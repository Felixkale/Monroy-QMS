// src/app/api/nameplate/scan/route.js
import { NextResponse } from "next/server";
import { parseNameplateText } from "@/lib/nameplateParser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ─── Model config ──────────────────────────────────────────────
   gemini-2.5-flash  — stable alias, always points to latest stable.
   Built-in thinking improves accuracy on industrial nameplate OCR.
─────────────────────────────────────────────────────────────── */
const GEMINI_MODEL   = "gemini-2.5-flash";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

/* ─── Max file size: 10 MB ──────────────────────────────────── */
const MAX_BYTES = 10 * 1024 * 1024;

/* ─── Supported image MIME types ────────────────────────────── */
const ALLOWED_MIME = new Set([
  "image/jpeg", "image/jpg", "image/png",
  "image/webp", "image/heic", "image/heif",
]);

/* ─── Structured output schema ──────────────────────────────────
   Extended with QMS-specific fields:
   - identification_number, inspection_no, lanyard_serial_no
   - equipment_type, equipment_description
   - inspection_result, certificate_type
   These cover the full Monroy QMS certificate model.
─────────────────────────────────────────────────────────────── */
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    raw_text:              { type: "STRING" },
    manufacturer:          { type: "STRING" },
    model:                 { type: "STRING" },
    serial_number:         { type: "STRING" },
    year_built:            { type: "STRING" },
    capacity:              { type: "STRING" },
    swl:                   { type: "STRING" },
    mawp:                  { type: "STRING" },
    design_pressure:       { type: "STRING" },
    test_pressure:         { type: "STRING" },
    country_of_origin:     { type: "STRING" },
    equipment_id:          { type: "STRING" },
    identification_number: { type: "STRING" },
    inspection_no:         { type: "STRING" },
    lanyard_serial_no:     { type: "STRING" },
    equipment_type:        { type: "STRING" },
    equipment_description: { type: "STRING" },
    inspection_result:     { type: "STRING" },
    certificate_type:      { type: "STRING" },
  },
  required: ["raw_text"],
};

/* ─── System instruction (new in Gemini 2.5) ────────────────── */
const SYSTEM_INSTRUCTION = `You are a specialist industrial equipment inspector with deep expertise in reading
physical nameplates, data plates, and rating plates on lifting equipment (slings, shackles,
chain blocks, wire rope, harnesses, lanyards) and pressure vessels (air receivers, boilers,
compressors, separators).

Your task is to extract every visible field from the provided nameplate image with maximum
accuracy. You must never invent, guess, or hallucinate values. If a field is not clearly
visible, return an empty string for that field.

Be especially careful with:
- Numbers that look similar (0/O, 1/I, 6/G, 8/B)
- Units attached to values (e.g. "5T", "250kg", "16 bar") — preserve them as-is
- Serial numbers and identification numbers — copy exactly as printed
- Distinguishing SWL (Safe Working Load) from MAWP/working pressure`;

/* ─── Extraction prompt ──────────────────────────────────────── */
const USER_PROMPT = `Examine this industrial equipment nameplate image carefully.

Return a strict JSON object with ONLY these keys. Leave any key you cannot read as "".

raw_text              — all visible text from the nameplate, verbatim
manufacturer          — brand / maker name
model                 — model number or type designation
serial_number         — serial number / S/N / Ser No
year_built            — year of manufacture / date of manufacture
capacity              — volume or rated capacity with units (e.g. "500L", "2000kg")
swl                   — Safe Working Load with units (e.g. "3.2T", "500kg") — lifting equipment only
mawp                  — Max Allowable Working Pressure with units (e.g. "10 bar") — pressure vessels only
design_pressure       — design pressure with units
test_pressure         — test / hydrostatic pressure with units
country_of_origin     — country of manufacture
equipment_id          — asset ID / plate ID / asset number on the physical plate
identification_number — identification number or tag if different from serial
inspection_no         — inspection reference number if printed on plate
lanyard_serial_no     — lanyard serial number (fall-arrest equipment only)
equipment_type        — type of equipment (e.g. "Chain Block", "Air Receiver", "Safety Harness", "Wire Rope Sling")
equipment_description — full equipment description combining type + key specs
inspection_result     — pass / fail / conditional if shown on plate or attached sticker
certificate_type      — type of certificate referenced (e.g. "Load Test Certificate", "Pressure Test Certificate")

Rules:
- raw_text must contain ALL visible text exactly as it appears on the plate
- Preserve units exactly (1T not 1 tonne, 10bar not 10 bar — copy as seen)
- Do not merge or split fields
- Do not return markdown, code fences, or explanations
- Return JSON only`;

/* ─── Helpers ────────────────────────────────────────────────── */
function extractTextParts(apiData) {
  const parts = apiData?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .filter(p => !p.thought)  // strip Gemini 2.5 thinking parts
    .map(p => (typeof p?.text === "string" ? p.text : ""))
    .join("\n")
    .trim();
}

function safeJsonParse(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  // Direct parse
  try { return JSON.parse(raw); } catch {}

  // Strip markdown fences
  const stripped = raw
    .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(stripped); } catch {}

  // Extract first {...} block
  const s = stripped.indexOf("{"), e = stripped.lastIndexOf("}");
  if (s !== -1 && e > s) {
    try { return JSON.parse(stripped.slice(s, e + 1)); } catch {}
  }

  return null;
}

function clean(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

/* ─── Retry wrapper ──────────────────────────────────────────── */
async function withRetry(fn, attempts = 2, delayMs = 800) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (err) {
      lastError = err;
      if (i < attempts - 1) await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastError;
}

/* ─── Gemini call ────────────────────────────────────────────── */
async function callGemini({ base64Data, mimeType }) {
  const body = {
    /* System instruction — supported in Gemini 2.5 */
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    contents: [
      {
        role: "user",
        parts: [
          { text: USER_PROMPT },
          {
            inline_data: {
              mime_type: mimeType || "image/jpeg",
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature:       0,
      maxOutputTokens:   4096,
      responseMimeType:  "application/json",
      responseSchema:    RESPONSE_SCHEMA,
      /* Thinking config — Gemini 2.5 Flash built-in reasoning.
         A budget of 1024 tokens gives a good accuracy / latency balance
         for structured extraction tasks. Set to 0 to disable. */
      thinkingConfig: {
        thinkingBudget: 1024,
      },
    },
  };

  const res = await fetch(GEMINI_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(30_000),  // 30 s timeout
  });

  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

/* ─── Route handler ──────────────────────────────────────────── */
export async function POST(request) {
  /* ── API key guard ── */
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("file");

    /* ── Input validation ── */
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "A nameplate image file is required." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Use JPEG, PNG, WebP, HEIC, or HEIF.` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();

    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { error: `Image too large (${(bytes.byteLength / 1048576).toFixed(1)} MB). Maximum is 10 MB.` },
        { status: 413 }
      );
    }

    const base64Data = Buffer.from(bytes).toString("base64");
    const mimeType   = file.type;

    /* ── Call Gemini with retry ── */
    let gemini;
    try {
      gemini = await withRetry(() => callGemini({ base64Data, mimeType }), 2, 1000);
    } catch (fetchErr) {
      return NextResponse.json(
        { error: `Gemini API unreachable: ${fetchErr?.message || "network error"}` },
        { status: 502 }
      );
    }

    /* ── Gemini error response ── */
    if (!gemini.ok) {
      const msg = gemini.data?.error?.message || `Gemini returned status ${gemini.status}`;
      console.error("[nameplate/scan] Gemini error:", gemini.data);
      return NextResponse.json(
        { error: msg, details: gemini.data },
        { status: 500 }
      );
    }

    /* ── Parse model output ── */
    const rawModelText = extractTextParts(gemini.data);
    const ocr          = safeJsonParse(rawModelText);

    if (!ocr || typeof ocr !== "object" || Array.isArray(ocr)) {
      console.error("[nameplate/scan] JSON parse failed. Raw:", rawModelText.slice(0, 500));
      return NextResponse.json(
        {
          error:       "Gemini returned an unparseable response.",
          raw_preview: rawModelText.slice(0, 2000),
        },
        { status: 500 }
      );
    }

    /* ── Merge Gemini OCR with parseNameplateText heuristics ── */
    const parsed = parseNameplateText(clean(ocr.raw_text));

    /* Gemini values take priority; fall back to heuristic parser */
    const merged = {
      manufacturer:          clean(ocr.manufacturer)          || parsed.manufacturer          || "",
      model:                 clean(ocr.model)                 || parsed.model                 || "",
      serial_number:         clean(ocr.serial_number)         || parsed.serial_number         || "",
      year_built:            clean(ocr.year_built)            || parsed.year_built            || "",
      capacity:              clean(ocr.capacity)              || parsed.capacity              || "",
      swl:                   clean(ocr.swl)                   || parsed.swl                   || "",
      mawp:                  clean(ocr.mawp)                  || parsed.mawp                  || "",
      design_pressure:       clean(ocr.design_pressure)       || parsed.design_pressure       || "",
      test_pressure:         clean(ocr.test_pressure)         || parsed.test_pressure         || "",
      country_of_origin:     clean(ocr.country_of_origin)     || parsed.country_of_origin     || "",
      equipment_id:          clean(ocr.equipment_id)          || parsed.equipment_id          || "",
      /* New fields from expanded schema */
      identification_number: clean(ocr.identification_number) || "",
      inspection_no:         clean(ocr.inspection_no)         || "",
      lanyard_serial_no:     clean(ocr.lanyard_serial_no)     || "",
      equipment_type:        clean(ocr.equipment_type)        || parsed.equipment_type        || "",
      equipment_description: clean(ocr.equipment_description) || "",
      inspection_result:     clean(ocr.inspection_result)     || "",
      certificate_type:      clean(ocr.certificate_type)      || parsed.document_category     || "",
    };

    /* ── Usage / metadata from Gemini response ── */
    const usageMeta = gemini.data?.usageMetadata || {};

    return NextResponse.json({
      success: true,
      model:   GEMINI_MODEL,
      /* Raw OCR output exactly as Gemini returned it */
      ocr: {
        raw_text:              clean(ocr.raw_text),
        manufacturer:          clean(ocr.manufacturer),
        model:                 clean(ocr.model),
        serial_number:         clean(ocr.serial_number),
        year_built:            clean(ocr.year_built),
        capacity:              clean(ocr.capacity),
        swl:                   clean(ocr.swl),
        mawp:                  clean(ocr.mawp),
        design_pressure:       clean(ocr.design_pressure),
        test_pressure:         clean(ocr.test_pressure),
        country_of_origin:     clean(ocr.country_of_origin),
        equipment_id:          clean(ocr.equipment_id),
        identification_number: clean(ocr.identification_number),
        inspection_no:         clean(ocr.inspection_no),
        lanyard_serial_no:     clean(ocr.lanyard_serial_no),
        equipment_type:        clean(ocr.equipment_type),
        equipment_description: clean(ocr.equipment_description),
        inspection_result:     clean(ocr.inspection_result),
        certificate_type:      clean(ocr.certificate_type),
      },
      /* Merged output for direct use in the certificate form */
      parsed: merged,
      /* Token usage for monitoring */
      usage: {
        prompt_tokens:    usageMeta.promptTokenCount     || 0,
        thinking_tokens:  usageMeta.thoughtsTokenCount   || 0,
        output_tokens:    usageMeta.candidatesTokenCount || 0,
        total_tokens:     usageMeta.totalTokenCount       || 0,
      },
    });

  } catch (err) {
    console.error("[nameplate/scan] Unhandled error:", err);
    return NextResponse.json(
      { error: err?.message || "Nameplate scan failed unexpectedly." },
      { status: 500 }
    );
  }
}
