// src/app/api/ai/extract/route.js
import { NextResponse } from "next/server";

export const runtime     = "nodejs";
export const dynamic     = "force-dynamic";
export const maxDuration = 300;

/* ── CONFIG ──────────────────────────────────────────────── */

const OAI_KEY   = process.env.OPENAI_API_KEY || "";
const OAI_MODEL = process.env.OPENAI_MODEL   || "gpt-4o-mini";
const OAI_BASE  = "https://api.openai.com/v1";
const OAI_ON    = Boolean(OAI_KEY);

// OPTIONAL: Groq — only used as last-resort text restructure if OpenAI returns 0 fields
const GROQ_KEY   = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL   || "llama-3.3-70b-versatile";
const GROQ_BASE  = "https://api.groq.com/openai/v1";
const GROQ_ON    = Boolean(GROQ_KEY);

console.log(`OpenAI:${OAI_ON ? OAI_MODEL : "OFF — set OPENAI_API_KEY"} | Groq:${GROQ_ON ? "on (fallback)" : "off"}`);

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

/* ── PDF: UPLOAD TO OPENAI FILES API ─────────────────────────────────────────
   GPT-4o-mini vision only accepts images inline.
   PDFs must be uploaded to the Files API (purpose:"user_data") and
   referenced by file_id in the message content.
   We delete the file after extraction to keep OpenAI storage clean.
────────────────────────────────────────────────────────────────────────────── */
async function uploadPdfToOpenAI(b64, fileName) {
  const bytes = Buffer.from(b64, "base64");
  const blob  = new Blob([bytes], { type: "application/pdf" });

  const form = new FormData();
  form.append("purpose", "user_data");
  form.append("file", blob, fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);

  const res = await timed(`${OAI_BASE}/files`, {
    method:  "POST",
    headers: { "Authorization": `Bearer ${OAI_KEY}` },
    body:    form,
  }, 60000);

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(`PDF upload to OpenAI failed: ${err?.error?.message || res.status}`);
  }

  const j = await res.json();
  console.log(`PDF uploaded to OpenAI Files: ${j.id} (${fileName})`);
  return j.id; // "file-abc123..."
}

async function deletePdfFromOpenAI(fileId) {
  if (!fileId) return;
  try {
    await timed(`${OAI_BASE}/files/${fileId}`, {
      method:  "DELETE",
      headers: { "Authorization": `Bearer ${OAI_KEY}` },
    }, 15000);
    console.log(`Deleted OpenAI file: ${fileId}`);
  } catch (e) {
    console.warn(`Failed to delete OpenAI file ${fileId}:`, e.message);
  }
}

/* ── BUILD MESSAGE CONTENT ───────────────────────────────────────────────────
   Images  → inline base64 vision (detail:high)
   PDFs    → file_id reference (already uploaded)
────────────────────────────────────────────────────────────────────────────── */
function buildUserContent(userText, mime, b64, fileId) {
  if (fileId) {
    // PDF path — use file_id
    return [
      { type: "text", text: userText },
      { type: "file", file: { file_id: fileId } },
    ];
  }
  // Image path — inline base64
  const safeType = mime && mime.startsWith("image/") ? mime : "image/jpeg";
  return [
    { type: "text", text: userText },
    {
      type: "image_url",
      image_url: { url: `data:${safeType};base64,${b64}`, detail: "high" },
    },
  ];
}

/* ── OPENAI CALL ─────────────────────────────────────────────────────────────
   Handles both images (inline) and PDFs (file_id).
   Cleans up uploaded PDF file in finally block.
────────────────────────────────────────────────────────────────────────────── */
async function callOpenAI(b64, mime, sysPrompt, fileName, mode) {
  if (!OAI_ON) throw new Error("OPENAI_API_KEY is not set. Add it to Render environment variables.");

  const isPdf = mime === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

  const userText = mode === "list"
    ? `Read EVERY line. Extract each item into the items array. Return ONLY valid JSON. File: ${fileName}`
    : mode === "hookrope"
      ? `Extract all Hook & Rope inspection fields. Return ONLY valid JSON. File: ${fileName}`
      : `Extract all inspection certificate data. Return ONLY valid JSON. File: ${fileName}`;

  const schemaHint = mode === "list"
    ? `Return JSON: {"items":[{"equipment_type":"","serial_number":"","swl":"","result":"","defects_found":"","equipment_description":""}]}`
    : mode === "hookrope"
      ? `Return a flat JSON object with all hook and rope inspection fields.`
      : `Return JSON with these fields: equipment_type, equipment_description, manufacturer, model, serial_number, asset_tag, year_built, swl, working_pressure, inspection_date, expiry_date, client_name, location, inspector_name, result, defects_found, recommendations, comments, raw_text_summary.`;

  const systemContent = `${sysPrompt}\n\n${schemaHint}\nReturn ONLY valid JSON. No markdown, no explanation.`;

  // Upload PDF if needed
  let fileId = null;
  if (isPdf) {
    fileId = await uploadPdfToOpenAI(b64, fileName);
  }

  try {
    const content = buildUserContent(userText, mime, b64, fileId);

    const res = await timed(`${OAI_BASE}/chat/completions`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${OAI_KEY}`,
      },
      body: JSON.stringify({
        model:           OAI_MODEL,
        temperature:     0.1,
        max_tokens:      mode === "list" ? 16384 : 4096,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemContent },
          { role: "user",   content },
        ],
      }),
    }, 90000);

    if (res.status === 429) {
      const retryAfter = res.headers.get("retry-after");
      const wait = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
      console.warn(`[${fileName}] OpenAI 429 — waiting ${wait/1000}s and retrying once`);
      await sleep(wait);
      // Retry with same fileId (PDF already uploaded)
      const retryContent = buildUserContent(userText, mime, b64, fileId);
      const retryRes = await timed(`${OAI_BASE}/chat/completions`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OAI_KEY}` },
        body: JSON.stringify({
          model: OAI_MODEL, temperature: 0.1,
          max_tokens: mode === "list" ? 16384 : 4096,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemContent },
            { role: "user",   content: retryContent },
          ],
        }),
      }, 90000);
      if (!retryRes.ok) {
        const err = await retryRes.json().catch(() => null);
        throw new Error(err?.error?.message || `OpenAI error ${retryRes.status}`);
      }
      const rj = await retryRes.json().catch(() => null);
      if (!rj) throw new Error("OpenAI returned an empty response on retry.");
      return parseJson(rj.choices?.[0]?.message?.content || "");
    }

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || `OpenAI error ${res.status}`);
    }

    const j = await res.json().catch(() => null);
    if (!j) throw new Error("OpenAI returned an empty response.");

    const text   = j.choices?.[0]?.message?.content || "";
    const parsed = parseJson(text);
    const fields = mode === "list" ? (normList(parsed)?.items?.length || 0) : countFields(parsed);
    console.log(`[${fileName}] OpenAI ${OAI_MODEL} (${isPdf ? "pdf" : "image"}): ${fields} ${mode === "list" ? "items" : "fields"} ✓`);
    return parsed;

  } finally {
    // Always delete the uploaded PDF to keep OpenAI storage clean
    if (fileId) deletePdfFromOpenAI(fileId).catch(() => {});
  }
}

/* ── GROQ CALL (optional last-resort text restructure only) ─────────────── */
async function callGroq(sysPrompt, rawText) {
  if (!GROQ_ON || !rawText?.trim()) return null;
  try {
    const res = await timed(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization":`Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: GROQ_MODEL, temperature: 0.1, max_tokens: 8192,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user",   content: `Re-structure this extracted certificate text into the required JSON.\nReturn ONLY valid JSON.\n\nTEXT:\n${rawText}` },
        ],
      }),
    }, 60000);
    if (res.status === 429) { console.warn("Groq 429 — skipping"); return null; }
    const j = await res.json().catch(() => null);
    return j ? parseJson(j.choices?.[0]?.message?.content || "") : null;
  } catch (e) { console.warn("Groq failed:", e.message); return null; }
}

/* ── PROCESS ONE FILE ────────────────────────────────────────────────────────
   Flow:
   1. If image → send base64 inline to GPT-4o-mini vision
   2. If PDF   → upload to OpenAI Files API, reference by file_id, delete after
   3. If 0 fields AND Groq configured → Groq text restructure as last resort
────────────────────────────────────────────────────────────────────────────── */
async function processOne(fileData, sysPrompt, mode) {
  const { fileName, mimeType, base64Data } = fileData;

  try {
    const bytes = Buffer.from(base64Data, "base64");
    const mb    = bytes.byteLength / 1048576;
    if (mb > 20) return fail(fileName, `File too large (${mb.toFixed(1)} MB). Max 20 MB.`);

    let parsed;
    try {
      parsed = await callOpenAI(base64Data, mimeType, sysPrompt, fileName, mode);
    } catch (e) {
      return fail(fileName, e.message);
    }

    // ── List mode ─────────────────────────────────────────────────────────
    if (mode === "list") {
      const norm = normList(parsed);
      if (norm?.items?.length) return okList(fileName, norm);
      if (GROQ_ON && parsed) {
        const groqNorm = normList(await callGroq(sysPrompt, JSON.stringify(parsed)));
        if (groqNorm?.items?.length) return okList(fileName, groqNorm);
      }
      return fail(fileName, "AI could not extract any items. Try a higher-resolution photo.");
    }

    // ── Hook & rope mode ──────────────────────────────────────────────────
    if (mode === "hookrope") {
      if (countFields(parsed) >= 1) return okDoc(fileName, parsed, mode);
      if (GROQ_ON && parsed) {
        const groqParsed = await callGroq(sysPrompt, JSON.stringify(parsed));
        if (countFields(groqParsed) > 0) return okDoc(fileName, groqParsed, mode);
      }
      return fail(fileName, "AI extracted 0 fields. Try a clearer scan.");
    }

    // ── Document mode ─────────────────────────────────────────────────────
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

/* ── PARALLEL BATCH ──────────────────────────────────────── */
async function runBatch(files, sysPrompt, mode) {
  const results = new Array(files.length);
  const queue   = files.map((f, i) => ({ f, i }));
  const active  = new Set();

  await new Promise(resolve => {
    function next() {
      while (active.size < files.length && queue.length) {
        const { f, i } = queue.shift();
        const p = processOne(f, sysPrompt, mode)
          .then(r  => { results[i] = r; })
          .catch(e => { results[i] = fail(f.fileName, e?.message || "Failed"); })
          .finally(() => {
            active.delete(p);
            if (queue.length || active.size) next();
            else resolve();
          });
        active.add(p);
      }
      if (!active.size && !queue.length) resolve();
    }
    next();
  });

  return results;
}

/* ── ROUTE HANDLER ───────────────────────────────────────── */
export async function POST(req) {
  try {
    if (!OAI_ON)
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not set. Add it to Render → Environment → OPENAI_API_KEY." },
        { status: 500 }
      );

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.files) || !body.files.length)
      return NextResponse.json({ error: "Request must include a non-empty files array." }, { status: 400 });
    if (body.files.length > 20)
      return NextResponse.json({ error: "Batch too large. Max 20 files." }, { status: 400 });

    const sysPrompt = body.systemPrompt ||
      "Extract structured JSON from the inspection certificate. Return only valid JSON.";

    let mode = "document";
    if      (body.mode === "hookrope" || body.hookRopeMode === true) mode = "hookrope";
    else if (body.mode === "list"     || body.listMode     === true) mode = "list";

    console.log(`extract: ${body.files.length} file(s) mode=${mode} model=${OAI_MODEL}`);

    const results      = await runBatch(body.files, sysPrompt, mode);
    const successCount = results.filter(r => r.ok).length;
    console.log(`done: ${successCount}/${results.length} succeeded`);

    return NextResponse.json({
      results,
      primary_model: OAI_MODEL,
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
