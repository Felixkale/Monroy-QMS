import OpenAI from "openai";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

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
You are an industrial inspection AI.

Extract ALL readable nameplate data from this image.

Return ONLY JSON.

Fields to extract (if present):
- manufacturer
- model
- serial_number
- year_built
- pressure
- capacity
- country_of_origin
- any_other_visible_data

If unsure, still include best guess.
              `,
            },
            {
              type: "input_image",
              image_base64: base64,
            },
          ],
        },
      ],
    });

    const text = response.output_text;

    return new Response(text, {
      status: 200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
}
