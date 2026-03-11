import { supabase } from "@/lib/supabaseClient";

function notConfigured(defaultData = null) {
  return { data: defaultData, error: "Supabase not configured" };
}

function normalizeText(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  const trimmed = String(value).trim();
  return trimmed === "" ? fallback : trimmed;
}

function normalizeDate(value, fallback = null) {
  if (!value) return fallback;
  const str = String(value).trim();
  return str || fallback;
}

function normalizeCertificatePayload(data = {}) {
  const inspectionResult = normalizeText(
    data.inspection_result || data.equipment_status,
    "PASS"
  );

  return {
    certificate_type: normalizeText(
      data.certificate_type,
      "Certificate of Statutory Inspection"
    ),
    asset_id: normalizeText(data.asset_id),
    company: normalizeText(data.company),
    equipment_description: normalizeText(data.equipment_description),
    equipment_location: normalizeText(data.equipment_location),
    equipment_id: normalizeText(data.equipment_id),
    swl: normalizeText(data.swl),
    mawp: normalizeText(data.mawp),
    equipment_status: inspectionResult,
    legal_framework: normalizeText(
      data.legal_framework,
      "Mines, Quarries, Works and Machinery Act Cap 44:02"
    ),
    inspector_name: normalizeText(data.inspector_name),
    inspector_id: normalizeText(data.inspector_id),
    signature_url: normalizeText(data.signature_url),
    logo_url: normalizeText(data.logo_url, "/monroy-logo.png"),
    pdf_url: normalizeText(data.pdf_url),
    issued_at: data.issued_at
      ? new Date(data.issued_at).toISOString()
      : new Date().toISOString(),
    valid_to: normalizeDate(data.valid_to),
    status: normalizeText(data.status, "issued"),
  };
}

function getExpiryState(validTo) {
  if (!validTo) return "unknown";

  const today = new Date();
  const expiry = new Date(validTo);

  if (Number.isNaN(expiry.getTime())) return "unknown";

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const expiryDate = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());

  const diffMs = expiryDate.getTime() - startOfToday.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "expiring";
  return "valid";
}

function mapCertificateRow(row) {
  if (!row) return null;

  return {
    ...row,
    inspection_result: row.equipment_status || "PASS",
    expiry_state: getExpiryState(row.valid_to),
  };
}

const CERTIFICATE_SELECT = `
  id,
  certificate_number,
  certificate_type,
  asset_id,
  company,
  equipment_description,
  equipment_location,
  equipment_id,
  swl,
  mawp,
  equipment_status,
  issued_at,
  valid_to,
  status,
  legal_framework,
  inspector_name,
  inspector_id,
  signature_url,
  logo_url,
  pdf_url,
  created_at,
  updated_at,
  asset:assets (
    id,
    asset_tag,
    asset_name,
    asset_type,
    serial_number,
    location,
    manufacturer,
    model,
    year_built,
    design_standard,
    design_pressure,
    working_pressure,
    test_pressure,
    design_temperature,
    capacity_volume,
    safe_working_load,
    proof_load,
    lifting_height,
    sling_length,
    chain_size,
    rope_diameter,
    shell_material,
    fluid_type,
    notes,
    next_inspection_date,
    client_id,
    clients (
      company_name
    )
  )
`;

export async function getCertificates() {
  if (!supabase) return notConfigured([]);

  const { data, error } = await supabase
    .from("certificates")
    .select(CERTIFICATE_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error };
  }

  return {
    data: (data || []).map(mapCertificateRow),
    error: null,
  };
}

export async function getCertificateById(id) {
  if (!supabase) return notConfigured(null);
  if (!id) return { data: null, error: { message: "Certificate ID is required" } };

  const { data, error } = await supabase
    .from("certificates")
    .select(CERTIFICATE_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) {
    return { data: null, error };
  }

  return {
    data: mapCertificateRow(data),
    error: null,
  };
}

export async function getCertificatesByAssetId(assetId) {
  if (!supabase) return notConfigured([]);
  if (!assetId) return { data: [], error: { message: "Asset ID is required" } };

  const { data, error } = await supabase
    .from("certificates")
    .select(CERTIFICATE_SELECT)
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false });

  return {
    data: (data || []).map(mapCertificateRow),
    error,
  };
}

export async function createCertificate(certificateData) {
  if (!supabase) return notConfigured(null);

  const payload = normalizeCertificatePayload(certificateData);

  const { data, error } = await supabase
    .from("certificates")
    .insert([payload])
    .select(CERTIFICATE_SELECT)
    .single();

  if (error || !data) {
    return { data: null, error };
  }

  return {
    data: mapCertificateRow(data),
    error: null,
  };
}

export async function updateCertificateById(id, updates) {
  if (!supabase) return notConfigured(null);
  if (!id) return { data: null, error: { message: "Certificate ID is required" } };

  const payload = normalizeCertificatePayload(updates);

  const { data, error } = await supabase
    .from("certificates")
    .update(payload)
    .eq("id", id)
    .select(CERTIFICATE_SELECT)
    .single();

  if (error || !data) {
    return { data: null, error };
  }

  return {
    data: mapCertificateRow(data),
    error: null,
  };
}

export async function deleteCertificateById(id) {
  if (!supabase) return notConfigured(null);
  if (!id) return { data: null, error: { message: "Certificate ID is required" } };

  const { error } = await supabase
    .from("certificates")
    .delete()
    .eq("id", id);

  return { data: !error, error };
}

export async function getLatestCertificateByAssetId(assetId) {
  if (!supabase) return notConfigured(null);
  if (!assetId) return { data: null, error: { message: "Asset ID is required" } };

  const { data, error } = await supabase
    .from("certificates")
    .select(CERTIFICATE_SELECT)
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    data: mapCertificateRow(data),
    error,
  };
}

export async function getCertificateStats() {
  if (!supabase) {
    return {
      total: 0,
      pass: 0,
      conditional: 0,
      fail: 0,
      expired: 0,
    };
  }

  const { data, error } = await supabase
    .from("certificates")
    .select("id, equipment_status, valid_to");

  if (error || !data) {
    return {
      total: 0,
      pass: 0,
      conditional: 0,
      fail: 0,
      expired: 0,
    };
  }

  const mapped = (data || []).map((item) => ({
    ...item,
    expiry_state: getExpiryState(item.valid_to),
  }));

  return {
    total: mapped.length,
    pass: mapped.filter((item) => String(item.equipment_status || "").toUpperCase() === "PASS").length,
    conditional: mapped.filter((item) => String(item.equipment_status || "").toUpperCase() === "CONDITIONAL").length,
    fail: mapped.filter((item) => String(item.equipment_status || "").toUpperCase() === "FAIL").length,
    expired: mapped.filter((item) => item.expiry_state === "expired").length,
  };
}

export async function uploadCertificateSignature(file) {
  if (!supabase) return notConfigured(null);
  if (!file) return { data: null, error: { message: "Signature file is required" } };

  const ext = file.name?.split(".").pop() || "png";
  const fileName = `signature-${Date.now()}.${ext}`;
  const path = `certificate-signatures/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, file, { upsert: true });

  if (uploadError) {
    return { data: null, error: uploadError };
  }

  const { data } = supabase.storage.from("documents").getPublicUrl(path);

  return {
    data: {
      path,
      publicUrl: data?.publicUrl || null,
    },
    error: null,
  };
}

export function buildCertificateQrValue(certificate) {
  if (!certificate) return "";

  return [
    `Certificate Number: ${certificate.certificate_number || ""}`,
    `Equipment Tag: ${certificate.equipment_id || certificate.asset?.asset_tag || ""}`,
    `Company: ${certificate.company || certificate.asset?.clients?.company_name || ""}`,
    `Inspector: ${certificate.inspector_name || ""}`,
    `Legal Compliance: ${certificate.legal_framework || "Mines, Quarries, Works and Machinery Act Cap 44:02"}`,
  ].join("\n");
}
