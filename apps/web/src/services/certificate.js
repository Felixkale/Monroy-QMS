import { supabase } from "@/lib/supabaseClient";

function clean(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text === "" ? fallback : text;
}

function normalizeStatus(value) {
  const v = String(value || "").trim().toUpperCase();
  if (["PASS", "FAIL", "CONDITIONAL PASS", "REPAIR"].includes(v)) return v;
  return "PASS";
}

function normalizeCertificateType(assetType = "", inspectionType = "") {
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
  const date = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
}

function formatCertificateNumber(asset = {}, inspection = {}, existingCount = 0) {
  const serial =
    clean(asset.serial_number) ||
    clean(asset.asset_tag) ||
    clean(asset.equipment_id) ||
    "XX";

  const safeSerial = serial.replace(/\s+/g, "-").toUpperCase();
  const seq = String(existingCount + 1).padStart(2, "0");

  return `CERT-${safeSerial}-${seq}`;
}

async function getExistingCertificateByInspection(inspectionId) {
  if (!inspectionId) return null;

  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .eq("inspection_id", inspectionId)
    .maybeSingle();

  if (error) throw new Error(error.message || "Failed to check existing certificate.");

  return data || null;
}

async function getAssetById(assetId) {
  if (!assetId) throw new Error("Asset ID is required.");

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

async function getCertificateSequenceCount(assetId) {
  if (!assetId) return 0;

  const { count, error } = await supabase
    .from("certificates")
    .select("id", { count: "exact", head: true })
    .eq("asset_id", assetId);

  if (error) throw new Error(error.message || "Failed to count certificates.");

  return count || 0;
}

function buildCertificatePayload({ inspection, asset, existingCertificate, inspector }) {
  const inspectionDate =
    inspection?.inspection_date ||
    inspection?.date_of_inspection ||
    inspection?.tested_at ||
    new Date().toISOString();

  const validTo =
    inspection?.valid_to ||
    inspection?.expiry_date ||
    addMonths(inspectionDate, 12);

  const companyName =
    clean(inspection?.company) ||
    clean(asset?.clients?.company_name);

  const equipmentDescription =
    clean(inspection?.equipment_description) ||
    clean(asset?.asset_type) ||
    clean(asset?.asset_name);

  const equipmentLocation =
    clean(inspection?.equipment_location) ||
    clean(asset?.location);

  const equipmentStatus =
    normalizeStatus(
      inspection?.equipment_status ||
        inspection?.status ||
        inspection?.result ||
        inspection?.inspection_result
    );

  return {
    inspection_id: inspection.id,
    asset_id: asset.id,

    certificate_number:
      existingCertificate?.certificate_number || inspection.certificate_number,

    sequence_number:
      existingCertificate?.sequence_number || inspection.sequence_number || 1,

    certificate_type: normalizeCertificateType(
      asset?.asset_type,
      inspection?.inspection_type
    ),

    company: companyName,
    equipment_description: equipmentDescription,
    equipment_location: equipmentLocation,

    equipment_id:
      clean(inspection?.equipment_id) ||
      clean(asset?.equipment_id) ||
      clean(asset?.serial_number) ||
      clean(asset?.asset_tag),

    identification_number:
      clean(inspection?.identification_number) ||
      clean(asset?.identification_number),

    inspection_no:
      clean(inspection?.inspection_no) ||
      clean(asset?.inspection_no),

    lanyard_serial_no:
      clean(inspection?.lanyard_serial_no) ||
      clean(asset?.lanyard_serial_no),

    manufacturer:
      clean(inspection?.manufacturer) ||
      clean(asset?.manufacturer),

    model:
      clean(inspection?.model) ||
      clean(asset?.model),

    year_built:
      clean(inspection?.year_built) ||
      clean(asset?.year_built),

    country_of_origin:
      clean(inspection?.country_of_origin) ||
      clean(asset?.country_of_origin),

    capacity:
      clean(inspection?.capacity) ||
      clean(asset?.capacity_volume),

    mawp:
      clean(inspection?.mawp) ||
      clean(asset?.working_pressure),

    design_pressure:
      clean(inspection?.design_pressure) ||
      clean(asset?.design_pressure),

    test_pressure:
      clean(inspection?.test_pressure) ||
      clean(asset?.test_pressure),

    swl:
      clean(inspection?.swl) ||
      clean(asset?.safe_working_load),

    proof_load:
      clean(inspection?.proof_load) ||
      clean(asset?.proof_load),

    lifting_height:
      clean(inspection?.lifting_height) ||
      clean(asset?.lifting_height),

    sling_length:
      clean(inspection?.sling_length) ||
      clean(asset?.sling_length),

    chain_size:
      clean(inspection?.chain_size) ||
      clean(asset?.chain_size),

    rope_diameter:
      clean(inspection?.rope_diameter) ||
      clean(asset?.rope_diameter),

    equipment_status: equipmentStatus,

    legal_framework:
      clean(inspection?.legal_framework) ||
      "Mines, Quarries, Works and Machinery Act Cap 44:02",

    inspector_name:
      clean(inspection?.inspector_name) ||
      clean(asset?.inspector_name) ||
      clean(inspector?.name) ||
      "Moemedi Masupe",

    inspector_id:
      clean(inspection?.inspector_id) ||
      clean(asset?.inspector_id) ||
      clean(inspector?.id_number) ||
      "700117910",

    logo_url:
      clean(inspection?.logo_url) ||
      clean(existingCertificate?.logo_url),

    signature_url:
      clean(inspection?.signature_url) ||
      clean(existingCertificate?.signature_url),

    issued_at:
      inspection?.issued_at ||
      inspectionDate,

    valid_to: validTo,

    updated_at: new Date().toISOString(),
  };
}

export async function saveCertificateFromInspection({
  inspection,
  assetId,
  inspector = null,
}) {
  if (!inspection?.id) {
    throw new Error("Inspection ID is required.");
  }

  const resolvedAssetId = assetId || inspection.asset_id;
  if (!resolvedAssetId) {
    throw new Error("Asset ID is required to save certificate.");
  }

  const asset = await getAssetById(resolvedAssetId);
  const existingCertificate = await getExistingCertificateByInspection(inspection.id);

  let sequenceNumber = existingCertificate?.sequence_number || 1;
  let certificateNumber = existingCertificate?.certificate_number || null;

  if (!existingCertificate) {
    const existingCount = await getCertificateSequenceCount(resolvedAssetId);
    sequenceNumber = existingCount + 1;
    certificateNumber = formatCertificateNumber(asset, inspection, existingCount);
  }

  const payload = buildCertificatePayload({
    inspection: {
      ...inspection,
      sequence_number: sequenceNumber,
      certificate_number: certificateNumber,
    },
    asset,
    existingCertificate,
    inspector,
  });

  let query = supabase.from("certificates");

  if (existingCertificate?.id) {
    const { data, error } = await query
      .update(payload)
      .eq("id", existingCertificate.id)
      .select()
      .single();

    if (error) throw new Error(error.message || "Failed to update certificate.");
    return data;
  }

  const { data, error } = await query
    .insert({
      ...payload,
      certificate_number: certificateNumber,
      sequence_number: sequenceNumber,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message || "Failed to create certificate.");

  return data;
}
