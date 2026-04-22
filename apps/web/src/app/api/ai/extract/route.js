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

// Per-key cooldown: tracks when each key is next available
const keyCooldowns = new Map(KEY_POOL.map(k => [k, 0]));

const PER_KEY_DELAY_MS = 12000;
const EFFECTIVE_DELAY_MS = Math.ceil(PER_KEY_DELAY_MS / KEY_POOL.length);

console.log(`Gemini key pool: ${KEY_POOL.length} key(s), effective delay: ${EFFECTIVE_DELAY_MS}ms`);

let keyIndex = 0;

/**
 * Returns the next available key, respecting per-key cooldowns.
 * If all keys are on cooldown, waits for the soonest-available one.
 */
async function nextKey() {
  const now = Date.now();

  // Find a key that's already available
  for (let i = 0; i < KEY_POOL.length; i++) {
    const idx = (keyIndex + i) % KEY_POOL.length;
    const key = KEY_POOL[idx];
    if ((keyCooldowns.get(key) || 0) <= now) {
      keyIndex = (idx + 1) % KEY_POOL.length;
      keyCooldowns.set(key, now + PER_KEY_DELAY_MS);
      return key;
    }
  }

  // All keys on cooldown — wait for the soonest available
  let soonestKey = KEY_POOL[0];
  let soonestTime = keyCooldowns.get(KEY_POOL[0]) || 0;
  for (const k of KEY_POOL) {
    const t = keyCooldowns.get(k) || 0;
    if (t < soonestTime) { soonestTime = t; soonestKey = k; }
  }

  const wait = soonestTime - now;
  if (wait > 0) {
    console.log(`All keys on cooldown. Waiting ${Math.round(wait / 1000)}s for next available key…`);
    await sleep(wait);
  }

  keyCooldowns.set(soonestKey, Date.now() + PER_KEY_DELAY_MS);
  return soonestKey;
}

/**
 * Mark a key as rate-limited for an extended cooldown.
 */
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

/* ── UTILITIES ───────────────────────────────────────────── */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function sanitize(v) { return v == null ? "" : String(v).trim(); }

function normalizeResult(v) {
  const n = sanitize(v).toUpperCase().replace(/\s+/g, "_");
  if (["PASS", "FAIL", "CONDITIONAL", "REPAIR_REQUIRED", "OUT_OF_SERVICE"].includes(n)) return n;
  if (n === "REPAIR REQUIRED") return "REPAIR_REQUIRED";
  return "UNKNOWN";
}

/**
 * fetchWithTimeout — wraps fetch with an AbortController timeout.
 * Prevents individual Gemini calls from hanging indefinitely.
 */
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

/**
 * extractJsonFromPayload — handles all Gemini response formats:
 * a) Raw JSON string (schema mode)
 * b) Markdown-fenced JSON
 * c) First { } block in text
 * d) First [ ] block in text
 */
function extractJsonFromPayload(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  const allText = parts
    .map(p => (typeof p?.text === "string" ? p.text : ""))
    .join("")
    .trim();

  if (!allText) return null;

  // a) Direct parse
  try { return JSON.parse(allText); } catch {}

  // b) Strip markdown fences
  const stripped = allText
    .replace(/^```json\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();
  try { return JSON.parse(stripped); } catch {}

  // c) First complete JSON object
  const oi = stripped.indexOf("{");
  const oj = stripped.lastIndexOf("}");
  if (oi >= 0 && oj > oi) {
    try { return JSON.parse(stripped.slice(oi, oj + 1)); } catch {}
  }

  // d) First JSON array
  const ai = stripped.indexOf("[");
  const aj = stripped.lastIndexOf("]");
  if (ai >= 0 && aj > ai) {
    try { return JSON.parse(stripped.slice(ai, aj + 1)); } catch {}
  }

  console.error("JSON extraction failed. Raw text sample:", allText.slice(0, 500));
  return null;
}

/**
 * normalizeListResult — ensures { items: [...] } regardless of model shape.
 */
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

  // Poll until ACTIVE
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
/**
 * callGemini — two-shot strategy with per-key penalization on 429.
 *
 * Shot 1: responseSchema (structured output) — most reliable
 * Shot 2: plain JSON fallback if shot 1 returns empty/null
 */
async function callGemini(uploadedFile, fileName, systemPrompt, apiKey, listMode = false) {

  async function makeRequest(useSchema, keyOverride) {
    const key = keyOverride || apiKey;
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
      let res;
      try {
        res = await fetchWithTimeout(
          `${FILE_API_BASE}/v1beta/models/${MODEL}:generateContent?key=${key}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
          120000 // 2 min per generation call
        );
      } catch (fetchErr) {
        // Timeout or network error — retry with backoff
        const waitMs = 5000 * Math.pow(2, attempt);
        console.warn(`[${fileName}] Fetch error attempt ${attempt + 1}: ${fetchErr.message}. Waiting ${Math.round(waitMs / 1000)}s…`);
        if (attempt < MAX_RETRIES - 1) { await sleep(waitMs); continue; }
        throw fetchErr;
      }

      // Rate limited — penalize this key and try a fresh one
      if (res.status === 429) {
        penalizeKey(key, 60000 * (attempt + 1));
        const retryAfter = parseInt(res.headers.get("retry-after") || "0") * 1000;
        const waitMs = Math.max(retryAfter, EFFECTIVE_DELAY_MS * Math.pow(2, attempt));
        console.log(`[${fileName}] 429 attempt ${attempt + 1}/${MAX_RETRIES}. Waiting ${Math.round(waitMs / 1000)}s…`);
        await sleep(waitMs);

        // Switch to a different key for next attempt
        const freshKey = await nextKey();
        if (freshKey !== key) {
          console.log(`[${fileName}] Switching to fresh key for retry.`);
          return makeRequest(useSchema, freshKey);
        }
        continue;
      }

      // Transient server errors
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

      // Detect overload messages in 200 responses
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

  // ── Shot 1: with schema ──────────────────────────────────
  const json1 = await makeRequest(true, null);
  const parsed1 = extractJsonFromPayload(json1);

  if (listMode) {
    const normalized1 = normalizeListResult(parsed1);
    if (normalized1 && normalized1.items.length > 0) {
      console.log(`[${fileName}] Schema shot: ${normalized1.items.length} items ✓`);
      return { payload: json1, parsed: normalized1 };
    }

    // Shot 2: plain JSON — better for messy handwriting
    console.log(`[${fileName}] Schema shot 0 items. Trying plain JSON fallback…`);
    await sleep(EFFECTIVE_DELAY_MS);
    const json2 = await makeRequest(false, await nextKey());
    const parsed2 = extractJsonFromPayload(json2);
    const normalized2 = normalizeListResult(parsed2);

    if (normalized2 && normalized2.items.length > 0) {
      console.log(`[${fileName}] Plain JSON fallback: ${normalized2.items.length} items ✓`);
      return { payload: json2, parsed: normalized2 };
    }

    console.warn(`[${fileName}] Both shots returned 0 items.`);
    return { payload: json1, parsed: normalized1 || { items: [] } };
  }

  // ── Document mode two-shot ───────────────────────────────
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
    console.log(`[${fileName}] Doc plain JSON fallback: ${fields2} fields ✓`);
    return { payload: json2, parsed: parsed2 };
  }

  console.warn(`[${fileName}] Both doc shots weak (${fields1} vs ${fields2}). Using best.`);
  return { payload: json1, parsed: parsed1 };
}

/* ── PROCESS ONE FILE ────────────────────────────────────── */
async function processOneFile(fileData, systemPrompt, listMode = false) {
  const { fileName, mimeType, base64Data } = fileData;
  let uploadedFile = null;
  const apiKey = await nextKey();

  try {
    const bytes = Buffer.from(base64Data, "base64");

    // Validate file size (Gemini File API limit: 20MB)
    const sizeMB = bytes.byteLength / (1024 * 1024);
    if (sizeMB > 20) {
      return {
        fileName,
        ok: false,
        error: `File too large (${sizeMB.toFixed(1)}MB). Maximum is 20MB. Please compress the image or PDF.`,
      };
    }

    console.log(`[${fileName}] Uploading ${sizeMB.toFixed(2)}MB as ${mimeType}…`);
    uploadedFile = await uploadFile(bytes, mimeType, fileName, apiKey);

    const { payload, parsed } = await callGemini(
      uploadedFile, fileName, systemPrompt, apiKey, listMode
    );

    if (!parsed || typeof parsed !== "object") {
      return {
        fileName,
        ok: false,
        error: "Model returned invalid JSON. Try a clearer image.",
      };
    }

    // ── LIST MODE ────────────────────────────────────────
    if (listMode) {
      const itemCount = parsed.items?.length || 0;
      console.log(`[${fileName}] list mode: ${itemCount} items`);

      if (itemCount === 0) {
        return {
          fileName,
          ok: false,
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

      return {
        fileName,
        ok: true,
        data: { items: sanitizedItems },
        usage: payload?.usageMetadata || null,
      };
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
        fileName,
        ok: false,
        error: "AI extracted 0 usable fields. The document may be encrypted, image-only, or too low resolution. Try a clearer scan or text-based PDF.",
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

    // Guard: cap batch size to avoid 300s timeout
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

    const results = [];
    const isListMode = body.listMode === true;

    for (let i = 0; i < body.files.length; i++) {
      const file = body.files[i];
      console.log(`Processing ${i + 1}/${body.files.length}: ${file.fileName} (listMode: ${isListMode})`);

      const result = await processOneFile(file, systemPrompt, isListMode);
      results.push(result);

      // Delay between files to respect rate limits (skip after last)
      if (i < body.files.length - 1) {
        await sleep(EFFECTIVE_DELAY_MS);
      }
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
