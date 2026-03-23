import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    certificate_number:    { type: "STRING" },
    inspection_number:     { type: "STRING" },
    certificate_type:      { type: "STRING" },
    equipment_type:        { type: "STRING" },
    equipment_description: { type: "STRING" },
    asset_tag:             { type: "STRING" },
    serial_number:         { type: "STRING" },
    manufacturer:          { type: "STRING" },
    model:                 { type: "STRING" },
    year_built:            { type: "STRING" },
    country_of_origin:     { type: "STRING" },
    capacity_volume:       { type: "STRING" },
    swl:                   { type: "STRING" },
    proof_load:            { type: "STRING" },
    lift_height:           { type: "STRING" },
    sling_length:          { type: "STRING" },
    working_pressure:      { type: "STRING" },
    design_pressure:       { type: "STRING" },
    test_pressure:         { type: "STRING" },
    pressure_unit:         { type: "STRING" },
    temperature_range:     { type: "STRING" },
    material:              { type: "STRING" },
    standard_code:         { type: "STRING" },
    client_name:           { type: "STRING" },
    location:              { type: "STRING" },
    inspection_date:       { type: "STRING" },
    issue_date:            { type: "STRING" },
    expiry_date:           { type: "STRING" },
    next_inspection_due:   { type: "STRING" },
    inspector_name:        { type: "STRING" },
    inspection_body:       { type: "STRING" },
    result:                { type: "STRING" },
    status:                { type: "STRING" },
    defects_found:         { type: "STRING" },
    recommendations:       { type: "STRING" },
    comments:              { type: "STRING" },
    nameplate_data:        { type: "STRING" },
    raw_text_summary:      { type: "STRING" },
  },
};

// ── Attempt 1 prompt — strict JSON schema mode ────────────────────────────────
const PROMPT_STRICT = `
Extract industrial inspection certificate data from this document.

CRITICAL: Return ONLY a valid JSON object. No markdown. No code fences. No explanation. No text before or after the JSON.

Use empty string "" for any field that is missing or not found. Read all pages.

Field name aliases — look for these labels in the document:
- certificate_number: Certificate No, Report No, Report Number
- inspection_number: Inspection No, Job No, Job Number
- serial_number: Serial No, Serial Number, Pressure Vessel No
- equipment_description: Description, Vessel Description, Plant/Section
- client_name: Client, Customer, Company
- location: Area, Section, Site, Plant
- inspection_date: Inspection Date, Date of Test, Date of Pressure Test
- issue_date: Date Issued, Issue Date, Date Issued to Client
- next_inspection_due: Next Due Date, Next Inspection Due, Retest Date
- manufacturer: Manufacturer, Name of Manufacturer, Made By
- standard_code: Code of Construction, Standard, Module, Design Code
- year_built: Year of Manufacture, Date of Manufacture
- capacity_volume: Capacity, Volume, Internal Volume
- swl: SWL, Safe Working Load, WLL, Working Load Limit
- raw_text_summary: write 1-2 sentences summarising the certificate

For the "result" field:
- "PASS" = compliant, passed, satisfactory, no leaks, no defects, acceptable
- "FAIL" = failed, rejected, unsafe, non-compliant, defects found
- "UNKNOWN" = cannot determine from document
`.trim();

// ── Attempt 2 prompt — plain text mode (no schema enforcement) ────────────────
const PROMPT_PLAIN = `
You are reading an industrial inspection certificate document.
Extract the data and return ONLY a JSON object — nothing else, no markdown, no explanation.

Start your response with { and end with }

Extract these exact field names (use "" if not found):
certificate_number, inspection_number, certificate_type, equipment_type,
equipment_description, asset_tag, serial_number, manufacturer, model,
year_built, country_of_origin, capacity_volume, swl, proof_load,
lift_height, sling_length, working_pressure, design_pressure, test_pressure,
pressure_unit, temperature_range, material, standard_code, client_name,
location, inspection_date, issue_date, expiry_date, next_inspection_due,
inspector_name, inspection_body, result, status, defects_found,
recommendations, comments, nameplate_data, raw_text_summary

Rules:
- result must be exactly: PASS, FAIL, or UNKNOWN
- raw_text_summary: 1-2 sentences about the certificate
- All values must be strings
- No nested objects or arrays
`.trim();

// ─── Normalisation helpers ────────────────────────────────────────────────────

function clean(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s || null;
}

function parseDate(v) {
  const s = clean(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) {
    let [, dd, mm, yy] = m;
    dd = dd.padStart(2, "0");
    mm = mm.padStart(2, "0");
    if (yy.length === 2) yy = `20${yy}`;
    return `${yy}-${mm}-${dd}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
}

function splitPressure(v) {
  const s = clean(v);
  if (!s) return { value: null, unit: null };
  const m = s.match(/(-?\d+(?:\.\d+)?)\s*([A-Za-z°\/0-9\-\+\(\)]+)?/);
  if (!m) return { value: s, unit: null };
  return { value: m[1] || s, unit: m[2] || null };
}

function normalizeResult(value, obj = {}) {
  const text = [value, obj.comments, obj.defects_found, obj.recommendations, obj.raw_text_summary]
    .map((x) => String(x || "").toUpperCase())
    .join(" ");
  if (/PASS(ED)?|COMPLIANT|SATISFACTORY|NO[\s_]LEAKS|ACCEPTABLE/.test(text)) return "PASS";
  if (/FAIL(ED)?|REJECTED|UNSAFE|NON[\s_-]COMPLIANT/.test(text)) return "FAIL";
  return "UNKNOWN";
}

function normalizeData(obj = {}) {
  const wp = splitPressure(obj.working_pressure);
  const dp = splitPressure(obj.design_pressure);
  const tp = splitPressure(obj.test_pressure);
  return {
    certificate_number:    clean(obj.certificate_number),
    inspection_number:     clean(obj.inspection_number),
    certificate_type:      clean(obj.certificate_type),
    equipment_type:        clean(obj.equipment_type) || "UNKNOWN",
    equipment_description: clean(obj.equipment_description),
    asset_tag:             clean(obj.asset_tag),
    serial_number:         clean(obj.serial_number),
    manufacturer:          clean(obj.manufacturer),
    model:                 clean(obj.model),
    year_built:            clean(obj.year_built),
    country_of_origin:     clean(obj.country_of_origin),
    capacity_volume:       clean(obj.capacity_volume),
    swl:                   clean(obj.swl),
    proof_load:            clean(obj.proof_load),
    lift_height:           clean(obj.lift_height),
    sling_length:          clean(obj.sling_length),
    working_pressure:      wp.value,
    design_pressure:       dp.value,
    test_pressure:         tp.value,
    pressure_unit:         clean(obj.pressure_unit) || wp.unit || dp.unit || tp.unit,
    temperature_range:     clean(obj.temperature_range),
    material:              clean(obj.material),
    standard_code:         clean(obj.standard_code),
    client_name:           clean(obj.client_name),
    location:              clean(obj.location),
    inspection_date:       parseDate(obj.inspection_date),
    issue_date:            parseDate(obj.issue_date),
    expiry_date:           parseDate(obj.expiry_date),
    next_inspection_due:   parseDate(obj.next_inspection_due),
    inspector_name:        clean(obj.inspector_name),
    inspection_body:       clean(obj.inspection_body) || "Monroy (Pty) Ltd",
    result:                normalizeResult(obj.result, obj),
    status:                clean(obj.status) || "Active",
    defects_found:         clean(obj.defects_found),
    recommendations:       clean(obj.recommendations),
    comments:              clean(obj.comments),
    nameplate_data:        clean(obj.nameplate_data),
    raw_text_summary:      clean(obj.raw_text_summary),
  };
}

// ── Pull text + finish reason from Gemini response ────────────────────────────
function extractRawText(data) {
  const candidate  = data?.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const parts = candidate?.content?.parts;
  if (!Array.isArray(parts)) return { text: "", truncated: false };
  const text = parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("\n").trim();
  return { text, truncated: finishReason === "MAX_TOKENS" };
}

// ── Aggressive JSON parser with truncation repair ─────────────────────────────
function parseJsonAggressive(raw) {
  if (!raw) return null;
  const text = String(raw).trim();

  // 1. Direct parse
  try { return JSON.parse(text); } catch {}

  // 2. Strip markdown fences
  const stripped = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try { return JSON.parse(stripped); } catch {}

  // 3. Extract { ... } block
  const start = stripped.indexOf("{");
  const end   = stripped.lastIndexOf("}");
  if (start !== -1 && end > start) {
    const slice = stripped.slice(start, end + 1);
    try { return JSON.parse(slice); } catch {}
  }

  // 4. Try to repair truncated JSON — response was cut mid-string value
  if (start !== -1) {
    const partial = stripped.slice(start);

    // Close open string + object
    const repairs = [
      partial + '"}',
      partial + '""}'  ,
      partial + '"}}'  ,
    ];
    for (const attempt of repairs) {
      try { return JSON.parse(attempt); } catch {}
    }

    // Strip last incomplete key-value pair then close
    const lastComma = partial.lastIndexOf(",");
    if (lastComma > 0) {
      const trimmed = partial.slice(0, lastComma) + "}";
      try { return JSON.parse(trimmed); } catch {}
    }
  }

  return null;
}

// ── Single Gemini request ─────────────────────────────────────────────────────
async function callGemini(base64Data, mimeType, prompt, useSchema) {
  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType || "application/pdf", data: base64Data } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192,
        ...(useSchema
          ? { response_mime_type: "application/json", response_schema: RESPONSE_SCHEMA }
          : {}),
      },
    }),
  });

  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "Missing GEMINI_API_KEY environment variable." },
        { status: 500 }
      );
    }

    const body  = await req.json();
    const files = Array.isArray(body?.files) ? body.files : [];

    if (!files.length) {
      return NextResponse.json({ ok: false, error: "No files provided." }, { status: 400 });
    }

    const results = [];

    for (const file of files) {
      const fileName   = file?.fileName   || "unnamed-file";
      const mimeType   = file?.mimeType   || "application/pdf";
      const base64Data = file?.base64Data;

      if (!base64Data) {
        results.push({ fileName, ok: false, error: "Missing base64 file data." });
        continue;
      }

      let parsed    = null;
      let lastError = null;
      const debug   = {};

      // ── Attempt 1: JSON schema enforced ──────────────────────────────────
      try {
        const g1 = await callGemini(base64Data, mimeType, PROMPT_STRICT, true);

        if (g1.ok) {
          const { text, truncated } = extractRawText(g1.data);
          debug.a1_len       = text.length;
          debug.a1_truncated = truncated;
          parsed = parseJsonAggressive(text);
          if (parsed) {
            debug.a1_ok = true;
          } else {
            debug.a1_raw_preview = text.slice(0, 400);
          }
        } else {
          lastError        = g1.data?.error?.message || `Gemini HTTP ${g1.status}`;
          debug.a1_api_err = lastError;
        }
      } catch (e) {
        lastError      = e?.message;
        debug.a1_throw = lastError;
      }

      // ── Attempt 2: plain text, no schema ─────────────────────────────────
      if (!parsed) {
        try {
          const g2 = await callGemini(base64Data, mimeType, PROMPT_PLAIN, false);

          if (g2.ok) {
            const { text, truncated } = extractRawText(g2.data);
            debug.a2_len       = text.length;
            debug.a2_truncated = truncated;
            parsed = parseJsonAggressive(text);
            if (parsed) {
              debug.a2_ok = true;
            } else {
              debug.a2_raw_preview = text.slice(0, 400);
              lastError = "Both attempts failed — Gemini did not return valid JSON.";
            }
          } else {
            lastError        = g2.data?.error?.message || `Gemini HTTP ${g2.status}`;
            debug.a2_api_err = lastError;
          }
        } catch (e) {
          lastError      = e?.message;
          debug.a2_throw = lastError;
        }
      }

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        results.push({ fileName, ok: false, error: lastError || "Extraction failed.", debug });
        continue;
      }

      results.push({ fileName, ok: true, data: normalizeData(parsed), debug });
    }

    return NextResponse.json({ ok: true, results });

  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}
