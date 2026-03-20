import { supabase } from "@/lib/supabaseClient";

const DEFAULT_INSPECTOR_NAME = "Moemedi Masupe";
const DEFAULT_INSPECTOR_ID = "700117910";
const DEFAULT_LEGAL_FRAMEWORK =
  "Mines, Quarries, Works and Machinery Act Cap 44:02";

function clean(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text === "" ? fallback : text;
}

function normalizeStatus(value) {
  const v = String(value || "").trim().toUpperCase();
  if (!v) return "PASS";
  if (["PASS", "FAIL", "CONDITIONAL PASS", "REPAIR"].includes(v)) return v;
  return v;
}

function resolveCertificateType(assetType = "", inspectionType = "") {
  const source = `${assetType} ${inspectionType}`.toLowerCase();

  if (
    source.includes("pressure") ||
    source.includes("boiler") ||
    source.includes("air receiver") ||
    source.includes("air compressor") ||
    source.includes("oil separator")
  ) {
    return "Pressure Test Certificate";
  }

  return "Load Test Certificate";
}

function addMonths(dateInput, months = 12) {
  const base = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(base.getTime())) return new Date().toISOString();

  const date = new Date(base);
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
}

function buildCertificateNumber(asset = {}, sequenceNumber = 1) {
  const serial =
    clean(asset.serial_number) ||
    clean(asset.asset_tag) ||
    clean(asset.equipment_id) ||
    clean(asset.identification_number) ||
    "XX";

  const safeSerial = String(serial).replace(/\s+/g, "-").toUpperCase();
  const seq = String(sequenceNumber).padStart(2, "0");

  return `CERT-${safeSerial}-${seq}`;
}

async function getAssetById(assetId) {
  const { data, error } = await supabase
    .from("assets")
    .select(
      `
      *,
      clients (
        id,
        company_name,
        company_code
      )
    `
    )
    .eq("id", assetId)
    .single();

  if (error) throw new Error(error.message || "Failed to load asset.");
  if (!data) throw new Error("Asset not found.");

  return data;
}

async function getExistingCertificateByInspection(inspectionId) {
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .eq("inspection_id", inspectionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load existing certificate.");
  }

  return data || null;
}

async function getExistingCountForAsset(assetId) {
  const { count, error } = await supabase
    .from("certificates")
    .select("id", { count: "exact", head: true })
    .eq("asset_id", assetId);

  if (error) {
    throw new Error(error.message || "Failed to count existing certificates.");
  }

  return count || 0;
}

function buildPayload({ inspection, asset, existingCertificate }) {
  const inspectionDate =
    inspection.inspection_date ||
    inspection.date_of_inspection ||
    inspection.test_date ||
    inspection.issued_at ||
    new Date().toISOString();

  const validTo =
    inspection.valid_to ||
    inspection.expiry_date ||
    existingCertificate?.valid_to ||
    addMonths(inspectionDate, 12);

  const company =
    clean(inspection.company) ||
    clean(asset?.clients?.company_name) ||
    clean(asset?.company_name);

  const equipmentDescription =
    clean(inspection.equipment_description) ||
    clean(asset.asset_type) ||
    clean(asset.asset_name);

  const equipmentLocation =
    clean(inspection.equipment_location) || clean(asset.location);

  return {
    inspection_id: inspection.id,
    asset_id: asset.id,
    certificate_number: clean(inspection.certificate_number),
    sequence_number: inspection.sequence_number || 1,
    certificate_type: resolveCertificateType(
      asset.asset_type,
      inspection.inspection_type
    ),
    company,
    equipment_description: equipmentDescription,
    equipment_location: equipmentLocation,
    equipment_id:
      clean(inspection.equipment_id) ||
      clean(asset.equipment_id) ||
      clean(asset.serial_number) ||
      clean(asset.asset_tag),
    identification_number:
      clean(inspection.identification_number) ||
      clean(asset.identification_number),
    inspection_no: clean(inspection.inspection_no) || clean(asset.inspection_no),
    lanyard_serial_no:
      clean(inspection.lanyard_serial_no) || clean(asset.lanyard_serial_no),
    manufacturer: clean(inspection.manufacturer) || clean(asset.manufacturer),
    model: clean(inspection.model) || clean(asset.model),
    year_built: clean(inspection.year_built) || clean(asset.year_built),
    country_of_origin:
      clean(inspection.country_of_origin) || clean(asset.country_of_origin),
    capacity: clean(inspection.capacity) || clean(asset.capacity_volume),
    mawp: clean(inspection.mawp) || clean(asset.working_pressure),
    design_pressure:
      clean(inspection.design_pressure) || clean(asset.design_pressure),
    test_pressure: clean(inspection.test_pressure) || clean(asset.test_pressure),
    swl: clean(inspection.swl) || clean(asset.safe_working_load),
    proof_load: clean(inspection.proof_load) || clean(asset.proof_load),
    lifting_height:
      clean(inspection.lifting_height) || clean(asset.lifting_height),
    sling_length: clean(inspection.sling_length) || clean(asset.sling_length),
    chain_size: clean(inspection.chain_size) || clean(asset.chain_size),
    rope_diameter:
      clean(inspection.rope_diameter) || clean(asset.rope_diameter),
    equipment_status: normalizeStatus(
      inspection.equipment_status || inspection.status || inspection.result
    ),
    legal_framework:
      clean(inspection.legal_framework) ||
      clean(existingCertificate?.legal_framework) ||
      DEFAULT_LEGAL_FRAMEWORK,
    inspector_name:
      clean(inspection.inspector_name) ||
      clean(asset.inspector_name) ||
      clean(existingCertificate?.inspector_name) ||
      DEFAULT_INSPECTOR_NAME,
    inspector_id:
      clean(inspection.inspector_id) ||
      clean(asset.inspector_id) ||
      clean(existingCertificate?.inspector_id) ||
      DEFAULT_INSPECTOR_ID,
    logo_url: clean(inspection.logo_url) || clean(existingCertificate?.logo_url),
    signature_url:
      clean(inspection.signature_url) || clean(existingCertificate?.signature_url),
    issued_at: inspection.issued_at || inspectionDate,
    valid_to: validTo,
    extracted_data:
      inspection.extracted_data || existingCertificate?.extracted_data || null,
    source_nameplate_image_url:
      clean(inspection.source_nameplate_image_url) ||
      clean(existingCertificate?.source_nameplate_image_url),
    updated_at: new Date().toISOString(),
  };
}

export async function saveCertificateFromInspection({
  inspection,
  assetId = null,
}) {
  if (!inspection?.id) {
    throw new Error("Inspection ID is required.");
  }

  const resolvedAssetId = assetId || inspection.asset_id;
  if (!resolvedAssetId) {
    throw new Error("Asset ID is required.");
  }

  const asset = await getAssetById(resolvedAssetId);
  const existingCertificate = await getExistingCertificateByInspection(
    inspection.id
  );

  let sequenceNumber = existingCertificate?.sequence_number || 1;
  let certificateNumber =
    existingCertificate?.certificate_number ||
    clean(inspection.certificate_number);

  if (!existingCertificate) {
    const existingCount = await getExistingCountForAsset(resolvedAssetId);
    sequenceNumber = existingCount + 1;
    certificateNumber = buildCertificateNumber(asset, sequenceNumber);
  }

  const payload = buildPayload({
    inspection: {
      ...inspection,
      sequence_number: sequenceNumber,
      certificate_number: certificateNumber,
    },
    asset,
    existingCertificate,
  });

  if (existingCertificate?.id) {
    const { data, error } = await supabase
      .from("certificates")
      .update(payload)
      .eq("id", existingCertificate.id)
      .select()
      .single();

    if (error) throw new Error(error.message || "Failed to update certificate.");
    return data;
  }

  const { data, error } = await supabase
    .from("certificates")
    .insert({
      ...payload,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message || "Failed to create certificate.");
  return data;
}
