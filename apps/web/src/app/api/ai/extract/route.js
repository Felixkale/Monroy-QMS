// apps/web/src/app/api/ai/extract/route.js
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const EXTRACTION_PROMPT = `
You are an industrial inspection certificate extraction assistant for a Quality Management System.

Read the uploaded certificate and extract as much structured data as possible.

Return ONLY a valid JSON object.
No markdown.
No explanation.
No code fences.

Use this shape exactly:
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

function cleanText(text) {
  return String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function normalizeResult(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "UNKNOWN";
  if (["PASS", "PASSED", "OK", "SATISFACTORY"].includes(raw)) return "PASS";
  if (["FAIL", "FAILED", "UNSATISFACTORY"].includes(raw)) return "FAIL";
  if (["REPAIR REQUIRED", "REPAIR_REQUIRED", "REPAIRS REQUIRED"].includes(raw)) {
    return "REPAIR_REQUIRED";
  }
  if (["OUT OF SERVICE", "OUT_OF_SERVICE", "REMOVE FROM SERVICE"].includes(raw)) {
    return "OUT_OF_SERVICE";
  }
  return "UNKNOWN";
}

function normalizeDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toISOString().slice(0, 10);
}

function normalizePayload(obj = {}) {
  return {
    certificate_number: obj.certificate_number ?? null,
    inspection_number: obj.inspection_number ?? null,
    certificate_type: obj.certificate_type ?? null,
    equipment_type: obj.equipment_type ?? "UNKNOWN",
    equipment_description: obj.equipment_description ?? null,
    asset_tag: obj.asset_tag ?? null,
    serial_number: obj.serial_number ?? null,
    manufacturer: obj.manufacturer ?? null,
    model: obj.model ?? null,
    year_built: obj.year_built ?? null,
    country_of_origin: obj.country_of_origin ?? null,
    capacity_volume: obj.capacity_volume ?? null,
    swl: obj.swl ?? null,
    proof_load: obj.proof_load ?? null,
    lift_height: obj.lift_height ?? null,
    sling_length: obj.sling_length ?? null,
    working_pressure: obj.working_pressure ?? null,
    design_pressure: obj.design_pressure ?? null,
    test_pressure: obj.test_pressure ?? null,
    pressure_unit: obj.pressure_unit ?? null,
    temperature_range: obj.temperature_range ?? null,
    material: obj.material ?? null,
    standard_code: obj.standard_code ?? null,
    client_name: obj.client_name ?? null,
    location: obj.location ?? null,
    inspection_date: normalizeDate(obj.inspection_date),
    issue_date: normalizeDate(obj.issue_date),
    expiry_date: normalizeDate(obj.expiry_date),
    next_inspection_due: normalizeDate(obj.next_inspection_due),
    inspector_name: obj.inspector_name ?? null,
    inspection_body: obj.inspection_body ?? null,
    result: normalizeResult(obj.result),
    status: obj.status ?? "Active",
    defects_found: obj.defects_found ?? null,
    recommendations: obj.recommendations ?? null,
    comments: obj.comments ?? null,
    nameplate_data: obj.nameplate_data ?? null,
    raw_text_summary: obj.raw_text_summary ?? null,
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

      const geminiResponse = await fetch(GEMINI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
                {
                  text: EXTRACTION_PROMPT,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      });

      const geminiJson = await geminiResponse.json();

      if (!geminiResponse.ok) {
        results.push({
          fileName,
          ok: false,
          error:
            geminiJson?.error?.message ||
            `Gemini request failed with status ${geminiResponse.status}.`,
          details: geminiJson,
        });
        continue;
      }

      const rawText =
        geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

      const cleaned = cleanText(rawText);

      try {
        const parsed = JSON.parse(cleaned);
        results.push({
          fileName,
          ok: true,
          data: normalizePayload(parsed),
        });
      } catch {
        results.push({
          fileName,
          ok: false,
          error: "Gemini returned invalid JSON.",
          raw: rawText,
        });
      }
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
