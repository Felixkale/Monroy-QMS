import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const S = { type: ["string", "null"] };

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    certificate_number: S,
    inspection_number: S,
    certificate_type: S,
    equipment_type: S,
    equipment_description: S,
    asset_tag: S,
    serial_number: S,
    manufacturer: S,
    model: S,
    year_built: S,
    country_of_origin: S,
    capacity_volume: S,
    swl: S,
    proof_load: S,
    lift_height: S,
    sling_length: S,
    working_pressure: S,
    design_pressure: S,
    test_pressure: S,
    pressure_unit: S,
    temperature_range: S,
    material: S,
    standard_code: S,
    client_name: S,
    location: S,
    inspection_date: S,
    issue_date: S,
    expiry_date: S,
    next_inspection_due: S,
    inspector_name: S,
    inspection_body: S,
    result: S,
    status: S,
    defects_found: S,
    recommendations: S,
    comments: S,
    nameplate_data: S,
    raw_text_summary: S,
  },
  required: [],
};

const TEXT_PROMPT = `
You extract industrial inspection certificate data for Monroy QMS.

Read the uploaded PDF directly.
Do not assume a fixed layout.
Merge relevant facts across all pages into one final record.

Rules:
- Return exactly one JSON object.
- No markdown.
- No code fences.
- No commentary.
- Use null when a field is not found.
- Dates should be YYYY-MM-DD where possible.
- Keep engineering values concise.
- For result:
  PASS = compliant yes / non-compliant no / no leaks / acceptable / satisfactory
  FAIL = failed / rejected / non-compliant yes / unsafe
  otherwise UNKNOWN

Useful aliases:
- certificate_number: Report No, Report Number, Certificate No
- inspection_number: Job No, Job Number, Inspection No
- serial_number: Serial Number, Pressure Vessel No, Manufacturer Serial No
- equipment_description: Description, Vessel Description, Plant/Section No
- client_name: Client, Customer
- location: Area, Plant Type, Section, Site
- inspection_date: Inspection Date, Date of Pressure Test
- issue_date: Issue Date, Date Issued to Client
- next_inspection_due: Next Due Date, Next Inspection Due
- manufacturer: Manufacturer, Name of Manufacturer
- standard_code: Code of Construction, Module, Standard
- year_built: Year of Manufacture
- capacity_volume: Capacity
`.trim();

function cleanValue(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s || null;
}

function parseDateFlexible(value) {
  const s = cleanValue(value);
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    let [, dd, mm, yy] = dmy;
    dd = dd.padStart(2, "0");
    mm = mm.padStart(2, "0");
    if (yy.length === 2) yy = `20${yy}`;
    return `${yy}-${mm}-${dd}`;
  }

  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) {
    return dt.toISOString().slice(0, 10);
  }

  return s;
}

function splitPressure(value) {
  const s = cleanValue(value);
  if (!s) return { number: null, unit: null };

  const m = s.match(/(-?\d+(?:\.\d+)?)\s*([A-Za-z°\/0-9\-\+\(\)]+)?/);
  if (!m) return { number: s, unit: null };

  return {
    number: m[1] || s,
    unit: m[2] || null,
  };
}

function normalizeResult(value, obj = {}) {
  const bag = [
    value,
    obj.comments,
    obj.defects_found,
    obj.recommendations,
    obj.raw_text_summary,
  ]
    .map((x) => String(x || "").toUpperCase())
    .join(" ");

  if (
    bag.includes("COMPLIANT YES") ||
    bag.includes("NON-COMPLIANT NO") ||
    bag.includes("NO LEAKS") ||
    bag.includes("GOOD CONDITION") ||
    bag.includes("ACCEPTABLE") ||
    bag.includes("PASSED") ||
    bag.includes("SATISFACTORY")
  ) {
    return "PASS";
  }

  if (
    bag.includes("FAILED") ||
    bag.includes(" FAIL ") ||
    bag.startsWith("FAIL ") ||
    bag.endsWith(" FAIL") ||
    bag.includes("NON-COMPLIANT YES") ||
    bag.includes("REJECTED") ||
    bag.includes("UNSAFE")
  ) {
    return "FAIL";
  }

  if (bag.includes("REPAIR REQUIRED") || bag.includes("REPAIRS REQUIRED")) {
    return "REPAIR_REQUIRED";
  }

  if (bag.includes("OUT OF SERVICE") || bag.includes("REMOVE FROM SERVICE")) {
    return "OUT_OF_SERVICE";
  }

  return "UNKNOWN";
}

function normalizePayload(obj = {}) {
  const design = splitPressure(obj.design_pressure);
  const test = splitPressure(obj.test_pressure);
  const working = splitPressure(obj.working_pressure);

  const pressureUnit =
    cleanValue(obj.pressure_unit) ||
    design.unit ||
    test.unit ||
    working.unit ||
    null;

  return {
    certificate_number: cleanValue(obj.certificate_number),
    inspection_number: cleanValue(obj.inspection_number),
    certificate_type: cleanValue(obj.certificate_type),
    equipment_type: cleanValue(obj.equipment_type) || "UNKNOWN",
    equipment_description: cleanValue(obj.equipment_description),
    asset_tag: cleanValue(obj.asset_tag),
    serial_number: cleanValue(obj.serial_number),
    manufacturer: cleanValue(obj.manufacturer),
    model: cleanValue(obj.model),
    year_built: cleanValue(obj.year_built),
    country_of_origin: cleanValue(obj.country_of_origin),
    capacity_volume: cleanValue(obj.capacity_volume),
    swl: cleanValue(obj.swl),
    proof_load: cleanValue(obj.proof_load),
    lift_height: cleanValue(obj.lift_height),
    sling_length: cleanValue(obj.sling_length),
    working_pressure: working.number,
    design_pressure: design.number,
    test_pressure: test.number,
    pressure_unit: pressureUnit,
    temperature_range: cleanValue(obj.temperature_range),
    material: cleanValue(obj.material),
    standard_code: cleanValue(obj.standard_code),
    client_name: cleanValue(obj.client_name),
    location: cleanValue(obj.location),
    inspection_date: parseDateFlexible(obj.inspection_date),
    issue_date: parseDateFlexible(obj.issue_date),
    expiry_date: parseDateFlexible(obj.expiry_date),
    next_inspection_due: parseDateFlexible(obj.next_inspection_due),
    inspector_name: cleanValue(obj.inspector_name),
    inspection_body: cleanValue(obj.inspection_body) || "Monroy (Pty) Ltd",
    result: normalizeResult(obj.result, obj),
    status: cleanValue(obj.status) || "Active",
    defects_found: cleanValue(obj.defects_found),
    recommendations: cleanValue(obj.recommendations),
    comments: cleanValue(obj.comments),
    nameplate_data: cleanValue(obj.nameplate_data),
    raw_text_summary: cleanValue(obj.raw_text_summary),
  };
}

function extractTextParts(apiData) {
  const parts = apiData?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("\n")
    .trim();
}

function safeParseGeminiJson(text) {
  if (!text) return null;

  const trimmed = String(text).trim();

  try {
    return JSON.parse(trimmed);
  } catch {}

  const unfenced = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(unfenced);
  } catch {}

  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const sliced = unfenced.slice(start, end + 1);
    try {
      return JSON.parse(sliced);
    } catch {}
  }

  return null;
}

async function callGemini({ base64Data, mimeType }) {
  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: TEXT_PROMPT },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_JSON_SCHEMA,
        temperature: 0.1,
        maxOutputTokens: 2200,
      },
    }),
  });

  const data = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export async function POST(req) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "Server is missing GEMINI_API_KEY." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const files = Array.isArray(body?.files) ? body.files : [];

    if (!files.length) {
      return NextResponse.json(
        { ok: false, error: "No files were provided." },
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

      const gemini = await callGemini({ base64Data, mimeType });

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

      const rawText = extractTextParts(gemini.data);
      const parsed = safeParseGeminiJson(rawText);

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        results.push({
          fileName,
          ok: false,
          error: "Gemini returned invalid JSON.",
          raw_preview: rawText.slice(0, 1500),
          candidate: gemini.data?.candidates?.[0] || null,
        });
        continue;
      }

      results.push({
        fileName,
        ok: true,
        data: normalizePayload(parsed),
      });
    }

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}
