"use client";

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  extractCertificateData,
  sanitizeParsed,
  validateParsed,
} from "@/lib/certificateParser";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

function normalizeText(text = "") {
  return String(text)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: true,
    isEvalSupported: false,
  }).promise;

  let fullText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const lineMap = new Map();

    for (const item of content.items) {
      if (!("str" in item) || !item.str) continue;

      const y = Math.round(item.transform?.[5] || 0);
      const x = item.transform?.[4] || 0;

      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push({ x, str: item.str });
    }

    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);

    let pageText = "";
    for (const y of sortedYs) {
      const lineText = lineMap
        .get(y)
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (lineText) pageText += lineText + "\n";
    }

    fullText += `\n\n--- PAGE ${pageNumber} ---\n${pageText}`;
  }

  return normalizeText(fullText);
}

export async function extractPdfCertificateFields(file) {
  const text = await extractTextFromPdf(file);
  const raw = extractCertificateData(text);
  const parsed = sanitizeParsed(raw);
  const errors = validateParsed(parsed);

  return {
    ...parsed,
    raw_text: text,
    parse_errors: errors,
    is_valid: errors.length === 0,
  };
}
