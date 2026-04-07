// src/app/api/ai/extract-machine/route.js
import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_2 || "";

export async function POST(req) {
  try {
    const { base64, mimeType } = await req.json();
    if (!base64) return NextResponse.json({ error: "No image" }, { status: 400 });

    const prompt = `You are a machine inspection data extraction AI for a QMS system in Botswana.
Extract ALL data from this handwritten machine/equipment inspection note and return ONLY a JSON object.

Extract these fields (use null if not found):
{
  "serial_number": "serial or chassis number",
  "fleet_number": "fleet number or unit number",
  "registration_number": "registration plate",
  "manufacturer": "brand/make e.g. JCB, Manitou, Zoomlion",
  "model": "model name e.g. 535-125, ZTC300",
  "swl": "safe working load or rated capacity e.g. 5T, 250kg",
  "test_load": "load test value as number only",
  "overall_result": "PASS or FAIL based on all notes",
  "defects": "all defects mentioned",
  "recommendations": "any recommendations",
  "structural_result": "PASS or FAIL for structural integrity",
  "hydraulics_result": "PASS or FAIL for hydraulic system",
  "boom_result": "PASS or FAIL for boom/mast condition",
  "boom_actual_length": "actual boom length in metres as number only",
  "boom_extended_length": "extended length in metres as number only",
  "boom_radius": "working radius in metres as number only",
  "boom_angle": "boom angle in degrees as number only",
  "boom_test_load": "boom load test in tonnes as number only",
  "boom_swl_at_config": "SWL at test configuration e.g. 4T",
  "boom_swl_min": "SWL at minimum radius",
  "boom_swl_max": "SWL at maximum radius",
  "boom_min_radius": "minimum radius as number only",
  "boom_max_radius": "maximum radius as number only",
  "pressure_vessels": [
    {
      "sn": "serial e.g. PV01, PV-001",
      "description": "description if given e.g. hydraulic tank, air receiver",
      "manufacturer": "manufacturer if given",
      "year_manufacture": "year of manufacture if given",
      "country_origin": "country of origin if given",
      "capacity": "capacity with unit e.g. 80L, 500L, 200L",
      "working_pressure": "working pressure as number only",
      "test_pressure": "test pressure as number only",
      "pressure_unit": "kPa or bar or psi or MPa — infer from context",
      "result": "PASS or FAIL",
      "notes": "any notes about this vessel"
    }
  ]
}

Notes:
- If 'not working', 'fail', 'defective', 'unsafe' appears for any system, set that result to FAIL
- SWL at radius: read load charts if written e.g. '5T @ 3m'
- Pressure units: if kPa written use kPa, if bar use bar, default to bar if unclear
- Return ONLY valid JSON, no markdown, no explanation.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType || "image/jpeg", data: base64 } }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
        })
      }
    );

    const geminiData = await geminiRes.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json(parsed);
  } catch(e) {
    console.error("extract-machine error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
