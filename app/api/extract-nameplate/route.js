import OpenAI from "openai";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file uploaded." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const bytes = await file.arrayBuffer();
    const mimeType = file.type || "image/jpeg";
    const base64 = Buffer.from(bytes).toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await client.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
You are an industrial equipment nameplate extraction assistant.

Read the uploaded image and extract important visible nameplate data.

Return ONLY valid JSON.
Do not include markdown.
Do not include explanation text.

Use this flexible structure:
{
  "equipment_type": "",
  "manufacturer": "",
  "model": "",
  "serial_number": "",
  "identification_number": "",
  "year_built": "",
  "country_of_origin": "",
  "capacity": "",
  "capacity_volume": "",
  "pressure": "",
  "working_pressure": "",
  "design_pressure": "",
  "test_pressure": "",
  "safe_working_load": "",
  "proof_load": "",
  "lifting_height": "",
  "sling_length": "",
  "chain_size": "",
  "rope_diameter": "",
  "plate_text": "",
  "other_visible_data": {}
}

Rules:
- Fill any field you can infer from the image.
- Leave missing fields as empty strings.
- Put extra useful values under "other_visible_data".
- "plate_text" should contain a compact readable transcription of the visible nameplate.
              `,
            },
            {
              type: "input_image",
              image_url: dataUrl,
            },
          ],
        },
      ],
    });

    const output = response.output_text?.trim();

    return new Response(output || "{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to extract nameplate data.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
