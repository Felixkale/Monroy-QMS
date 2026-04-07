// src/app/api/ai/extract-crane/route.js
import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_2 || "";

export async function POST(req) {
  try {
    const { base64, mimeType } = await req.json();
    if (!base64) return NextResponse.json({ error: "No image" }, { status: 400 });

    const prompt = `You are a crane inspection data extraction AI for a QMS system in Botswana.
Extract ALL data from this handwritten crane inspection note and return ONLY a JSON object.

Extract these fields (use null if not found):
{
  "crane_serial_number": "serial or chassis number of crane",
  "crane_fleet_number": "fleet number or unit number",
  "crane_registration": "registration plate e.g. FG85HL GP",
  "crane_model": "model name e.g. CC150, LTM100",
  "crane_manufacturer": "brand e.g. Zoomlion, Liebherr, Grove",
  "crane_swl": "safe working load e.g. 150T",
  "crane_type": "Mobile Crane or Tower Crane etc",
  "hook_swl": "hook safe working load e.g. 90T",
  "hook_serial": "hook serial number",
  "rope_diameter": "rope diameter in mm as number only e.g. 20",
  "rope_length": "rope length in metres as number only",
  "boom_actual_length": "actual boom length in metres as number only e.g. 13.5",
  "boom_extended_length": "extended or pull length in metres as number only e.g. 25",
  "boom_radius": "working radius in metres as number only",
  "boom_angle": "boom angle in degrees as number only",
  "boom_swl_at_config": "SWL at this configuration e.g. 50T",
  "boom_test_load": "load test value in tonnes as number only",
  "crane_computer_status": "PASS or FAIL - is the LMI/computer working?",
  "crane_computer_notes": "verbatim notes about computer/LMI",
  "overall_result": "PASS or FAIL based on all inspection notes",
  "defects": "all defects mentioned",
  "pressure_vessels": [
    {
      "sn": "serial e.g. PV01",
      "description": "description if given",
      "capacity": "capacity with unit e.g. 80L, 40L",
      "working_pressure": "pressure as number only",
      "pressure_unit": "kPa or bar or psi — default kPa if unit written as kPa",
      "result": "PASS or FAIL"
    }
  ]
}

Notes:
- If 'computer not working' or 'not safe' appears, set crane_computer_status to FAIL and overall_result to FAIL
- Pressure vessel capacity: read carefully e.g. PV01 80L = capacity 80L
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
    console.error("extract-crane error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
