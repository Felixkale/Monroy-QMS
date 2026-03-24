import { NextResponse } from "next/server";
import { parseNameplateText } from "@/lib/nameplateParser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    raw_text: { type: "STRING" },
    manufacturer: { type: "STRING" },
    model: { type: "STRING" },
    serial_number: { type: "STRING" },
    year_built: { type: "STRING" },
    capacity: { type: "STRING" },
    swl: { type: "STRING" },
    mawp: { type: "STRING" },
    design_pressure: { type: "STRING" },
    test_pressure: { type: "STRING" },
    country_of_origin: { type: "STRING" },
    equipment_id: { type: "STRING" },
  },
};

const PROMPT = `
Read this industrial equipment nameplate image.

Return strict JSON only.
Do not return markdown.
Do not return code fences.
Do not return explanation text.

Keys:
raw_text
manufacturer
model
serial_number
year_built
capacity
swl
mawp
design_pressure
test_pressure
country_of_origin
equipment_id

Rules:
- raw_text must contain the visible text from the plate as best as possible.
- Keep missing fields as empty strings.
- Do not invent values.
- equipment_id can be asset number / identification number / plate id if visible.
`.trim();

function extractTextParts(apiData) {
  const parts = apiData?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((part) => !part.thought) // exclude Gemini 2.5 thinking parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("\n")
    .trim();
}

function safeJsonParse(text) {
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

function cleanValue(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
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
            { text: PROMPT },
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 1200,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
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

export async function POST(request) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "Nameplate image is required." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64Data = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const gemini = await callGemini({ base64Data, mimeType });

    if (!gemini.ok) {
      return NextResponse.json(
        {
          error:
            gemini.data?.error?.message ||
            `Gemini request failed with status ${gemini.status}.`,
          details: gemini.data,
        },
        { status: 500 }
      );
    }

    const rawModelText = extractTextParts(gemini.data);
    const ocr = safeJsonParse(rawModelText);

    if (!ocr || typeof ocr !== "object" || Array.isArray(ocr)) {
      return NextResponse.json(
        {
          error: "Gemini returned invalid JSON.",
          raw_preview: rawModelText.slice(0, 2000),
        },
        { status: 500 }
      );
    }

    const parsed = parseNameplateText(cleanValue(ocr.raw_text));

    return NextResponse.json({
      success: true,
      ocr: {
        raw_text: cleanValue(ocr.raw_text),
        manufacturer: cleanValue(ocr.manufacturer),
        model: cleanValue(ocr.model),
        serial_number: cleanValue(ocr.serial_number),
        year_built: cleanValue(ocr.year_built),
        capacity: cleanValue(ocr.capacity),
        swl: cleanValue(ocr.swl),
        mawp: cleanValue(ocr.mawp),
        design_pressure: cleanValue(ocr.design_pressure),
        test_pressure: cleanValue(ocr.test_pressure),
        country_of_origin: cleanValue(ocr.country_of_origin),
        equipment_id: cleanValue(ocr.equipment_id),
      },
      parsed: {
        ...parsed,
        manufacturer: cleanValue(ocr.manufacturer) || parsed.manufacturer,
        model: cleanValue(ocr.model) || parsed.model,
        serial_number: cleanValue(ocr.serial_number) || parsed.serial_number,
        year_built: cleanValue(ocr.year_built) || parsed.year_built,
        capacity: cleanValue(ocr.capacity) || parsed.capacity,
        swl: cleanValue(ocr.swl) || parsed.swl,
        mawp: cleanValue(ocr.mawp) || parsed.mawp,
        design_pressure: cleanValue(ocr.design_pressure) || parsed.design_pressure,
        test_pressure: cleanValue(ocr.test_pressure) || parsed.test_pressure,
        country_of_origin:
          cleanValue(ocr.country_of_origin) || parsed.country_of_origin,
        equipment_id: cleanValue(ocr.equipment_id) || parsed.equipment_id,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Nameplate scan failed." },
      { status: 500 }
    );
  }
}
