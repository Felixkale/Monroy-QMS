export function sanitizeText(val, maxLen = 200) {
  if (val === undefined || val === null) return "";
  return String(val)
    .replace(/<[^>]*>/g, "")
    .replace(/[^\x20-\x7E\u00C0-\u024F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export function normalizeText(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value).replace(/\s+/g, " ").trim() || fallback;
}

export function normalizeDate(value) {
  if (!value) return null;

  let text = String(value)
    .trim()
    .replace(/[.,;]+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s*-\s*/g, "-");

  const ddmmyyyy = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  const yyyymmdd = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmdd) {
    const [, yyyy, mm, dd] = yyyymmdd;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  return null;
}

export function firstMatch(text, patterns = []) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      return normalizeText(m[1].replace(/\n.*/s, "").trim());
    }
  }
  return "";
}

export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function cleanExtractedValue(value, maxLen = 200) {
  if (!value) return "";
  return String(value)
    .replace(/[|]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[.,;]+$/g, "")
    .trim()
    .slice(0, maxLen);
}

const STOP_LABELS = [
  "Company",
  "Client",
  "Client / Company",
  "Equipment owner",
  "Owner",
  "Equipment",
  "Equipment Description",
  "Equipment Type",
  "Description",
  "Product",
  "Location",
  "Equipment Location",
  "Site",
  "Serial Number",
  "Serial number",
  "Serial No",
  "Serial no",
  "S/N",
  "Equipment ID",
  "Identification Number",
  "Identification number",
  "Identification No",
  "Inspection No",
  "Vessel Unique ID",
  "Lanyard Serial No",
  "Lanyard No",
  "Manufacturer",
  "Manufactured by",
  "Model",
  "Model No",
  "Year Built",
  "Year of Manufacture",
  "Year Manufactured",
  "Production Year",
  "Year",
  "Capacity",
  "Volume",
  "Country of Origin",
  "Country",
  "Inspector Name",
  "Inspector",
  "Competent person",
  "Inspector ID",
  "Inspector ID No",
  "Inspector No",
  "SWL",
  "Safe Working Load",
  "Working Pressure",
  "Actual Working Pressure",
  "Actual working Pressure",
  "MAWP",
  "Design Pressure",
  "Design Pressure rating",
  "Test Pressure",
  "Prest-Test Pressure",
  "Inspection Date",
  "Date of Inspection",
  "Date",
  "Issue Date",
  "Date Issued",
  "Expiry Date",
  "Valid To",
  "Next Inspection",
  "Next inspection Date",
  "Next Inspection Date",
  "Equipment Status",
  "Status",
  "Test Results",
  "Certificate Type",
  "Legal Framework",
  "Design Standard",
];

export function extractLabeledValue(text, labels = [], stopLabels = STOP_LABELS) {
  for (const label of labels) {
    const labelPattern = escapeRegex(label).replace(/\s+/g, "\\s+");
    const stopPattern = stopLabels
      .map((s) => escapeRegex(s).replace(/\s+/g, "\\s+"))
      .join("|");

    const regex = new RegExp(
      `${labelPattern}\\s*[:\\-]?\\s*(.+?)(?=\\s+(?:${stopPattern})\\b|$)`,
      "i"
    );

    const match = text.match(regex);
    if (match?.[1]) return cleanExtractedValue(match[1]);
  }
  return "";
}

export function extractDateAfterLabel(text, labels = []) {
  for (const label of labels) {
    const labelPattern = escapeRegex(label).replace(/\s+/g, "\\s+");
    const regex = new RegExp(
      `${labelPattern}\\s*[:\\-]?\\s*(\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{4})`,
      "i"
    );
    const match = text.match(regex);
    if (match?.[1]) return normalizeDate(match[1]);
  }
  return null;
}

export function extractNumberWithUnit(text, labels = [], units = []) {
  for (const label of labels) {
    const labelPattern = escapeRegex(label).replace(/\s+/g, "\\s+");
    const unitPattern = units.length
      ? `(?:${units.map((u) => escapeRegex(u)).join("|")})`
      : `[A-Za-z%°³/]+`;

    const regex = new RegExp(
      `${labelPattern}\\s*[:\\-]?\\s*(\\d+(?:[.,]\\d+)?\\s*${unitPattern})`,
      "i"
    );
    const match = text.match(regex);
    if (match?.[1]) return cleanExtractedValue(match[1]);
  }
  return "";
}

export function detectEquipmentType(text) {
  const checks = [
    "Air Compressor",
    "Pressure Vessel",
    "Air Receiver",
    "Boiler",
    "Oil Separator",
    "Manual Rod Handlers",
    "Rod Handler",
    "Trestle Jack",
    "Trestle Stand",
    "Lever Hoist",
    "Bottle Jack",
    "Safety Harness",
    "Jack Stand",
    "Chain Block",
    "Bow Shackle",
    "Mobile Crane",
    "Overhead Crane",
    "Trolley Jack",
    "Step Ladder",
    "Step Ladders",
    "Tifor",
    "Crawl Beam",
    "Beam Crawl",
    "Beam Clamp",
    "Webbing Sling",
    "Nylon Sling",
    "Wire Sling",
    "Wire Rope",
    "Fall Arrest",
    "Man Cage",
    "Shutter Clamp",
    "Drum Clamp",
    "Scissor Lift",
    "Axle Jack",
    "Axile Jack",
    "Personnel Basket",
    "Load Cell",
    "Trestle",
    "Crane Truck",
  ];

  const lower = String(text || "").toLowerCase();

  for (const item of checks) {
    if (lower.includes(item.toLowerCase())) return item;
  }

  if (lower.includes("air compressor test certificate")) return "Air Compressor";
  if (lower.includes("pressure test certificate")) return "Pressure Vessel";
  if (lower.includes("load test certificate")) return "Lifting Equipment";
  if (lower.includes("horizontal air receiver")) return "Air Receiver";
  if (lower.includes("vertical air receiver")) return "Air Receiver";

  return "";
}

export function inferCertificateType(assetType = "", rawText = "") {
  const text = String(rawText || "").toLowerCase();
  const pressureTypes = [
    "pressure vessel",
    "boiler",
    "air receiver",
    "air compressor",
    "oil separator",
  ];

  if (text.includes("load test certificate")) return "Load Test Certificate";
  if (text.includes("pressure test certificate")) return "Pressure Test Certificate";
  if (text.includes("certificate of statutory inspection")) return "Certificate of Statutory Inspection";
  if (text.includes("inspection certificate")) return "Inspection Certificate";

  if (pressureTypes.includes(String(assetType || "").toLowerCase())) {
    return "Pressure Test Certificate";
  }

  return "Load Test Certificate";
}

export function extractCertificateData(text) {
  const normalizedText = String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();

  const company =
    extractLabeledValue(normalizedText, [
      "Company",
      "Client / Company",
      "Client",
      "Equipment owner",
      "Owner",
    ]) || "";

  const assetType =
    extractLabeledValue(normalizedText, [
      "Equipment Description",
      "Equipment Type",
      "Equipment",
      "Description",
      "Product",
    ]) ||
    detectEquipmentType(normalizedText) ||
    "";

  const location =
    extractLabeledValue(normalizedText, [
      "Equipment Location",
      "Location",
      "Site",
    ]) || "";

  const equipmentLocation = location;

  const serialNumber =
    extractLabeledValue(normalizedText, [
      "Serial Number",
      "Serial number",
      "Serial No",
      "Serial no",
      "S/N",
    ]) || "";

  const inspectionNo =
    extractLabeledValue(normalizedText, [
      "Inspection No",
    ]) || "";

  const identificationNumber =
    extractLabeledValue(normalizedText, [
      "Identification Number",
      "Identification number",
      "Identification No",
      "Vessel Unique ID",
    ]) || "";

  const equipmentId =
    extractLabeledValue(normalizedText, [
      "Equipment ID",
      "Vessel Unique ID",
      "Identification Number",
      "Identification No",
      "Inspection No",
    ]) ||
    identificationNumber ||
    inspectionNo ||
    serialNumber ||
    "";

  const lanyardSerialNo =
    extractLabeledValue(normalizedText, [
      "Lanyard Serial No",
      "Lanyard No",
    ]) || "";

  const manufacturer =
    extractLabeledValue(normalizedText, [
      "Manufacturer",
      "Manufactured by",
    ]) || "";

  const model =
    extractLabeledValue(normalizedText, [
      "Model",
      "Model No",
      "Product",
    ]) || "";

  const yearBuilt =
    extractLabeledValue(normalizedText, [
      "Year Built",
      "Year of Manufacture",
      "Year Manufactured",
      "Production Year",
      "Year",
    ]) || "";

  const capacity =
    extractNumberWithUnit(
      normalizedText,
      ["Capacity", "Volume"],
      ["L", "LT", "LTR", "LITRE", "LITRES", "LITER", "LITERS", "m3", "m³"]
    ) ||
    extractLabeledValue(normalizedText, ["Capacity", "Volume"]) ||
    "";

  const countryOfOrigin =
    extractLabeledValue(normalizedText, [
      "Country of Origin",
      "Country",
    ]) || "";

  const swl =
    extractNumberWithUnit(
      normalizedText,
      ["SWL", "Safe Working Load"],
      ["kg", "KG", "ton", "tons", "Ton", "Tons", "t", "kN"]
    ) ||
    extractLabeledValue(normalizedText, ["SWL", "Safe Working Load"]) ||
    "";

  const mawp =
    extractNumberWithUnit(
      normalizedText,
      ["Working Pressure", "Actual Working Pressure", "Actual working Pressure", "MAWP"],
      ["kPa", "Kpa", "bar", "BAR", "MPa", "psi"]
    ) ||
    extractLabeledValue(normalizedText, [
      "Working Pressure",
      "Actual Working Pressure",
      "Actual working Pressure",
      "MAWP",
    ]) ||
    "";

  const designPressure =
    extractNumberWithUnit(
      normalizedText,
      ["Design Pressure", "Design Pressure rating"],
      ["kPa", "Kpa", "bar", "BAR", "MPa", "psi"]
    ) || "";

  const testPressure =
    extractNumberWithUnit(
      normalizedText,
      ["Test Pressure", "Prest-Test Pressure"],
      ["kPa", "Kpa", "bar", "BAR", "MPa", "psi"]
    ) || "";

  const issueDate =
    extractDateAfterLabel(normalizedText, [
      "Inspection Date",
      "Date of Inspection",
      "Date",
      "Issue Date",
      "Date Issued",
    ]) || null;

  const expiryDate =
    extractDateAfterLabel(normalizedText, [
      "Expiry Date",
      "Next Inspection Date",
      "Next inspection Date",
      "Valid To",
      "Next Inspection",
    ]) || null;

  const inspectorName =
    extractLabeledValue(normalizedText, [
      "Inspector Name",
      "Competent person",
      "Inspector",
    ]) || "";

  const inspectorId =
    extractLabeledValue(normalizedText, [
      "Inspector ID No",
      "Inspector ID",
      "Inspector No",
    ]) || "";

  const certificateType = inferCertificateType(assetType, normalizedText);

  const equipmentStatus = (
    firstMatch(normalizedText, [
      /test\s+results\s*\(?pass\/fail\)?\s*(PASS|FAIL|CONDITIONAL)/i,
      /equipment\s+status\s*[:\-]?\s*(PASS|FAIL|CONDITIONAL)/i,
      /status\s*[:\-]?\s*(PASS|FAIL|CONDITIONAL)/i,
    ]) || "PASS"
  ).toUpperCase();

  return {
    company,
    asset_type: assetType,
    location,
    equipment_location: equipmentLocation,
    serial_number: serialNumber || identificationNumber || equipmentId,
    equipment_id: equipmentId,
    identification_number: identificationNumber || equipmentId,
    inspection_no: inspectionNo,
    lanyard_serial_no: lanyardSerialNo,
    manufacturer,
    model,
    year_built: yearBuilt,
    capacity,
    country_of_origin: countryOfOrigin,
    inspector_name: inspectorName,
    inspector_id: inspectorId,
    safe_working_load: swl,
    swl,
    working_pressure: mawp,
    mawp,
    design_pressure: designPressure,
    test_pressure: testPressure,
    certificate_type: certificateType,
    equipment_status: equipmentStatus,
    issued_at: issueDate || new Date().toISOString().slice(0, 10),
    last_inspection_date: issueDate || null,
    valid_to: expiryDate || null,
    next_inspection_date: expiryDate || null,
    legal_framework: "Mines, Quarries, Works and Machinery Act Cap 44:02",
  };
}

export function sanitizeParsed(raw) {
  return {
    ...raw,
    company: sanitizeText(raw.company, 100),
    asset_type: sanitizeText(raw.asset_type, 100),
    location: sanitizeText(raw.location, 200),
    equipment_location: sanitizeText(raw.equipment_location, 200),
    serial_number: sanitizeText(raw.serial_number, 80),
    equipment_id: sanitizeText(raw.equipment_id, 80),
    identification_number: sanitizeText(raw.identification_number, 80),
    inspection_no: sanitizeText(raw.inspection_no, 80),
    lanyard_serial_no: sanitizeText(raw.lanyard_serial_no, 80),
    manufacturer: sanitizeText(raw.manufacturer, 100),
    model: sanitizeText(raw.model, 100),
    year_built: sanitizeText(raw.year_built, 20),
    capacity: sanitizeText(raw.capacity, 50),
    country_of_origin: sanitizeText(raw.country_of_origin, 80),
    inspector_name: sanitizeText(raw.inspector_name, 100),
    inspector_id: sanitizeText(raw.inspector_id, 80),
    safe_working_load: sanitizeText(raw.safe_working_load, 50),
    swl: sanitizeText(raw.swl, 50),
    working_pressure: sanitizeText(raw.working_pressure, 50),
    mawp: sanitizeText(raw.mawp, 50),
    design_pressure: sanitizeText(raw.design_pressure, 50),
    test_pressure: sanitizeText(raw.test_pressure, 50),
    certificate_type: sanitizeText(raw.certificate_type, 100),
    equipment_status: sanitizeText(raw.equipment_status, 30),
    legal_framework: sanitizeText(raw.legal_framework, 200),
  };
}

export function validateParsed(parsed) {
  const errors = [];

  if (!parsed.company || parsed.company.length < 2) {
    errors.push("Company name too short or missing");
  }

  if (!parsed.asset_type || parsed.asset_type.length < 2) {
    errors.push("Equipment type missing");
  }

  if (!parsed.serial_number && !parsed.equipment_id && !parsed.identification_number) {
    errors.push("Serial number / equipment ID missing");
  }

  if (parsed.last_inspection_date && isNaN(new Date(parsed.last_inspection_date))) {
    errors.push("Invalid inspection date");
  }

  if (parsed.next_inspection_date && isNaN(new Date(parsed.next_inspection_date))) {
    errors.push("Invalid expiry date");
  }

  if (parsed.last_inspection_date && parsed.next_inspection_date) {
    if (new Date(parsed.next_inspection_date) <= new Date(parsed.last_inspection_date)) {
      errors.push("Expiry date must be after inspection date");
    }
  }

  return errors;
}

export function mapParsedToEquipment(parsed, clientId) {
  return {
    client_id: clientId || null,
    asset_type: parsed.asset_type || null,
    location: parsed.equipment_location || parsed.location || null,
    serial_number: parsed.serial_number || parsed.identification_number || parsed.equipment_id || null,
    lanyard_serial_no: parsed.lanyard_serial_no || null,
    manufacturer: parsed.manufacturer || null,
    model: parsed.model || null,
    year_built: parsed.year_built || null,
    capacity_volume: parsed.capacity || null,
    country_of_origin: parsed.country_of_origin || null,
    safe_working_load: parsed.safe_working_load || parsed.swl || null,
    working_pressure: parsed.working_pressure || parsed.mawp || null,
    last_inspection_date: parsed.last_inspection_date || null,
    next_inspection_date: parsed.next_inspection_date || null,
    inspector_name: parsed.inspector_name || null,
    cert_type: parsed.certificate_type || null,
    design_standard: parsed.legal_framework || null,
    license_status: "valid",
    notes: "Imported from certificate",
  };
}

export function mapParsedToCertificate(parsed, assetId, companyName) {
  return {
    asset_id: assetId || null,
    certificate_type: parsed.certificate_type || "Certificate of Statutory Inspection",
    company: companyName || parsed.company || null,
    equipment_description: parsed.asset_type || null,
    equipment_location: parsed.equipment_location || parsed.location || null,
    equipment_id:
      parsed.identification_number ||
      parsed.serial_number ||
      parsed.equipment_id ||
      null,
    lanyard_serial_no: parsed.lanyard_serial_no || null,
    swl: parsed.swl || parsed.safe_working_load || null,
    mawp: parsed.mawp || parsed.working_pressure || null,
    capacity: parsed.capacity || null,
    country_of_origin: parsed.country_of_origin || null,
    year_built: parsed.year_built || null,
    manufacturer: parsed.manufacturer || null,
    model: parsed.model || null,
    equipment_status: parsed.equipment_status || "PASS",
    issued_at: parsed.issued_at ? new Date(parsed.issued_at).toISOString() : null,
    valid_to: parsed.valid_to || null,
    status: "issued",
    legal_framework: parsed.legal_framework || null,
    inspector_name: parsed.inspector_name || null,
    inspector_id: parsed.inspector_id || null,
  };
}
