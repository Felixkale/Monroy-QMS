// apps/web/src/app/api/ai/extract/route.js

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const FILE_API_BASE = "https://generativelanguage.googleapis.com/upload/v1beta/files";
const GENERATE_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const MAX_FILES = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_CONCURRENCY = Number(process.env.GEMINI_EXTRACT_CONCURRENCY || 4);

const DEFAULT_PROMPT = `You are a senior industrial inspection AI for a QMS system. Extract ALL visible data from the image or document with maximum precision.

NAMEPLATE READING RULES:
- Read brand/manufacturer name exactly as printed
- Equipment type: identify precisely
- SWL/WLL/Capacity: read the large number with unit, put in swl field
- Serial number: read S/No., Serial No., S/N exactly
- Asset tag written in marker/paint, put in asset_tag field
- CE, TUV, SABS marks, put in standard_code

DATE FIELD RULES — CRITICAL:
- "Date:" on equipment nameplate = MANUFACTURE DATE, put ONLY in year_built. NEVER in inspection_date or expiry_date.
- inspection_date = date inspection was performed from certificate document only
- expiry_date = date certificate expires from certificate document only
- For nameplate photos only: leave inspection_date, expiry_date, next_inspection_due as ""

Return ONLY valid JSON, no markdown:
{"equipment_type":"","equipment_description":"","manufacturer":"","model":"","serial_number":"","asset_tag":"","year_built":"","capacity_volume":"","swl":"","working_pressure":"","design_pressure":"","test_pressure":"","pressure_unit":"","material":"","standard_code":"","inspection_number":"","certificate_number":"","certificate_type":"","client_name":"","owner":"","location":"","inspection_date":"","issue_date":"","expiry_date":"","next_inspection_due":"","inspector_name":"","inspector_id":"","inspection_body":"","result":"","defects_found":"","recommendations":"","comments":"","notes":"","nameplate_data":"","raw_text_summary":"","inspection_data":{}}`;

function getGeminiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    ""
  ).trim();
}

function jsonError(message, status = 500, extra = {}) {
  return NextResponse.json(
    {
      success: false,
      ok: false,
      error: message,
      ...extra,
    },
    { status }
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isImage(mimeType = "") {
  return ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"].includes(
    String(mimeType).toLowerCase()
  );
}

function isPdf(mimeType = "") {
  return String(mimeType).toLowerCase() === "application/pdf";
}

function isAllowedMime(mimeType = "") {
  return isPdf(mimeType) || isImage(mimeType);
}

function stripJsonText(text) {
  let clean = String(text || "").trim();

  clean = clean
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return clean;
}

function parseAIJson(text) {
  const clean = stripJsonText(text);

  try {
    return JSON.parse(clean);
  } catch (_) {
    const objectStart = clean.indexOf("{");
    const objectEnd = clean.lastIndexOf("}");
    const arrayStart = clean.indexOf("[");
    const arrayEnd = clean.lastIndexOf("]");

    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      return JSON.parse(clean.slice(arrayStart, arrayEnd + 1));
    }

    if (objectStart >= 0 && objectEnd > objectStart) {
      return JSON.parse(clean.slice(objectStart, objectEnd + 1));
    }

    throw new Error("Could not parse JSON from AI response.");
  }
}

function normalizeExtractedData(input) {
  if (Array.isArray(input)) {
    return { items: input };
  }

  const d = input && typeof input === "object" ? input : {};

  if (Array.isArray(d.items)) {
    return d;
  }

  return {
    equipment_type: String(d.equipment_type || ""),
    equipment_description: String(d.equipment_description || ""),
    manufacturer: String(d.manufacturer || d.make || ""),
    make: String(d.make || d.manufacturer || ""),
    model: String(d.model || ""),
    serial_number: String(d.serial_number || ""),
    asset_tag: String(d.asset_tag || ""),
    year_built: String(d.year_built || ""),
    capacity_volume: String(d.capacity_volume || ""),
    swl: String(d.swl || d.wll || d.capacity || ""),
    working_pressure: String(d.working_pressure || ""),
    design_pressure: String(d.design_pressure || ""),
    test_pressure: String(d.test_pressure || ""),
    pressure_unit: String(d.pressure_unit || ""),
    material: String(d.material || ""),
    standard_code: String(d.standard_code || ""),
    inspection_number: String(d.inspection_number || ""),
    certificate_number: String(d.certificate_number || ""),
    certificate_type: String(d.certificate_type || ""),
    client_name: String(d.client_name || d.owner || ""),
    owner: String(d.owner || d.client_name || ""),
    location: String(d.location || ""),
    inspection_date: String(d.inspection_date || d.issue_date || ""),
    issue_date: String(d.issue_date || d.inspection_date || ""),
    expiry_date: String(d.expiry_date || ""),
    next_inspection_due: String(d.next_inspection_due || ""),
    inspector_name: String(d.inspector_name || ""),
    inspector_id: String(d.inspector_id || ""),
    inspection_body: String(d.inspection_body || ""),
    result: String(d.result || "PASS").toUpperCase(),
    defects_found: String(d.defects_found || ""),
    recommendations: String(d.recommendations || ""),
    comments: String(d.comments || ""),
    notes: String(d.notes || d.comments || d.defects_found || ""),
    nameplate_data: String(d.nameplate_data || ""),
    raw_text_summary: String(d.raw_text_summary || ""),
    inspection_data: d.inspection_data || d,
  };
}

async function mapLimit(items, limit, worker) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 1, items.length || 1));
  const results = new Array(items.length);
  let nextIndex = 0;

  async function run() {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: safeLimit }, run));
  return results;
}

async function uploadToGeminiFileAPI(fileBuffer, mimeType, apiKey, fileName = "upload.pdf") {
  const initRes = await fetch(`${FILE_API_BASE}?uploadType=resumable&key=${apiKey}`, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(fileBuffer.byteLength),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file: {
        display_name: fileName,
      },
    }),
  });

  if (!initRes.ok) {
    const text = await initRes.text();
    throw new Error(`Gemini File API init failed: ${initRes.status} ${text}`);
  }

  const uploadUrl = initRes.headers.get("x-goog-upload-url");

  if (!uploadUrl) {
    throw new Error("Gemini File API did not return an upload URL.");
  }

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
    const text = await uploadRes.text();
    throw new Error(`Gemini file upload failed: ${uploadRes.status} ${text}`);
  }

  const uploadJson = await uploadRes.json();
  const uploadedFile = uploadJson?.file;

  if (!uploadedFile?.name) {
    throw new Error("Gemini file upload response did not include file name.");
  }

  for (let i = 0; i < 40; i += 1) {
    const stateRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${uploadedFile.name}?key=${apiKey}`
    );

    if (stateRes.ok) {
      const stateJson = await stateRes.json();

      if (stateJson?.state === "ACTIVE") {
        return stateJson;
      }

      if (stateJson?.state === "FAILED") {
        throw new Error("Gemini file processing failed.");
      }
    }

    await sleep(1500);
  }

  throw new Error("Gemini file did not become ACTIVE in time.");
}

async function deleteGeminiFile(fileName, apiKey) {
  try {
    if (!fileName) return;

    await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`, {
      method: "DELETE",
    });
  } catch (_) {
    // Best effort cleanup only.
  }
}

async function buildGeminiPart({ base64Data, mimeType, fileName }, apiKey) {
  if (!base64Data) {
    throw new Error(`Missing base64 data for ${fileName || "uploaded file"}.`);
  }

  if (!isAllowedMime(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType || "unknown"}. Use PDF or image.`);
  }

  const buffer = Buffer.from(base64Data, "base64");

  if (buffer.byteLength > MAX_FILE_SIZE) {
    throw new Error(`${fileName || "File"} is too large. Maximum size is 10 MB.`);
  }

  if (isImage(mimeType)) {
    return {
      part: {
        inline_data: {
          mime_type: mimeType,
          data: base64Data,
        },
      },
      fileNameToDelete: null,
    };
  }

  const uploaded = await uploadToGeminiFileAPI(buffer, mimeType, apiKey, fileName);

  return {
    part: {
      file_data: {
        mime_type: mimeType,
        file_uri: uploaded.uri,
      },
    },
    fileNameToDelete: uploaded.name,
  };
}

async function callGeminiForFile(filePayload, systemPrompt) {
  const apiKey = getGeminiKey();

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in Render environment variables.");
  }

  const { part, fileNameToDelete } = await buildGeminiPart(filePayload, apiKey);

  try {
    const res = await fetch(`${GENERATE_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: systemPrompt || DEFAULT_PROMPT,
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              part,
              {
                text: `Extract all visible data from this file and return ONLY valid JSON. File name: ${
                  filePayload.fileName || "uploaded-file"
                }`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          topP: 0.9,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      }),
    });

    const raw = await res.text();

    let responseJson = null;

    try {
      responseJson = raw ? JSON.parse(raw) : null;
    } catch (_) {
      throw new Error(`Gemini returned non-JSON API response: ${raw.slice(0, 250)}`);
    }

    if (!res.ok) {
      throw new Error(
        responseJson?.error?.message || `Gemini generate failed with status ${res.status}`
      );
    }

    const text =
      responseJson?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("\n")
        .trim() || "";

    const parsed = parseAIJson(text);

    return normalizeExtractedData(parsed);
  } finally {
    if (fileNameToDelete) {
      deleteGeminiFile(fileNameToDelete, apiKey);
    }
  }
}

async function fileToPayload(file) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("Invalid uploaded file.");
  }

  const mimeType = file.type || "application/octet-stream";
  const fileName = file.name || "uploaded-file";

  if (!isAllowedMime(mimeType)) {
    throw new Error(`${fileName} is not supported. Upload PDF, PNG, JPG, WEBP, or GIF.`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${fileName} is too large. Maximum size is 10 MB.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return {
    fileName,
    mimeType,
    base64Data: buffer.toString("base64"),
  };
}

async function handleJsonRequest(request) {
  const body = await request.json();

  const files = Array.isArray(body?.files) ? body.files.slice(0, MAX_FILES) : [];
  const systemPrompt = body?.systemPrompt || DEFAULT_PROMPT;

  if (!files.length) {
    return jsonError("No files received. Expected JSON body with a files array.", 400);
  }

  const results = await mapLimit(files, MAX_CONCURRENCY, async (file) => {
    const fileName = file?.fileName || "uploaded-file";

    try {
      const data = await callGeminiForFile(
        {
          fileName,
          mimeType: file?.mimeType || "application/pdf",
          base64Data: file?.base64Data,
        },
        systemPrompt
      );

      return {
        fileName,
        ok: true,
        success: true,
        data,
      };
    } catch (error) {
      return {
        fileName,
        ok: false,
        success: false,
        error: error?.message || "Extraction failed.",
      };
    }
  });

  return NextResponse.json({
    success: true,
    ok: true,
    results,
  });
}

async function handleFormDataRequest(request) {
  const formData = await request.formData();

  const uploadedFiles = [...formData.getAll("files"), ...formData.getAll("file")]
    .filter((file) => file && typeof file.arrayBuffer === "function")
    .slice(0, MAX_FILES);

  const systemPrompt = String(
    formData.get("systemPrompt") || formData.get("prompt") || DEFAULT_PROMPT
  );

  if (!uploadedFiles.length) {
    return jsonError("No files received. Expected multipart/form-data with files.", 400);
  }

  const payloads = await mapLimit(uploadedFiles, MAX_CONCURRENCY, async (file) => {
    return fileToPayload(file);
  });

  const results = await mapLimit(payloads, MAX_CONCURRENCY, async (payload) => {
    try {
      const data = await callGeminiForFile(payload, systemPrompt);

      return {
        fileName: payload.fileName,
        ok: true,
        success: true,
        data,
      };
    } catch (error) {
      return {
        fileName: payload.fileName,
        ok: false,
        success: false,
        error: error?.message || "Extraction failed.",
      };
    }
  });

  const first = results[0];

  if (results.length === 1) {
    if (!first?.ok) {
      return jsonError(first?.error || "Extraction failed.", 500, {
        fileName: first?.fileName || uploadedFiles[0]?.name || "uploaded-file",
        results,
      });
    }

    return NextResponse.json({
      success: true,
      ok: true,
      fileName: first.fileName,
      data: first.data,
      results,
    });
  }

  return NextResponse.json({
    success: true,
    ok: true,
    results,
  });
}

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return await handleJsonRequest(request);
    }

    if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/x-www-form-urlencoded")
    ) {
      return await handleFormDataRequest(request);
    }

    return jsonError(
      `Unsupported Content-Type: ${contentType || "empty"}. Send application/json or multipart/form-data.`,
      415
    );
  } catch (error) {
    console.error("[api/ai/extract] error:", error);

    return jsonError(error?.message || "AI extraction route failed.", 500);
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    ok: true,
    route: "/api/ai/extract",
    model: GEMINI_MODEL,
    hasGeminiApiKey: Boolean(getGeminiKey()),
    maxFiles: MAX_FILES,
    maxFileSizeMB: MAX_FILE_SIZE / 1024 / 1024,
    maxConcurrency: MAX_CONCURRENCY,
  });
}
