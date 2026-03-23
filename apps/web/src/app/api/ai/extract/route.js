// apps/web/src/app/api/ai/extract/route.js
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const OUTPUT_SCHEMA_TEXT = `
{
  "certificate_number": null,
  "inspection_number": null,
  "certificate_type": null,
  "equipment_type": null,
  "equipment_description": null,
  "asset_tag": null,
  "serial_number": null,
  "manufacturer": null,
  "model": null,
  "year_built": null,
  "country_of_origin": null,
  "capacity_volume": null,
  "swl": null,
  "proof_load": null,
  "lift_height": null,
  "sling_length": null,
  "working_pressure": null,
  "design_pressure": null,
  "test_pressure": null,
  "pressure_unit": null,
  "temperature_range": null,
  "material": null,
  "standard_code": null,
  "client_name": null,
  "location": null,
  "inspection_date": null,
  "issue_date": null,
  "expiry_date": null,
  "next_inspection_due": null,
  "inspector_name": null,
  "inspection_body": null,
  "result": null,
  "status": null,
  "defects_found": null,
  "recommendations": null,
  "comments": null,
  "nameplate_data": null,
  "raw_text_summary": null
}
`.trim();

const FAST_EXTRACTION_PROMPT = `
You extract industrial certificate data for Monroy QMS.

This is a flexible multi-page extraction task.
Documents may include cover pages, signatures, annexures, stickers, nameplate sheets, pressure test sheets, thickness sheets, and remarks pages.

Your job:
- Scan the full uploaded document.
- Ignore boilerplate or irrelevant pages.
- Combine relevant facts across all pages into ONE final record.
- Do NOT assume a fixed layout.

Field aliases:
- certificate_number: Report No, Report Number, Certificate No
- inspection_number: Job No, Job Number, Inspection No
- serial_number: Serial Number, Pressure Vessel No, Manufacturer Serial No
- equipment_description: Description, Vessel Description, Plant/Section No
- client_name: Client, Customer
- location: Area, Plant Type, Section, Site
- inspection_date: Inspection Date, Date of Pressure Test
- issue_date: Issue Date, Date issued to Client
- next_inspection_due: Next Due Date, Next Inspection Due
- manufacturer: Manufacturer, Name of Manufacturer
- standard_code: Code of Construction, Module, Standard
- result: PASS if compliant yes / non-compliant no / no leaks / good condition / acceptable
- result: FAIL if failed / non-compliant yes / rejected / unsafe

Rules:
- Return ONLY one strict JSON object.
- No markdown.
- No explanation.
- Use null for missing fields.
- Dates should be YYYY-MM-DD where possible.
- Keep extracted engineering values concise.
- pressure_unit should hold units like KPa, bar, MPa if found.

Output shape:
${OUTPUT_SCHEMA_TEXT}
`.trim();

function cleanText(text) {
  return String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function extractJsonObject(text) {
  const cleaned = cleanText(text);
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  return cleaned.slice(firstBrace, lastBrace + 1);
}

function cleanValue(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s || null;
}

function parseDateFlexible(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const dmy = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})$/);
  if (dmy) {
    let [, dd, mm, yy] = dmy;
    if (yy.length === 2) yy = `20${yy}`;
    return `${yy}-${mm}-${dd}`;
  }

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);

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
    bag.includes("WITHIN ACCEPTABLE STRUCTURAL LIMITS") ||
    bag.includes("PASSED")
  ) {
    return "PASS";
  }

  if (
    bag.includes("FAILED") ||
    bag.includes("FAIL") ||
    bag.includes("NON-COMPLIANT YES") ||
    bag.includes("REJECTED")
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

function mergeLocation(obj) {
  const parts = [
    cleanValue(obj.location),
    cleanValue(obj.area),
    cleanValue(obj.plant_type),
    cleanValue(obj.site),
    cleanValue(obj.section),
  ].filter(Boolean);

  if (!parts.length) return null;
  return [...new Set(parts)].join(", ");
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

  const commentsParts = [
    cleanValue(obj.comments),
    cleanValue(obj.remarks),
    cleanValue(obj.pressure_test_remarks),
  ].filter(Boolean);

  return {
    certificate_number:
      cleanValue(obj.certificate_number) ||
      cleanValue(obj.report_no) ||
      cleanValue(obj.report_number),

    inspection_number:
      cleanValue(obj.inspection_number) ||
      cleanValue(obj.job_no) ||
      cleanValue(obj.job_number),

    certificate_type:
      cleanValue(obj.certificate_type) ||
      (String(obj.raw_text_summary || "").toUpperCase().includes("PRESSURE TEST")
        ? "PRESSURE TEST CERTIFICATE"
        : null),

    equipment_type:
      cleanValue(obj.equipment_type) ||
      (String(
        obj.equipment_description ||
          obj.description ||
          obj.vessel_description ||
          ""
      ).toUpperCase().includes("AIR RECEIVER")
        ? "PRESSURE_VESSEL"
        : "UNKNOWN"),

    equipment_description:
      cleanValue(obj.equipment_description) ||
      cleanValue(obj.description) ||
      cleanValue(obj.vessel_description) ||
      cleanValue(obj.plant_section_no),

    asset_tag: cleanValue(obj.asset_tag),

    serial_number:
      cleanValue(obj.serial_number) ||
      cleanValue(obj.pressure_vessel_no) ||
      cleanValue(obj.manufacturer_serial_no),

    manufacturer:
      cleanValue(obj.manufacturer) || cleanValue(obj.name_of_manufacturer),

    model: cleanValue(obj.model),
    year_built: cleanValue(obj.year_built) || cleanValue(obj.year_of_manufacture),
    country_of_origin: cleanValue(obj.country_of_origin),

    capacity_volume:
      cleanValue(obj.capacity_volume) || cleanValue(obj.capacity),

    swl: cleanValue(obj.swl),
    proof_load: cleanValue(obj.proof_load),
    lift_height: cleanValue(obj.lift_height),
    sling_length: cleanValue(obj.sling_length),

    working_pressure: working.number,
    design_pressure: design.number,
    test_pressure: test.number,
    pressure_unit: pressureUnit,

    temperature_range:
      cleanValue(obj.temperature_range) ||
      cleanValue(obj.design_temperature) ||
      cleanValue(obj.design_temperature_min_max),

    material: cleanValue(obj.material),

    standard_code:
      cleanValue(obj.standard_code) ||
      cleanValue(obj.code_of_construction) ||
      cleanValue(obj.code_of_construction_module),

    client_name: cleanValue(obj.client_name) || cleanValue(obj.client),

    location: mergeLocation(obj),

    inspection_date:
      parseDateFlexible(obj.inspection_date) ||
      parseDateFlexible(obj.date_of_pressure_test),

    issue_date:
      parseDateFlexible(obj.issue_date) ||
      parseDateFlexible(obj.date_issued_to_client),

    expiry_date: parseDateFlexible(obj.expiry_date),

    next_inspection_due:
      parseDateFlexible(obj.next_inspection_due) ||
      parseDateFlexible(obj.next_due_date),

    inspector_name:
      cleanValue(obj.inspector_name) || cleanValue(obj.inspector),

    inspection_body:
      cleanValue(obj.inspection_body) || "Monroy (Pty) Ltd",

    result: normalizeResult(obj.result, obj),
    status: cleanValue(obj.status) || "Active",

    defects_found: cleanValue(obj.defects_found),
    recommendations: cleanValue(obj.recommendations),
    comments: commentsParts.length ? commentsParts.join(" | ") : null,
    nameplate_data: cleanValue(obj.nameplate_data),
    raw_text_summary: cleanValue(obj.raw_text_summary),
  };
}

async function callGemini(parts, maxOutputTokens = 2600) {
  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens,
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

async function repairJson(rawText) {
  const repairPrompt = `
Convert the following extraction output into ONE strict valid JSON object.

Rules:
- Output JSON only.
- No markdown.
- No prose.
- Keep only the target fields.
- Missing fields must be null.

Target shape:
${OUTPUT_SCHEMA_TEXT}

Text:
${rawText}
  `.trim();

  const repaired = await callGemini([{ text: repairPrompt }], 1800);
  if (!repaired.ok) return null;

  return repaired.data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
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
        results.push({ fileName, ok: false, error: "Missing base64 file data." });
        continue;
      }

      const firstPass = await callGemini(
        [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          },
          {
            text: FAST_EXTRACTION_PROMPT,
          },
        ],
        2600
      );

      if (!firstPass.ok) {
        results.push({
          fileName,
          ok: false,
          error:
            firstPass.data?.error?.message ||
            `Gemini request failed with status ${firstPass.status}.`,
          details: firstPass.data,
        });
        continue;
      }

      const rawText =
        firstPass.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      let parsed = null;
      const firstJson = extractJsonObject(rawText);

      if (firstJson) {
        try {
          parsed = JSON.parse(firstJson);
        } catch {
          parsed = null;
        }
      }

      if (!parsed) {
        const repairedText = await repairJson(rawText);
        const repairedJson = extractJsonObject(repairedText || "");

        if (repairedJson) {
          try {
            parsed = JSON.parse(repairedJson);
          } catch {
            parsed = null;
          }
        }
      }

      if (!parsed) {
        results.push({
          fileName,
          ok: false,
          error: "Gemini returned text that was not valid JSON.",
          raw: rawText,
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
