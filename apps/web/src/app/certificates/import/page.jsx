// src/app/api/certificates/import/route.js
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL   = "gemini-2.5-flash";
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const MAX_BYTES  = 20 * 1024 * 1024; // 20 MB
const ALLOWED    = new Set(["image/jpeg","image/jpg","image/png","image/webp","image/heic","image/heif","application/pdf"]);

const SCHEMA = {
  type: "OBJECT",
  properties: {
    certificate_number:    { type: "STRING" },
    certificate_type:      { type: "STRING" },
    client_name:           { type: "STRING" },
    equipment_description: { type: "STRING" },
    equipment_type:        { type: "STRING" },
    equipment_location:    { type: "STRING" },
    equipment_id:          { type: "STRING" },
    identification_number: { type: "STRING" },
    inspection_no:         { type: "STRING" },
    lanyard_serial_no:     { type: "STRING" },
    manufacturer:          { type: "STRING" },
    model:                 { type: "STRING" },
    serial_number:         { type: "STRING" },
    year_built:            { type: "STRING" },
    country_of_origin:     { type: "STRING" },
    swl:                   { type: "STRING" },
    mawp:                  { type: "STRING" },
    capacity:              { type: "STRING" },
    design_pressure:       { type: "STRING" },
    test_pressure:         { type: "STRING" },
    inspector_name:        { type: "STRING" },
    inspector_id:          { type: "STRING" },
    result:                { type: "STRING" },
    equipment_status:      { type: "STRING" },
    issue_date:            { type: "STRING" },
    expiry_date:           { type: "STRING" },
    legal_framework:       { type: "STRING" },
    remarks:               { type: "STRING" },
    raw_text:              { type: "STRING" },
  },
  required: ["raw_text"],
};

const SYSTEM = `You are a specialist inspector reading industrial equipment certificates issued in Botswana under the Mines, Quarries, Works and Machinery Act Cap 44:02. Extract every visible field from the certificate image or PDF accurately. Never invent values. Return empty string for fields not visible.`;

const PROMPT = `Extract all fields from this certificate document.

Return strict JSON only — no markdown, no code fences, no explanation.

Fields:
certificate_number     — the certificate or doc number
certificate_type       — type (e.g. Load Test Certificate, Pressure Test Certificate)
client_name            — company / client name
equipment_description  — full description of equipment
equipment_type         — type (e.g. Chain Block, Safety Harness, Air Receiver)
equipment_location     — where the equipment is located
equipment_id           — equipment ID / plate ID
identification_number  — identification number if shown
inspection_no          — inspection reference number
lanyard_serial_no      — lanyard serial (fall-arrest only)
manufacturer           — manufacturer name
model                  — model / drawing number
serial_number          — serial number
year_built             — year of manufacture
country_of_origin      — country of origin
swl                    — Safe Working Load with units
mawp                   — Max Allowable Working Pressure with units
capacity               — capacity / volume with units
design_pressure        — design pressure with units
test_pressure          — test / hydrostatic pressure with units
inspector_name         — name of inspector
inspector_id           — inspector ID / competency number
result                 — PASS, FAIL, REPAIR_REQUIRED, or OUT_OF_SERVICE
equipment_status       — same as result if shown separately
issue_date             — date issued (YYYY-MM-DD if possible)
expiry_date            — expiry / next inspection date (YYYY-MM-DD if possible)
legal_framework        — legal standard referenced
remarks                — any remarks, conditions, or comments
raw_text               — all visible text verbatim`;

function clean(v) {
  if (!v && v !== 0) return "";
  return String(v).trim();
}

function safeJson(text) {
  const s = String(text || "").trim();
  try { return JSON.parse(s); } catch {}
  const stripped = s.replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/\s*```$/i,"").trim();
  try { return JSON.parse(stripped); } catch {}
  const a = stripped.indexOf("{"), b = stripped.lastIndexOf("}");
  if (a !== -1 && b > a) { try { return JSON.parse(stripped.slice(a, b+1)); } catch {} }
  return null;
}

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.filter(p => !p.thought).map(p => p.text || "").join("\n").trim();
}

async function callGemini(base64, mimeType) {
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents: [{
        role: "user",
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        thinkingConfig: { thinkingBudget: 1024 },
      },
    }),
    signal: AbortSignal.timeout(40_000),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export async function POST(request) {
  // Always return JSON — never let an exception bubble to HTML
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured on server." }, { status: 500 });
    }

    let form;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data — ensure Content-Type is multipart/form-data." }, { status: 400 });
    }

    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type}. Use JPEG, PNG, WebP, HEIC, or PDF.` }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: `File too large (${(bytes.byteLength/1048576).toFixed(1)} MB). Max 20 MB.` }, { status: 413 });
    }

    const base64   = Buffer.from(bytes).toString("base64");
    const mimeType = file.type === "application/pdf" ? "application/pdf" : file.type;

    // Retry once on failure
    let gemini;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        gemini = await callGemini(base64, mimeType);
        if (gemini.ok) break;
      } catch (e) {
        if (attempt === 1) return NextResponse.json({ error: `Gemini unreachable: ${e?.message}` }, { status: 502 });
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!gemini.ok) {
      return NextResponse.json(
        { error: gemini.data?.error?.message || `Gemini error ${gemini.status}` },
        { status: 500 }
      );
    }

    const rawText = extractText(gemini.data);
    const ocr     = safeJson(rawText);

    if (!ocr || typeof ocr !== "object") {
      return NextResponse.json(
        { error: "Gemini returned unparseable response.", raw_preview: rawText.slice(0, 500) },
        { status: 500 }
      );
    }

    // Normalise result
    const rawResult = clean(ocr.result || ocr.equipment_status);
    const normResult = rawResult.toUpperCase().replace(/\s+/g,"_");
    const result =
      normResult === "PASS"            ? "PASS"            :
      normResult === "FAIL"            ? "FAIL"            :
      ["REPAIR_REQUIRED","CONDITIONAL"].includes(normResult) ? "REPAIR_REQUIRED" :
      normResult === "OUT_OF_SERVICE"  ? "OUT_OF_SERVICE"  :
      "PASS"; // default for newly issued certificates

    return NextResponse.json({
      success: true,
      model:   GEMINI_MODEL,
      extracted: {
        certificate_number:    clean(ocr.certificate_number),
        certificate_type:      clean(ocr.certificate_type),
        client_name:           clean(ocr.client_name),
        equipment_description: clean(ocr.equipment_description),
        equipment_type:        clean(ocr.equipment_type),
        equipment_location:    clean(ocr.equipment_location),
        equipment_id:          clean(ocr.equipment_id),
        identification_number: clean(ocr.identification_number),
        inspection_no:         clean(ocr.inspection_no),
        lanyard_serial_no:     clean(ocr.lanyard_serial_no),
        manufacturer:          clean(ocr.manufacturer),
        model:                 clean(ocr.model),
        serial_number:         clean(ocr.serial_number),
        year_built:            clean(ocr.year_built),
        country_of_origin:     clean(ocr.country_of_origin),
        swl:                   clean(ocr.swl),
        mawp:                  clean(ocr.mawp),
        capacity:              clean(ocr.capacity),
        design_pressure:       clean(ocr.design_pressure),
        test_pressure:         clean(ocr.test_pressure),
        inspector_name:        clean(ocr.inspector_name) || "Moemedi Masupe",
        inspector_id:          clean(ocr.inspector_id)   || "700117910",
        result,
        equipment_status:      result,
        issue_date:            clean(ocr.issue_date),
        expiry_date:           clean(ocr.expiry_date),
        legal_framework:       clean(ocr.legal_framework) || "Mines, Quarries, Works and Machinery Act Cap 44:02",
        remarks:               clean(ocr.remarks),
        raw_text:              clean(ocr.raw_text),
      },
      usage: {
        prompt_tokens:   gemini.data?.usageMetadata?.promptTokenCount    || 0,
        thinking_tokens: gemini.data?.usageMetadata?.thoughtsTokenCount  || 0,
        output_tokens:   gemini.data?.usageMetadata?.candidatesTokenCount|| 0,
        total_tokens:    gemini.data?.usageMetadata?.totalTokenCount      || 0,
      },
    });

  } catch (err) {
    // Catch-all — always return JSON, never HTML
    console.error("[certificates/import] Unhandled error:", err);
    return NextResponse.json(
      { error: err?.message || "Import failed unexpectedly." },
      { status: 500 }
    );
  }
}
