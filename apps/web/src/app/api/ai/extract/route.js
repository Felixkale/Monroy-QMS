import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

const URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    certificate_number: { type: "STRING" },
    inspection_number: { type: "STRING" },
    certificate_type: { type: "STRING" },
    equipment_type: { type: "STRING" },
    equipment_description: { type: "STRING" },
    asset_tag: { type: "STRING" },
    serial_number: { type: "STRING" },
    manufacturer: { type: "STRING" },
    model: { type: "STRING" },
    year_built: { type: "STRING" },
    country_of_origin: { type: "STRING" },
    capacity_volume: { type: "STRING" },
    swl: { type: "STRING" },
    proof_load: { type: "STRING" },
    lift_height: { type: "STRING" },
    sling_length: { type: "STRING" },
    working_pressure: { type: "STRING" },
    design_pressure: { type: "STRING" },
    test_pressure: { type: "STRING" },
    pressure_unit: { type: "STRING" },
    temperature_range: { type: "STRING" },
    material: { type: "STRING" },
    standard_code: { type: "STRING" },
    client_name: { type: "STRING" },
    location: { type: "STRING" },
    inspection_date: { type: "STRING" },
    issue_date: { type: "STRING" },
    expiry_date: { type: "STRING" },
    next_inspection_due: { type: "STRING" },
    inspector_name: { type: "STRING" },
    inspection_body: { type: "STRING" },
    result: { type: "STRING" },
    status: { type: "STRING" },
    defects_found: { type: "STRING" },
    recommendations: { type: "STRING" },
    comments: { type: "STRING" },
    nameplate_data: { type: "STRING" },
    raw_text_summary: { type: "STRING" },
  },
};

const PROMPT = `
Extract industrial inspection certificate data from this PDF.

Rules:
- Return JSON only.
- No markdown.
- No code fences.
- No explanation.
- Use empty string when a field is missing.
- Merge facts across all pages.
- Do not assume a fixed layout.

Aliases:
- certificate_number: Certificate No, Report No, Report Number
- inspection_number: Inspection No, Job No, Job Number
- serial_number: Serial No, Serial Number, Pressure Vessel No
- equipment_description: Description, Vessel Description, Plant/Section No
- client_name: Client, Customer
- location: Area, Section, Site, Plant Type
- inspection_date: Inspection Date, Date of Pressure Test
- issue_date: Date Issued to Client, Issue Date
- next_inspection_due: Next Due Date, Next Inspection Due
- manufacturer: Manufacturer, Name of Manufacturer
- standard_code: Code of Construction, Module, Standard
- year_built: Year of Manufacture
- capacity_volume: Capacity, Volume

For result:
- PASS for compliant/passed/acceptable/satisfactory/no leaks
- FAIL for failed/rejected/unsafe/non-compliant yes
- UNKNOWN otherwise
`.trim();

function clean(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s || null;
}

function parseDate(v) {
  const s = clean(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
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

  return {
    value: m[1] || s,
    unit: m[2] || null,
  };
}

function normalizeResult(value, obj = {}) {
  const text = [
    value,
    obj.comments,
    obj.defects_found,
    obj.recommendations,
    obj.raw_text_summary,
  ]
    .map((x) => String(x || "").toUpperCase())
    .join(" ");

  if (
    text.includes("PASSED") ||
    text.includes("PASS") ||
    text.includes("COMPLIANT") ||
    text.includes("SATISFACTORY") ||
    text.includes("NO LEAKS") ||
    text.includes("ACCEPTABLE")
  ) {
    return "PASS";
  }

  if (
    text.includes("FAILED") ||
    text.includes("FAIL") ||
    text.includes("REJECTED") ||
    text.includes("UNSAFE") ||
    text.includes("NON-COMPLIANT YES")
  ) {
    return "FAIL";
  }

  return "UNKNOWN";
}

function normalizeData(obj = {}) {
  const wp = splitPressure(obj.working_pressure);
  const dp = splitPressure(obj.design_pressure);
  const tp = splitPressure(obj.test_pressure);

  return {
    certificate_number: clean(obj.certificate_number),
    inspection_number: clean(obj.inspection_number),
    certificate_type: clean(obj.certificate_type),
    equipment_type: clean(obj.equipment_type) || "UNKNOWN",
    equipment_description: clean(obj.equipment_description),
    asset_tag: clean(obj.asset_tag),
    serial_number: clean(obj.serial_number),
    manufacturer: clean(obj.manufacturer),
    model: clean(obj.model),
    year_built: clean(obj.year_built),
    country_of_origin: clean(obj.country_of_origin),
    capacity_volume: clean(obj.capacity_volume),
    swl: clean(obj.swl),
    proof_load: clean(obj.proof_load),
    lift_height: clean(obj.lift_height),
    sling_length: clean(obj.sling_length),
    working_pressure: wp.value,
    design_pressure: dp.value,
    test_pressure: tp.value,
    pressure_unit: clean(obj.pressure_unit) || wp.unit || dp.unit || tp.unit,
    temperature_range: clean(obj.temperature_range),
    material: clean(obj.material),
    standard_code: clean(obj.standard_code),
    client_name: clean(obj.client_name),
    location: clean(obj.location),
    inspection_date: parseDate(obj.inspection_date),
    issue_date: parseDate(obj.issue_date),
    expiry_date: parseDate(obj.expiry_date),
    next_inspection_due: parseDate(obj.next_inspection_due),
    inspector_name: clean(obj.inspector_name),
    inspection_body: clean(obj.inspection_body) || "Monroy (Pty) Ltd",
    result: normalizeResult(obj.result, obj),
    status: clean(obj.status) || "Active",
    defects_found: clean(obj.defects_found),
    recommendations: clean(obj.recommendations),
    comments: clean(obj.comments),
    nameplate_data: clean(obj.nameplate_data),
    raw_text_summary: clean(obj.raw_text_summary),
  };
}

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => (typeof p?.text === "string" ? p.text : ""))
    .join("\n")
    .trim();
}

function parseJsonLoose(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {}

  const unfenced = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(unfenced);
  } catch {}

  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(unfenced.slice(start, end + 1));
    } catch {}
  }

  return null;
}

async function askGemini(base64Data, mimeType) {
  const response = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: PROMPT },
            {
              inline_data: {
                mime_type: mimeType || "application/pdf",
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: "application/json",
        response_schema: RESPONSE_SCHEMA,
        temperature: 0.1,
        maxOutputTokens: 2200,
      },
    }),
  });

  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

export async function POST(req) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "Missing GEMINI_API_KEY." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const files = Array.isArray(body?.files) ? body.files : [];

    if (!files.length) {
      return NextResponse.json(
        { ok: false, error: "No files provided." },
        { status: 400 }
      );
    }

    const results = [];

    for (const file of files) {
      const fileName = file?.fileName || "unnamed-file";
      const mimeType = file?.mimeType || "application/pdf";
      const base64Data = file?.base64Data;

      if (!base64Data) {
        results.push({
          fileName,
          ok: false,
          error: "Missing base64 file data.",
        });
        continue;
      }

      const gemini = await askGemini(base64Data, mimeType);

      if (!gemini.ok) {
        results.push({
          fileName,
          ok: false,
          error:
            gemini.data?.error?.message ||
            `Gemini request failed with status ${gemini.status}.`,
          details: gemini.data,
        });
        continue;
      }

      const rawText = extractText(gemini.data);
      const parsed = parseJsonLoose(rawText);

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        results.push({
          fileName,
          ok: false,
          error: "Gemini returned invalid JSON.",
          raw_preview: rawText.slice(0, 2000),
        });
        continue;
      }

      results.push({
        fileName,
        ok: true,
        data: normalizeData(parsed),
      });
    }

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}
