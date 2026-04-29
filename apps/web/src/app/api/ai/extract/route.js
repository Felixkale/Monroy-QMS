// src/app/api/ai/extract/route.js
import { NextResponse } from "next/server";

export const runtime  = "nodejs";
export const dynamic  = "force-dynamic";
export const maxDuration = 300;

/* ── CONFIG ──────────────────────────────────────────────── */
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_BASE  = "https://generativelanguage.googleapis.com";
const MAX_RETRIES  = 5;

const GROQ_KEY     = process.env.GROQ_API_KEY    || "";
const GROQ_MODEL   = process.env.GROQ_MODEL      || "llama-3.3-70b-versatile";
const GROQ_BASE    = "https://api.groq.com/openai/v1";
const GROQ_ON      = Boolean(GROQ_KEY);

const OR_KEY       = process.env.OPENROUTER_API_KEY || "";
const OR_MODEL     = process.env.OPENROUTER_MODEL   || "meta-llama/llama-4-maverick:free";
const OR_BASE      = "https://openrouter.ai/api/v1";
const OR_ON        = Boolean(OR_KEY);

/* ── GEMINI KEY POOL ─────────────────────────────────────── */
const KEYS = [
  process.env.GEMINI_API_KEY,   process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3, process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
].filter(Boolean);

if (!KEYS.length) throw new Error("No GEMINI_API_KEY set.");

const PER_KEY_MS   = 10000; // 10 RPM = 6s minimum, 10s gives headroom to avoid 429s
const EFF_MS       = Math.max(300, Math.ceil(PER_KEY_MS / KEYS.length));
const cooldowns    = new Map(KEYS.map(k => [k, 0]));
let   ki           = 0;

console.log(`Gemini:${KEYS.length} Groq:${GROQ_ON?"on":"off"} OR:${OR_ON?"on":"off"} delay:${EFF_MS}ms`);

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
  let sk = KEYS[0], st = cooldowns.get(KEYS[0]) || 0;
  for (const k of KEYS) { const t = cooldowns.get(k)||0; if (t < st) { st=t; sk=k; } }
  const w = st - now; if (w > 0) { console.log(`Cooldown ${Math.round(w/1000)}s`); await sleep(w); }
  cooldowns.set(sk, Date.now() + PER_KEY_MS);
  return sk;
}

function penalize(key, ms = 60000) {
  cooldowns.set(key, Math.max(cooldowns.get(key)||Date.now(), Date.now() + ms));
}

/* ── SCHEMAS ─────────────────────────────────────────────── */
const DOC_SCHEMA = {
  type: "object",
  properties: {
    equipment_type:{type:"string"}, equipment_description:{type:"string"},
    manufacturer:{type:"string"},   model:{type:"string"},
    serial_number:{type:"string"},  asset_tag:{type:"string"},
    year_built:{type:"string"},     capacity_volume:{type:"string"},
    swl:{type:"string"},            working_pressure:{type:"string"},
    design_pressure:{type:"string"},test_pressure:{type:"string"},
    pressure_unit:{type:"string"},  material:{type:"string"},
    standard_code:{type:"string"},  inspection_number:{type:"string"},
    client_name:{type:"string"},    location:{type:"string"},
    inspection_date:{type:"string"},expiry_date:{type:"string"},
    next_inspection_due:{type:"string"}, inspector_name:{type:"string"},
    inspection_body:{type:"string"},result:{type:"string"},
    defects_found:{type:"string"},  recommendations:{type:"string"},
    comments:{type:"string"},       nameplate_data:{type:"string"},
    raw_text_summary:{type:"string"},
  },
  required: ["equipment_type","result"],
};

const LIST_SCHEMA = {
  type:"object",
  properties:{ items:{ type:"array", items:{
    type:"object",
    properties:{
      equipment_type:{type:"string"}, serial_number:{type:"string"},
      swl:{type:"string"},            result:{type:"string"},
      defects_found:{type:"string"},  equipment_description:{type:"string"},
    },
    required:["equipment_type"],
  }}},
  required:["items"],
};

const HR_SCHEMA = {
  type:"object",
  properties:{
    client_name:{type:"string"},     location:{type:"string"},
    crane_make:{type:"string"},      crane_serial:{type:"string"},
    crane_fleet:{type:"string"},     crane_swl:{type:"string"},
    machine_hours:{type:"string"},   inspection_date:{type:"string"},
    expiry_date:{type:"string"},     report_number:{type:"string"},
    drum_main_condition:{type:"string"}, drum_aux_condition:{type:"string"},
    rope_lay_main:{type:"string"},   rope_lay_aux:{type:"string"},
    rope_diameter_main:{type:"string"}, rope_diameter_aux:{type:"string"},
    rope_length_3x_main:{type:"string"}, rope_length_3x_aux:{type:"string"},
    reduction_dia_main:{type:"string"}, reduction_dia_aux:{type:"string"},
    core_protrusion_main:{type:"string"}, core_protrusion_aux:{type:"string"},
    corrosion_main:{type:"string"},  corrosion_aux:{type:"string"},
    broken_wires_main:{type:"string"}, broken_wires_aux:{type:"string"},
    rope_kinks_main:{type:"string"}, rope_kinks_aux:{type:"string"},
    other_defects_main:{type:"string"}, other_defects_aux:{type:"string"},
    end_fittings_main:{type:"string"}, end_fittings_aux:{type:"string"},
    serviceability_main:{type:"string"}, serviceability_aux:{type:"string"},
    lower_limit_main:{type:"string"}, lower_limit_aux:{type:"string"},
    damaged_strands_main:{type:"string"}, damaged_strands_aux:{type:"string"},
    hook1_sn:{type:"string"}, hook1_swl:{type:"string"},
    hook1_swl_marked:{type:"string"}, hook1_safety_catch:{type:"string"},
    hook1_cracks:{type:"string"},    hook1_swivel:{type:"string"},
    hook1_corrosion:{type:"string"}, hook1_side_bending:{type:"string"},
    hook1_ab:{type:"string"},        hook1_ac:{type:"string"},
    hook2_sn:{type:"string"},        hook2_swl:{type:"string"},
    hook2_swl_marked:{type:"string"}, hook2_safety_catch:{type:"string"},
    hook2_cracks:{type:"string"},    hook2_swivel:{type:"string"},
    hook2_corrosion:{type:"string"}, hook2_side_bending:{type:"string"},
    hook2_ab:{type:"string"},        hook2_ac:{type:"string"},
    hook3_sn:{type:"string"},        hook3_swl:{type:"string"},
    overall_result:{type:"string"},  defects_found:{type:"string"},
    comments:{type:"string"},
  },
  required:["client_name","overall_result"],
};

/* ── UTILS ───────────────────────────────────────────────── */
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
  catch (e) { if (e.name === "AbortError") throw new Error(`Timeout ${ms/1000}s`); throw e; }
  finally   { clearTimeout(t); }
}

function parseJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const s = text.replace(/^```json\s*/im,"").replace(/^```\s*/im,"").replace(/\s*```\s*$/im,"").trim();
  try { return JSON.parse(s); } catch {}
  const oi=s.indexOf("{"), oj=s.lastIndexOf("}");
  if (oi>=0&&oj>oi) { try { return JSON.parse(s.slice(oi,oj+1)); } catch {} }
  const ai=s.indexOf("["), aj=s.lastIndexOf("]");
  if (ai>=0&&aj>ai) { try { return JSON.parse(s.slice(ai,aj+1)); } catch {} }
  return null;
}

function geminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts.map(p => typeof p?.text === "string" ? p.text : "").join("").trim();
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

/* ── PDF TEXT EXTRACTION ─────────────────────────────────── */
async function pdfText(bytes) {
  try {
    const { default: parse } = await import("pdf-parse");
    const d = await parse(bytes, { max: 0 });
    const t = (d?.text || "").trim();
    return t.length >= 20 ? t : "";
  } catch { return ""; }
}

/* ── GROQ (text → JSON, instant) ────────────────────────── */
async function groq(sysPrompt, userText, retries = 2) {
  if (!GROQ_ON) return null;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await timed(`${GROQ_BASE}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type":"application/json", "Authorization":`Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: GROQ_MODEL, temperature: 0.1, max_tokens: 8192,
          response_format: { type: "json_object" },
          messages: [{ role:"system", content:sysPrompt }, { role:"user", content:userText }],
        }),
      }, 60000);
      if (res.status === 429) { if (i < retries) { await sleep(5000); continue; } return null; }
      const j = await res.json().catch(() => null);
      return j ? parseJson(j.choices?.[0]?.message?.content || "") : null;
    } catch { if (i < retries) await sleep(3000); }
  }
  return null;
}

function groqPrompt(rawText, mode) {
  const hint = mode === "list"
    ? "Extract every equipment line item. Return JSON: {\"items\":[{equipment_type,serial_number,swl,result,defects_found,equipment_description}]}"
    : mode === "hookrope"
      ? "Extract all Hook & Rope fields. Return a flat JSON object."
      : "Extract all inspection certificate fields. Return a flat JSON object.";
  return `${hint}\nReturn ONLY valid JSON. No markdown.\n\nDOCUMENT TEXT:\n${rawText||"(empty)"}`;
}

/* ── OPENROUTER (vision, parallel with Gemini) ───────────── */
async function openrouter(b64, mime, sysPrompt, fileName, mode) {
  if (!OR_ON) return null;
  const userText = mode === "list"
    ? `Extract every item into items array. Return ONLY JSON. File:${fileName}`
    : mode === "hookrope"
      ? `Extract all Hook & Rope fields. Return ONLY JSON. File:${fileName}`
      : `Extract all certificate fields. Return ONLY JSON. File:${fileName}`;
  try {
    const res = await timed(`${OR_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type":"application/json",
        "Authorization":`Bearer ${OR_KEY}`,
        "HTTP-Referer":"https://monroyqms.onrender.com",
        "X-Title":"Monroy QMS",
      },
      body: JSON.stringify({
        model: OR_MODEL, temperature: 0.1, max_tokens: 8192,
        messages: [
          { role:"system", content: sysPrompt },
          { role:"user", content:[
            { type:"text", text: userText },
            { type:"image_url", image_url:{ url:`data:${mime};base64,${b64}` } },
          ]},
        ],
      }),
    }, 90000);
    if (!res.ok) { console.warn(`OR ${res.status}`); return null; }
    const j = await res.json().catch(() => null);
    return j ? parseJson(j.choices?.[0]?.message?.content || "") : null;
  } catch (e) { console.warn("OR failed:", e.message); return null; }
}

/* ── GEMINI FILE UPLOAD ──────────────────────────────────── */
async function upload(bytes, mime, name, key) {
  const r1 = await timed(`${GEMINI_BASE}/upload/v1beta/files?key=${key}`, {
    method:"POST",
    headers:{
      "X-Goog-Upload-Protocol":"resumable", "X-Goog-Upload-Command":"start",
      "X-Goog-Upload-Header-Content-Length":String(bytes.byteLength),
      "X-Goog-Upload-Header-Content-Type":mime, "Content-Type":"application/json",
    },
    body: JSON.stringify({ file:{ display_name:name } }),
  }, 30000);
  if (!r1.ok) throw new Error(`Upload start ${r1.status}`);
  const url = r1.headers.get("x-goog-upload-url");
  if (!url) throw new Error("No upload URL");

  const r2 = await timed(url, {
    method:"POST",
    headers:{ "Content-Length":String(bytes.byteLength), "X-Goog-Upload-Offset":"0", "X-Goog-Upload-Command":"upload, finalize" },
    body: bytes,
  }, 60000);
  const j2 = await r2.json().catch(() => null);
  if (!r2.ok || !j2?.file) throw new Error(j2?.error?.message || `Upload ${r2.status}`);

  let file = j2.file;
  for (let i = 0; i < 20; i++) {
    const s = file?.state || "";
    if (s === "ACTIVE" || s === "FILE_STATE_ACTIVE") return file;
    if (s === "FAILED"  || s === "FILE_STATE_FAILED")  throw new Error("File processing failed");
    await sleep(1500);
    const rp = await timed(`${GEMINI_BASE}/v1beta/${file.name}?key=${key}`, {}, 15000);
    file = await rp.json().catch(() => file);
  }
  throw new Error("File never became ACTIVE");
}

async function del(name, key) {
  if (!name) return;
  try { await timed(`${GEMINI_BASE}/v1beta/${name}?key=${key}`, { method:"DELETE" }, 10000); } catch {}
}

/* ── GEMINI GENERATE ─────────────────────────────────────── */
async function geminiGen(uf, fileName, sysPrompt, key, mode) {
  const schema = mode === "list" ? LIST_SCHEMA : mode === "hookrope" ? HR_SCHEMA : DOC_SCHEMA;
  const userQ  = mode === "list"
    ? `Read EVERY line. Extract each item into items array. File:${fileName}`
    : mode === "hookrope"
      ? `Extract all Hook & Rope fields. File:${fileName}`
      : `Extract all certificate data. File:${fileName}`;

  const body = {
    system_instruction:{ parts:[{ text:sysPrompt }] },
    contents:[{ role:"user", parts:[
      { text: userQ },
      { file_data:{ mime_type:uf.mimeType, file_uri:uf.uri } },
    ]}],
    generationConfig:{
      temperature:0.1, topP:0.95,
      maxOutputTokens: mode === "list" ? 16384 : 8192,
      responseMimeType:"application/json",
      responseSchema: schema,
    },
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let res;
    try {
      res = await timed(
        `${GEMINI_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
        { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) },
        120000
      );
    } catch (e) {
      if (attempt < MAX_RETRIES-1) { await sleep(5000 * 2**attempt); continue; }
      throw e;
    }

    if (res.status === 429) {
      penalize(key, 60000*(attempt+1));
      await sleep(Math.max(parseInt(res.headers.get("retry-after")||"0")*1000, EFF_MS * 2**attempt));
      const nk = await nextKey();
      if (nk !== key) return geminiGen(uf, fileName, sysPrompt, nk, mode);
      continue;
    }
    if ((res.status === 500 || res.status === 503) && attempt < MAX_RETRIES-1) {
      await sleep(15000 * 2**attempt); continue;
    }

    const j = await res.json().catch(() => null);
    if (!res.ok || !j) throw new Error(j?.error?.message || `Gemini ${res.status}`);

    const fr = j?.candidates?.[0]?.finishReason;
    if (fr === "SAFETY" || fr === "RECITATION") throw new Error(`Gemini blocked: ${fr}`);

    const txt = geminiText(j).toLowerCase();
    if ((txt.includes("high demand") || txt.includes("try again later")) && attempt < MAX_RETRIES-1) {
      await sleep(20000*(attempt+1)); continue;
    }

    return j;
  }
  throw new Error("Gemini overloaded");
}

/* ── PROCESS ONE FILE ────────────────────────────────────────────────────
   Decision tree:
   PDF + extractable text → Groq PRIMARY (instant) → Gemini fallback
   Scanned PDF / image   → Gemini + OR parallel   → Groq on raw text
   List mode             → Gemini vision           → Groq fallback
   Hookrope mode         → Gemini vision           → Groq fallback
──────────────────────────────────────────────────────────────────────── */
async function processOne(fileData, sysPrompt, mode) {
  const { fileName, mimeType, base64Data } = fileData;
  const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  let uf = null; // uploaded gemini file — cleaned up in finally

  try {
    const bytes = Buffer.from(base64Data, "base64");
    const mb    = bytes.byteLength / 1048576;
    if (mb > 20) return fail(fileName, `File too large (${mb.toFixed(1)}MB). Max 20MB.`);

    // ── LIST / HOOKROPE — Gemini vision always ────────────────────────────
    if (mode === "list" || mode === "hookrope") {
      const key  = await nextKey();
      uf = await upload(bytes, mimeType, fileName, key);
      const gj  = await geminiGen(uf, fileName, sysPrompt, key, mode);
      const raw = geminiText(gj);
      const gp  = parseJson(raw);

      if (mode === "list") {
        const norm = normList(gp);
        if (norm?.items?.length) return okList(fileName, norm);
        // Groq fallback on Gemini raw text
        if (GROQ_ON && raw) {
          const qp = await groq(sysPrompt, groqPrompt(raw, "list"));
          const qn = normList(qp);
          if (qn?.items?.length) return okList(fileName, qn);
        }
        return fail(fileName, "No items extracted. Try a higher-resolution photo.");
      }

      // hookrope
      const fields = countFields(gp);
      if (fields >= 3) return okDoc(fileName, gp, mode);
      if (GROQ_ON && raw) {
        const qp = await groq(sysPrompt, groqPrompt(raw, "hookrope"));
        if (countFields(qp) > fields) return okDoc(fileName, qp, mode);
      }
      return fields >= 1 ? okDoc(fileName, gp, mode)
        : fail(fileName, "AI extracted 0 fields. Try a clearer scan.");
    }

    // ── DOCUMENT — try pdf-parse text first ───────────────────────────────
    const text = isPdf ? await pdfText(bytes) : "";

    if (text) {
      console.log(`[${fileName}] text PDF ${text.length}ch → Groq`);
      const qp = await groq(sysPrompt, groqPrompt(text, "document"));
      const qf = countFields(qp);
      if (qf >= 2) { console.log(`[${fileName}] Groq:${qf} ✓`); return okDoc(fileName, qp, mode); }

      // Groq weak — also run Gemini vision
      console.log(`[${fileName}] Groq weak(${qf}) → Gemini vision`);
      const key = await nextKey();
      uf = await upload(bytes, mimeType, fileName, key);
      const gj  = await geminiGen(uf, fileName, sysPrompt, key, mode);
      const gp  = parseJson(geminiText(gj));
      const gf  = countFields(gp);
      console.log(`[${fileName}] Gemini:${gf}`);
      const best = gf >= qf ? gp : qp;
      return countFields(best) >= 1 ? okDoc(fileName, best, mode)
        : fail(fileName, "Could not extract data. PDF may be encrypted.");
    }

    // ── VISION PATH — scanned PDF or image ───────────────────────────────
    console.log(`[${fileName}] vision → Gemini + OR parallel`);
    const key = await nextKey();
    const [gr, or_] = await Promise.allSettled([
      (async () => {
        uf = await upload(bytes, mimeType, fileName, key);
        const j = await geminiGen(uf, fileName, sysPrompt, key, mode);
        return { j, p: parseJson(geminiText(j)) };
      })(),
      openrouter(base64Data, mimeType, sysPrompt, fileName, mode).catch(() => null),
    ]);

    const gp  = gr.status  === "fulfilled" ? gr.value?.p   : null;
    const op  = or_.status === "fulfilled" ? or_.value      : null;
    const gf  = countFields(gp), of_ = countFields(op);
    console.log(`[${fileName}] Gemini:${gf} OR:${of_}`);

    let best = null;
    if (gf >= of_ && gf >= 1) best = gp;
    else if (of_ > gf && of_ >= 1) best = op;

    // Groq last resort on Gemini raw text
    if (countFields(best) < 2 && GROQ_ON) {
      const raw = gr.status === "fulfilled" ? geminiText(gr.value?.j || {}) : "";
      if (raw?.length >= 10) {
        const qp = await groq(sysPrompt, groqPrompt(raw, "document"));
        if (countFields(qp) > countFields(best)) best = qp;
      }
    }

    return countFields(best) >= 1 ? okDoc(fileName, best, mode)
      : fail(fileName, "Could not extract data. Try a higher-resolution scan.");

  } catch (e) {
    console.error(`[${fileName}]`, e.message);
    return fail(fileName, e.message || "Extraction failed.");
  } finally {
    if (uf?.name) del(uf.name, await nextKey().catch(() => KEYS[0]));
  }
}

/* ── RESULT BUILDERS ─────────────────────────────────────── */
function fail(fileName, error) { return { fileName, ok:false, error }; }

function okList(fileName, norm) {
  return {
    fileName, ok:true,
    data:{ items:(norm.items||[]).map(it => ({
      equipment_type:        san(it.equipment_type) || "Other",
      serial_number:         san(it.serial_number),
      swl:                   san(it.swl),
      result:                normalizeResult(it.result) || "PASS",
      defects_found:         san(it.defects_found),
      equipment_description: san(it.equipment_description),
    }))},
  };
}

function okDoc(fileName, parsed, mode) {
  if (mode === "hookrope") {
    const data = {};
    for (const [k,v] of Object.entries(parsed)) data[k] = san(v);
    return { fileName, ok:true, data };
  }
  const data = {};
  for (const [k,v] of Object.entries(parsed)) data[k] = san(v);
  data.result = normalizeResult(data.result);
  return { fileName, ok:true, data };
}

/* ── PARALLEL BATCH ──────────────────────────────────────── */
async function batch(files, sysPrompt, mode) {
  const MAX_C  = Math.max(2, KEYS.length);
  const results = new Array(files.length);
  const queue   = files.map((f,i) => ({ f, i }));
  const active  = new Set();

  await new Promise(resolve => {
    function next() {
      while (active.size < MAX_C && queue.length) {
        const { f, i } = queue.shift();
        const p = processOne(f, sysPrompt, mode)
          .then(r => { results[i] = r; })
          .catch(e => { results[i] = fail(f.fileName, e?.message||"Failed"); })
          .finally(() => { active.delete(p); queue.length || active.size ? next() : resolve(); });
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
      return NextResponse.json({ error:"Request must include a non-empty files array." }, { status:400 });
    if (body.files.length > 20)
      return NextResponse.json({ error:"Batch too large. Max 20 files." }, { status:400 });

    const sysPrompt = body.systemPrompt ||
      "Extract structured JSON from the inspection certificate. Return only valid JSON.";

    let mode = "document";
    if      (body.mode === "hookrope" || body.hookRopeMode) mode = "hookrope";
    else if (body.mode === "list"     || body.listMode)     mode = "list";

    console.log(`extract: ${body.files.length} file(s) mode=${mode}`);

    const results     = await batch(body.files, sysPrompt, mode);
    const successCount = results.filter(r => r.ok).length;
    console.log(`done: ${successCount}/${results.length}`);

    return NextResponse.json({
      results,
      model:            GEMINI_MODEL,
      groq_model:       GROQ_ON ? GROQ_MODEL : null,
      openrouter_model: OR_ON   ? OR_MODEL   : null,
      processed:        results.length,
      succeeded:        successCount,
      failed:           results.length - successCount,
    });
  } catch (e) {
    console.error("extract:", e);
    return NextResponse.json({ error: e?.message || "Unexpected error." }, { status:500 });
  }
}
