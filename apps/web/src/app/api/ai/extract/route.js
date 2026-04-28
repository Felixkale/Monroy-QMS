// apps/web/src/app/api/ai/extract/route.js

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * IMPORTANT SPEED / QUOTA SETTINGS
 *
 * Free Gemini can easily hit quota when many files run in parallel.
 * This route is now safer:
 * - Default concurrency = 1
 * - Adds delay between AI calls
 * - Retries when Gemini says quota/rate limit
 *
 * Recommended Render Environment Variables:
 * GEMINI_API_KEY=your_key_here
 * GEMINI_EXTRACT_CONCURRENCY=1
 * GEMINI_REQUEST_DELAY_MS=5000
 * GEMINI_MAX_RETRIES=3
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const FILE_API_BASE = "https://generativelanguage.googleapis.com/upload/v1beta/files";
const GENERATE_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const MAX_FILES = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// SAFER DEFAULTS FOR FREE GEMINI
const MAX_CONCURRENCY = Math.max(
  1,
  Math.min(Number(process.env.GEMINI_EXTRACT_CONCURRENCY || 1), 4)
);

const GEMINI_REQUEST_DELAY_MS = Number(process.env.GEMINI_REQUEST_DELAY_MS || 5000);
const GEMINI_MAX_RETRIES = Number(process.env.GEMINI_MAX_RETRIES || 3);

const DEFAULT_PROMPT = `You are a senior industrial inspection AI for a QMS system. Extract ALL visible data from the image or document with maximum precision.

NAMEPLATE READING RULES:
- Read brand/manufacturer name exactly as printed
- Equipment type: identify precisely — "Chain Block", "Manual Chain Hoist", "Electric Chain Hoist", "Lever Hoist / Tirfor", "Wire Rope Sling", "Chain Sling", "Web Sling / Flat Sling", "Shackle — Bow / Anchor", "Shackle — D / Dee", "Hook — Swivel", "Safety Harness — Full Body", "Lanyard — Energy Absorbing", "Self-Retracting Lifeline (SRL)", "Spreader Beam", "Lifting Beam", "Beam Clamp", "Electric Winch", "Mobile Crane", "Overhead Crane / EOT Crane", "Pressure Vessel", "Air Receiver", etc.
- SWL/WLL/Capacity: read the large number with unit, put in swl field
- Serial number: read S/No., Serial No., S/N exactly
- Asset tag written in marker/paint, put in asset_tag field
- CE, TUV, SABS marks, put in standard_code

DATE FIELD RULES — CRITICAL:
- "Date:" on equipment nameplate = MANUFACTURE DATE, put ONLY in year_built. NEVER in inspection_date or expiry_date.
- inspection_date = date inspection was performed from certificate document only
- expiry_date = date certificate expires from certificate document only
- For nameplate photos only: leave inspection_date, expiry_date, next_inspection_due as ""

DATE FORMAT:
- Return dates as YYYY-MM-DD where possible.
- If only month/year is visible, return MM/YYYY.
- If only year is visible, return YYYY.

Return ONLY valid JSON, no markdown:
{"equipment_type":"","equipment_description":"","manufacturer":"","make":"","model":"","serial_number":"","asset_tag":"","year_built":"","capacity_volume":"","swl":"","working_pressure":"","design_pressure":"","test_pressure":"","pressure_unit":"","material":"","standard_code":"","inspection_number":"","certificate_number":"","certificate_type":"","client_name":"","owner":"","location":"","inspection_date":"","issue_date":"","expiry_date":"","next_inspection_due":"","inspector_name":"","inspector_id":"","inspection_body":"","result":"","defects_found":"","recommendations":"","comments":"","notes":"","nameplate_data":"","raw_text_summary":"","inspection_data":{}}`;

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

function safeFileName(name = "uploaded-file") {
  return String(name || "uploaded-file")
    .replace(/[^\w.\-() ]+/g, "_")
    .slice(0, 120);
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

function normalizeValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function normalizeExtractedData(input) {
  if (Array.isArray(input)) {
    return { items: input };
  }

  const d = input && typeof input === "object" ? input : {};

  if (Array.isArray(d.items)) {
    return {
      ...d,
      items: d.items.map((item) => ({
        equipment_type: normalizeValue(item?.equipment_type),
        equipment_description: normalizeValue(item?.equipment_description),
        manufacturer: normalizeValue(item?.manufacturer || item?.make),
        make: normalizeValue(item?.make || item?.manufacturer),
        model: normalizeValue(item?.model),
        serial_number: normalizeValue(item?.serial_number),
        asset_tag: normalizeValue(item?.asset_tag),
        year_built: normalizeValue(item?.year_built),
        capacity_volume: normalizeValue(item?.capacity_volume),
        swl: normalizeValue(item?.swl || item?.wll || item?.capacity),
        working_pressure: normalizeValue(item?.working_pressure),
        design_pressure: normalizeValue(item?.design_pressure),
        test_pressure: normalizeValue(item?.test_pressure),
        pressure_unit: normalizeValue(item?.pressure_unit),
        material: normalizeValue(item?.material),
        standard_code: normalizeValue(item?.standard_code),
        inspection_number: normalizeValue(item?.inspection_number),
        certificate_number: normalizeValue(item?.certificate_number),
        certificate_type: normalizeValue(item?.certificate_type),
        client_name: normalizeValue(item?.client_name || item?.owner),
        owner: normalizeValue(item?.owner || item?.client_name),
        location: normalizeValue(item?.location),
        inspection_date: normalizeValue(item?.inspection_date || item?.issue_date),
        issue_date: normalizeValue(item?.issue_date || item?.inspection_date),
        expiry_date: normalizeValue(item?.expiry_date),
        next_inspection_due: normalizeValue(item?.next_inspection_due),
        inspector_name: normalizeValue(item?.inspector_name),
        inspector_id: normalizeValue(item?.inspector_id),
        inspection_body: normalizeValue(item?.inspection_body),
        result: normalizeValue(item?.result || "PASS").toUpperCase(),
        defects_found: normalizeValue(item?.defects_found),
        recommendations: normalizeValue(item?.recommendations),
        comments: normalizeValue(item?.comments),
        notes: normalizeValue(item?.notes || item?.comments || item?.defects_found),
        nameplate_data: normalizeValue(item?.nameplate_data),
        raw_text_summary: normalizeValue(item?.raw_text_summary),
        inspection_data: item?.inspection_data || item || {},
      })),
    };
  }

  return {
    equipment_type: normalizeValue(d.equipment_type),
    equipment_description: normalizeValue(d.equipment_description),
    manufacturer: normalizeValue(d.manufacturer || d.make),
    make: normalizeValue(d.make || d.manufacturer),
    model: normalizeValue(d.model),
    serial_number: normalizeValue(d.serial_number),
    asset_tag: normalizeValue(d.asset_tag),
    year_built: normalizeValue(d.year_built),
    capacity_volume: normalizeValue(d.capacity_volume),
    swl: normalizeValue(d.swl || d.wll || d.capacity),
    working_pressure: normalizeValue(d.working_pressure),
    design_pressure: normalizeValue(d.design_pressure),
    test_pressure: normalizeValue(d.test_pressure),
    pressure_unit: normalizeValue(d.pressure_unit),
    material: normalizeValue(d.material),
    standard_code: normalizeValue(d.standard_code),
    inspection_number: normalizeValue(d.inspection_number),
    certificate_number: normalizeValue(d.certificate_number),
    certificate_type: normalizeValue(d.certificate_type),
    client_name: normalizeValue(d.client_name || d.owner),
    owner: normalizeValue(d.owner || d.client_name),
    location: normalizeValue(d.location),
    inspection_date: normalizeValue(d.inspection_date || d.issue_date),
    issue_date: normalizeValue(d.issue_date || d.inspection_date),
    expiry_date: normalizeValue(d.expiry_date),
    next_inspection_due: normalizeValue(d.next_inspection_due),
    inspector_name: normalizeValue(d.inspector_name),
    inspector_id: normalizeValue(d.inspector_id),
    inspection_body: normalizeValue(d.inspection_body),
    result: normalizeValue(d.result || "PASS").toUpperCase(),
    defects_found: normalizeValue(d.defects_found),
    recommendations: normalizeValue(d.recommendations),
    comments: normalizeValue(d.comments),
    notes: normalizeValue(d.notes || d.comments || d.defects_found),
    nameplate_data: normalizeValue(d.nameplate_data),
    raw_text_summary: normalizeValue(d.raw_text_summary),
    inspection_data: d.inspection_data || d || {},
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

function getRetryDelayFromGeminiError(errorJson, fallbackMs) {
  const details = Array.isArray(errorJson?.error?.details) ? errorJson.error.details : [];

  for (const detail of details) {
    const retryDelay = detail?.retryDelay;

    if (typeof retryDelay === "string") {
      const seconds = Number(retryDelay.replace("s", ""));
      if (!Number.isNaN(seconds) && seconds > 0) {
        return Math.ceil(seconds * 1000) + 1000;
      }
    }
  }

  const message = String(errorJson?.error?.message || "");
  const retryMatch = message.match(/retry\s+in\s+([\d.]+)s/i);

  if (retryMatch?.[1]) {
    const seconds = Number(retryMatch[1]);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return Math.ceil(seconds * 1000) + 1000;
    }
  }

  return fallbackMs;
}

function isQuotaOrRateLimitError(error) {
  const message = String(error?.message || "").toLowerCase();

  return (
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("resource_exhausted") ||
    message.includes("too many requests")
  );
}

async function withRetry(label, worker) {
  let lastError = null;

  for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt += 1) {
    try {
      if (attempt > 0) {
        const waitMs = GEMINI_REQUEST_DELAY_MS * attempt;
        console.warn(`[ai/extract] retrying ${label}, attempt ${attempt + 1}, waiting ${waitMs}ms`);
        await sleep(waitMs);
      }

      return await worker();
    } catch (error) {
      lastError = error;

      if (!isQuotaOrRateLimitError(error) || attempt >= GEMINI_MAX_RETRIES) {
        throw error;
      }
    }
  }

  throw lastError || new Error(`${label} failed.`);
}

async function uploadToGeminiFileAPI(fileBuffer, mimeType, apiKey, fileName = "upload.pdf") {
  return withRetry(`Gemini file upload ${fileName}`, async () => {
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
          display_name: safeFileName(fileName),
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
  });
}

async function deleteGeminiFile(fileName, apiKey) {
  try {
    if (!fileName) return;

    await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`, {
      method: "DELETE",
    });
  } catch (_) {
    // Best-effort cleanup only.
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
    return await withRetry(`Gemini generate ${filePayload.fileName || "uploaded-file"}`, async () => {
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
        const retryDelayMs = getRetryDelayFromGeminiError(
          responseJson,
          GEMINI_REQUEST_DELAY_MS
        );

        const error = new Error(
          responseJson?.error?.message ||
            `Gemini generate failed with status ${res.status}`
        );

        error.status = res.status;
        error.retryDelayMs = retryDelayMs;
        throw error;
      }

      const text =
        responseJson?.candidates?.[0]?.content?.parts
          ?.map((p) => p.text || "")
          .join("\n")
          .trim() || "";

      const parsed = parseAIJson(text);

      return normalizeExtractedData(parsed);
    });
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
  const fileName = safeFileName(file.name || "uploaded-file");

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

async function processPayloads(payloads, systemPrompt) {
  return mapLimit(payloads, MAX_CONCURRENCY, async (payload, index) => {
    const fileName = payload?.fileName || `uploaded-file-${index + 1}`;

    try {
      /**
       * Delay before each file except first one.
       * This protects the free Gemini quota.
       */
      if (index > 0) {
        await sleep(GEMINI_REQUEST_DELAY_MS * index);
      }

      const data = await callGeminiForFile(
        {
          fileName,
          mimeType: payload?.mimeType || "application/pdf",
          base64Data: payload?.base64Data,
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
      let message = error?.message || "Extraction failed.";

      if (isQuotaOrRateLimitError(error)) {
        message =
          "Gemini quota/rate limit reached. Wait 1 minute and try again, or reduce files. " +
          message;
      }

      return {
        fileName,
        ok: false,
        success: false,
        error: message,
      };
    }
  });
}

async function handleJsonRequest(request) {
  const body = await request.json();

  const files = Array.isArray(body?.files) ? body.files.slice(0, MAX_FILES) : [];
  const systemPrompt = body?.systemPrompt || DEFAULT_PROMPT;

  if (!files.length) {
    return jsonError("No files received. Expected JSON body with a files array.", 400);
  }

  const payloads = files.map((file, index) => ({
    fileName: safeFileName(file?.fileName || `uploaded-file-${index + 1}`),
    mimeType: file?.mimeType || "application/pdf",
    base64Data: file?.base64Data || "",
  }));

  const results = await processPayloads(payloads, systemPrompt);

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

  const payloads = await mapLimit(uploadedFiles, 2, async (file) => fileToPayload(file));
  const results = await processPayloads(payloads, systemPrompt);

  const first = results[0];

  /**
   * Keep old frontend compatibility:
   * Old page expects { success:true, data:{...} } when one file is uploaded.
   */
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
    requestDelayMs: GEMINI_REQUEST_DELAY_MS,
    maxRetries: GEMINI_MAX_RETRIES,
  });
}
