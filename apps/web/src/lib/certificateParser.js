// FILE: /apps/web/src/lib/certificateParser.js

import {
  buildEquipmentDescription,
  detectEquipmentType,
  normalizeText,
} from "@/lib/equipmentDetection";

export { normalizeText };

export function sanitizeParsed(raw = {}) {
  const detection = detectEquipmentType(raw);
  const equipment_type = raw.equipment_type || raw.asset_type || detection.type;
  const equipment_description =
    raw.equipment_description ||
    buildEquipmentDescription({
      manufacturer: raw.manufacturer,
      equipment_type,
      model: raw.model,
      capacity: raw.capacity,
      serial_number: raw.serial_number,
      identification_number: raw.identification_number,
      equipment_id: raw.equipment_id,
    });

  return {
    company: normalizeText(raw.company),
    location: normalizeText(raw.location),
    equipment_location: normalizeText(raw.equipment_location),
    manufacturer: normalizeText(raw.manufacturer),
    model: normalizeText(raw.model),
    serial_number: normalizeText(raw.serial_number),
    identification_number: normalizeText(raw.identification_number),
    equipment_id: normalizeText(raw.equipment_id),
    year_built: normalizeText(raw.year_built),
    capacity: normalizeText(raw.capacity),
    swl: normalizeText(raw.swl),
    mawp: normalizeText(raw.mawp),
    design_pressure: normalizeText(raw.design_pressure),
    test_pressure: normalizeText(raw.test_pressure),
    country_of_origin: normalizeText(raw.country_of_origin),
    certificate_type: normalizeText(raw.certificate_type || detection.category),
    equipment_status: normalizeText(raw.equipment_status || "PASS"),
    inspector_name: normalizeText(raw.inspector_name),
    inspector_id: normalizeText(raw.inspector_id),
    last_inspection_date: normalizeText(raw.last_inspection_date),
    next_inspection_date: normalizeText(raw.next_inspection_date),
    inspection_no: normalizeText(raw.inspection_no),
    lanyard_serial_no: normalizeText(raw.lanyard_serial_no),
    asset_type: equipment_type,
    equipment_type,
    equipment_description,
    issued_at: raw.issued_at || raw.last_inspection_date || null,
    pdf_url: raw.pdf_url || null,
    signature_url: raw.signature_url || null,
  };
}

export function validateParsed(parsed = {}) {
  const errors = [];
  if (!normalizeText(parsed.company)) errors.push("Company missing");
  if (!normalizeText(parsed.equipment_type)) errors.push("Equipment type missing");
  if (!normalizeText(parsed.equipment_description)) errors.push("Equipment description missing");
  return errors;
}

export function extractCertificateData(text = "") {
  const value = String(text || "");

  const take = (...patterns) => {
    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match?.[1]) return normalizeText(match[1]);
    }
    return "";
  };

  return {
    company: take(/(?:client|company)\s*[:\-]\s*(.+)/i),
    location: take(/(?:location|site)\s*[:\-]\s*(.+)/i),
    equipment_location: take(/(?:equipment location)\s*[:\-]\s*(.+)/i),
    manufacturer: take(/(?:manufacturer|make)\s*[:\-]\s*(.+)/i),
    model: take(/(?:model|type)\s*[:\-]\s*(.+)/i),
    serial_number: take(/(?:serial(?:\s*no|\s*number)?|s\/n)\s*[:#\-]?\s*(.+)/i),
    identification_number: take(/(?:identification number|id no)\s*[:\-]\s*(.+)/i),
    equipment_id: take(/(?:equipment id|asset id)\s*[:\-]\s*(.+)/i),
    year_built: take(/(?:year built|year)\s*[:\-]\s*(\d{4})/i),
    capacity: take(/(?:capacity|volume)\s*[:\-]\s*(.+)/i),
    swl: take(/(?:swl|wll|safe working load)\s*[:\-]?\s*(.+)/i),
    mawp: take(/(?:mawp|working pressure)\s*[:\-]?\s*(.+)/i),
    design_pressure: take(/(?:design pressure)\s*[:\-]?\s*(.+)/i),
    test_pressure: take(/(?:test pressure)\s*[:\-]?\s*(.+)/i),
    country_of_origin: take(/(?:country of origin|made in)\s*[:\-]?\s*(.+)/i),
    certificate_type: take(/(?:certificate type)\s*[:\-]\s*(.+)/i),
    equipment_status: take(/(?:result|status)\s*[:\-]\s*(PASS|FAIL|REPAIR REQUIRED|OUT OF SERVICE)/i),
    inspector_name: take(/(?:inspector)\s*[:\-]\s*(.+)/i),
    inspector_id: take(/(?:inspector id|id no)\s*[:\-]\s*(.+)/i),
    last_inspection_date: take(/(?:inspection date|last inspection date)\s*[:\-]\s*(.+)/i),
    next_inspection_date: take(/(?:expiry date|next inspection date)\s*[:\-]\s*(.+)/i),
    inspection_no: take(/(?:inspection no|inspection number)\s*[:\-]\s*(.+)/i),
    lanyard_serial_no: take(/(?:lanyard serial no)\s*[:\-]\s*(.+)/i),
  };
}

export function mapParsedToEquipment(parsed = {}, clientId) {
  return {
    client_id: clientId,
    asset_name: parsed.equipment_description,
    asset_type: parsed.equipment_type,
    equipment_type: parsed.equipment_type,
    equipment_description: parsed.equipment_description,
    manufacturer: parsed.manufacturer,
    model: parsed.model,
    serial_number: parsed.serial_number || parsed.identification_number || parsed.equipment_id,
    year_built: parsed.year_built,
    capacity: parsed.capacity,
    swl: parsed.swl,
    working_pressure: parsed.mawp,
    design_pressure: parsed.design_pressure,
    test_pressure: parsed.test_pressure,
    identification_number: parsed.identification_number,
    equipment_id: parsed.equipment_id,
    country_of_origin: parsed.country_of_origin,
  };
}

export function mapParsedToCertificate(parsed = {}, assetId, clientName) {
  return {
    asset_id: assetId,
    client_id: parsed.client_id || null,
    company_name: clientName || parsed.company,
    asset_type: parsed.equipment_type,
    equipment_type: parsed.equipment_type,
    equipment_description: parsed.equipment_description,
    certificate_type: parsed.certificate_type,
    document_category: parsed.certificate_type,
    document_status: "Active",
    equipment_status: parsed.equipment_status || "PASS",
    inspection_date: parsed.last_inspection_date || null,
    issue_date: parsed.last_inspection_date || null,
    expiry_date: parsed.next_inspection_date || null,
    last_inspection_date: parsed.last_inspection_date || null,
    next_inspection_date: parsed.next_inspection_date || null,
    issued_at: parsed.issued_at || null,
    manufacturer: parsed.manufacturer,
    model: parsed.model,
    serial_number: parsed.serial_number,
    year_built: parsed.year_built,
    capacity: parsed.capacity,
    swl: parsed.swl,
    mawp: parsed.mawp,
    design_pressure: parsed.design_pressure,
    test_pressure: parsed.test_pressure,
    country_of_origin: parsed.country_of_origin,
    identification_number: parsed.identification_number,
    equipment_id: parsed.equipment_id,
    inspector_name: parsed.inspector_name,
    inspector_id: parsed.inspector_id,
    signature_url: parsed.signature_url || null,
    pdf_url: parsed.pdf_url || null,
  };
}
