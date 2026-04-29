// src/app/api/ai/extract/route.js
import { NextResponse } from "next/server";

export const runtime  = "nodejs";
export const dynamic  = "force-dynamic";
export const maxDuration = 300;

/* ── CONFIG ──────────────────────────────────────────────── */
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_BASE  = "https://generativelanguage.googleapis.com";
const MAX_RETRIES  = 5;

// Groq: text-only shot-2 fallback. Instant, no cooldown, 30 RPM free.
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

if (!KEYS.length) throw new Error("No GEMINI_API_KEY set.");

// 10 RPM limit → 10s cooldown gives real headroom against 429s
const PER_KEY_MS = 10000;
const EFF_MS     = Math.max(500, Math.ceil(PER_KEY_MS / KEYS.length));
const cooldowns  = new Map(KEYS.map(k => [k, 0]));
let   ki         = 0;

console.log(`Gemini:${KEYS.length} keys | Groq:${GROQ_ON ? "on" : "off"} | delay:${EFF_MS}ms`);

async function nextKey() {
  const now = Date.now();
  for (let i = 0; i < KEYS.length; i++) {
    const idx = (ki + i) % KEYS.length;
    const key = KEYS[idx];
    if ((cooldowns.get(key) || 0) <= now) {
      ki = (idx + 1) % KEYS.length;
      cooldowns.set(key, now + PER_KEY_MS);
      return key;
    }
  }
  // All on cooldown — wait for soonest
  let sk = KEYS[0], st = cooldowns.get(KEYS[0]) || 0;
  for (const k of KEYS) { const t = cooldowns.get(k) || 0; if (t < st) { st = t; sk = k; } }
  const wait = st - now;
  if (wait > 0) { console.log(`All keys cooldown. Waiting ${Math.round(wait / 1000)}s…`); await sleep(wait); }
  cooldowns.set(sk, Date.now() + PER_KEY_MS);
  return sk;
}

function penalize(key, ms = 60000) {
  cooldowns.set(key, Math.max(cooldowns.get(key) || Date.now(), Date.now() + ms));
}

/* ── SCHEMAS ─────────────────────────────────────────────── */
const DOC_SCHEMA = {
  type: "object",
  properties: {
    equipment_type:{type:"string"},      equipment_description:{type:"string"},
    manufacturer:{type:"string"},        model:{type:"string"},
    serial_number:{type:"string"},       asset_tag:{type:"string"},
    year_built:{type:"string"},          capacity_volume:{type:"string"},
    swl:{type:"string"},                 working_pressure:{type:"string"},
    design_pressure:{type:"string"},     test_pressure:{type:"string"},
    pressure_unit:{type:"string"},       material:{type:"string"},
    standard_code:{type:"string"},       inspection_number:{type:"string"},
    client_name:{type:"string"},         location:{type:"string"},
    inspection_date:{type:"string"},     expiry_date:{type:"string"},
    next_inspection_due:{type:"string"}, inspector_name:{type:"string"},
    inspection_body:{type:"string"},     result:{type:"string"},
    defects_found:{type:"string"},       recommendations:{type:"string"},
    comments:{type:"string"},            nameplate_data:{type:"string"},
    raw_text_summary:{type:"string"},
  },
  required: ["equipment_type", "result"],
};

const LIST_ITEM_SCHEMA = {
  type: "object",
  properties: {
    equipment_type:{type:"string"},      serial_number:{type:"string"},
    swl:{type:"string"},                 result:{type:"string"},
    defects_found:{type:"string"},       equipment_description:{type:"string"},
  },
  required: ["equipment_type"],
};

const LIST_SCHEMA = {
  type: "object",
  properties: { items: { type: "array", items: LIST_ITEM_SCHEMA } },
  required: ["items"],
};

const HR_SCHEMA = {
  type: "object",
  properties: {
    client_name:{type:"string"},         location:{type:"string"},
    crane_make:{type:"string"},          crane_serial:{type:"string"},
    crane_fleet:{type:"string"},         crane_swl:{type:"string"},
    machine_hours:{type:"string"},       inspection_date:{type:"string"},
    expiry_date:{type:"string"},         report_number:{type:"string"},
    drum_main_condition:{type:"string"}, drum_aux_condition:{type:"string"},
    rope_lay_main:{type:"string"},       rope_lay_aux:{type:"string"},
    rope_diameter_main:{type:"string"},  rope_diameter_aux:{type:"string"},
    rope_length_3x_main:{type:"string"}, rope_length_3x_aux:{type:"string"},
    reduction_dia_main:{type:"string"},  reduction_dia_aux:{type:"string"},
    core_protrusion_main:{type:"string"},core_protrusion_aux:{type:"string"},
    corrosion_main:{type:"string"},      corrosion_aux:{type:"string"},
    broken_wires_main:{type:"string"},   broken_wires_aux:{type:"string"},
    rope_kinks_main:{type:"string"},     rope_kinks_aux:{type:"string"},
    other_defects_main:{type:"string"},  other_defects_aux:{type:"string"},
    end_fittings_main:{type:"string"},   end_fittings_aux:{type:"string"},
    serviceability_main:{type:"string"}, serviceability_aux:{type:"string"},
    lower_limit_main:{type:"string"},    lower_limit_aux:{type:"string"},
    damaged_strands_main:{type:"string"},damaged_strands_aux:{type:"string"},
    hook1_sn:{type:"string"},            hook1_swl:{type:"string"},
    hook1_swl_marked:{type:"string"},    hook1_safety_catch:{type:"string"},
    hook1_cracks:{type:"string"},        hook1_swivel:{type:"string"},
    hook1_corrosion:{type:"string"},     hook1_side_bending:{type:"string"},
    hook1_ab:{type:"string"},            hook1_ac:{type:"string"},
    hook2_sn:{type:"string"},            hook2_swl:{type:"string"},
    hook2_swl_marked:{type:"string"},    hook2_safety_catch:{type:"string"},
    hook2_cracks:{type:"string"},        hook2_swivel:{type:"string"},
    hook2_corrosion:{type:"string"},     hook2_side_bending:{type:"string"},
    hook2_ab:{type:"string"},            hook2_ac:{type:"string"},
    hook3_sn:{type:"string"},            hook3_swl:{type:"string"},
    overall_result:{type:"string"},      defects_found:{type:"string"},
    comments:{type:"string"},
  },
  required: ["client_name", "overall_result"],
};

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

function geminiText(payload) {
  return (payload?.candidates?.[0]?.content?.parts || [])
    .map(p => typeof p?.text === "string" ? p.text : "").join("").trim();
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

/* ── GROQ (text → JSON, instant, no cooldown) ────────────── */
async function groqCall(sysPrompt, rawText) {
  if (!GROQ_ON || !rawText?.trim()) return null;
  try {
    const res = await timed(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization":`Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.1,
        max_tokens: 8192,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user",   content: `Re-structure this extracted text into the required JSON.\nReturn ONLY valid JSON.\n\nTEXT:\n${rawText}` },
        ],
      }),
    }, 60000);
    if (res.status === 429) { console.warn("Groq 429 — skipping"); return null; }
    const j = await res.json().catch(() => null);
    return j ? parseJson(j.choices?.[0]?.message?.content || "") : null;
  } catch (e) { console.warn("Groq failed:", e.message); return null; }
}

/* ── GEMINI FILE UPLOAD ──────────────────────────────────── */
async function uploadFile(bytes, mime, name, key) {
  const r1 = await timed(`${GEMINI_BASE}/upload/v1beta/files?key=${key}`, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command":  "start",
      "X-Goog-Upload-Header-Content-Length": String(bytes.byteLength),
      "X-Goog-Upload-Header-Content-Type":   mime,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: name } }),
  }, 30000);
  if (!r1.ok) throw new Error(`Upload start ${r1.status}`);

  const uploadUrl = r1.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("No upload URL");

  const r2 = await timed(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(bytes.byteLength),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: bytes,
  }, 60000);

  const j2 = await r2.json().catch(() => null);
  if (!r2.ok || !j2?.file) throw new Error(j2?.error?.message || `Upload ${r2.status}`);

  let file = j2.file;
  for (let i = 0; i < 20; i++) {
    const s = file?.state || "";
    if (s === "ACTIVE" || s === "FILE_STATE_ACTIVE") return file;
    if (s === "FAILED" || s === "FILE_STATE_FAILED")  throw new Error("File processing failed");
    await sleep(1500);
    const rp = await timed(`${GEMINI_BASE}/v1beta/${file.name}?key=${key}`, {}, 15000);
    file = await rp.json().catch(() => file);
  }
  throw new Error("File never became ACTIVE");
}

async function deleteFile(name, key) {
  if (!name) return;
  try { await timed(`${GEMINI_BASE}/v1beta/${name}?key=${key}`, { method: "DELETE" }, 10000); } catch {}
}

/* ── GEMINI GENERATE ─────────────────────────────────────── */
async function geminiGen(uf, fileName, sysPrompt, key, mode) {
  const schema  = mode === "list" ? LIST_SCHEMA : mode === "hookrope" ? HR_SCHEMA : DOC_SCHEMA;
  const userMsg = mode === "list"
    ? `Read EVERY line carefully. Extract each item into the items array. File: ${fileName}`
    : mode === "hookrope"
      ? `Extract all Hook & Rope inspection data. File: ${fileName}`
      : `Extract all inspection certificate data. File: ${fileName}`;

  const body = {
    system_instruction: { parts: [{ text: sysPrompt }] },
    contents: [{ role: "user", parts: [
      { text: userMsg },
      { file_data: { mime_type: uf.mimeType, file_uri: uf.uri } },
    ]}],
    generationConfig: {
      temperature: 0.1,
      topP: 0.95,
      maxOutputTokens: mode === "list" ? 16384 : 8192,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let res;
    try {
      res = await timed(
        `${GEMINI_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
        120000
      );
    } catch (e) {
      if (attempt < MAX_RETRIES - 1) { await sleep(5000 * 2 ** attempt); continue; }
      throw e;
    }

    if (res.status === 429) {
      penalize(key, 60000 * (attempt + 1));
      const ra = parseInt(res.headers.get("retry-after") || "0") * 1000;
      await sleep(Math.max(ra, EFF_MS * 2 ** attempt));
      const nk = await nextKey();
      if (nk !== key) return geminiGen(uf, fileName, sysPrompt, nk, mode);
      continue;
    }
    if ((res.status === 500 || res.status === 503) && attempt < MAX_RETRIES - 1) {
      await sleep(15000 * 2 ** attempt); continue;
    }

    const j = await res.json().catch(() => null);
    if (!res.ok || !j) throw new Error(j?.error?.message || `Gemini ${res.status}`);

    const fr = j?.candidates?.[0]?.finishReason;
    if (fr === "SAFETY" || fr === "RECITATION") throw new Error(`Gemini blocked: ${fr}`);

    const txt = geminiText(j).toLowerCase();
    if ((txt.includes("high demand") || txt.includes("try again")) && attempt < MAX_RETRIES - 1) {
      await sleep(20000 * (attempt + 1)); continue;
    }

    return j;
  }
  throw new Error("Gemini overloaded after all retries.");
}

/* ── PROCESS ONE FILE ────────────────────────────────────────────────────
   Strategy:
   Shot 1 — Gemini vision with schema (reliable structured output)
   Shot 2 — Groq on Gemini's raw text (instant, no key cooldown)
             Only fires if shot 1 returns < 2 fields.
             For list: fires if shot 1 returns 0 items.
──────────────────────────────────────────────────────────────────────── */
async function processOne(fileData, sysPrompt, mode) {
  const { fileName, mimeType, base64Data } = fileData;
  let uf = null;

  try {
    const bytes = Buffer.from(base64Data, "base64");
    const mb    = bytes.byteLength / 1048576;
    if (mb > 20) return fail(fileName, `File too large (${mb.toFixed(1)}MB). Max 20MB.`);

    const key = await nextKey();
    console.log(`[${fileName}] uploading ${mb.toFixed(2)}MB mode=${mode}`);
    uf = await uploadFile(bytes, mimeType, fileName, key);

    const gj  = await geminiGen(uf, fileName, sysPrompt, key, mode);
    const raw = geminiText(gj);
    const gp  = parseJson(raw);

    // ── LIST ──────────────────────────────────────────────
    if (mode === "list") {
      const norm = normList(gp);
      if (norm?.items?.length) {
        console.log(`[${fileName}] Gemini list: ${norm.items.length} items ✓`);
        return okList(fileName, norm);
      }
      // Groq fallback — send Gemini's raw text
      if (GROQ_ON && raw) {
        console.log(`[${fileName}] Gemini 0 items → Groq fallback`);
        const qp = await groqCall(sysPrompt, raw);
        const qn = normList(qp);
        if (qn?.items?.length) {
          console.log(`[${fileName}] Groq list: ${qn.items.length} items ✓`);
          return okList(fileName, qn);
        }
      }
      return fail(fileName, "No items extracted. Try a higher-resolution photo.");
    }

    // ── HOOKROPE ──────────────────────────────────────────
    if (mode === "hookrope") {
      const gf = countFields(gp);
      if (gf >= 3) { console.log(`[${fileName}] Gemini hookrope: ${gf} fields ✓`); return okDoc(fileName, gp, mode); }
      if (GROQ_ON && raw) {
        const qp = await groqCall(sysPrompt, raw);
        const qf = countFields(qp);
        if (qf > gf) { console.log(`[${fileName}] Groq hookrope: ${qf} fields ✓`); return okDoc(fileName, qp, mode); }
      }
      return gf >= 1 ? okDoc(fileName, gp, mode) : fail(fileName, "AI extracted 0 fields. Try a clearer scan.");
    }

    // ── DOCUMENT ──────────────────────────────────────────
    const gf = countFields(gp);
    if (gf >= 4) {
      console.log(`[${fileName}] Gemini doc: ${gf} fields ✓`);
      return okDoc(fileName, gp, mode);
    }
    // Shot 2: Groq on Gemini's raw text — no key cooldown, instant
    if (GROQ_ON && raw) {
      console.log(`[${fileName}] Gemini weak (${gf}) → Groq shot-2`);
      const qp = await groqCall(sysPrompt, raw);
      const qf = countFields(qp);
      console.log(`[${fileName}] Groq: ${qf} fields`);
      if (qf > gf) return okDoc(fileName, qp, mode);
    }
    // Accept Gemini result if it has anything
    if (gf >= 1) return okDoc(fileName, gp, mode);

    return fail(fileName, "AI extracted 0 usable fields. Try a clearer scan or text-based PDF.");

  } catch (e) {
    console.error(`[${fileName}] error:`, e.message);
    return fail(fileName, e.message || "Extraction failed.");
  } finally {
    if (uf?.name) deleteFile(uf.name, KEYS[0]).catch(() => {});
  }
}

/* ── RESULT BUILDERS ─────────────────────────────────────── */
function fail(fileName, error) {
  return { fileName, ok: false, error };
}

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
  const MAX_C   = Math.max(2, KEYS.length);
  const results = new Array(files.length);
  const queue   = files.map((f, i) => ({ f, i }));
  const active  = new Set();

  await new Promise(resolve => {
    function next() {
      while (active.size < MAX_C && queue.length) {
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

    console.log(`extract: ${body.files.length} file(s) mode=${mode}`);

    const results      = await runBatch(body.files, sysPrompt, mode);
    const successCount = results.filter(r => r.ok).length;
    console.log(`done: ${successCount}/${results.length} succeeded`);

    return NextResponse.json({
      results,
      model:      GEMINI_MODEL,
      groq_model: GROQ_ON ? GROQ_MODEL : null,
      processed:  results.length,
      succeeded:  successCount,
      failed:     results.length - successCount,
    });

  } catch (e) {
    console.error("extract error:", e);
    return NextResponse.json({ error: e?.message || "Unexpected server error." }, { status: 500 });
  }
}
