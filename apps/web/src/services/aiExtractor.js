import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function extractNameplateData(imageUrl) {
  const res = await client.responses.create({
    model: "gpt-4o-mini",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: "Extract all equipment nameplate data as JSON." },
          {
            type: "input_image",
            image_url: imageUrl,
          },
        ],
      },
    ],
  });

  return res.output[0].content[0].text;
}
