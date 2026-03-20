// FILE: /apps/web/src/lib/nameplateParser.js

import {
  normalizeText,
  detectEquipmentType,
  buildEquipmentDescription,
} from "@/lib/equipmentDetection";

function findByRegex(text, patterns = []) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return normalizeText(match[1]);
  }
  return "";
}

export function parseNameplateText(rawText = "") {
  const text = normalizeText(rawText);
  const block = rawText || "";

  const manufacturer = findByRegex(block, [
    /(?:manufacturer|make)\s*[:\-]\s*(.+)/i,
    /(?:mfr)\s*[:\-]\s*(.+)/i,
  ]);

  const model = findByRegex(block, [
    /(?:model|type)\s*[:\-]\s*(.+)/i,
  ]);

  const serial_number = findByRegex(block, [
    /(?:serial(?:\s*no|\s*number)?|s\/n)\s*[:#\-]?\s*(.+)/i,
  ]);

  const year_built = findByRegex(block, [
    /(?:year built|year|manufactured)\s*[:\-]\s*(\d{4})/i,
  ]);

  const capacity = findByRegex(block, [
    /(?:capacity|volume)\s*[:\-]\s*(.+)/i,
  ]);

  const swl = findByRegex(block, [
    /(?:swl|wll|safe working load)\s*[:\-]?\s*(.+)/i,
  ]);

  const mawp = findByRegex(block, [
    /(?:mawp|working pressure)\s*[:\-]?\s*(.+)/i,
  ]);

  const design_pressure = findByRegex(block, [
    /(?:design pressure)\s*[:\-]?\s*(.+)/i,
  ]);

  const test_pressure = findByRegex(block, [
    /(?:test pressure|hydro test pressure)\s*[:\-]?\s*(.+)/i,
  ]);

  const country_of_origin = findByRegex(block, [
    /(?:country of origin|origin|made in)\s*[:\-]?\s*(.+)/i,
  ]);

  const equipment_id = findByRegex(block, [
    /(?:equipment id|asset id|id no|identification number)\s*[:\-]?\s*(.+)/i,
  ]);

  const detection = detectEquipmentType({
    raw_text: rawText,
    manufacturer,
    model,
    serial_number,
    capacity,
    swl,
    mawp,
  });

  const equipment_type = detection.type;
  const document_category = detection.category;

  const equipment_description = buildEquipmentDescription({
    manufacturer,
    equipment_type,
    model,
    capacity,
    serial_number,
    identification_number: equipment_id,
  });

  return {
    manufacturer,
    model,
    serial_number,
    year_built,
    capacity,
    swl,
    mawp,
    design_pressure,
    test_pressure,
    country_of_origin,
    equipment_id,
    equipment_type,
    equipment_description,
    document_category,
    raw_text: text,
  };
}
