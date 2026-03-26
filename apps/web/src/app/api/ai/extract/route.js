import { NextResponse } from "next/server";

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY;

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MAX_CONCURRENCY = 3;
const FILE_API_BASE = "https://generativelanguage.googleapis.com";

const EMPTY_RESULT = {
  equipment_type: "",
  equipment_description: "",
  manufacturer: "",
  model: "",
  serial_number: "",
  year_built: "",
  capacity_volume: "",
  swl: "",
  working_pressure: "",
  design_pressure: "",
  test_pressure: "",
  pressure_unit: "",
  material: "",
  standard_code: "",
  inspection_number: "",
  client_name: "",
  location: "",
  inspection_date: "",
  expiry_date: "",
  next_inspection_due: "",
  inspector_name: "",
  inspection_body: "",
  result: "",
  defects_found: "",
  recommendations: "",
  comments: "",
  qr_code_data: "",
  nameplate_data: "",
  raw_text_summary: "",
};

const RESPONSE_SCHEMA = {
  type: "object",
  properties: Object.fromEntries(
    Object.keys(EMPTY_RESULT).map((key) => [key, { type: "string" }])
  ),
  required: Object.keys(EMPTY_RESULT),
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeString(value) {
  if (value == null) return "";
  return String(value).trim();
}

function normalizeResultValue(value) {
  const v = sanitizeString(value).toUpperCase().replace(/\s+/g, "_");
  if (["PASS", "FAIL", "CONDITIONAL", "UNKNOWN"].includes(v)) return v;
  if (v === "REPAIR_REQUIRED") return "CONDITIONAL";
  if (v === "OUT_OF_SERVICE") return "FAIL";
  return v || "UNKNOWN";
}

function normalizeData(obj) {
  const merged = { ...EMPTY_RESULT, ...(obj || {}) };
  const normalized = {};

  for (const key of Object.keys(EMPTY_RESULT)) {
    normalized[key] = sanitizeString(merged[key]);
  }

  normalized.result = normalizeResultValue(normalized.result);
  return normalized;
}

function stripCodeFences(text) {
  return String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractJsonString(text) {
  const cleaned = stripCodeFences(text);
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

function getCandidateText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function isAllowedMimeType(mimeType) {
  return (
    mimeType === "application/pdf" ||
    mimeType === "image/png" ||
    mimeType === "image/jpeg" ||
    mimeType === "image/webp"
  );
}

async function startResumableUpload({ displayName, mimeType, sizeBytes }) {
  const url = `${FILE_API_BASE}/upload/v1beta/files?key=${encodeURIComponent(
    GEMINI_API_KEY
  )}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(sizeBytes),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file: {
        display_name: displayName,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Files API start failed: ${text || response.status}`);
  }

  const uploadUrl =
    response.headers.get("x-goog-upload-url") ||
    response.headers.get("X-Goog-Upload-URL");

  if (!uploadUrl) {
    throw new Error("Files API did not return an upload URL.");
  }

  return uploadUrl;
}

async function uploadFileBytes(uploadUrl, bytes) {
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(bytes.byteLength),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: bytes,
  });

  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.file) {
    throw new Error(
      json?.error?.message || `Files API upload failed with status ${response.status}`
    );
  }

  return json.file;
}

async function getFileByName(name) {
  const response = await fetch(
    `${FILE_API_BASE}/v1beta/${name}?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: "GET",
    }
  );

  const json = await response.json().catch(() => null);

  if (!response.ok || !json) {
    throw new Error(
      json?.error?.message || `Files API get failed with status ${response.status}`
    );
  }

  return json;
}

async function waitUntilActive(file) {
  let current = file;
  const maxPolls = 25;

  for (let i = 0; i < maxPolls; i += 1) {
    const state = current?.state || "STATE_UNSPECIFIED";

    if (state === "ACTIVE" || state === "FILE_STATE_ACTIVE") {
      return current;
    }

    if (state === "FAILED" || state === "FILE_STATE_FAILED") {
      throw new Error(current?.error?.message || "Uploaded file failed processing.");
    }

    await sleep(1200);
    current = await getFileByName(current.name);
  }

  throw new Error("Uploaded file did not become ACTIVE in time.");
}

async function deleteFile(name) {
  if (!name) return;

  try {
    await fetch(
      `${FILE_API_BASE}/v1beta/${name}?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      {
        method: "DELETE",
      }
    );
  } catch {
    // ignore cleanup failure
  }
}

async function generateFromFile({ file, systemPrompt, fileName }) {
  const response = await fetch(
    `${FILE_API_BASE}/v1beta/models/${encodeURIComponent(
      MODEL
    )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  "Extract inspection certificate fields from this document or image. " +
                  "Return only valid JSON matching the schema. " +
                  `Original filename: ${fileName || "uploaded-file"}`,
              },
              {
                file_data: {
                  mime_type: file.mimeType,
                  file_uri: file.uri,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          topP: 0.95,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    }
  );

  const json = await response.json().catch(() => null);

  if (!response.ok || !json) {
    throw new Error(
      json?.error?.message ||
        `generateContent failed with status ${response.status}`
    );
  }

  return json;
}

async function processOneFile(file, systemPrompt) {
  const fileName = sanitizeString(file?.fileName) || "uploaded-file";
  const mimeType = sanitizeString(file?.mimeType);
  const base64Data = sanitizeString(file?.base64Data);

  if (!isAllowedMimeType(mimeType)) {
    return {
      fileName,
      ok: false,
      error: `Unsupported file type: ${mimeType || "unknown"}`,
    };
  }

  if (!base64Data) {
    return {
      fileName,
      ok: false,
      error: "Missing base64Data.",
    };
  }

  let uploadedFile = null;

  try {
    const bytes = Buffer.from(base64Data, "base64");
    const uploadUrl = await startResumableUpload({
      displayName: fileName,
      mimeType,
      sizeBytes: bytes.byteLength,
    });

    uploadedFile = await uploadFileBytes(uploadUrl, bytes);
    uploadedFile = await waitUntilActive(uploadedFile);

    const modelPayload = await generateFromFile({
      file: uploadedFile,
      systemPrompt,
      fileName,
    });

    const rawText = getCandidateText(modelPayload);
    const jsonText = extractJsonString(rawText);

    let parsed = null;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      parsed = null;
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        fileName,
        ok: false,
        error: "Model returned invalid JSON.",
        raw: rawText || "",
      };
    }

    return {
      fileName,
      ok: true,
      data: normalizeData(parsed),
      usage: modelPayload?.usageMetadata || null,
    };
  } catch (error) {
    return {
      fileName,
      ok: false,
      error: error?.message || "Extraction failed.",
    };
  } finally {
    if (uploadedFile?.name) {
      await deleteFile(uploadedFile.name);
    }
  }
}

async function runPool(items, worker, concurrency = 3) {
  const results = new Array(items.length);
  let index = 0;

  async function next() {
    const current = index;
    index += 1;
    if (current >= items.length) return;

    results[current] = await worker(items[current], current);
    await next();
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => next()
  );

  await Promise.all(workers);
  return results;
}

export async function POST(request) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Missing GEMINI_API_KEY. Add GEMINI_API_KEY in Render environment variables.",
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || !Array.isArray(body.files) || body.files.length === 0) {
      return NextResponse.json(
        { error: "Request body must include a non-empty files array." },
        { status: 400 }
      );
    }

    const systemPrompt =
      sanitizeString(body.systemPrompt) ||
      "Extract structured JSON from the provided inspection document.";

    const results = await runPool(
      body.files,
      (file) => processOneFile(file, systemPrompt),
      MAX_CONCURRENCY
    );

    return NextResponse.json({
      results,
      mode: "files_api",
      model: MODEL,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}
