// src/app/api/ai/extract/route.js
import { NextResponse } from "next/server";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const GEMINI_MODEL   = "gemini-2.5-flash";
const FILE_API_BASE  = "https://generativelanguage.googleapis.com";
const MAX_RETRIES    = 5;

// ── GROQ — PRIMARY for text PDFs (instant, 30 RPM free) ──────────────────────
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL   = process.env.GROQ_MODEL   || "llama-3.3-70b-versatile";
const GROQ_BASE    = "https://api.groq.com/openai/v1";
const GROQ_ENABLED = Boolean(GROQ_API_KEY);

// ── OPENROUTER — parallel vision for image/scanned PDFs ──────────────────────
const OR_API_KEY  = process.env.OPENROUTER_API_KEY || "";
const OR_MODEL    = process.env.OPENROUTER_MODEL   || "meta-llama/llama-4-maverick:free";
const OR_BASE     = "https://openrouter.ai/api/v1";
const OR_ENABLED  = Boolean(OR_API_KEY);

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

console.log(`Gemini: ${KEY_POOL.length} key(s) | Groq: ${GROQ_ENABLED ? GROQ_MODEL : "off"} | OR: ${OR_ENABLED ? OR_MODEL : "off"}`);

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
  if (wait > 0) await sleep(wait);
  keyCooldowns.set(soonestKey, Date.now() + PER_KEY_DELAY_MS);
  return soonestKey;
}

function penalizeKey(key, extraMs = 60000) {
  const current = keyCooldowns.get(key) || Date.now();
  keyCooldowns.set(key, Math.max(current, Date.now() + extraMs));
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

function tryParseJson(text) {
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

function extractJsonFromPayload(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  const text = parts.map(p => (typeof p?.text === "string" ? p.text : "")).join("").trim();
  return tryParseJson(text);
}

function extractJsonFromChat(json) {
  const text = json?.choices?.[0]?.message?.content || "";
  return tryParseJson(text);
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

/* ── PDF TEXT EXTRACTION ─────────────────────────────────────────────────────
   Extracts raw text from PDF bytes using pdf-parse (server-side, no AI).
   Returns empty string if PDF is image-only/scanned.
   This is the key improvement — text PDFs can skip Gemini entirely.
────────────────────────────────────────────────────────────────────────────── */
async function extractPdfText(bytes) {
  try {
    const data = await pdfParse(bytes, { max: 0 });
    const text = (data?.text || "").trim();
    // Need at least 50 chars of real content to be useful
    return text.length >= 50 ? text : "";
  } catch (err) {
    console.warn("pdf-parse failed:", err.message);
    return "";
  }
}

/* ── BUILD GROQ PROMPT ───────────────────────────────────── */
function buildGroqPrompt(rawText, systemPrompt, mode) {
  const modeHint = mode === "list"
    ? "Extract every equipment line item. Return a JSON object with key 'items' (array). Each item: equipment_type, serial_number, swl, result, defects_found, equipment_description."
    : mode === "hookrope"
      ? "Extract all Hook & Rope inspection fields. Return a flat JSON object with all fields."
      : "Extract all inspection certificate fields. Return a flat JSON object.";

  return `You are a document parser for industrial inspection certificates.
${modeHint}
Return ONLY valid JSON. No markdown, no explanation, no extra text.

DOCUMENT TEXT:
${rawText}`;
}

/* ── GROQ CALL (text → JSON) ─────────────────────────────────────────────────
   Primary provider for text-based PDFs. Near-instant, 30 RPM free.
────────────────────────────────────────────────────────────────────────────── */
async function callGroq(systemPrompt, userText, retries = 2) {
  if (!GROQ_ENABLED) return null;
  for (let attempt = 0; attempt <= retries; attempt++) {
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
      if (res.status === 429) {
        console.warn(`Groq 429 attempt ${attempt + 1}. Waiting 5s…`);
        if (attempt < retries) { await sleep(5000); continue; }
        return null;
      }
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) { console.warn(`Groq error ${res.status}`); return null; }
      return extractJsonFromChat(json);
    } catch (err) {
      console.warn(`Groq attempt ${attempt + 1} failed:`, err.message);
      if (attempt < retries) await sleep(3000);
    }
  }
  return null;
}

/* ── OPENROUTER VISION CALL ──────────────────────────────────────────────────
   Used for scanned/image PDFs where pdf-parse returns empty text.
   Sends base64 image — no file upload, no Gemini cooldown.
────────────────────────────────────────────────────────────────────────────── */
async function callOpenRouter(base64Data, mimeType, systemPrompt, fileName, mode) {
  if (!OR_ENABLED) return null;

  const userText = mode === "list"
    ? `Read EVERY line of this list. Extract each item into the items array. Return ONLY valid JSON. File: ${fileName}`
    : mode === "hookrope"
      ? `Extract all Hook & Rope inspection data. Return ONLY a valid JSON object. File: ${fileName}`
      : `Extract all inspection certificate data from this document. Return ONLY a valid JSON object. File: ${fileName}`;

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
        body: JSON.stringify({
          model: OR_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userText },
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 8192,
          // No response_format — not all free models support it
        }),
      },
      90000
    );

    if (res.status === 429) { console.warn(`[${fileName}] OpenRouter 429.`); return null; }
    if (!res.ok) { console.warn(`[${fileName}] OpenRouter error ${res.status}`); return null; }
    const json = await res.json().catch(() => null);
    if (!json) return null;
    const parsed = extractJsonFromChat(json);
    console.log(`[${fileName}] OpenRouter: ${countDocFields(parsed)} fields`);
    return parsed;
  } catch (err) {
    console.warn(`[${fileName}] OpenRouter failed:`, err.message);
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

/* ── GEMINI VISION CALL ──────────────────────────────────── */
async function callGeminiVision(uploadedFile, fileName, systemPrompt, apiKey, mode) {
  let responseSchema = null;
  if (mode === "list")          responseSchema = LIST_RESPONSE_SCHEMA;
  else if (mode === "hookrope") responseSchema = HOOK_ROPE_SCHEMA;
  else                          responseSchema = RESPONSE_SCHEMA;

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{
      role: "user",
      parts: [
        {
          text: mode === "list"
            ? `Read EVERY line. Extract each item into the items array. File: ${fileName}`
            : mode === "hookrope"
              ? `Extract all Hook & Rope inspection data. File: ${fileName}`
              : `Extract all inspection certificate data. File: ${fileName}`,
        },
        { file_data: { mime_type: uploadedFile.mimeType, file_uri: uploadedFile.uri } },
      ],
    }],
    generationConfig: {
      temperature: 0.1, topP: 0.95,
      maxOutputTokens: mode === "list" ? 16384 : 8192,
      responseMimeType: "application/json",
      responseSchema,
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
      if (attempt < MAX_RETRIES - 1) { await sleep(5000 * Math.pow(2, attempt)); continue; }
      throw fetchErr;
    }

    if (res.status === 429) {
      penalizeKey(apiKey, 60000 * (attempt + 1));
      await sleep(Math.max(parseInt(res.headers.get("retry-after")||"0")*1000, EFFECTIVE_DELAY_MS * Math.pow(2, attempt)));
      const freshKey = await nextKey();
      if (freshKey !== apiKey) return callGeminiVision(uploadedFile, fileName, systemPrompt, freshKey, mode);
      continue;
    }
    if (res.status === 503 || res.status === 500) {
      if (attempt < MAX_RETRIES - 1) { await sleep(15000 * Math.pow(2, attempt)); continue; }
    }

    const json = await res.json().catch(() => null);
    if (!res.ok || !json) throw new Error(json?.error?.message || `Gemini error ${res.status}`);

    const fr = json?.candidates?.[0]?.finishReason;
    if (fr === "SAFETY" || fr === "RECITATION") throw new Error(`Gemini blocked: ${fr}`);

    const textCheck = (json?.candidates?.[0]?.content?.parts||[]).map(p=>p?.text||"").join("").toLowerCase();
    if (textCheck.includes("experiencing high demand") && attempt < MAX_RETRIES - 1) {
      await sleep(20000 * (attempt + 1)); continue;
    }

    return json;
  }
  throw new Error("Gemini overloaded after all retries.");
}

/* ── PROCESS ONE FILE ────────────────────────────────────────────────────────

   DECISION TREE:
   ┌─ Is it a PDF?
   │  ├─ YES → extract text with pdf-parse
   │  │   ├─ text found (≥50 chars) → TEXT PATH
   │  │   │     Groq (primary, instant) → if weak → Gemini vision fallback
   │  │   └─ no text (scanned PDF) → VISION PATH
   │  │         Gemini + OpenRouter in parallel → if both weak → Groq on whatever text exists
   │  └─ NO (image file) → VISION PATH
   │        Gemini + OpenRouter in parallel → if both weak → Groq
   │
   └─ LIST MODE: always Gemini vision (best handwriting OCR) → Groq fallback

────────────────────────────────────────────────────────────────────────────── */
async function processOneFile(fileData, systemPrompt, mode = "document") {
  const { fileName, mimeType, base64Data } = fileData;
  let uploadedFile = null;
  const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

  try {
    const bytes = Buffer.from(base64Data, "base64");
    const sizeMB = bytes.byteLength / (1024 * 1024);
    if (sizeMB > 20) return { fileName, ok: false, error: `File too large (${sizeMB.toFixed(1)}MB). Max 20MB.` };

    // ── LIST MODE — always Gemini vision (best for handwriting) ──────────────
    if (mode === "list") {
      const apiKey = await nextKey();
      uploadedFile = await uploadFile(bytes, mimeType, fileName, apiKey);
      const json1 = await callGeminiVision(uploadedFile, fileName, systemPrompt, apiKey, "list");
      const norm1 = normalizeListResult(extractJsonFromPayload(json1));

      if (norm1 && norm1.items.length > 0) {
        console.log(`[${fileName}] list Gemini: ${norm1.items.length} items ✓`);
        return buildListResult(fileName, norm1);
      }

      if (GROQ_ENABLED) {
        // Send whatever text Gemini extracted to Groq
        const rawText = (json1?.candidates?.[0]?.content?.parts||[]).map(p=>p?.text||"").join("").trim();
        if (rawText) {
          const groqParsed = await callGroq(systemPrompt, buildGroqPrompt(rawText, systemPrompt, "list"));
          const groqNorm = normalizeListResult(groqParsed);
          if (groqNorm && groqNorm.items.length > 0) {
            console.log(`[${fileName}] list Groq: ${groqNorm.items.length} items ✓`);
            return buildListResult(fileName, groqNorm);
          }
        }
      }

      return { fileName, ok: false, error: "No items extracted. Try a higher-resolution photo." };
    }

    // ── TEXT PATH — PDF with extractable text ────────────────────────────────
    if (isPdf) {
      const pdfText = await extractPdfText(bytes);

      if (pdfText) {
        console.log(`[${fileName}] text PDF (${pdfText.length} chars) → Groq primary`);
        const groqPrompt = buildGroqPrompt(pdfText, systemPrompt, mode);

        // Groq is primary — fast and reliable on clean text
        const groqParsed = await callGroq(systemPrompt, groqPrompt);
        const groqFields = countDocFields(groqParsed);
        console.log(`[${fileName}] Groq text: ${groqFields} fields`);

        if (groqFields >= 4) {
          return buildDocResult(fileName, groqParsed, "groq", mode);
        }

        // Groq weak — add Gemini vision as fallback
        console.log(`[${fileName}] Groq weak (${groqFields}) → Gemini vision fallback…`);
        const apiKey = await nextKey();
        uploadedFile = await uploadFile(bytes, mimeType, fileName, apiKey);
        const gemJson = await callGeminiVision(uploadedFile, fileName, systemPrompt, apiKey, mode);
        const gemParsed = extractJsonFromPayload(gemJson);
        const gemFields = countDocFields(gemParsed);
        console.log(`[${fileName}] Gemini vision: ${gemFields} fields`);

        const bestParsed = gemFields >= groqFields ? gemParsed : groqParsed;
        const bestSource = gemFields >= groqFields ? "gemini" : "groq";
        console.log(`[${fileName}] winner: ${bestSource} (${countDocFields(bestParsed)} fields)`);

        if (countDocFields(bestParsed) < 1) {
          return { fileName, ok: false, error: "Could not extract data. Check the PDF is not encrypted." };
        }
        return buildDocResult(fileName, bestParsed, bestSource, mode);
      }
    }

    // ── VISION PATH — scanned PDF or image file ───────────────────────────────
    console.log(`[${fileName}] vision path (scanned/image) → Gemini + OpenRouter parallel`);
    const apiKey = await nextKey();

    const [geminiResult, orResult] = await Promise.allSettled([
      (async () => {
        uploadedFile = await uploadFile(bytes, mimeType, fileName, apiKey);
        const json = await callGeminiVision(uploadedFile, fileName, systemPrompt, apiKey, mode);
        return { json, parsed: extractJsonFromPayload(json) };
      })(),
      OR_ENABLED
        ? callOpenRouter(base64Data, mimeType, systemPrompt, fileName, mode).catch(() => null)
        : Promise.resolve(null),
    ]);

    const gemParsed = geminiResult.status === "fulfilled" ? geminiResult.value?.parsed : null;
    const orParsed  = orResult.status  === "fulfilled" ? orResult.value  : null;
    const gemFields = countDocFields(gemParsed);
    const orFields  = countDocFields(orParsed);

    console.log(`[${fileName}] Gemini=${gemFields} | OpenRouter=${orFields}`);

    let bestParsed = null;
    let bestSource = "none";

    if (gemFields >= orFields && gemFields >= 1) { bestParsed = gemParsed; bestSource = "gemini"; }
    else if (orFields > gemFields && orFields >= 1) { bestParsed = orParsed; bestSource = "openrouter"; }

    // Groq text fallback — use whatever Gemini extracted as raw text
    if (countDocFields(bestParsed) < 2 && GROQ_ENABLED) {
      const gemJson = geminiResult.status === "fulfilled" ? geminiResult.value?.json : null;
      const rawText = (gemJson?.candidates?.[0]?.content?.parts||[]).map(p=>p?.text||"").join("").trim();
      if (rawText) {
        console.log(`[${fileName}] vision weak → Groq on extracted text…`);
        const groqParsed = await callGroq(systemPrompt, buildGroqPrompt(rawText, systemPrompt, mode));
        const groqFields = countDocFields(groqParsed);
        if (groqFields > countDocFields(bestParsed)) {
          bestParsed = groqParsed; bestSource = "groq";
        }
      }
    }

    console.log(`[${fileName}] winner: ${bestSource} (${countDocFields(bestParsed)} fields)`);

    if (countDocFields(bestParsed) < 1) {
      return { fileName, ok: false, error: "Could not extract data from this file. Try a higher-resolution scan." };
    }

    return buildDocResult(fileName, bestParsed, bestSource, mode);

  } catch (err) {
    console.error(`[${fileName}] error:`, err?.message);
    return { fileName, ok: false, error: err?.message || "Extraction failed." };
  } finally {
    if (uploadedFile?.name) {
      const apiKey = await nextKey().catch(() => KEY_POOL[0]);
      await deleteFile(uploadedFile.name, apiKey);
    }
  }
}

function buildListResult(fileName, normalized) {
  return {
    fileName, ok: true,
    data: {
      items: (normalized.items || []).map(item => ({
        equipment_type:        sanitize(item.equipment_type) || "Other",
        serial_number:         sanitize(item.serial_number),
        swl:                   sanitize(item.swl),
        result:                normalizeResult(item.result) || "PASS",
        defects_found:         sanitize(item.defects_found),
        equipment_description: sanitize(item.equipment_description),
      })),
    },
  };
}

function buildDocResult(fileName, parsed, source, mode) {
  if (mode === "hookrope") {
    const data = {};
    for (const [k, v] of Object.entries(parsed)) data[k] = sanitize(v);
    return { fileName, ok: true, data, source };
  }
  const data = {};
  for (const [k, v] of Object.entries(parsed)) data[k] = sanitize(v);
  data.result = normalizeResult(data.result);
  return { fileName, ok: true, data, source };
}

/* ── PARALLEL BATCH ──────────────────────────────────────── */
async function processBatch(files, systemPrompt, mode) {
  const MAX_CONCURRENT = Math.max(2, KEY_POOL.length);
  const results = new Array(files.length);
  const queue   = files.map((f, i) => ({ file: f, idx: i }));
  const active  = new Set();

  await new Promise((resolve) => {
    function startNext() {
      while (active.size < MAX_CONCURRENT && queue.length > 0) {
        const { file, idx } = queue.shift();
        const p = processOneFile(file, systemPrompt, mode)
          .then(r  => { results[idx] = r; })
          .catch(e => { results[idx] = { fileName: file.fileName, ok: false, error: e?.message || "Failed" }; })
          .finally(() => {
            active.delete(p);
            if (queue.length > 0) startNext();
            else if (active.size === 0) resolve();
          });
        active.add(p);
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

    console.log(`extract: ${body.files.length} file(s) | mode="${mode}" | gemini=${KEY_POOL.length} | groq=${GROQ_ENABLED} | or=${OR_ENABLED}`);

    const results = await processBatch(body.files, systemPrompt, mode);
    const successCount = results.filter(r => r.ok).length;
    console.log(`done: ${successCount}/${results.length} succeeded`);

    return NextResponse.json({
      results,
      model:            GEMINI_MODEL,
      groq_model:       GROQ_ENABLED ? GROQ_MODEL : null,
      openrouter_model: OR_ENABLED   ? OR_MODEL   : null,
      processed:        results.length,
      succeeded:        successCount,
      failed:           results.length - successCount,
    });

  } catch (err) {
    console.error("extract error:", err);
    return NextResponse.json({ error: err?.message || "Unexpected server error." }, { status: 500 });
  }
}
