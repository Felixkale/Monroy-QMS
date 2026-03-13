"use client";

import * as pdfjsLib from "pdfjs-dist";

// This makes the worker version match the installed pdfjs package version
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

function normalizeText(text = "") {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanValue(value) {
  if (!value) return null;
  const v = String(value).replace(/\s+/g, " ").trim();
  return v || null;
}

function pickFirst(text, patterns = []) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanValue(match[1]);
  }
  return null;
}

function pickNumber(text, patterns = []) {
  const value = pickFirst(text, patterns);
  if (!value) return null;

  const normalized = value.replace(/,/g, "");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : cleanValue(value);
}

function inferEquipmentType(text) {
  const lower = text.toLowerCase();

  if (lower.includes("pressure vessel")) return "Pressure Vessel";
  if (lower.includes("air receiver")) return "Air Receiver";
  if (lower.includes("boiler")) return "Boiler";
  if (lower.includes("forklift")) return "Forklift";
  if (lower.includes("crane")) return "Crane";
  if (lower.includes("chain block")) return "Chain Block";
  if (lower.includes("lever hoist")) return "Lever Hoist";
  if (lower.includes("shackle")) return "Shackle";
  if (lower.includes("webbing sling")) return "Webbing Sling";
  if (lower.includes("sling")) return "Sling";
  if (lower.includes("lifting")) return "Lifting Equipment";

  return null;
}

function extractCertificateData(rawText) {
  const text = normalizeText(rawText);

  const certificate_number = pickFirst(text, [
    /certificate\s*(?:no|number|#)?\s*[:\-]?\s*([A-Z0-9\/\-_]+)/i,
    /report\s*(?:no|number|#)?\s*[:\-]?\s*([A-Z0-9\/\-_]+)/i,
    /cert(?:ificate)?\s*ref(?:erence)?\s*[:\-]?\s*([A-Z0-9\/\-_]+)/i,
  ]);

  const client_name = pickFirst(text, [
    /client\s*name\s*[:\-]?\s*(.+)/i,
    /client\s*[:\-]?\s*(.+)/i,
    /customer\s*[:\-]?\s*(.+)/i,
    /company\s*[:\-]?\s*(.+)/i,
  ]);

  const asset_name = pickFirst(text, [
    /equipment\s*name\s*[:\-]?\s*(.+)/i,
    /asset\s*name\s*[:\-]?\s*(.+)/i,
    /machine\s*name\s*[:\-]?\s*(.+)/i,
    /description\s*[:\-]?\s*(.+)/i,
  ]);

  const asset_type =
    pickFirst(text, [
      /equipment\s*type\s*[:\-]?\s*(.+)/i,
      /asset\s*type\s*[:\-]?\s*(.+)/i,
      /type\s*[:\-]?\s*(pressure vessel|air receiver|boiler|forklift|crane|chain block|lever hoist|sling|shackle)/i,
    ]) || inferEquipmentType(text);

  const manufacturer = pickFirst(text, [
    /manufacturer\s*[:\-]?\s*(.+)/i,
    /make\s*[:\-]?\s*(.+)/i,
    /manufactured\s*by\s*[:\-]?\s*(.+)/i,
  ]);

  const model = pickFirst(text, [
    /model\s*[:\-]?\s*(.+)/i,
    /model\s*no\s*[:\-]?\s*(.+)/i,
  ]);

  const serial_number = pickFirst(text, [
    /serial\s*number\s*[:\-]?\s*(.+)/i,
    /serial\s*no\s*[:\-]?\s*(.+)/i,
    /s\/n\s*[:\-]?\s*(.+)/i,
  ]);

  const year_built = pickFirst(text, [
    /year\s*built\s*[:\-]?\s*(\d{4})/i,
    /year\s*of\s*manufacture\s*[:\-]?\s*(\d{4})/i,
    /manufactured\s*[:\-]?\s*(\d{4})/i,
    /date\s*of\s*manufacture\s*[:\-]?\s*(\d{4})/i,
  ]);

  const test_pressure_kpa = pickNumber(text, [
    /test\s*pressure\s*[:\-]?\s*([\d,.]+)\s*kpa/i,
    /hydro(?:static)?\s*test\s*pressure\s*[:\-]?\s*([\d,.]+)\s*kpa/i,
    /pressure\s*test\s*[:\-]?\s*([\d,.]+)\s*kpa/i,
  ]);

  const working_pressure_kpa = pickNumber(text, [
    /working\s*pressure\s*[:\-]?\s*([\d,.]+)\s*kpa/i,
    /design\s*pressure\s*[:\-]?\s*([\d,.]+)\s*kpa/i,
    /mawp\s*[:\-]?\s*([\d,.]+)\s*kpa/i,
  ]);

  const swl_tons = pickNumber(text, [
    /swl\s*[:\-]?\s*([\d,.]+)\s*(?:t|ton|tons)/i,
    /safe\s*working\s*load\s*[:\-]?\s*([\d,.]+)\s*(?:t|ton|tons)/i,
  ]);

  const wll_tons = pickNumber(text, [
    /wll\s*[:\-]?\s*([\d,.]+)\s*(?:t|ton|tons)/i,
    /working\s*load\s*limit\s*[:\-]?\s*([\d,.]+)\s*(?:t|ton|tons)/i,
  ]);

  const proof_load_tons = pickNumber(text, [
    /proof\s*load\s*[:\-]?\s*([\d,.]+)\s*(?:t|ton|tons)/i,
  ]);

  const lift_height_m = pickNumber(text, [
    /lift\s*height\s*[:\-]?\s*([\d,.]+)\s*m/i,
    /lifting\s*height\s*[:\-]?\s*([\d,.]+)\s*m/i,
  ]);

  const sling_length_m = pickNumber(text, [
    /sling\s*length\s*[:\-]?\s*([\d,.]+)\s*m/i,
    /length\s*[:\-]?\s*([\d,.]+)\s*m/i,
  ]);

  const installation_date = pickFirst(text, [
    /installation\s*date\s*[:\-]?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
    /date\s*installed\s*[:\-]?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
  ]);

  const location = pickFirst(text, [
    /location\s*[:\-]?\s*(.+)/i,
    /site\s*[:\-]?\s*(.+)/i,
    /plant\s*[:\-]?\s*(.+)/i,
  ]);

  const inspection_date = pickFirst(text, [
    /inspection\s*date\s*[:\-]?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
    /date\s*of\s*inspection\s*[:\-]?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
    /inspected\s*on\s*[:\-]?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
  ]);

  const inspector_name = pickFirst(text, [
    /inspector\s*[:\-]?\s*(.+)/i,
    /examined\s*by\s*[:\-]?\s*(.+)/i,
    /tested\s*by\s*[:\-]?\s*(.+)/i,
  ]);

  return {
    certificate_number,
    client_name,
    asset_name,
    asset_type,
    manufacturer,
    model,
    serial_number,
    year_built,
    working_pressure_kpa,
    test_pressure_kpa,
    swl_tons,
    wll_tons,
    proof_load_tons,
    lift_height_m,
    sling_length_m,
    installation_date,
    location,
    inspection_date,
    inspector_name,
    raw_text: text,
  };
}

export async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;

  let fullText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");

    fullText += `\n\n--- PAGE ${pageNumber} ---\n${pageText}`;
  }

  return normalizeText(fullText);
}

export async function extractPdfCertificateFields(file) {
  const text = await extractTextFromPdf(file);
  return extractCertificateData(text);
}
