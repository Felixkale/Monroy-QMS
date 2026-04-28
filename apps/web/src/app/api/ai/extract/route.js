import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const GEMINI_MODEL = "gemini-2.5-flash";
const FILE_API_BASE = "https://generativelanguage.googleapis.com/upload/v1beta/files";
const GENERATE_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";

// ── helpers ──────────────────────────────────────────────────────────────────

function isImage(mimeType) {
  return ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mimeType);
}

/**
 * Upload a file to Gemini File API and wait until ACTIVE.
 * Only used for PDFs (images go inline).
 */
async function uploadToGeminiFileAPI(fileBuffer, mimeType, apiKey) {
  // 1. Initiate resumable upload
  const initRes = await fetch(`${FILE_API_BASE}?uploadType=resumable&key=${apiKey}`, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": fileBuffer.byteLength,
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: "upload" } }),
  });

  if (!initRes.ok) {
    const t = await initRes.text();
    throw new Error(`File API init failed: ${initRes.status} ${t}`);
  }

  const uploadUrl = initRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("No upload URL returned from File API");

  // 2. Upload bytes
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Command": "upload, finalize",
      "X-Goog-Upload-Offset": "0",
      "Content-Type": mimeType,
    },
    body: fileBuffer,
  });

  if (!uploadRes.ok) {
    const t = await uploadRes.text();
    throw new Error(`File upload failed: ${uploadRes.status} ${t}`);
  }

  const fileData = await uploadRes.json();
  const fileName = fileData?.file?.name;
  if (!fileName) throw new Error("No file name in upload response");

  // 3. Poll until ACTIVE
  for (let i = 0; i < 30; i++) {
    const stateRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`
    );
    if (!stateRes.ok) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    const stateData = await stateRes.json();
    if (stateData?.state === "ACTIVE") return stateData;
    if (stateData?.state === "FAILED") throw new Error("Gemini file processing FAILED");
    await new Promise((r) => setTimeout(r, 1500));
  }

  throw new Error("Gemini file never became ACTIVE");
}

/** Delete a Gemini file (best-effort, don't block on failure) */
async function deleteGeminiFile(fileName, apiKey) {
  try {
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`,
      { method: "DELETE" }
    );
  } catch (_) {
    // ignore
  }
}

/**
 * Build Gemini content parts for a file.
 * Images → inline base64 (no upload, no polling, ~20-30s faster per file).
 * PDFs  → File API upload (required for PDFs).
 */
async function buildGeminiFilePart(fileBuffer, mimeType, apiKey) {
  if (isImage(mimeType)) {
    // Inline base64 — zero upload latency
    const b64 = Buffer.from(fileBuffer).toString("base64");
    return { inlinePart: { inline_data: { mime_type: mimeType, data: b64 } }, fileNameToDelete: null };
  }

  // PDF → File API
  const fileData = await uploadToGeminiFileAPI(fileBuffer, mimeType, apiKey);
  return {
    inlinePart: { file_data: { mime_type: mimeType, file_uri: fileData.uri } },
    fileNameToDelete: fileData.name,
  };
}

/** Call Gemini generate endpoint */
async function callGemini(parts, systemPrompt, apiKey) {
  const res = await fetch(
    `${GENERATE_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
      }),
    }
  );

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini generate failed: ${res.status} ${t}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

/** Call OpenRouter (for fallback / race) */
async function callOpenRouter(base64Files, mimeTypes, systemPrompt, userPrompt, apiKey) {
  const imageContents = base64Files
    .map((b64, i) => ({
      type: "image_url",
      image_url: { url: `data:${mimeTypes[i]};base64,${b64}` },
    }));

  const res = await fetch(OPENROUTER_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            ...imageContents,
            { type: "text", text: userPrompt },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 8192,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenRouter failed: ${res.status} ${t}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

// ── System prompts ────────────────────────────────────────────────────────────

const EXTRACT_SYSTEM = `You are an expert OCR and data extraction assistant specializing in industrial inspection certificates, particularly for lifting equipment used in Botswana's mining and industrial sectors.

Extract ALL information from the certificate image/document and return ONLY valid JSON — no markdown fences, no preamble.

Required JSON structure:
{
  "certificate_number": "string",
  "certificate_type": "string (Load Test | Pressure Test | NDT | Cherry Picker/AWP | Forklift | General)",
  "issue_date": "YYYY-MM-DD",
  "expiry_date": "YYYY-MM-DD",
  "equipment_type": "string",
  "make": "string",
  "model": "string",
  "serial_number": "string",
  "swl": "string (Safe Working Load with unit)",
  "owner": "string (company/owner name)",
  "location": "string",
  "inspector_name": "string",
  "inspector_id": "string",
  "notes": "string (any additional data as JSON string or plain text)",
  "inspection_data": {} 
}

Rules:
- Dates must be ISO format YYYY-MM-DD
- If a field is not found, use null
- For inspection_data, include ALL structured checklist items, test results, measurements
- For notes, include bucket serial numbers, MAWP values, test pressures, and any other data
- Return ONLY the JSON object`;

const LIST_SYSTEM = `You are an expert at identifying inspection certificates in document images.

List all certificates found. Return ONLY valid JSON array — no markdown, no preamble:
[
  {
    "certificate_number": "string or null",
    "certificate_type": "string",
    "equipment_type": "string",
    "issue_date": "YYYY-MM-DD or null",
    "expiry_date": "YYYY-MM-DD or null",
    "page_reference": "string describing where in document"
  }
]`;

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!geminiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const mode = formData.get("mode") || "extract"; // "extract" | "list"
    const files = formData.getAll("files");

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // ── Read all files in parallel ────────────────────────────────────────────
    const fileBuffers = await Promise.all(
      files.map((f) => f.arrayBuffer())
    );
    const mimeTypes = files.map((f) => f.type || "application/pdf");

    // ── EXTRACT mode ──────────────────────────────────────────────────────────
    if (mode === "extract") {
      // Build file parts in parallel (images are instant; PDFs upload concurrently)
      const partResults = await Promise.all(
        fileBuffers.map((buf, i) => buildGeminiFilePart(buf, mimeTypes[i], geminiKey))
      );

      const filesToDelete = partResults
        .map((r) => r.fileNameToDelete)
        .filter(Boolean);

      const parts = [
        ...partResults.map((r) => r.inlinePart),
        { text: "Extract all certificate information from this document. Return only JSON." },
      ];

      let text = "";
      try {
        text = await callGemini(parts, EXTRACT_SYSTEM, geminiKey);
      } finally {
        // Clean up uploaded PDF files (best-effort, non-blocking)
        filesToDelete.forEach((name) => deleteGeminiFile(name, geminiKey));
      }

      // Parse JSON
      const clean = text.replace(/```json\n?|\n?```/g, "").trim();
      let extracted;
      try {
        extracted = JSON.parse(clean);
      } catch {
        // Try to extract JSON object from response
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) {
          extracted = JSON.parse(match[0]);
        } else {
          throw new Error("Could not parse JSON from AI response");
        }
      }

      return NextResponse.json({ success: true, data: extracted });
    }

    // ── LIST mode ─────────────────────────────────────────────────────────────
    if (mode === "list") {
      // For list mode, race Gemini vs OpenRouter (if available) for speed
      const base64s = fileBuffers.map((buf) => Buffer.from(buf).toString("base64"));

      const geminiTask = async () => {
        const partResults = await Promise.all(
          fileBuffers.map((buf, i) => buildGeminiFilePart(buf, mimeTypes[i], geminiKey))
        );
        const filesToDelete = partResults.map((r) => r.fileNameToDelete).filter(Boolean);

        const parts = [
          ...partResults.map((r) => r.inlinePart),
          { text: "List all inspection certificates found in this document." },
        ];

        let text = "";
        try {
          text = await callGemini(parts, LIST_SYSTEM, geminiKey);
        } finally {
          filesToDelete.forEach((name) => deleteGeminiFile(name, geminiKey));
        }
        return text;
      };

      let text = "";

      if (openRouterKey && mimeTypes.every(isImage)) {
        // Race both providers — first valid JSON array wins
        try {
          text = await Promise.any([
            geminiTask(),
            callOpenRouter(
              base64s,
              mimeTypes,
              LIST_SYSTEM,
              "List all inspection certificates found in this document.",
              openRouterKey
            ),
          ]);
        } catch {
          text = await geminiTask();
        }
      } else {
        text = await geminiTask();
      }

      const clean = text.replace(/```json\n?|\n?```/g, "").trim();
      let items;
      try {
        items = JSON.parse(clean);
      } catch {
        const match = clean.match(/\[[\s\S]*\]/);
        items = match ? JSON.parse(match[0]) : [];
      }

      return NextResponse.json({ success: true, items });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err) {
    console.error("[ai/extract] error:", err);
    return NextResponse.json(
      { error: err.message || "Extraction failed" },
      { status: 500 }
    );
  }
}
