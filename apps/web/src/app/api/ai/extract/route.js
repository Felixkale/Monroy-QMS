// apps/web/src/app/api/ai/extract/route.js
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const PAGE_KEYWORDS = [
  "report no",
  "report number",
  "certificate no",
  "job no",
  "job number",
  "inspection no",
  "client",
  "customer",
  "description",
  "vessel description",
  "plant/section",
  "plant type",
  "area",
  "site",
  "serial number",
  "manufacturer’s serial no",
  "manufacturer's serial no",
  "pressure vessel no",
  "name of manufacturer",
  "manufacturer",
  "country of origin",
  "year of manufacture",
  "code of construction",
  "module",
  "design pressure",
  "test pressure",
  "initial test pressure",
  "working pressure",
  "capacity",
  "inspection date",
  "date of pressure test",
  "issue date",
  "next due date",
  "next inspection due",
  "inspected by",
  "tested by",
  "recommendations",
  "remarks",
  "comments",
  "compliant yes",
  "non-compliant no",
  "compliant",
  "pressure testing"
];

const OUTPUT_SCHEMA = `
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

const TEXT_PROMPT = `
You extract industrial inspection certificate data for Monroy QMS.

This is a flexible extraction task.
Documents may be multi-page and place important fields on different pages.

Instructions:
- Use the supplied page text only.
- Ignore indexes, boilerplate, duplicated headers/footers, generic terms, and irrelevant annexures.
- Merge relevant facts across the provided pages into ONE final record.
- Do not assume a fixed layout.
- Be alias-aware.

Field aliases:
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
- result:
  PASS if compliant yes / non-compliant no / no leaks / good condition / acceptable
  FAIL if failed / non-compliant yes / rejected / unsafe

Rules:
- Output ONE strict JSON object only.
- No markdown.
- No explanation.
- Use null if missing.
- Dates should be YYYY-MM-DD where possible.
- Keep engineering values concise.
- Split pressures from units where sensible.

JSON shape:
${OUTPUT_SCHEMA}
`.trim();

function cleanText(text) {
  return String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function extractJsonObject(text) {
  const cleaned = cleanText(text);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return cleaned.slice(start, end + 1);
}

function cleanValue(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s || null;
}

function parseDateFlexible(value) {
  const s = cleanValue(value);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const dmy = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})$/);
  if (dmy) {
    let [, dd, mm, yy] = dmy;
    if (yy.length === 2) yy = `20${yy}`;
    return `${yy}-${mm}-${dd}`;
  }

  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);

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

async function parsePdfPagesFromBase64(base64Data) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const buffer = Buffer.from(base64Data, "base64");
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    isEvalSupported: false,
    useWorkerFetch: false,
    disableFontFace: true,
  }).promise;

  const pages = [];

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const lineMap = new Map();

    for (const item of content.items || []) {
      if (!item?.str) continue;
      const y = Math.round(item.transform[5]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push({ x: item.transform[4], str: item.str });
    }

    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
    const lines = [];

    for (const y of sortedYs) {
      const lineText = lineMap
        .get(y)
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (lineText) lines.push(lineText);
    }

    pages.push({
      page: pageNo,
      text: lines.join("\n").trim(),
    });
  }

  return pages;
}

function scorePage(text) {
  const t = String(text || "").toLowerCase();
  if (!t) return 0;

  let score = 0;

  for (const keyword of PAGE_KEYWORDS) {
    if (t.includes(keyword)) score += 4;
  }

  if (t.includes("report no")) score += 10;
  if (t.includes("job no")) score += 10;
  if (t.includes("serial number")) score += 8;
  if (t.includes("pressure vessel no")) score += 8;
  if (t.includes("name of manufacturer")) score += 8;
  if (t.includes("design pressure")) score += 8;
  if (t.includes("initial test pressure")) score += 8;
  if (t.includes("capacity")) score += 6;
  if (t.includes("compliant yes")) score += 10;
  if (t.includes("non-compliant no")) score += 10;
  if (t.includes("next due date")) score += 10;
  if (t.includes("inspected by")) score += 6;
  if (t.includes("tested by")) score += 6;

  score += Math.min(10, Math.floor(t.length / 500));

  return score;
}

function selectRelevantPages(pages) {
  const scored = pages
    .map((p) => ({ ...p, score: scorePage(p.text) }))
    .sort((a, b) => b.score - a.score);

  const picked = scored.filter((p) => p.score > 0).slice(0, 5);

  if (!picked.length) return pages.slice(0, Math.min(4, pages.length));

  return picked.sort((a, b) => a.page - b.page);
}

async function callGeminiWithText(compiledText) {
  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: TEXT_PROMPT },
            { text: compiledText },
          ],
        },
      ],
      generationConfig: {
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

async function callGeminiWithImage(base64Data, mimeType) {
  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

async function repairJson(rawText) {
  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Convert the following into ONE strict valid JSON object only.

Use this shape exactly:
${OUTPUT_SCHEMA}

Text:
${rawText}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 1800,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) return null;
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
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

      let gemini;
      let compiledText = null;

      if (mimeType === "application/pdf") {
        const pages = await parsePdfPagesFromBase64(base64Data);
        const relevantPages = selectRelevantPages(pages);

        compiledText = relevantPages
          .map((p) => `--- PAGE ${p.page} ---\n${p.text}`)
          .join("\n\n");

        gemini = await callGeminiWithText(compiledText);
      } else {
        gemini = await callGeminiWithImage(base64Data, mimeType);
      }

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

      const rawText = gemini.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
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
          extracted_pages_text: compiledText,
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
