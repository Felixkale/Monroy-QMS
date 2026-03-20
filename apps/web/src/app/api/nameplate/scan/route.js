// FILE: /apps/web/src/app/api/nameplate/scan/route.js

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { parseNameplateText } from "@/lib/nameplateParser";

export const runtime = "nodejs";

function extractJson(text = "") {
  const direct = text.trim();
  try {
    return JSON.parse(direct);
  } catch {}

  const fenced = direct.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1]);
  }

  const braces = direct.match(/\{[\s\S]*\}/);
  if (braces?.[0]) {
    return JSON.parse(braces[0]);
  }

  throw new Error("Failed to parse OCR JSON response.");
}

export async function POST(request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Nameplate image is required." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Extract visible industrial nameplate text from the image. Return strict JSON only with keys: raw_text, manufacturer, model, serial_number, year_built, capacity, swl, mawp, design_pressure, test_pressure, country_of_origin, equipment_id.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Read the industrial equipment nameplate and extract its fields. Return only JSON.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
    });

    const content = response.choices?.[0]?.message?.content || "{}";
    const ocr = extractJson(content);
    const parsed = parseNameplateText(ocr.raw_text || "");

    return NextResponse.json({
      success: true,
      ocr: {
        ...ocr,
        raw_text: ocr.raw_text || "",
      },
      parsed: {
        ...parsed,
        manufacturer: ocr.manufacturer || parsed.manufacturer,
        model: ocr.model || parsed.model,
        serial_number: ocr.serial_number || parsed.serial_number,
        year_built: ocr.year_built || parsed.year_built,
        capacity: ocr.capacity || parsed.capacity,
        swl: ocr.swl || parsed.swl,
        mawp: ocr.mawp || parsed.mawp,
        design_pressure: ocr.design_pressure || parsed.design_pressure,
        test_pressure: ocr.test_pressure || parsed.test_pressure,
        country_of_origin: ocr.country_of_origin || parsed.country_of_origin,
        equipment_id: ocr.equipment_id || parsed.equipment_id,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Nameplate scan failed." },
      { status: 500 }
    );
  }
}
