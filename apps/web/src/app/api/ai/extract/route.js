import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const EXTRACTION_PROMPT = `
You are an expert document OCR and data extraction assistant specializing in industrial quality management certificates and inspection documents.

Analyze this certificate/document image or PDF page and extract ALL available information.

Return ONLY a valid JSON object with no markdown, no explanation, no preamble.

Extract these fields. Use null if not found:
{
  "certificate_number": null,
  "certificate_type": null,
  "equipment_tag": null,
  "equipment_description": null,
  "serial_number": null,
  "manufacturer": null,
  "model": null,
  "year_of_manufacture": null,
  "design_pressure": null,
  "test_pressure": null,
  "working_pressure": null,
  "temperature_range": null,
  "capacity_volume": null,
  "material": null,
  "standard_code": null,
  "inspection_date": null,
  "inspection_body": null,
  "inspector_name": null,
  "next_inspection_due": null,
  "expiry_date": null,
  "issue_date": null,
  "client_name": null,
  "location": null,
  "result": null,
  "defects_found": null,
  "recommendations": null,
  "comments": null,
  "nameplate_data": null,
  "photo_evidence_description": null
}
`.trim();

function cleanJsonText(text) {
  return String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

export async function POST(req) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing on the server." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { fileName, mimeType, base64Data } = body || {};

    if (!base64Data) {
      return NextResponse.json(
        { error: "Missing base64Data." },
        { status: 400 }
      );
    }

    const effectiveMimeType =
      mimeType && typeof mimeType === "string" ? mimeType : "application/pdf";

    const geminiRes = await fetch(GEMINI_URL, {
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
                  mime_type: effectiveMimeType,
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

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      return NextResponse.json(
        {
          error:
            geminiData?.error?.message ||
            `Gemini request failed with status ${geminiRes.status}`,
          details: geminiData,
        },
        { status: geminiRes.status }
      );
    }

    const rawText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    const cleaned = cleanJsonText(rawText);

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        raw_text: rawText,
        parse_error: "Could not parse JSON response",
      };
    }

    return NextResponse.json({
      ok: true,
      fileName: fileName || null,
      data: parsed,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error?.message || "Unexpected server error during extraction.",
      },
      { status: 500 }
    );
  }
}
