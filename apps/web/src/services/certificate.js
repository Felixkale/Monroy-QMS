import { supabase } from "@/lib/supabaseClient";

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
  assets (
    id,
    client_id,
    asset_tag,
    asset_name,
    asset_type,
    manufacturer,
    model,
    serial_number,
    year_built,
    location,
    department,
    cert_type,
    design_standard,
    inspection_freq,
    shell_material,
    fluid_type,
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
    last_inspection_date,
    next_inspection_date,
    license_status,
    license_expiry,
    condition,
    status,
    notes,
    clients (
      id,
      company_name,
      company_code
    )
  )
`;

function notConfigured(defaultData = null) {
  return { data: defaultData, error: { message: "Supabase not configured" } };
}

function normalizeText(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text === "" ? fallback : text;
}

function normalizeDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function mapCertificateRow(row) {
  if (!row) return null;

  return {
    ...row,
    certificate_no: row.certificate_number || null,
    issue_date: row.issued_at ? String(row.issued_at).slice(0, 10) : null,
    expiry_date: row.valid_to || null,
    asset: row.assets || null,
  };
}

export function buildCertificateQrValue(certificate = {}) {
  const certificateNumber =
    certificate.certificate_number ||
    certificate.certificate_no ||
    "PENDING-CERTIFICATE";

  const equipmentId =
    certificate.equipment_id ||
    certificate.asset?.asset_tag ||
    "NO-EQUIPMENT";

  const company =
    certificate.company ||
    certificate.asset?.clients?.company_name ||
    "";

  const inspector = certificate.inspector_name || "";
  const legal =
    certificate.legal_framework ||
    "Mines, Quarries, Works and Machinery Act Cap 44:02";

  return [
    `Certificate: ${certificateNumber}`,
    `Equipment: ${equipmentId}`,
    company ? `Company: ${company}` : null,
    inspector ? `Inspector: ${inspector}` : null,
    `Legal: ${legal}`,
  ]
    .filter(Boolean)
    .join(" | ");
}

export async function getCertificates() {
  if (!supabase) return notConfigured([]);

  const { data, error } = await supabase
    .from("certificates")
    .select(CERTIFICATE_SELECT)
    .order("created_at", { ascending: false });

  return {
    data: (data || []).map(mapCertificateRow),
    error,
  };
}

export async function getCertificateById(id) {
  if (!supabase) return notConfigured(null);
  if (!id) {
    return { data: null, error: { message: "Certificate ID is required" } };
  }

  const { data, error } = await supabase
    .from("certificates")
    .select(CERTIFICATE_SELECT)
    .eq("id", id)
    .maybeSingle();

  return {
    data: mapCertificateRow(data),
    error,
  };
}

export async function getCertificatesByAssetId(assetId) {
  if (!supabase) return notConfigured([]);
  if (!assetId) {
    return { data: [], error: { message: "Asset ID is required" } };
  }

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

export async function getLatestCertificateByAssetId(assetId) {
  if (!supabase) return notConfigured(null);
  if (!assetId) {
    return { data: null, error: { message: "Asset ID is required" } };
  }

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

export async function createCertificate(certificateData = {}) {
  if (!supabase) return notConfigured(null);

  const payload = {
    asset_id: normalizeText(certificateData.asset_id),
    certificate_type: normalizeText(
      certificateData.certificate_type,
      "Certificate of Statutory Inspection"
    ),
    company: normalizeText(certificateData.company),
    equipment_description: normalizeText(certificateData.equipment_description),
    equipment_location: normalizeText(certificateData.equipment_location),
    equipment_id: normalizeText(certificateData.equipment_id),
    swl: normalizeText(certificateData.swl),
    mawp: normalizeText(certificateData.mawp),
    equipment_status: normalizeText(certificateData.equipment_status, "PASS"),
    issued_at: certificateData.issued_at || new Date().toISOString(),
    valid_to: normalizeDate(certificateData.valid_to),
    status: normalizeText(certificateData.status, "issued"),
    legal_framework: normalizeText(
      certificateData.legal_framework,
      "Mines, Quarries, Works and Machinery Act Cap 44:02"
    ),
    inspector_name: normalizeText(certificateData.inspector_name),
    inspector_id: normalizeText(certificateData.inspector_id),
    signature_url: normalizeText(certificateData.signature_url),
    logo_url: normalizeText(certificateData.logo_url, "/monroy-logo.png"),
    pdf_url: normalizeText(certificateData.pdf_url),
  };

  if (!payload.asset_id) {
    return { data: null, error: { message: "Asset is required" } };
  }

  if (!payload.inspector_name) {
    return { data: null, error: { message: "Inspector name is required" } };
  }

  const { data, error } = await supabase
    .from("certificates")
    .insert([payload])
    .select(CERTIFICATE_SELECT)
    .single();

  return {
    data: mapCertificateRow(data),
    error,
  };
}

export async function updateCertificate(id, updates = {}) {
  if (!supabase) return notConfigured(null);
  if (!id) {
    return { data: null, error: { message: "Certificate ID is required" } };
  }

  const payload = {};

  if ("asset_id" in updates) payload.asset_id = normalizeText(updates.asset_id);
  if ("certificate_type" in updates) {
    payload.certificate_type = normalizeText(updates.certificate_type);
  }
  if ("company" in updates) payload.company = normalizeText(updates.company);
  if ("equipment_description" in updates) {
    payload.equipment_description = normalizeText(updates.equipment_description);
  }
  if ("equipment_location" in updates) {
    payload.equipment_location = normalizeText(updates.equipment_location);
  }
  if ("equipment_id" in updates) {
    payload.equipment_id = normalizeText(updates.equipment_id);
  }
  if ("swl" in updates) payload.swl = normalizeText(updates.swl);
  if ("mawp" in updates) payload.mawp = normalizeText(updates.mawp);
  if ("equipment_status" in updates) {
    payload.equipment_status = normalizeText(updates.equipment_status);
  }
  if ("issued_at" in updates) {
    payload.issued_at = updates.issued_at || null;
  }
  if ("valid_to" in updates) {
    payload.valid_to = normalizeDate(updates.valid_to);
  }
  if ("status" in updates) payload.status = normalizeText(updates.status);
  if ("legal_framework" in updates) {
    payload.legal_framework = normalizeText(updates.legal_framework);
  }
  if ("inspector_name" in updates) {
    payload.inspector_name = normalizeText(updates.inspector_name);
  }
  if ("inspector_id" in updates) {
    payload.inspector_id = normalizeText(updates.inspector_id);
  }
  if ("signature_url" in updates) {
    payload.signature_url = normalizeText(updates.signature_url);
  }
  if ("logo_url" in updates) {
    payload.logo_url = normalizeText(updates.logo_url);
  }
  if ("pdf_url" in updates) {
    payload.pdf_url = normalizeText(updates.pdf_url);
  }

  const { data, error } = await supabase
    .from("certificates")
    .update(payload)
    .eq("id", id)
    .select(CERTIFICATE_SELECT)
    .single();

  return {
    data: mapCertificateRow(data),
    error,
  };
}

export async function deleteCertificate(id) {
  if (!supabase) return notConfigured(null);
  if (!id) {
    return { data: null, error: { message: "Certificate ID is required" } };
  }

  const { error } = await supabase
    .from("certificates")
    .delete()
    .eq("id", id);

  return { data: !error, error };
}

export async function getCertificateStats() {
  if (!supabase) {
    return {
      total: 0,
      issued: 0,
      valid: 0,
      expired: 0,
      draft: 0,
      rejected: 0,
      pass: 0,
      fail: 0,
    };
  }

  const { data, error } = await supabase
    .from("certificates")
    .select("status, equipment_status, valid_to");

  if (error) {
    throw error;
  }

  const today = new Date().toISOString().slice(0, 10);

  const stats = {
    total: 0,
    issued: 0,
    valid: 0,
    expired: 0,
    draft: 0,
    rejected: 0,
    pass: 0,
    fail: 0,
  };

  for (const row of data || []) {
    stats.total += 1;

    const status = String(row.status || "").trim().toLowerCase();
    const equipmentStatus = String(row.equipment_status || "").trim().toLowerCase();
    const validTo = row.valid_to ? String(row.valid_to).slice(0, 10) : null;

    if (status === "issued") stats.issued += 1;
    if (status === "draft") stats.draft += 1;
    if (status === "rejected") stats.rejected += 1;

    if (equipmentStatus === "pass") stats.pass += 1;
    if (equipmentStatus === "fail") stats.fail += 1;

    if (validTo) {
      if (validTo >= today) stats.valid += 1;
      if (validTo < today) stats.expired += 1;
    } else {
      if (status === "expired") stats.expired += 1;
    }
  }

  return stats;
}
