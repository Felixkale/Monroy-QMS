// src/app/api/ai/extract/route.js
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const GEMINI_MODEL    = "gemini-2.5-flash";
const FILE_API_BASE   = "https://generativelanguage.googleapis.com";
const MAX_RETRIES     = 5;

// ── GROQ (text-only fallback — shot 2) ───────────────────────────────────────
const GROQ_API_KEY  = process.env.GROQ_API_KEY || "";
const GROQ_MODEL    = process.env.GROQ_MODEL   || "llama-3.3-70b-versatile";
const GROQ_BASE     = "https://api.groq.com/openai/v1";
const GROQ_ENABLED  = Boolean(GROQ_API_KEY);

// ── OPENROUTER (vision-capable parallel shot 1) ───────────────────────────────
// Free models with vision: meta-llama/llama-4-maverick:free  (20 RPM)
//                          meta-llama/llama-4-scout:free
//                          google/gemini-2.0-flash-exp:free
const OR_API_KEY    = process.env.OPENROUTER_API_KEY || "";
const OR_MODEL      = process.env.OPENROUTER_MODEL   || "meta-llama/llama-4-maverick:free";
const OR_BASE       = "https://openrouter.ai/api/v1";
const OR_ENABLED    = Boolean(OR_API_KEY);

/* ── GEMINI KEY POOL ─────────────────────────────────────── */
const KEY_POOL = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
].filter(Boolean);

if (KEY_POOL.length === 0) throw new Error("No GEMINI_API_KEY set in environment.");

const keyCooldowns      = new Map(KEY_POOL.map(k => [k, 0]));
const PER_KEY_DELAY_MS  = 6000;
const EFFECTIVE_DELAY_MS = Math.max(300, Math.ceil(PER_KEY_DELAY_MS / KEY_POOL.length));

console.log(`Gemini: ${KEY_POOL.length} key(s) | Groq: ${GROQ_ENABLED ? GROQ_MODEL : "off"} | OpenRouter: ${OR_ENABLED ? OR_MODEL : "off"} | delay: ${EFFECTIVE_DELAY_MS}ms`);

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
    console.log(`All Gemini keys on cooldown. Waiting ${Math.round(wait / 1000)}s…`);
    await sleep(wait);
  }
  keyCooldowns.set(soonestKey, Date.now() + PER_KEY_DELAY_MS);
  return soonestKey;
}

function penalizeKey(key, extraMs = 60000) {
  const current = keyCooldowns.get(key) || Date.now();
  keyCooldowns.set(key, Math.max(current, Date.now() + extraMs));
  console.warn(`Gemini key penalized ${Math.round(extraMs / 1000)}s.`);
}

/* ── SCHEMAS ─────────────────────────────────────────────── */
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    equipment_type: { type: "string" }, equipment_description: { type: "string" },
    manufacturer: { type: "string" }, model: { type: "string" },
    serial_number: { type: "string" }, asset_tag: { type: "string" },
    year_built: { type: "string" }, capacity_volume: { type: "string" },
    swl: { type: "string" }, working_pressure: { type: "string" },
    design_pressure: { type: "string" }, test_pressure: { type: "string" },
    pressure_unit: { type: "string" }, material: { type: "string" },
    standard_code: { type: "string" }, inspection_number: { type: "string" },
    client_name: { type: "string" }, location: { type: "string" },
    inspection_date: { type: "string" }, expiry_date: { type: "string" },
    next_inspection_due: { type: "string" }, inspector_name: { type: "string" },
    inspection_body: { type: "string" }, result: { type: "string" },
    defects_found: { type: "string" }, recommendations: { type: "string" },
    comments: { type: "string" }, nameplate_data: { type: "string" },
    raw_text_summary: { type: "string" },
  },
  required: ["equipment_type", "result"],
};

const LIST_ITEM_SCHEMA = {
  type: "object",
  properties: {
    equipment_type: { type: "string" }, serial_number: { type: "string" },
    swl: { type: "string" }, result: { type: "string" },
    defects_found: { type: "string" }, equipment_description: { type: "string" },
  },
  required: ["equipment_type"],
};

const LIST_RESPONSE_SCHEMA = {
  type: "object",
  properties: { items: { type: "array", items: LIST_ITEM_SCHEMA } },
  required: ["items"],
};

const HOOK_ROPE_SCHEMA = {
  type: "object",
  properties: {
    client_name: { type: "string" }, location: { type: "string" },
    crane_make: { type: "string" }, crane_serial: { type: "string" },
    crane_fleet: { type: "string" }, crane_swl: { type: "string" },
    machine_hours: { type: "string" }, inspection_date: { type: "string" },
    expiry_date: { type: "string" }, report_number: { type: "string" },
    drum_main_condition: { type: "string" }, drum_aux_condition: { type: "string" },
    rope_lay_main: { type: "string" }, rope_lay_aux: { type: "string" },
    rope_diameter_main: { type: "string" }, rope_diameter_aux: { type: "string" },
    rope_length_3x_main: { type: "string" }, rope_length_3x_aux: { type: "string" },
    reduction_dia_main: { type: "string" }, reduction_dia_aux: { type: "string" },
    core_protrusion_main: { type: "string" }, core_protrusion_aux: { type: "string" },
    corrosion_main: { type: "string" }, corrosion_aux: { type: "string" },
    broken_wires_main: { type: "string" }, broken_wires_aux: { type: "string" },
    rope_kinks_main: { type: "string" }, rope_kinks_aux: { type: "string" },
    other_defects_main: { type: "string" }, other_defects_aux: { type: "string" },
    end_fittings_main: { type: "string" }, end_fittings_aux: { type: "string" },
    serviceability_main: { type: "string" }, serviceability_aux: { type: "string" },
    lower_limit_main: { type: "string" }, lower_limit_aux: { type: "string" },
    damaged_strands_main: { type: "string" }, damaged_strands_aux: { type: "string" },
    hook1_sn: { type: "string" }, hook1_swl: { type: "string" },
    hook1_swl_marked: { type: "string" }, hook1_safety_catch: { type: "string" },
    hook1_cracks: { type: "string" }, hook1_swivel: { type: "string" },
    hook1_corrosion: { type: "string" }, hook1_side_bending: { type: "string" },
    hook1_ab: { type: "string" }, hook1_ac: { type: "string" },
    hook2_sn: { type: "string" }, hook2_swl: { type: "string" },
    hook2_swl_marked: { type: "string" }, hook2_safety_catch: { type: "string" },
    hook2_cracks: { type: "string" }, hook2_swivel: { type: "string" },
    hook2_corrosion: { type: "string" }, hook2_side_bending: { type: "string" },
    hook2_ab: { type: "string" }, hook2_ac: { type: "string" },
    hook3_sn: { type: "string" }, hook3_swl: { type: "string" },
    overall_result: { type: "string" }, defects_found: { type: "string" },
    comments: { type: "string" },
  },
  required: ["client_name", "overall_result"],
};

/* ── UTILITIES ───────────────────────────────────────────── */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function sanitize(v) { return v == null ? "" : String(v).trim(); }

function normalizeResult(v) {
  const n = sanitize(v).toUpperCase().replace(/\s+/g, "_");
  if (["PASS","FAIL","CONDITIONAL","REPAIR_REQUIRED","OUT_OF_SERVICE"].includes(n)) return n;
  if (n === "REPAIR REQUIRED") return "REPAIR_REQUIRED";
  return "UNKNOWN";
}

async function fetchWithTimeout(url, options, timeoutMs = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === "AbortError") throw new Error(`Timed out after ${timeoutMs / 1000}s`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function extractJsonFromPayload(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  const allText = parts.map(p => (typeof p?.text === "string" ? p.text : "")).join("").trim();
  if (!allText) return null;
  try { return JSON.parse(allText); } catch {}
  const stripped = allText.replace(/^```json\s*/im,"").replace(/^```\s*/im,"").replace(/\s*```\s*$/im,"").trim();
  try { return JSON.parse(stripped); } catch {}
  const oi = stripped.indexOf("{"); const oj = stripped.lastIndexOf("}");
  if (oi >= 0 && oj > oi) { try { return JSON.parse(stripped.slice(oi, oj + 1)); } catch {} }
  const ai = stripped.indexOf("["); const aj = stripped.lastIndexOf("]");
  if (ai >= 0 && aj > ai) { try { return JSON.parse(stripped.slice(ai, aj + 1)); } catch {} }
  return null;
}

// Parse JSON from OpenAI-format chat completion response
function extractJsonFromChatResponse(json) {
  const text = json?.choices?.[0]?.message?.content || "";
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const stripped = text.replace(/^```json\s*/im,"").replace(/^```\s*/im,"").replace(/\s*```\s*$/im,"").trim();
  try { return JSON.parse(stripped); } catch {}
  const oi = stripped.indexOf("{"); const oj = stripped.lastIndexOf("}");
  if (oi >= 0 && oj > oi) { try { return JSON.parse(stripped.slice(oi, oj + 1)); } catch {} }
  const ai = stripped.indexOf("["); const aj = stripped.lastIndexOf("]");
  if (ai >= 0 && aj > ai) { try { return JSON.parse(stripped.slice(ai, aj + 1)); } catch {} }
  return null;
}

function normalizeListResult(parsed) {
  if (!parsed) return null;
  if (parsed.items && Array.isArray(parsed.items)) return parsed;
  if (Array.isArray(parsed)) return { items: parsed };
  const altKeys = ["certificates","equipment","results","data","list","records","entries"];
  for (const key of altKeys) { if (Array.isArray(parsed[key])) return { items: parsed[key] }; }
  if (parsed.equipment_type || parsed.serial_number) return { items: [parsed] };
  for (const val of Object.values(parsed)) { if (Array.isArray(val) && val.length > 0) return { items: val }; }
  return null;
}

function countDocFields(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return 0;
  return Object.values(parsed).filter(v => v != null && String(v).trim() !== "").length;
}

function buildGroqPrompt(geminiPayload, mode) {
  const parts = geminiPayload?.candidates?.[0]?.content?.parts || [];
  const rawText = parts.map(p => p?.text || "").join("").trim();
  const modeHint = mode === "list"
    ? "Extract every equipment line item into a JSON object with key 'items' (array). Each item needs: equipment_type, serial_number, swl, result, defects_found, equipment_description."
    : mode === "hookrope"
      ? "Re-structure all Hook & Rope inspection fields from this text into the required JSON object."
      : "Re-structure this inspection certificate text into the required JSON object. Extract every visible field.";
  return `The following is raw text extracted from an inspection certificate.
${modeHint}
Return ONLY valid JSON. No markdown, no explanation.

RAW TEXT:
${rawText || "(empty — fill all fields with empty strings)"}`;
}

/* ── OPENROUTER VISION CALL ──────────────────────────────────────────────────
   Sends base64 image directly — no file upload needed.
   Used in parallel with Gemini shot-1 for document/hookrope mode.
   Returns parsed JSON object or null on failure.
────────────────────────────────────────────────────────────────────────────── */
async function callOpenRouter(base64Data, mimeType, systemPrompt, fileName, mode) {
  if (!OR_ENABLED) return null;

  const userText = mode === "list"
    ? `Read EVERY line of this handwritten list. Extract each item into the items array. File: ${fileName}`
    : mode === "hookrope"
      ? `Extract all Hook & Rope inspection data from this certificate. Read every field. File: ${fileName}`
      : `Extract all inspection certificate data from this document. File: ${fileName}`;

  const body = {
    model: OR_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64Data}` },
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: mode === "list" ? 16384 : 8192,
    response_format: { type: "json_object" },
  };

  try {
    const res = await fetchWithTimeout(
      `${OR_BASE}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OR_API_KEY}`,
          "HTTP-Referer": "https://monroyqms.onrender.com",
          "X-Title": "Monroy QMS",
        },
        body: JSON.stringify(body),
      },
      90000
    );

    if (res.status === 429) { console.warn(`[${fileName}] OpenRouter rate limited.`); return null; }
    if (!res.ok) { console.warn(`[${fileName}] OpenRouter error ${res.status}`); return null; }

    const json = await res.json().catch(() => null);
    if (!json) return null;

    const parsed = extractJsonFromChatResponse(json);
    console.log(`[${fileName}] OpenRouter: ${countDocFields(parsed)} fields`);
    return parsed;
  } catch (err) {
    console.warn(`[${fileName}] OpenRouter failed:`, err.message);
    return null;
  }
}

/* ── GROQ TEXT CALL ──────────────────────────────────────────────────────────
   Text-only shot-2 fallback. Receives Gemini's raw extracted text,
   re-structures into clean JSON. No file upload, no rate limit wait.
────────────────────────────────────────────────────────────────────────────── */
async function callGroq(systemPrompt, userText) {
  if (!GROQ_ENABLED) return null;
  try {
    const res = await fetchWithTimeout(
      `${GROQ_BASE}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: userText },
          ],
          temperature: 0.1,
          max_tokens: 8192,
          response_format: { type: "json_object" },
        }),
      },
      60000
    );
    if (res.status === 429) { console.warn("Groq rate limited."); return null; }
    const json = await res.json().catch(() => null);
    if (!res.ok || !json) { console.warn(`Groq error ${res.status}`); return null; }
    const text = json.choices?.[0]?.message?.content || "";
    if (!text) return null;
    try { return JSON.parse(text); } catch {}
    const stripped = text.replace(/^```json\s*/im,"").replace(/\s*```\s*$/im,"").trim();
    try { return JSON.parse(stripped); } catch {}
    return null;
  } catch (err) {
    console.warn("Groq failed:", err.message);
    return null;
  }
}

/* ── GEMINI FILE UPLOAD ──────────────────────────────────── */
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
  if (!uploadRes.ok || !uploadJson?.file) throw new Error(uploadJson?.error?.message || `Upload failed: ${uploadRes.status}`);

  let file = uploadJson.file;
  for (let i = 0; i < 20; i++) {
    const state = file?.state || "";
    if (state === "ACTIVE" || state === "FILE_STATE_ACTIVE") return file;
    if (state === "FAILED" || state === "FILE_STATE_FAILED") throw new Error("File processing failed");
    await sleep(1500);
    const pollRes = await fetchWithTimeout(`${FILE_API_BASE}/v1beta/${file.name}?key=${apiKey}`, {}, 15000);
    file = await pollRes.json().catch(() => file);
  }
  throw new Error("File did not become ACTIVE in time");
}

async function deleteFile(name, apiKey) {
  if (!name) return;
  try { await fetchWithTimeout(`${FILE_API_BASE}/v1beta/${name}?key=${apiKey}`, { method: "DELETE" }, 10000); } catch {}
}

/* ── GEMINI GENERATE CALL ────────────────────────────────── */
async function geminiGenerate(uploadedFile, fileName, systemPrompt, apiKey, mode, useSchema) {
  let responseSchema = null;
  if (useSchema) {
    if (mode === "list")          responseSchema = LIST_RESPONSE_SCHEMA;
    else if (mode === "hookrope") responseSchema = HOOK_ROPE_SCHEMA;
    else                          responseSchema = RESPONSE_SCHEMA;
  }

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{
      role: "user",
      parts: [
        {
          text: mode === "list"
            ? `Read EVERY line carefully. Extract each item into the items array. File: ${fileName}`
            : mode === "hookrope"
              ? `Extract all Hook & Rope inspection data. File: ${fileName}`
              : `Extract inspection certificate data. Filename: ${fileName}`,
        },
        { file_data: { mime_type: uploadedFile.mimeType, file_uri: uploadedFile.uri } },
      ],
    }],
    generationConfig: {
      temperature: 0.1, topP: 0.95,
      maxOutputTokens: mode === "list" ? 16384 : 8192,
      responseMimeType: "application/json",
      ...(responseSchema ? { responseSchema } : {}),
    },
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let res;
    try {
      res = await fetchWithTimeout(
        `${FILE_API_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
        120000
      );
    } catch (fetchErr) {
      const waitMs = 5000 * Math.pow(2, attempt);
      if (attempt < MAX_RETRIES - 1) { await sleep(waitMs); continue; }
      throw fetchErr;
    }

    if (res.status === 429) {
      penalizeKey(apiKey, 60000 * (attempt + 1));
      const retryAfter = parseInt(res.headers.get("retry-after") || "0") * 1000;
      const waitMs = Math.max(retryAfter, EFFECTIVE_DELAY_MS * Math.pow(2, attempt));
      await sleep(waitMs);
      const freshKey = await nextKey();
      if (freshKey !== apiKey) return geminiGenerate(uploadedFile, fileName, systemPrompt, freshKey, mode, useSchema);
      continue;
    }

    if (res.status === 503 || res.status === 500) {
      if (attempt < MAX_RETRIES - 1) { await sleep(15000 * Math.pow(2, attempt)); continue; }
    }

    const json = await res.json().catch(() => null);
    if (!res.ok || !json) throw new Error(json?.error?.message || `Gemini error ${res.status}`);

    const finishReason = json?.candidates?.[0]?.finishReason;
    if (finishReason === "SAFETY" || finishReason === "RECITATION") throw new Error(`Gemini blocked: ${finishReason}`);

    const textCheck = (json?.candidates?.[0]?.content?.parts || []).map(p => p?.text || "").join("").toLowerCase();
    if (textCheck.includes("experiencing high demand") || textCheck.includes("try again later")) {
      if (attempt < MAX_RETRIES - 1) { await sleep(20000 * (attempt + 1)); continue; }
    }

    return json;
  }
  throw new Error("Gemini overloaded after all retries.");
}

/* ── PROCESS ONE FILE ────────────────────────────────────────────────────────
   Strategy per mode:

   DOCUMENT / HOOKROPE:
     Shot 1 — Gemini (file upload + vision) AND OpenRouter (base64 vision)
              run IN PARALLEL via Promise.race.
              Winner is whoever returns ≥4 fields first.
              Loser is cancelled (we just ignore its result).
     Shot 2 — Only if shot-1 winner is weak: Groq (text restructure, instant).

   LIST:
     Shot 1 — Gemini with LIST schema (best for handwriting).
     Shot 2 — If Gemini weak: Groq fallback (instant).
              OpenRouter not used for list — handwriting OCR quality
              is significantly better on Gemini.
────────────────────────────────────────────────────────────────────────────── */
async function processOneFile(fileData, systemPrompt, mode = "document") {
  const { fileName, mimeType, base64Data } = fileData;
  let uploadedFile = null;
  const apiKey = await nextKey();

  try {
    const bytes = Buffer.from(base64Data, "base64");
    const sizeMB = bytes.byteLength / (1024 * 1024);
    if (sizeMB > 20) return { fileName, ok: false, error: `File too large (${sizeMB.toFixed(1)}MB). Max 20MB.` };

    console.log(`[${fileName}] ${sizeMB.toFixed(2)}MB mode=${mode} gemini+${OR_ENABLED?"openrouter":"groq-fallback"}`);

    // ── LIST MODE — Gemini only for shot 1 (best handwriting OCR) ────────────
    if (mode === "list") {
      uploadedFile = await uploadFile(bytes, mimeType, fileName, apiKey);
      const json1 = await geminiGenerate(uploadedFile, fileName, systemPrompt, apiKey, "list", true);
      const parsed1 = extractJsonFromPayload(json1);
      const norm1 = normalizeListResult(parsed1);

      if (norm1 && norm1.items.length > 0) {
        console.log(`[${fileName}] list Gemini: ${norm1.items.length} items ✓`);
        return buildListResult(fileName, norm1, json1);
      }

      // Groq fallback
      if (GROQ_ENABLED) {
        console.log(`[${fileName}] list Gemini weak → Groq…`);
        const groqParsed = await callGroq(systemPrompt, buildGroqPrompt(json1, "list"));
        const groqNorm = normalizeListResult(groqParsed);
        if (groqNorm && groqNorm.items.length > 0) {
          console.log(`[${fileName}] list Groq: ${groqNorm.items.length} items ✓`);
          return buildListResult(fileName, groqNorm, json1);
        }
      } else {
        // Second Gemini call
        await sleep(EFFECTIVE_DELAY_MS);
        const json2 = await geminiGenerate(uploadedFile, fileName, systemPrompt, apiKey, "list", false);
        const norm2 = normalizeListResult(extractJsonFromPayload(json2));
        if (norm2 && norm2.items.length > 0) return buildListResult(fileName, norm2, json2);
      }

      return { fileName, ok: false, error: "No items extracted. Try a higher-resolution photo." };
    }

    // ── DOCUMENT / HOOKROPE — Parallel Gemini + OpenRouter ───────────────────
    // Start Gemini file upload and OpenRouter call simultaneously
    const [geminiUploadResult, orResult] = await Promise.allSettled([
      // Gemini: upload then generate
      (async () => {
        uploadedFile = await uploadFile(bytes, mimeType, fileName, apiKey);
        const json = await geminiGenerate(uploadedFile, fileName, systemPrompt, apiKey, mode, true);
        return { source: "gemini", json, parsed: extractJsonFromPayload(json) };
      })(),
      // OpenRouter: base64 direct (no upload needed)
      OR_ENABLED
        ? (async () => {
            const parsed = await callOpenRouter(base64Data, mimeType, systemPrompt, fileName, mode);
            return { source: "openrouter", json: null, parsed };
          })()
        : Promise.resolve(null),
    ]);

    // Evaluate both results
    const geminiResult = geminiUploadResult.status === "fulfilled" ? geminiUploadResult.value : null;
    const orParsed     = orResult.status === "fulfilled" ? orResult.value?.parsed : null;

    const geminiFields = countDocFields(geminiResult?.parsed);
    const orFields     = countDocFields(orParsed);

    console.log(`[${fileName}] gemini=${geminiFields} fields | openrouter=${orFields} fields`);

    // Use whichever got more fields
    let bestParsed = null;
    let bestSource = "none";

    if (geminiFields >= orFields && geminiFields >= 4) {
      bestParsed = geminiResult.parsed; bestSource = "gemini";
    } else if (orFields > geminiFields && orFields >= 4) {
      bestParsed = orParsed; bestSource = "openrouter";
    } else if (geminiFields > 0 || orFields > 0) {
      // Both weak — use whichever has more
      bestParsed = geminiFields >= orFields ? geminiResult?.parsed : orParsed;
      bestSource = geminiFields >= orFields ? "gemini" : "openrouter";
    }

    // Shot 2 — Groq if best is still weak
    if (countDocFields(bestParsed) < 4 && GROQ_ENABLED) {
      console.log(`[${fileName}] both providers weak → Groq fallback (instant)…`);
      const geminiPayload = geminiResult?.json || null;
      const groqParsed = await callGroq(systemPrompt, buildGroqPrompt(geminiPayload, mode));
      const groqFields = countDocFields(groqParsed);
      if (groqFields > countDocFields(bestParsed)) {
        bestParsed = groqParsed; bestSource = "groq";
      }
    }

    console.log(`[${fileName}] winner: ${bestSource} (${countDocFields(bestParsed)} fields)`);

    if (!bestParsed || typeof bestParsed !== "object") {
      return { fileName, ok: false, error: "All providers returned invalid JSON. Try a clearer image." };
    }

    // ── HOOKROPE result ───────────────────────────────────────────────────────
    if (mode === "hookrope") {
      if (countDocFields(bestParsed) < 2) {
        return { fileName, ok: false, error: "AI extracted 0 usable fields. Try a clearer scan." };
      }
      const data = {};
      for (const [k, v] of Object.entries(bestParsed)) data[k] = sanitize(v);
      return { fileName, ok: true, data, source: bestSource };
    }

    // ── DOCUMENT result ───────────────────────────────────────────────────────
    const data = {};
    for (const [k, v] of Object.entries(bestParsed)) data[k] = sanitize(v);
    data.result = normalizeResult(data.result);
    const mf = Object.values(data).filter(v => v && String(v).trim()).length;
    if (mf < 2) return { fileName, ok: false, error: "AI extracted 0 usable fields. Try a clearer scan." };

    return { fileName, ok: true, data, source: bestSource };

  } catch (err) {
    console.error(`[${fileName}] error:`, err?.message);
    return { fileName, ok: false, error: err?.message || "Extraction failed." };
  } finally {
    if (uploadedFile?.name) await deleteFile(uploadedFile.name, apiKey);
  }
}

function buildListResult(fileName, normalized, payload) {
  const items = (normalized.items || []).map(item => ({
    equipment_type:        sanitize(item.equipment_type) || "Other",
    serial_number:         sanitize(item.serial_number),
    swl:                   sanitize(item.swl),
    result:                normalizeResult(item.result) || "PASS",
    defects_found:         sanitize(item.defects_found),
    equipment_description: sanitize(item.equipment_description),
  }));
  return { fileName, ok: true, data: { items }, usage: payload?.usageMetadata || null };
}

/* ── PARALLEL BATCH PROCESSING ───────────────────────────────────────────────
   Files are processed in parallel, capped at MAX_CONCURRENT to avoid
   exhausting all Gemini keys simultaneously.
   With 5 Gemini keys: up to 5 files in flight at once.
   With 1 key: up to 2 files (second starts while first is generating).
────────────────────────────────────────────────────────────────────────────── */
async function processBatch(files, systemPrompt, mode) {
  const MAX_CONCURRENT = Math.max(2, KEY_POOL.length);
  const results = new Array(files.length);
  const queue   = files.map((f, i) => ({ file: f, idx: i }));
  const active  = new Set();

  await new Promise((resolve) => {
    function startNext() {
      while (active.size < MAX_CONCURRENT && queue.length > 0) {
        const { file, idx } = queue.shift();
        const promise = processOneFile(file, systemPrompt, mode).then(result => {
          results[idx] = result;
          active.delete(promise);
          if (queue.length > 0) startNext();
          else if (active.size === 0) resolve();
        }).catch(err => {
          results[idx] = { fileName: file.fileName, ok: false, error: err?.message || "Failed" };
          active.delete(promise);
          if (queue.length > 0) startNext();
          else if (active.size === 0) resolve();
        });
        active.add(promise);
      }
      if (active.size === 0 && queue.length === 0) resolve();
    }
    startNext();
  });

  return results;
}

/* ── ROUTE HANDLER ───────────────────────────────────────── */
export async function POST(request) {
  try {
    if (KEY_POOL.length === 0) return NextResponse.json({ error: "No GEMINI_API_KEY set." }, { status: 500 });

    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.files) || body.files.length === 0) {
      return NextResponse.json({ error: "Request must include a non-empty files array." }, { status: 400 });
    }
    if (body.files.length > 20) {
      return NextResponse.json({ error: "Batch too large. Maximum 20 files per request." }, { status: 400 });
    }

    const systemPrompt = body.systemPrompt ||
      "Extract structured JSON from the provided inspection certificate document. Return only valid JSON.";

    let mode = "document";
    if      (body.mode === "hookrope" || body.hookRopeMode === true) mode = "hookrope";
    else if (body.mode === "list"     || body.listMode     === true) mode = "list";

    console.log(`extract: ${body.files.length} file(s) | mode="${mode}" | gemini=${KEY_POOL.length} | groq=${GROQ_ENABLED} | openrouter=${OR_ENABLED}`);

    // Process all files in parallel (capped at MAX_CONCURRENT)
    const results = await processBatch(body.files, systemPrompt, mode);

    const successCount = results.filter(r => r.ok).length;
    console.log(`done: ${successCount}/${results.length} succeeded`);

    return NextResponse.json({
      results,
      model:            GEMINI_MODEL,
      groq_model:       GROQ_ENABLED  ? GROQ_MODEL : null,
      openrouter_model: OR_ENABLED    ? OR_MODEL   : null,
      processed:        results.length,
      succeeded:        successCount,
      failed:           results.length - successCount,
    });

  } catch (err) {
    console.error("extract error:", err);
    return NextResponse.json({ error: err?.message || "Unexpected server error." }, { status: 500 });
  }
}
