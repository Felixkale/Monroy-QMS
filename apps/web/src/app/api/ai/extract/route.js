// src/app/api/ai/extract/route.js
import { NextResponse } from "next/server";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 300;

/* ── CONFIG ──────────────────────────────────────────────── */
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_BASE  = "https://generativelanguage.googleapis.com";
const MAX_RETRIES  = 3;

// Groq: text-only shot-2 fallback (30 RPM free, no cooldown needed)
const GROQ_KEY   = process.env.GROQ_API_KEY  || "";
const GROQ_MODEL = process.env.GROQ_MODEL    || "llama-3.3-70b-versatile";
const GROQ_BASE  = "https://api.groq.com/openai/v1";
const GROQ_ON    = Boolean(GROQ_KEY);

/* ── GEMINI KEY POOL ─────────────────────────────────────── */
const KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
].filter(Boolean);

if (!KEYS.length) throw new Error("No GEMINI_API_KEY set in environment variables.");

// Free tier: 10 RPM per key. 12 000 ms cooldown per key is proven safe.
const PER_KEY_MS = 12000;
const EFF_MS     = Math.max(500, Math.ceil(PER_KEY_MS / KEYS.length));
const cooldowns  = new Map(KEYS.map(k => [k, 0]));
let   ki         = 0;

console.log(`Gemini:${KEYS.length} key(s) | delay:${EFF_MS}ms | Groq:${GROQ_ON ? "on" : "off"}`);

/* ── UTILITIES ───────────────────────────────────────────── */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const san   = v  => v == null ? "" : String(v).trim();

function normalizeResult(v) {
  const n = san(v).toUpperCase().replace(/\s+/g, "_");
  if (["PASS","FAIL","CONDITIONAL","REPAIR_REQUIRED","OUT_OF_SERVICE"].includes(n)) return n;
  if (n === "REPAIR REQUIRED") return "REPAIR_REQUIRED";
  return "UNKNOWN";
}

function countFields(o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return 0;
  return Object.values(o).filter(v => v != null && String(v).trim()).length;
}

async function timed(url, opts, ms = 90000) {
  const ac = new AbortController();
  const t  = setTimeout(() => ac.abort(), ms);
  try   { return await fetch(url, { ...opts, signal: ac.signal }); }
  catch (e) { if (e.name === "AbortError") throw new Error(`Timeout after ${ms/1000}s`); throw e; }
  finally   { clearTimeout(t); }
}

function parseJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const s = text.replace(/^```json\s*/im,"").replace(/^```\s*/im,"").replace(/\s*```\s*$/im,"").trim();
  try { return JSON.parse(s); } catch {}
  const oi = s.indexOf("{"), oj = s.lastIndexOf("}");
  if (oi >= 0 && oj > oi) { try { return JSON.parse(s.slice(oi, oj+1)); } catch {} }
  const ai = s.indexOf("["), aj = s.lastIndexOf("]");
  if (ai >= 0 && aj > ai) { try { return JSON.parse(s.slice(ai, aj+1)); } catch {} }
  return null;
}

function normList(parsed) {
  if (!parsed) return null;
  if (parsed.items && Array.isArray(parsed.items)) return parsed;
  if (Array.isArray(parsed)) return { items: parsed };
  for (const k of ["certificates","equipment","results","data","list","records","entries"])
    if (Array.isArray(parsed[k])) return { items: parsed[k] };
  if (parsed.equipment_type || parsed.serial_number) return { items: [parsed] };
  for (const v of Object.values(parsed)) if (Array.isArray(v) && v.length) return { items: v };
  return null;
}

/* ── GEMINI KEY SELECTOR ─────────────────────────────────── */
async function nextGeminiKey() {
  const now = Date.now();
  // Try to find a key whose cooldown has elapsed
  for (let i = 0; i < KEYS.length; i++) {
    const k = KEYS[(ki + i) % KEYS.length];
    if ((cooldowns.get(k) || 0) <= now) {
      ki = (ki + i + 1) % KEYS.length;
      cooldowns.set(k, now + PER_KEY_MS);
      return k;
    }
  }
  // All keys on cooldown — wait for the soonest one
  const soonest = Math.min(...[...cooldowns.values()]);
  const wait    = soonest - now + 200;
  console.log(`All Gemini keys on cooldown — waiting ${wait}ms`);
  await sleep(wait);
  const k = KEYS[ki % KEYS.length];
  ki = (ki + 1) % KEYS.length;
  cooldowns.set(k, Date.now() + PER_KEY_MS);
  return k;
}

/* ── GEMINI FILE UPLOAD (resumable) ──────────────────────── */
async function uploadFile(bytes, mimeType, displayName, apiKey) {
  const startRes = await timed(
    `${GEMINI_BASE}/upload/v1beta/files?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command":  "start",
        "X-Goog-Upload-Header-Content-Length": String(bytes.byteLength),
        "X-Goog-Upload-Header-Content-Type":   mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: displayName } }),
    },
    30000
  );
  if (!startRes.ok) throw new Error(`Gemini upload start failed: ${startRes.status}`);

  const uploadUrl = startRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("No upload URL from Gemini");

  const uploadRes = await timed(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(bytes.byteLength),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: bytes,
  }, 60000);
  if (!uploadRes.ok) throw new Error(`Gemini upload failed: ${uploadRes.status}`);

  const meta = await uploadRes.json();
  const file = meta.file || meta;

  // Poll until ACTIVE
  let attempts = 0;
  while (file.state === "PROCESSING" && attempts < 20) {
    await sleep(3000);
    attempts++;
    const pollRes = await timed(
      `${GEMINI_BASE}/v1beta/${file.name}?key=${apiKey}`, {}, 15000
    );
    const polled = await pollRes.json();
    if (polled.state === "ACTIVE") return polled;
    if (polled.state === "FAILED") throw new Error("Gemini file processing failed");
  }
  if (file.state === "ACTIVE") return file;
  throw new Error("Gemini file did not become ACTIVE in time");
}

async function deleteFile(fileUri, apiKey) {
  if (!fileUri) return;
  try {
    const name = fileUri.split("/files/")[1];
    if (!name) return;
    await timed(`${GEMINI_BASE}/v1beta/files/${name}?key=${apiKey}`, { method: "DELETE" }, 15000);
  } catch (e) {
    console.warn("Gemini file delete failed:", e.message);
  }
}

/* ── GEMINI GENERATE ─────────────────────────────────────── */
async function callGemini(b64, mime, sysPrompt, fileName, mode) {
  const isPdf    = mime === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  const safeType = isPdf ? "application/pdf"
    : (mime && mime.startsWith("image/") ? mime : "image/jpeg");

  const bytes = Buffer.from(b64, "base64");
  const mb    = bytes.byteLength / 1048576;
  if (mb > 20) throw new Error(`File too large (${mb.toFixed(1)} MB). Max 20 MB.`);

  const schemaHint = mode === "list"
    ? `Return JSON: {"items":[{"equipment_type":"","serial_number":"","swl":"","result":"","defects_found":"","equipment_description":""}]}`
    : mode === "hookrope"
      ? `Return a flat JSON object with all hook and rope inspection fields.`
      : `Return JSON with these fields: equipment_type, equipment_description, manufacturer, model, serial_number, asset_tag, year_built, swl, working_pressure, inspection_date, expiry_date, client_name, location, inspector_name, result, defects_found, recommendations, comments, raw_text_summary.`;

  const userPrompt = mode === "list"
    ? `Read EVERY line. Extract each item into the items array. Return ONLY valid JSON.\n\n${schemaHint}`
    : mode === "hookrope"
      ? `Extract all Hook & Rope inspection fields. Return ONLY valid JSON.\n\n${schemaHint}`
      : `Extract all inspection certificate data. Return ONLY valid JSON.\n\n${schemaHint}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const apiKey  = await nextGeminiKey();
    let   fileUri = null;

    try {
      // Upload file to Gemini Files API
      const uploaded = await uploadFile(bytes, safeType, fileName, apiKey);
      fileUri = uploaded.uri;

      const maxTok = mode === "list" ? 16384 : 4096;

      const res = await timed(
        `${GEMINI_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: `${sysPrompt}\nReturn ONLY valid JSON. No markdown, no explanation.` }] },
            contents: [{
              role: "user",
              parts: [
                { text: userPrompt },
                { file_data: { mime_type: safeType, file_uri: fileUri } },
              ],
            }],
            generationConfig: {
              temperature:      0.1,
              maxOutputTokens:  maxTok,
              responseMimeType: "application/json",
            },
          }),
        },
        90000
      );

      if (res.status === 429) {
        console.warn(`[${fileName}] Gemini 429 (attempt ${attempt + 1}) — waiting ${EFF_MS}ms`);
        await sleep(EFF_MS);
        continue;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || `Gemini error ${res.status}`);
      }

      const j    = await res.json().catch(() => null);
      const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      const parsed = parseJson(text);
      const fields = mode === "list"
        ? (normList(parsed)?.items?.length || 0)
        : countFields(parsed);

      console.log(`[${fileName}] Gemini ${GEMINI_MODEL}: ${fields} ${mode === "list" ? "items" : "fields"} ✓`);
      return parsed;

    } catch (e) {
      console.warn(`[${fileName}] Gemini attempt ${attempt + 1} failed:`, e.message);
      if (attempt === MAX_RETRIES - 1) throw e;
      await sleep(EFF_MS);
    } finally {
      if (fileUri) deleteFile(fileUri, apiKey).catch(() => {});
    }
  }

  throw new Error("Gemini: all retries exhausted.");
}

/* ── GROQ CALL (text-only shot-2 fallback) ───────────────── */
async function callGroq(sysPrompt, rawText) {
  if (!GROQ_ON || !rawText?.trim()) return null;
  try {
    const res = await timed(`${GROQ_BASE}/chat/completions`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model:           GROQ_MODEL,
        temperature:     0.1,
        max_tokens:      8192,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sysPrompt },
          {
            role:    "user",
            content: `Re-structure this extracted certificate text into the required JSON.\nReturn ONLY valid JSON.\n\nTEXT:\n${rawText}`,
          },
        ],
      }),
    }, 60000);
    if (res.status === 429) { console.warn("Groq 429 — skipping fallback"); return null; }
    const j = await res.json().catch(() => null);
    return j ? parseJson(j.choices?.[0]?.message?.content || "") : null;
  } catch (e) {
    console.warn("Groq fallback failed:", e.message);
    return null;
  }
}

/* ── PROCESS ONE FILE ────────────────────────────────────── */
async function processOne(fileData, sysPrompt, mode) {
  const { fileName, mimeType, base64Data } = fileData;

  try {
    let parsed;
    try {
      parsed = await callGemini(base64Data, mimeType, sysPrompt, fileName, mode);
    } catch (e) {
      return fail(fileName, e.message);
    }

    // ── List mode ────────────────────────────────────────────────────────
    if (mode === "list") {
      const norm = normList(parsed);
      if (norm?.items?.length) return okList(fileName, norm);
      if (GROQ_ON && parsed) {
        const groqNorm = normList(await callGroq(sysPrompt, JSON.stringify(parsed)));
        if (groqNorm?.items?.length) return okList(fileName, groqNorm);
      }
      return fail(fileName, "AI could not extract any items. Try a higher-resolution scan.");
    }

    // ── Hook & rope mode ─────────────────────────────────────────────────
    if (mode === "hookrope") {
      if (countFields(parsed) >= 1) return okDoc(fileName, parsed, mode);
      if (GROQ_ON && parsed) {
        const groqParsed = await callGroq(sysPrompt, JSON.stringify(parsed));
        if (countFields(groqParsed) > 0) return okDoc(fileName, groqParsed, mode);
      }
      return fail(fileName, "AI extracted 0 fields. Try a clearer scan.");
    }

    // ── Document mode ────────────────────────────────────────────────────
    if (countFields(parsed) >= 1) return okDoc(fileName, parsed, mode);

    if (GROQ_ON && parsed) {
      const groqParsed = await callGroq(sysPrompt, JSON.stringify(parsed));
      if (countFields(groqParsed) >= 1) return okDoc(fileName, groqParsed, mode);
    }

    // Still 0 fields — return empty doc so the UI card still renders
    return okDoc(fileName, parsed || {}, mode);

  } catch (e) {
    console.error(`[${fileName}] error:`, e.message);
    return fail(fileName, e.message || "Extraction failed.");
  }
}

/* ── RESULT BUILDERS ─────────────────────────────────────── */
function fail(fileName, error) { return { fileName, ok: false, error }; }

function okList(fileName, norm) {
  return {
    fileName, ok: true,
    data: {
      items: (norm.items || []).map(it => ({
        equipment_type:        san(it.equipment_type) || "Other",
        serial_number:         san(it.serial_number),
        swl:                   san(it.swl),
        result:                normalizeResult(it.result) || "PASS",
        defects_found:         san(it.defects_found),
        equipment_description: san(it.equipment_description),
      })),
    },
  };
}

function okDoc(fileName, parsed, mode) {
  const data = {};
  for (const [k, v] of Object.entries(parsed || {})) data[k] = san(v);
  if (mode !== "hookrope") data.result = normalizeResult(data.result);
  return { fileName, ok: true, data };
}

/* ── SEQUENTIAL BATCH (respects key cooldowns) ───────────── */
async function runBatch(files, sysPrompt, mode) {
  const results = [];
  for (const f of files) {
    const r = await processOne(f, sysPrompt, mode).catch(e => fail(f.fileName, e?.message || "Failed"));
    results.push(r);
    // Small breathing room between files to stay inside free tier RPM
    if (files.length > 1) await sleep(EFF_MS);
  }
  return results;
}

/* ── ROUTE HANDLER ───────────────────────────────────────── */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.files) || !body.files.length)
      return NextResponse.json({ error: "Request must include a non-empty files array." }, { status: 400 });
    if (body.files.length > 20)
      return NextResponse.json({ error: "Batch too large. Max 20 files per request." }, { status: 400 });

    const sysPrompt = body.systemPrompt ||
      "Extract structured JSON from the inspection certificate. Return only valid JSON.";

    let mode = "document";
    if      (body.mode === "hookrope" || body.hookRopeMode === true) mode = "hookrope";
    else if (body.mode === "list"     || body.listMode     === true) mode = "list";

    console.log(`extract: ${body.files.length} file(s) mode=${mode} model=${GEMINI_MODEL} keys=${KEYS.length}`);

    const results      = await runBatch(body.files, sysPrompt, mode);
    const successCount = results.filter(r => r.ok).length;
    console.log(`done: ${successCount}/${results.length} succeeded`);

    return NextResponse.json({
      results,
      primary_model: GEMINI_MODEL,
      groq_model:    GROQ_ON ? GROQ_MODEL : null,
      processed:     results.length,
      succeeded:     successCount,
      failed:        results.length - successCount,
    });

  } catch (e) {
    console.error("extract error:", e);
    return NextResponse.json({ error: e?.message || "Unexpected server error." }, { status: 500 });
  }
}
