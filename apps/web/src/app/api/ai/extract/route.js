import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min

const MODEL = "gemini-2.5-flash";
const FILE_API_BASE = "https://generativelanguage.googleapis.com";
const MAX_RETRIES = 3;

// ── Key pool — add up to 5 keys to multiply your rate limit ──────────────
const KEY_POOL = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
].filter(Boolean);

// Each key gets 1 request per 12s. With N keys the effective delay is 12000/N ms.
const PER_KEY_DELAY_MS = 12000;
const EFFECTIVE_DELAY_MS = Math.ceil(
  PER_KEY_DELAY_MS / Math.max(KEY_POOL.length, 1)
);

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    equipment_type: { type: "string" },
    equipment_description: { type: "string" },
    manufacturer: { type: "string" },
    model: { type: "string" },
    serial_number: { type: "string" },
    year_built: { type: "string" },
    capacity_volume: { type: "string" },
    swl: { type: "string" },
    working_pressure: { type: "string" },
    design_pressure: { type: "string" },
    test_pressure: { type: "string" },
    pressure_unit: { type: "string" },
    material: { type: "string" },
    standard_code: { type: "string" },
    inspection_number: { type: "string" },
    client_name: { type: "string" },
    location: { type: "string" },
    inspection_date: { type: "string" },
    expiry_date: { type: "string" },
    next_inspection_due: { type: "string" },
    inspector_name: { type: "string" },
    inspection_body: { type: "string" },
    result: { type: "string" },
    defects_found: { type: "string" },
    recommendations: { type: "string" },
    comments: { type: "string" },
    nameplate_data: { type: "string" },
    raw_text_summary: { type: "string" },
  },
  required: [
    "equipment_type",
    "result",
    "client_name",
    "serial_number",
    "inspection_date",
    "expiry_date",
  ],
};

// Round-robin key selector
let keyIndex = 0;
function nextKey() {
  if (KEY_POOL.length === 0) return null;
  const key = KEY_POOL[keyIndex % KEY_POOL.length];
  keyIndex++;
  return key;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitize(v) {
  return v == null ? "" : String(v).trim();
}

function normalizeResult(v) {
  const n = sanitize(v).toUpperCase().replace(/\s+/g, "_");
  if (
    ["PASS", "FAIL", "CONDITIONAL", "REPAIR_REQUIRED", "OUT_OF_SERVICE"].includes(
      n
    )
  ) {
    return n;
  }
  if (n === "REPAIR REQUIRED") return "REPAIR_REQUIRED";
  return "UNKNOWN";
}

function extractText(payload) {
  return (payload?.candidates?.[0]?.content?.parts || [])
    .map((p) => (typeof p?.text === "string" ? p.text : ""))
    .join("")
    .trim();
}

function cleanJson(text) {
  return String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractJsonObj(text) {
  const cleaned = cleanJson(text);
  const i = cleaned.indexOf("{");
  const j = cleaned.lastIndexOf("}");

  if (i >= 0 && j > i) {
    try {
      return JSON.parse(cleaned.slice(i, j + 1));
    } catch {}
  }

  try {
    return JSON.parse(cleaned);
  } catch {}

  return null;
}

async function uploadFile(bytes, mimeType, displayName, apiKey) {
  const startRes = await fetch(
    `${FILE_API_BASE}/upload/v1beta/files?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(bytes.byteLength),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: { display_name: displayName },
      }),
    }
  );

  if (!startRes.ok) {
    const errText = await startRes.text().catch(() => "");
    throw new Error(`Upload start failed: ${startRes.status} ${errText}`);
  }

  const uploadUrl = startRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) {
    throw new Error("No upload URL returned");
  }

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(bytes.byteLength),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: bytes,
  });

  const uploadJson = await uploadRes.json().catch(() => null);

  if (!uploadRes.ok || !uploadJson?.file) {
    throw new Error(
      uploadJson?.error?.message || `Upload failed: ${uploadRes.status}`
    );
  }

  let file = uploadJson.file;

  for (let i = 0; i < 20; i++) {
    const state = file?.state || "";

    if (state === "ACTIVE" || state === "FILE_STATE_ACTIVE") {
      return file;
    }

    if (state === "FAILED" || state === "FILE_STATE_FAILED") {
      throw new Error("File processing failed");
    }

    await sleep(1500);

    const pollRes = await fetch(`${FILE_API_BASE}/v1beta/${file.name}?key=${apiKey}`);
    file = await pollRes.json().catch(() => file);
  }

  throw new Error("File did not become ACTIVE in time");
}

async function deleteFile(name, apiKey) {
  if (!name || !apiKey) return;

  try {
    await fetch(`${FILE_API_BASE}/v1beta/${name}?key=${apiKey}`, {
      method: "DELETE",
    });
  } catch {}
}

async function callGemini(file, fileName, systemPrompt, apiKey, listMode = false) {
  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Extract inspection certificate data from this file. Filename: ${fileName}`,
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
    generationConfig: listMode
      ? {
          temperature: 0.1,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        }
      : {
          temperature: 0.1,
          topP: 0.95,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(
      `${FILE_API_BASE}/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (res.status === 429) {
      const retryAfterHeader = res.headers.get("retry-after");
      const retryAfterMs = retryAfterHeader
        ? parseInt(retryAfterHeader, 10) * 1000
        : 0;

      const waitMs = Math.max(retryAfterMs, EFFECTIVE_DELAY_MS * (attempt + 1));

      console.log(
        `Gemini rate limited for ${fileName}. Waiting ${waitMs}ms before retry ${attempt + 1}/${MAX_RETRIES}`
      );

      await sleep(waitMs);
      continue;
    }

    const json = await res.json().catch(() => null);

    if (!res.ok || !json) {
      throw new Error(json?.error?.message || `Gemini error ${res.status}`);
    }

    return json;
  }

  throw new Error("Rate limit exceeded after retries. Please try again in 1 minute.");
}

async function processOneFile(fileData, systemPrompt, listMode = false) {
  const { fileName, mimeType, base64Data } = fileData;
  let uploadedFile = null;
  const apiKey = nextKey();

  try {
    if (!apiKey) {
      throw new Error("No GEMINI_API_KEY set in Render environment variables.");
    }

    const bytes = Buffer.from(base64Data, "base64");
    uploadedFile = await uploadFile(bytes, mimeType, fileName, apiKey);

    const payload = await callGemini(
      uploadedFile,
      fileName,
      systemPrompt,
      apiKey,
      listMode
    );

    const rawText = extractText(payload);
    const parsed = extractJsonObj(rawText);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        fileName,
        ok: false,
        error: "Model returned invalid JSON.",
        raw: rawText?.slice(0, 300),
      };
    }

    if (listMode) {
      return {
        fileName,
        ok: true,
        data: parsed,
        usage: payload?.usageMetadata || null,
      };
    }

    const data = {};
    for (const [k, v] of Object.entries(parsed)) {
      data[k] = sanitize(v);
    }

    data.result = normalizeResult(data.result);

    return {
      fileName,
      ok: true,
      data,
      usage: payload?.usageMetadata || null,
    };
  } catch (err) {
    return {
      fileName,
      ok: false,
      error: err?.message || "Extraction failed.",
    };
  } finally {
    if (uploadedFile?.name) {
      await deleteFile(uploadedFile.name, apiKey);
    }
  }
}

export async function POST(request) {
  try {
    if (KEY_POOL.length === 0) {
      return NextResponse.json(
        { error: "No GEMINI_API_KEY set in Render environment variables." },
        { status: 500 }
      );
    }

    console.log(
      `Gemini key pool: ${KEY_POOL.length} key(s), effective delay: ${EFFECTIVE_DELAY_MS}ms between requests`
    );

    const body = await request.json().catch(() => null);

    if (!body || !Array.isArray(body.files) || body.files.length === 0) {
      return NextResponse.json(
        { error: "Request must include a non-empty files array." },
        { status: 400 }
      );
    }

    const systemPrompt =
      body.systemPrompt ||
      "Extract structured JSON from the provided inspection certificate document. Return only valid JSON.";

    const results = [];

    for (let i = 0; i < body.files.length; i++) {
      const file = body.files[i];

      console.log(`Processing file ${i + 1}/${body.files.length}: ${file.fileName}`);

      const result = await processOneFile(
        file,
        systemPrompt,
        body.listMode === true
      );

      results.push(result);

      if (i < body.files.length - 1) {
        console.log(`Waiting ${EFFECTIVE_DELAY_MS}ms before next file...`);
        await sleep(EFFECTIVE_DELAY_MS);
      }
    }

    return NextResponse.json({
      results,
      model: MODEL,
      processed: results.length,
    });
  } catch (err) {
    console.error("AI extract error:", err);

    return NextResponse.json(
      { error: err?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}
