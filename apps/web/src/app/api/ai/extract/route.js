// src/app/api/ai/extract/route.js
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MODEL = "gemini-2.5-flash";
const FILE_API_BASE = "https://generativelanguage.googleapis.com";
const MAX_RETRIES = 5;

/* ── KEY POOL with per-key cooldown tracking ─────────────── */
const KEY_POOL = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
].filter(Boolean);

if (KEY_POOL.length === 0) throw new Error("No GEMINI_API_KEY set in environment.");

const keyCooldowns = new Map(KEY_POOL.map(k => [k, 0]));
const PER_KEY_DELAY_MS = 12000;
const EFFECTIVE_DELAY_MS = Math.ceil(PER_KEY_DELAY_MS / KEY_POOL.length);

console.log(`Gemini key pool: ${KEY_POOL.length} key(s), effective delay: ${EFFECTIVE_DELAY_MS}ms`);

let keyIndex = 0;

async function nextKey() {
  const now = Date.now();
  for (let i = 0; i < KEY_POOL.length; i++) {
    const idx = (keyIndex + i) % KEY_POOL.length;
    const key = KEY_POOL[idx];
    if ((keyCooldowns.get(key) || 0) <= now) {
      keyIndex = (idx + 1) % KEY_POOL.length;
      keyCooldowns.set(key, now + PER_KEY_DELAY_MS);
      return key;
    }
  }
  let soonestKey = KEY_POOL[0];
  let soonestTime = keyCooldowns.get(KEY_POOL[0]) || 0;
  for (const k of KEY_POOL) {
    const t = keyCooldowns.get(k) || 0;
    if (t < soonestTime) { soonestTime = t; soonestKey = k; }
  }
  const wait = soonestTime - now;
  if (wait > 0) {
    console.log(`All keys on cooldown. Waiting ${Math.round(wait / 1000)}s…`);
    await sleep(wait);
  }
  keyCooldowns.set(soonestKey, Date.now() + PER_KEY_DELAY_MS);
  return soonestKey;
}

function penalizeKey(key, extraMs = 60000) {
  const current = keyCooldowns.get(key) || Date.now();
  keyCooldowns.set(key, Math.max(current, Date.now() + extraMs));
  console.warn(`Key penalized for ${Math.round(extraMs / 1000)}s due to rate limit.`);
}

/* ── SCHEMAS ─────────────────────────────────────────────── */
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

// ── HOOK & ROPE SCHEMA — all fields the HookRopePage reads ───────────────────
// We use a schema here so Gemini's structured output fills every field reliably.
// Fields not present in the document are returned as empty strings.
const HOOK_ROPE_SCHEMA = {
  type: "object",
  properties: {
    client_name:              { type: "string" },
    location:                 { type: "string" },
    crane_make:               { type: "string" },
    crane_serial:             { type: "string" },
    crane_fleet:              { type: "string" },
    crane_swl:                { type: "string" },
    machine_hours:            { type: "string" },
    inspection_date:          { type: "string" },
    expiry_date:              { type: "string" },
    report_number:            { type: "string" },
    drum_main_condition:      { type: "string" },
    drum_aux_condition:       { type: "string" },
    rope_lay_main:            { type: "string" },
    rope_lay_aux:             { type: "string" },
    rope_diameter_main:       { type: "string" },
    rope_diameter_aux:        { type: "string" },
    rope_length_3x_main:      { type: "string" },
    rope_length_3x_aux:       { type: "string" },
    reduction_dia_main:       { type: "string" },
    reduction_dia_aux:        { type: "string" },
    core_protrusion_main:     { type: "string" },
    core_protrusion_aux:      { type: "string" },
    corrosion_main:           { type: "string" },
    corrosion_aux:            { type: "string" },
    broken_wires_main:        { type: "string" },
    broken_wires_aux:         { type: "string" },
    rope_kinks_main:          { type: "string" },
    rope_kinks_aux:           { type: "string" },
    other_defects_main:       { type: "string" },
    other_defects_aux:        { type: "string" },
    end_fittings_main:        { type: "string" },
    end_fittings_aux:         { type: "string" },
    serviceability_main:      { type: "string" },
    serviceability_aux:       { type: "string" },
    lower_limit_main:         { type: "string" },
    lower_limit_aux:          { type: "string" },
    damaged_strands_main:     { type: "string" },
    damaged_strands_aux:      { type: "string" },
    hook1_sn:                 { type: "string" },
    hook1_swl:                { type: "string" },
    hook1_swl_marked:         { type: "string" },
    hook1_safety_catch:       { type: "string" },
    hook1_cracks:             { type: "string" },
    hook1_swivel:             { type: "string" },
    hook1_corrosion:          { type: "string" },
    hook1_side_bending:       { type: "string" },
    hook1_ab:                 { type: "string" },
    hook1_ac:                 { type: "string" },
    hook2_sn:                 { type: "string" },
    hook2_swl:                { type: "string" },
    hook2_swl_marked:         { type: "string" },
    hook2_safety_catch:       { type: "string" },
    hook2_cracks:             { type: "string" },
    hook2_swivel:             { type: "string" },
    hook2_corrosion:          { type: "string" },
    hook2_side_bending:       { type: "string" },
    hook2_ab:                 { type: "string" },
    hook2_ac:                 { type: "string" },
    hook3_sn:                 { type: "string" },
    hook3_swl:                { type: "string" },
    overall_result:           { type: "string" },
    defects_found:            { type: "string" },
    comments:                 { type: "string" },
  },
  required: ["client_name", "overall_result"],
};

/* ── UTILITIES ───────────────────────────────────────────── */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function sanitize(v) { return v == null ? "" : String(v).trim(); }

function normalizeResult(v) {
  const n = sanitize(v).toUpperCase().replace(/\s+/g, "_");
  if (["PASS", "FAIL", "CONDITIONAL", "REPAIR_REQUIRED", "OUT_OF_SERVICE"].includes(n)) return n;
  if (n === "REPAIR REQUIRED") return "REPAIR_REQUIRED";
  return "UNKNOWN";
}

async function fetchWithTimeout(url, options, timeoutMs = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === "AbortError") throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function extractJsonFromPayload(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  const allText = parts
    .map(p => (typeof p?.text === "string" ? p.text : ""))
    .join("")
    .trim();

  if (!allText) return null;

  try { return JSON.parse(allText); } catch {}

  const stripped = allText
    .replace(/^```json\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();
  try { return JSON.parse(stripped); } catch {}

  const oi = stripped.indexOf("{");
  const oj = stripped.lastIndexOf("}");
  if (oi >= 0 && oj > oi) {
    try { return JSON.parse(stripped.slice(oi, oj + 1)); } catch {}
  }

  const ai = stripped.indexOf("[");
  const aj = stripped.lastIndexOf("]");
  if (ai >= 0 && aj > ai) {
    try { return JSON.parse(stripped.slice(ai, aj + 1)); } catch {}
  }

  console.error("JSON extraction failed. Raw text sample:", allText.slice(0, 500));
  return null;
}

function normalizeListResult(parsed) {
  if (!parsed) return null;
  if (parsed.items && Array.isArray(parsed.items)) return parsed;
  if (Array.isArray(parsed)) return { items: parsed };

  const altKeys = ["certificates", "equipment", "results", "data", "list", "records", "entries"];
  for (const key of altKeys) {
    if (Array.isArray(parsed[key])) return { items: parsed[key] };
  }

  if (parsed.equipment_type || parsed.serial_number) return { items: [parsed] };

  for (const val of Object.values(parsed)) {
    if (Array.isArray(val) && val.length > 0) return { items: val };
  }

  return null;
}

function countDocFields(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return 0;
  return Object.values(parsed).filter(v => v != null && String(v).trim() !== "").length;
}

/* ── FILE UPLOAD ─────────────────────────────────────────── */
async function uploadFile(bytes, mimeType, displayName, apiKey) {
  const startRes = await fetchWithTimeout(
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
    },
    30000
  );
  if (!startRes.ok) throw new Error(`Upload start failed: ${startRes.status}`);

  const uploadUrl = startRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("No upload URL returned");

  const uploadRes = await fetchWithTimeout(
    uploadUrl,
    {
      method: "POST",
      headers: {
        "Content-Length": String(bytes.byteLength),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
      },
      body: bytes,
    },
    60000
  );

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
    const pollRes = await fetchWithTimeout(
      `${FILE_API_BASE}/v1beta/${file.name}?key=${apiKey}`,
      {},
      15000
    );
    file = await pollRes.json().catch(() => file);
  }
  throw new Error("File did not become ACTIVE in time");
}

async function deleteFile(name, apiKey) {
  if (!name) return;
  try {
    await fetchWithTimeout(
      `${FILE_API_BASE}/v1beta/${name}?key=${apiKey}`,
      { method: "DELETE" },
      10000
    );
  } catch {}
}

/* ── GEMINI CALL ─────────────────────────────────────────── */
async function callGemini(uploadedFile, fileName, systemPrompt, apiKey, mode = "document") {
  // mode: "document" | "list" | "hookrope"

  async function makeRequest(useSchema, keyOverride) {
    const key = keyOverride || apiKey;

    // Choose schema based on mode
    let responseSchema = null;
    if (useSchema) {
      if (mode === "list")     responseSchema = LIST_RESPONSE_SCHEMA;
      else if (mode === "hookrope") responseSchema = HOOK_ROPE_SCHEMA;
      else                    responseSchema = RESPONSE_SCHEMA;
    }

    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{
        role: "user",
        parts: [
          {
            text: mode === "list"
              ? `Read EVERY line of this handwritten list carefully. Extract each equipment item into the items array. File: ${fileName}`
              : mode === "hookrope"
                ? `Extract all Hook & Rope inspection data from this certificate. Read every field carefully. File: ${fileName}`
                : `Extract inspection certificate data from this file. Filename: ${fileName}`,
          },
          { file_data: { mime_type: uploadedFile.mimeType, file_uri: uploadedFile.uri } },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        maxOutputTokens: mode === "list" ? 16384 : 8192,
        responseMimeType: "application/json",
        ...(responseSchema ? { responseSchema } : {}),
      },
    };

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      let res;
      try {
        res = await fetchWithTimeout(
          `${FILE_API_BASE}/v1beta/models/${MODEL}:generateContent?key=${key}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
          120000
        );
      } catch (fetchErr) {
        const waitMs = 5000 * Math.pow(2, attempt);
        console.warn(`[${fileName}] Fetch error attempt ${attempt + 1}: ${fetchErr.message}. Waiting ${Math.round(waitMs / 1000)}s…`);
        if (attempt < MAX_RETRIES - 1) { await sleep(waitMs); continue; }
        throw fetchErr;
      }

      if (res.status === 429) {
        penalizeKey(key, 60000 * (attempt + 1));
        const retryAfter = parseInt(res.headers.get("retry-after") || "0") * 1000;
        const waitMs = Math.max(retryAfter, EFFECTIVE_DELAY_MS * Math.pow(2, attempt));
        console.log(`[${fileName}] 429 attempt ${attempt + 1}/${MAX_RETRIES}. Waiting ${Math.round(waitMs / 1000)}s…`);
        await sleep(waitMs);
        const freshKey = await nextKey();
        if (freshKey !== key) {
          console.log(`[${fileName}] Switching to fresh key for retry.`);
          return makeRequest(useSchema, freshKey);
        }
        continue;
      }

      if (res.status === 503 || res.status === 500) {
        const waitMs = 15000 * Math.pow(2, attempt);
        console.log(`[${fileName}] ${res.status} attempt ${attempt + 1}/${MAX_RETRIES}. Waiting ${Math.round(waitMs / 1000)}s…`);
        if (attempt < MAX_RETRIES - 1) { await sleep(waitMs); continue; }
      }

      const json = await res.json().catch(() => null);
      if (!res.ok || !json) throw new Error(json?.error?.message || `Gemini error ${res.status}`);

      const finishReason = json?.candidates?.[0]?.finishReason;
      if (finishReason === "SAFETY" || finishReason === "RECITATION") {
        throw new Error(`Gemini blocked: ${finishReason}`);
      }
      if (finishReason === "MAX_TOKENS") {
        console.warn(`[${fileName}] Response truncated (MAX_TOKENS). JSON may be incomplete.`);
      }

      const textCheck = (json?.candidates?.[0]?.content?.parts || [])
        .map(p => p?.text || "").join("").toLowerCase();
      if (
        textCheck.includes("experiencing high demand") ||
        textCheck.includes("try again later") ||
        textCheck.includes("temporarily unavailable")
      ) {
        if (attempt < MAX_RETRIES - 1) {
          const waitMs = 20000 * (attempt + 1);
          console.log(`[${fileName}] Gemini overload in 200. Waiting ${Math.round(waitMs / 1000)}s…`);
          await sleep(waitMs);
          continue;
        }
      }

      return json;
    }
    throw new Error("Gemini is overloaded after all retries.");
  }

  // ── LIST MODE ────────────────────────────────────────────
  if (mode === "list") {
    const json1 = await makeRequest(true, null);
    const parsed1 = extractJsonFromPayload(json1);
    const normalized1 = normalizeListResult(parsed1);
    if (normalized1 && normalized1.items.length > 0) {
      console.log(`[${fileName}] List schema shot: ${normalized1.items.length} items ✓`);
      return { payload: json1, parsed: normalized1 };
    }
    console.log(`[${fileName}] List schema 0 items. Trying plain JSON fallback…`);
    await sleep(EFFECTIVE_DELAY_MS);
    const json2 = await makeRequest(false, await nextKey());
    const parsed2 = extractJsonFromPayload(json2);
    const normalized2 = normalizeListResult(parsed2);
    if (normalized2 && normalized2.items.length > 0) {
      console.log(`[${fileName}] List plain fallback: ${normalized2.items.length} items ✓`);
      return { payload: json2, parsed: normalized2 };
    }
    console.warn(`[${fileName}] Both list shots returned 0 items.`);
    return { payload: json1, parsed: normalized1 || { items: [] } };
  }

  // ── HOOK & ROPE MODE ────────────────────────────────────
  // Shot 1: with HOOK_ROPE_SCHEMA (structured — all fields guaranteed in output)
  // Shot 2: plain JSON fallback if shot 1 returns fewer than 3 fields
  if (mode === "hookrope") {
    const json1 = await makeRequest(true, null);
    const parsed1 = extractJsonFromPayload(json1);
    const fields1 = countDocFields(parsed1);
    if (fields1 >= 3) {
      console.log(`[${fileName}] Hook & Rope schema shot: ${fields1} fields ✓`);
      return { payload: json1, parsed: parsed1 };
    }
    console.log(`[${fileName}] Hook & Rope schema weak (${fields1} fields). Trying plain JSON fallback…`);
    await sleep(EFFECTIVE_DELAY_MS);
    const json2 = await makeRequest(false, await nextKey());
    const parsed2 = extractJsonFromPayload(json2);
    const fields2 = countDocFields(parsed2);
    console.log(`[${fileName}] Hook & Rope plain fallback: ${fields2} fields`);
    // Use whichever shot returned more data
    return fields2 >= fields1
      ? { payload: json2, parsed: parsed2 }
      : { payload: json1, parsed: parsed1 };
  }

  // ── DOCUMENT MODE ────────────────────────────────────────
  const json1 = await makeRequest(true, null);
  const parsed1 = extractJsonFromPayload(json1);
  const fields1 = countDocFields(parsed1);
  if (fields1 >= 2) {
    console.log(`[${fileName}] Doc schema shot: ${fields1} fields ✓`);
    return { payload: json1, parsed: parsed1 };
  }
  console.log(`[${fileName}] Doc schema shot ${fields1} fields. Trying plain JSON fallback…`);
  await sleep(EFFECTIVE_DELAY_MS);
  const json2 = await makeRequest(false, await nextKey());
  const parsed2 = extractJsonFromPayload(json2);
  const fields2 = countDocFields(parsed2);
  if (fields2 >= fields1) {
    console.log(`[${fileName}] Doc plain fallback: ${fields2} fields ✓`);
    return { payload: json2, parsed: parsed2 };
  }
  console.warn(`[${fileName}] Both doc shots weak (${fields1} vs ${fields2}). Using best.`);
  return { payload: json1, parsed: parsed1 };
}

/* ── PROCESS ONE FILE ────────────────────────────────────── */
async function processOneFile(fileData, systemPrompt, mode = "document") {
  const { fileName, mimeType, base64Data } = fileData;
  let uploadedFile = null;
  const apiKey = await nextKey();

  try {
    const bytes = Buffer.from(base64Data, "base64");
    const sizeMB = bytes.byteLength / (1024 * 1024);
    if (sizeMB > 20) {
      return {
        fileName,
        ok: false,
        error: `File too large (${sizeMB.toFixed(1)}MB). Maximum is 20MB.`,
      };
    }

    console.log(`[${fileName}] Uploading ${sizeMB.toFixed(2)}MB as ${mimeType} (mode: ${mode})…`);
    uploadedFile = await uploadFile(bytes, mimeType, fileName, apiKey);

    const { payload, parsed } = await callGemini(
      uploadedFile, fileName, systemPrompt, apiKey, mode
    );

    if (!parsed || typeof parsed !== "object") {
      return { fileName, ok: false, error: "Model returned invalid JSON. Try a clearer image." };
    }

    // ── LIST MODE ────────────────────────────────────────
    if (mode === "list") {
      const itemCount = parsed.items?.length || 0;
      console.log(`[${fileName}] list mode: ${itemCount} items`);
      if (itemCount === 0) {
        return {
          fileName, ok: false,
          error: "No items could be extracted. Try a higher-resolution photo with good lighting.",
        };
      }
      const sanitizedItems = (parsed.items || []).map(item => ({
        equipment_type:        sanitize(item.equipment_type) || "Other",
        serial_number:         sanitize(item.serial_number),
        swl:                   sanitize(item.swl),
        result:                normalizeResult(item.result) || "PASS",
        defects_found:         sanitize(item.defects_found),
        equipment_description: sanitize(item.equipment_description),
      }));
      return { fileName, ok: true, data: { items: sanitizedItems }, usage: payload?.usageMetadata || null };
    }

    // ── HOOK & ROPE MODE ─────────────────────────────────
    // Return parsed as-is — HookRopeMode handles field mapping
    if (mode === "hookrope") {
      const meaningfulFields = countDocFields(parsed);
      console.log(`[${fileName}] hook & rope mode: ${meaningfulFields} fields ✓`);
      if (meaningfulFields < 2) {
        return {
          fileName, ok: false,
          error: "AI extracted 0 usable fields. Try a clearer scan or higher-resolution image.",
        };
      }
      // Sanitize all string fields
      const data = {};
      for (const [k, v] of Object.entries(parsed)) {
        data[k] = sanitize(v);
      }
      return { fileName, ok: true, data, usage: payload?.usageMetadata || null };
    }

    // ── DOCUMENT MODE ────────────────────────────────────
    const data = {};
    for (const [k, v] of Object.entries(parsed)) {
      data[k] = sanitize(v);
    }
    data.result = normalizeResult(data.result);

    const meaningfulFields = Object.values(data).filter(v => v && String(v).trim()).length;
    if (meaningfulFields < 2) {
      return {
        fileName, ok: false,
        error: "AI extracted 0 usable fields. The document may be encrypted, image-only, or too low resolution.",
      };
    }

    console.log(`[${fileName}] doc mode: ${meaningfulFields} fields ✓`);
    return { fileName, ok: true, data, usage: payload?.usageMetadata || null };

  } catch (err) {
    console.error(`[${fileName}] error:`, err?.message);
    return { fileName, ok: false, error: err?.message || "Extraction failed." };
  } finally {
    if (uploadedFile?.name) await deleteFile(uploadedFile.name, apiKey);
  }
}

/* ── ROUTE HANDLER ───────────────────────────────────────── */
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

    const MAX_BATCH = 20;
    if (body.files.length > MAX_BATCH) {
      return NextResponse.json(
        { error: `Batch too large. Maximum ${MAX_BATCH} files per request.` },
        { status: 400 }
      );
    }

    const systemPrompt =
      body.systemPrompt ||
      "Extract structured JSON from the provided inspection certificate document. Return only valid JSON.";

    // ── Resolve mode ────────────────────────────────────────────────────────
    // Supports both old boolean flags and new string mode for forward compat.
    // Priority: body.mode (string) > body.hookRopeMode > body.listMode > "document"
    let mode = "document";
    if (body.mode === "hookrope" || body.hookRopeMode === true) mode = "hookrope";
    else if (body.mode === "list"     || body.listMode     === true) mode = "list";

    console.log(`AI extract: ${body.files.length} file(s), mode="${mode}"`);

    const results = [];

    for (let i = 0; i < body.files.length; i++) {
      const file = body.files[i];
      console.log(`Processing ${i + 1}/${body.files.length}: ${file.fileName}`);
      const result = await processOneFile(file, systemPrompt, mode);
      results.push(result);
      if (i < body.files.length - 1) await sleep(EFFECTIVE_DELAY_MS);
    }

    const successCount = results.filter(r => r.ok).length;
    console.log(`Batch complete: ${successCount}/${results.length} succeeded.`);

    return NextResponse.json({
      results,
      model: MODEL,
      processed: results.length,
      succeeded: successCount,
      failed: results.length - successCount,
    });

  } catch (err) {
    console.error("AI extract error:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}
