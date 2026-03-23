"use client";

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read file."));
        return;
      }

      const base64 = result.split(",")[1];
      resolve(base64);
    };

    reader.onerror = () => reject(new Error("Failed to convert file to base64."));
    reader.readAsDataURL(file);
  });
}

export async function extractTextFromPdf(file) {
  const base64Data = await toBase64(file);

  const response = await fetch("/api/ai/extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      files: [
        {
          fileName: file.name,
          mimeType: file.type || "application/pdf",
          base64Data,
        },
      ],
    }),
  });

  const json = await response.json();

  if (!response.ok || !json?.ok) {
    throw new Error(json?.error || "Failed to extract PDF.");
  }

  const result = Array.isArray(json?.results) ? json.results[0] : null;

  if (!result?.ok) {
    throw new Error(result?.error || "Extraction failed.");
  }

  return result?.extracted_pages_text || result?.data?.raw_text_summary || "";
}

export async function extractPdfCertificateFields(file) {
  const base64Data = await toBase64(file);

  const response = await fetch("/api/ai/extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      files: [
        {
          fileName: file.name,
          mimeType: file.type || "application/pdf",
          base64Data,
        },
      ],
    }),
  });

  const json = await response.json();

  if (!response.ok || !json?.ok) {
    throw new Error(json?.error || "Failed to extract certificate fields.");
  }

  const result = Array.isArray(json?.results) ? json.results[0] : null;

  if (!result?.ok) {
    throw new Error(result?.error || "Extraction failed.");
  }

  return {
    ...result.data,
    raw_text: result?.extracted_pages_text || null,
    parse_errors: [],
    is_valid: true,
  };
}
