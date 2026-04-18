// src/app/api/ai/extract/route.js
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MODEL = "gemini-2.5-flash";
const FILE_API_BASE = "https://generativelanguage.googleapis.com";
const MAX_RETRIES = 5;

const KEY_POOL = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
].filter(Boolean);

if (KEY_POOL.length === 0) throw new Error("No GEMINI_API_KEY set in environment.");

const PER_KEY_DELAY_MS = 12000;
const EFFECTIVE_DELAY_MS = Math.ceil(PER_KEY_DELAY_MS / KEY_POOL.length);

console.log(`Gemini key pool: ${KEY_POOL.length} key(s), effective delay: ${EFFECTIVE_DELAY_MS}ms`);

let keyIndex = 0;
function nextKey() {
  const key = KEY_POOL[keyIndex % KEY_POOL.length];
  keyIndex++;
  return key;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    equipment_type:        { type: "string" },
    equipment_description: { type: "string" },
    manufacturer:          { type: "string" },
    model:                 { type: "string" },
    serial_number:         { type: "string" },
    asset_tag:             { type: "string" },
    year_built:            { type: "string" },
    capacity_volume:       { type: "string" },
    swl:                   { type: "string" },
    working_pressure:      { type: "string" },
    design_pressure:       { type: "string" },
    test_pressure:         { type: "string" },
    pressure_unit:         { type: "string" },
    material:              { type: "string" },
    standard_code:         { type: "string" },
    inspection_number:     { type: "string" },
    client_name:           { type: "string" },
    location:              { type: "string" },
    inspection_date:       { type: "string" },
    expiry_date:           { type: "string" },
    next_inspection_due:   { type: "string" },
    inspector_name:        { type: "string" },
    inspection_body:       { type: "string" },
    result:                { type: "string" },
    defects_found:         { type: "string" },
    recommendations:       { type: "string" },
    comments:              { type: "string" },
    nameplate_data:        { type: "string" },
    raw_text_summary:      { type: "string" },
  },
  required: ["equipment_type", "result"],
};

// ── List mode schema — strict: forces { items: [...] } shape ──────────────
const LIST_ITEM_SCHEMA = {
  type: "object",
  properties: {
    equipment_type:        { type: "string" },
    serial_number:         { type: "string" },
    swl:                   { type: "string" },
    result:                { type: "string" },
    defects_found:         { type: "string" },
    equipment_description: { type: "string" },
  },
  required: ["equipment_type"],
};

const LIST_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    items: { type: "array", items: LIST_ITEM_SCHEMA },
  },
  required: ["items"],
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function sanitize(v) { return v == null ? "" : String(v).trim(); }

function normalizeResult(v) {
  const n = sanitize(v).toUpperCase().replace(/\s+/g, "_");
  if (["PASS", "FAIL", "CONDITIONAL", "REPAIR_REQUIRED", "OUT_OF_SERVICE"].includes(n)) return n;
  if (n === "REPAIR REQUIRED") return "REPAIR_REQUIRED";
  return "UNKNOWN";
}

/* ─────────────────────────────────────────────────────────
   extractJsonFromPayload — THE CORE FIX
   
   Gemini returns JSON in two different ways depending on config:
   1. When responseMimeType = "application/json" + responseSchema:
      The JSON is already parsed and available in parts[0].text
      as a raw JSON string (no markdown fences).
   2. When using plain text generation:
      The JSON is wrapped in ```json ... ``` markdown.
   
   We handle BOTH cases plus a third: sometimes the model
   ignores the schema and returns plain text description.
   
   Priority order:
   a) Try parts[0].text as raw JSON (most reliable with schema)
   b) Strip markdown fences and try again
   c) Find first { } or [ ] block in the full text
   d) Return null (caller handles error)
───────────────────────────────────────────────────────── */
function extractJsonFromPayload(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  
  // Collect all text from all parts
  const allText = parts
    .map(p => (typeof p?.text === "string" ? p.text : ""))
    .join("")
    .trim();

  if (!allText) return null;

  // Attempt a: direct parse (works when Gemini returns clean JSON with schema)
  try { return JSON.parse(allText); } catch {}

  // Attempt b: strip markdown fences
  const stripped = allText
    .replace(/^```json\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();
  try { return JSON.parse(stripped); } catch {}

  // Attempt c: extract first complete JSON object
  const oi = stripped.indexOf("{");
  const oj = stripped.lastIndexOf("}");
  if (oi >= 0 && oj > oi) {
    try { return JSON.parse(stripped.slice(oi, oj + 1)); } catch {}
  }

  // Attempt d: extract first JSON array (bare array fallback)
  const ai = stripped.indexOf("[");
  const aj = stripped.lastIndexOf("]");
  if (ai >= 0 && aj > ai) {
    try { return JSON.parse(stripped.slice(ai, aj + 1)); } catch {}
  }

  console.error("JSON extraction failed. Raw text sample:", allText.slice(0, 500));
  return null;
}

/* ─────────────────────────────────────────────────────────
   normalizeListResult — ensures we always get { items: [...] }
   regardless of what shape the model returned
───────────────────────────────────────────────────────── */
function normalizeListResult(parsed) {
  if (!parsed) return null;

  // Already correct shape
  if (parsed.items && Array.isArray(parsed.items)) {
    return parsed;
  }

  // Bare array returned
  if (Array.isArray(parsed)) {
    return { items: parsed };
  }

  // Model used a different key
  const altKeys = ["certificates", "equipment", "results", "data", "list", "records", "entries"];
  for (const key of altKeys) {
    if (Array.isArray(parsed[key])) {
      return { items: parsed[key] };
    }
  }

  // Model returned a single item object (no array at all)
  if (parsed.equipment_type || parsed.serial_number) {
    return { items: [parsed] };
  }

  // Last resort: look for any array value in the object
  for (const val of Object.values(parsed)) {
    if (Array.isArray(val) && val.length > 0) {
      return { items: val };
    }
  }

  return null;
}

async function uploadFile(bytes, mimeType, displayName, apiKey) {
  const startRes = await fetch(
    `${FILE_API_BASE}/upload/v1beta/files?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(bytes.byteLength),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: displayName } }),
    }
  );
  if (!startRes.ok) throw new Error(`Upload start failed: ${startRes.status}`);
  const uploadUrl = startRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("No upload URL returned");

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(bytes.byteLength),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: bytes,
  });
  const uploadJson = await uploadRes.json().catch(() => null);
  if (!uploadRes.ok || !uploadJson?.file) {
    throw new Error(uploadJson?.error?.message || `Upload failed: ${uploadRes.status}`);
  }

  let file = uploadJson.file;
  for (let i = 0; i < 20; i++) {
    const state = file?.state || "";
    if (state === "ACTIVE" || state === "FILE_STATE_ACTIVE") return file;
    if (state === "FAILED" || state === "FILE_STATE_FAILED") throw new Error("File processing failed");
    await sleep(1500);
    const pollRes = await fetch(`${FILE_API_BASE}/v1beta/${file.name}?key=${apiKey}`);
    file = await pollRes.json().catch(() => file);
  }
  throw new Error("File did not become ACTIVE in time");
}

async function deleteFile(name, apiKey) {
  if (!name) return;
  try {
    await fetch(`${FILE_API_BASE}/v1beta/${name}?key=${apiKey}`, { method: "DELETE" });
  } catch {}
}

/* ─────────────────────────────────────────────────────────
   callGemini — two-shot strategy for list mode
   
   Shot 1: Use responseSchema (structured output) — most reliable
   Shot 2: If shot 1 returns empty/null, fall back to plain text
           generation with a very explicit prompt, then parse manually
───────────────────────────────────────────────────────── */
async function callGemini(uploadedFile, fileName, systemPrompt, apiKey, listMode = false) {

  async function makeRequest(useSchema) {
    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{
        role: "user",
        parts: [
          {
            text: listMode
              ? `Read EVERY line of this handwritten list carefully. Extract each equipment item into the items array. File: ${fileName}`
              : `Extract inspection certificate data from this file. Filename: ${fileName}`,
          },
          { file_data: { mime_type: uploadedFile.mimeType, file_uri: uploadedFile.uri } },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        maxOutputTokens: listMode ? 16384 : 8192,
        responseMimeType: "application/json",
        ...(useSchema ? { responseSchema: listMode ? LIST_RESPONSE_SCHEMA : RESPONSE_SCHEMA } : {}),
      },
    };

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const res = await fetch(
        `${FILE_API_BASE}/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );

      if (res.status === 429 || res.status === 503 || res.status === 500) {
        const retryAfter = parseInt(res.headers.get("retry-after") || "0") * 1000;
        const baseWait = res.status === 429 ? EFFECTIVE_DELAY_MS : 15000;
        const waitMs = Math.max(retryAfter, baseWait * Math.pow(2, attempt));
        console.log(`Gemini ${res.status} attempt ${attempt + 1}/${MAX_RETRIES}. Waiting ${Math.round(waitMs / 1000)}s...`);
        await sleep(waitMs);
        continue;
      }

      const json = await res.json().catch(() => null);
      if (!res.ok || !json) throw new Error(json?.error?.message || `Gemini error ${res.status}`);

      const finishReason = json?.candidates?.[0]?.finishReason;
      if (finishReason === "SAFETY" || finishReason === "RECITATION") {
        throw new Error(`Gemini blocked: ${finishReason}`);
      }
      if (finishReason === "MAX_TOKENS") {
        // Response was truncated — log but continue; extractJsonFromPayload will do its best
        console.warn(`[${fileName}] Response truncated (MAX_TOKENS). JSON may be incomplete.`);
      }

      // Check for overload message in 200 response
      const textCheck = (json?.candidates?.[0]?.content?.parts || []).map(p => p?.text || "").join("");
      if (textCheck.toLowerCase().includes("experiencing high demand") || textCheck.toLowerCase().includes("try again later")) {
        if (attempt < MAX_RETRIES - 1) {
          const waitMs = 20000 * (attempt + 1);
          console.log(`Gemini overload in 200. Waiting ${waitMs / 1000}s...`);
          await sleep(waitMs);
          continue;
        }
      }

      return json;
    }
    throw new Error("Gemini is overloaded after all retries.");
  }

  // Count meaningful fields in a parsed document result
  function countDocFields(parsed) {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return 0;
    return Object.values(parsed).filter(v => v != null && String(v).trim() !== "").length;
  }

  // Shot 1: with schema
  const json1 = await makeRequest(true);
  const parsed1 = extractJsonFromPayload(json1);

  if (listMode) {
    const normalized1 = normalizeListResult(parsed1);
    if (normalized1 && normalized1.items.length > 0) {
      console.log(`[${fileName}] Schema shot: ${normalized1.items.length} items extracted ✓`);
      return { payload: json1, parsed: normalized1 };
    }

    // Shot 2: no schema, plain JSON output — sometimes more reliable for messy handwriting
    console.log(`[${fileName}] Schema shot returned 0 items. Trying plain JSON fallback...`);
    const json2 = await makeRequest(false);
    const parsed2 = extractJsonFromPayload(json2);
    const normalized2 = normalizeListResult(parsed2);

    if (normalized2 && normalized2.items.length > 0) {
      console.log(`[${fileName}] Plain JSON fallback: ${normalized2.items.length} items extracted ✓`);
      return { payload: json2, parsed: normalized2 };
    }

    // Both shots returned 0 items — return whatever we have (even empty)
    console.warn(`[${fileName}] Both shots returned 0 items.`);
    return { payload: json1, parsed: normalized1 || { items: [] } };
  }

  // ── Document mode: two-shot with fallback ────────────────────────────────
  // Shot 1 result check: schema can force empty strings for all fields,
  // giving a technically valid but useless {} object. Detect this.
  const fields1 = countDocFields(parsed1);
  if (fields1 >= 2) {
    // Good result — has meaningful data
    console.log(`[${fileName}] Doc schema shot: ${fields1} fields extracted ✓`);
    return { payload: json1, parsed: parsed1 };
  }

  // Shot 1 returned empty or near-empty — try without schema
  console.log(`[${fileName}] Doc schema shot returned ${fields1} fields. Trying plain JSON fallback...`);
  const json2 = await makeRequest(false);
  const parsed2 = extractJsonFromPayload(json2);
  const fields2 = countDocFields(parsed2);

  if (fields2 >= fields1) {
    console.log(`[${fileName}] Doc plain JSON fallback: ${fields2} fields extracted ✓`);
    return { payload: json2, parsed: parsed2 };
  }

  // Fallback was worse — return whichever had more fields
  console.warn(`[${fileName}] Both doc shots weak (${fields1} vs ${fields2} fields). Using best.`);
  return { payload: json1, parsed: parsed1 };
}

async function processOneFile(fileData, systemPrompt, listMode = false) {
  const { fileName, mimeType, base64Data } = fileData;
  let uploadedFile = null;
  const apiKey = nextKey();

  try {
    const bytes = Buffer.from(base64Data, "base64");
    uploadedFile = await uploadFile(bytes, mimeType, fileName, apiKey);

    const { payload, parsed } = await callGemini(uploadedFile, fileName, systemPrompt, apiKey, listMode);

    if (!parsed || typeof parsed !== "object") {
      return {
        fileName,
        ok: false,
        error: "Model returned invalid JSON. Try a clearer image.",
      };
    }

    if (listMode) {
      const itemCount = parsed.items?.length || 0;
      console.log(`[${fileName}] list mode: ${itemCount} items`);

      if (itemCount === 0) {
        return {
          fileName,
          ok: false,
          error: `No items could be extracted. Got 0 items from model. Try a higher-resolution photo with good lighting.`,
        };
      }

      // Sanitize each item
      const sanitizedItems = (parsed.items || []).map(item => ({
        equipment_type:        sanitize(item.equipment_type) || "Other",
        serial_number:         sanitize(item.serial_number),
        swl:                   sanitize(item.swl),
        result:                normalizeResult(item.result) || "PASS",
        defects_found:         sanitize(item.defects_found),
        equipment_description: sanitize(item.equipment_description),
      }));

      return {
        fileName,
        ok: true,
        data: { items: sanitizedItems },
        usage: payload?.usageMetadata || null,
      };
    }

    // Document mode
    const data = {};
    for (const [k, v] of Object.entries(parsed)) {
      data[k] = sanitize(v);
    }
    data.result = normalizeResult(data.result);

    // Surface a proper error if the model returned essentially nothing
    const meaningfulFields = Object.values(data).filter(v => v && String(v).trim()).length;
    if (meaningfulFields < 2) {
      return {
        fileName,
        ok: false,
        error: `AI extracted 0 usable fields from this file. The document may be encrypted, image-only, or too low resolution. Try a clearer scan or a text-based PDF.`,
      };
    }

    console.log(`[${fileName}] doc mode: ${meaningfulFields} fields extracted ✓`);
    return { fileName, ok: true, data, usage: payload?.usageMetadata || null };

  } catch (err) {
    console.error(`[${fileName}] error:`, err?.message);
    return { fileName, ok: false, error: err?.message || "Extraction failed." };
  } finally {
    if (uploadedFile?.name) await deleteFile(uploadedFile.name, apiKey);
  }
}

export async function POST(request) {
  try {
    if (KEY_POOL.length === 0) {
      return NextResponse.json(
        { error: "No GEMINI_API_KEY set in environment." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.files) || body.files.length === 0) {
      return NextResponse.json(
        { error: "Request must include a non-empty files array." },
        { status: 400 }
      );
    }

    const systemPrompt =
      body.systemPrompt ||
      "Extract structured JSON from the provided inspection certificate document. Return only valid JSON.";

    const results = [];

    for (let i = 0; i < body.files.length; i++) {
      const file = body.files[i];
      const isListMode = body.listMode === true;
      console.log(`Processing ${i + 1}/${body.files.length}: ${file.fileName} (listMode: ${isListMode})`);

      const result = await processOneFile(file, systemPrompt, isListMode);
      results.push(result);

      if (i < body.files.length - 1) {
        await sleep(EFFECTIVE_DELAY_MS);
      }
    }

    return NextResponse.json({ results, model: MODEL, processed: results.length });
  } catch (err) {
    console.error("AI extract error:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}
