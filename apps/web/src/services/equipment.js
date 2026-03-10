import { supabase } from "@/lib/supabaseClient";

function notConfigured(defaultData = null) {
  return { data: defaultData, error: "Supabase not configured" };
}

function normalizeText(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  const trimmed = String(value).trim();
  return trimmed === "" ? fallback : trimmed;
}

function buildAssetName(data) {
  const explicitName = normalizeText(data.asset_name);
  if (explicitName) return explicitName;

  const assetType = normalizeText(data.asset_type || data.equipment_type, "Equipment");
  const model = normalizeText(data.model);
  const serial = normalizeText(data.serial_number);

  if (model) return `${assetType} - ${model}`;
  if (serial) return `${assetType} - ${serial}`;
  return assetType;
}

function normalizeEquipmentPayload(equipmentData = {}) {
  const assetType = normalizeText(
    equipmentData.asset_type || equipmentData.equipment_type,
    ""
  );

  return {
    client_id: normalizeText(equipmentData.client_id),
    asset_name: buildAssetName({
      asset_name: equipmentData.asset_name,
      asset_type: assetType,
      model: equipmentData.model,
      serial_number: equipmentData.serial_number,
    }),
    asset_type: assetType,
    description: normalizeText(equipmentData.description),
    manufacturer: normalizeText(equipmentData.manufacturer),
    model: normalizeText(equipmentData.model),
    serial_number: normalizeText(equipmentData.serial_number),
    purchase_date: normalizeText(equipmentData.purchase_date),
    license_status: normalizeText(equipmentData.license_status, "valid"),
    license_expiry: normalizeText(equipmentData.license_expiry),
    location: normalizeText(equipmentData.location),
    condition: normalizeText(equipmentData.condition, "Good"),
    status: normalizeText(equipmentData.status, "active"),
    year_built: normalizeText(equipmentData.year_built),
    department: normalizeText(equipmentData.department),
    cert_type: normalizeText(equipmentData.cert_type),
    design_standard: normalizeText(equipmentData.design_standard),
    inspection_freq: normalizeText(equipmentData.inspection_freq),
    shell_material: normalizeText(equipmentData.shell_material),
    fluid_type: normalizeText(equipmentData.fluid_type),
    design_pressure: normalizeText(equipmentData.design_pressure),
    working_pressure: normalizeText(equipmentData.working_pressure),
    test_pressure: normalizeText(equipmentData.test_pressure),
    design_temperature: normalizeText(equipmentData.design_temperature),
    capacity_volume: normalizeText(equipmentData.capacity_volume),
    safe_working_load: normalizeText(equipmentData.safe_working_load),
    proof_load: normalizeText(equipmentData.proof_load),
    lifting_height: normalizeText(equipmentData.lifting_height),
    sling_length: normalizeText(equipmentData.sling_length),
    chain_size: normalizeText(equipmentData.chain_size),
    rope_diameter: normalizeText(equipmentData.rope_diameter),
    last_inspection_date: normalizeText(equipmentData.last_inspection_date),
    next_inspection_date: normalizeText(equipmentData.next_inspection_date),
    notes: normalizeText(equipmentData.notes),
  };
}

const EQUIPMENT_SELECT = `
  id,
  client_id,
  asset_name,
  asset_tag,
  asset_type,
  description,
  manufacturer,
  model,
  serial_number,
  purchase_date,
  license_status,
  license_expiry,
  location,
  condition,
  status,
  year_built,
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
  notes,
  created_at,
  updated_at,
  clients (
    id,
    company_name,
    company_code
  )
`;

export async function getEquipment(clientId = null) {
  if (!supabase) return notConfigured([]);

  let query = supabase
    .from("assets")
    .select(EQUIPMENT_SELECT)
    .order("created_at", { ascending: false });

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;
  return { data: data || [], error };
}

export async function getEquipmentById(id) {
  if (!supabase) return notConfigured(null);
  if (!id) return { data: null, error: { message: "Equipment ID is required" } };

  const { data, error } = await supabase
    .from("assets")
    .select(EQUIPMENT_SELECT)
    .eq("id", id)
    .maybeSingle();

  return { data, error };
}

export async function getEquipmentByTag(tag) {
  if (!supabase) return notConfigured(null);
  if (!tag) return { data: null, error: { message: "Equipment tag is required" } };

  const { data, error } = await supabase
    .from("assets")
    .select(EQUIPMENT_SELECT)
    .eq("asset_tag", tag)
    .maybeSingle();

  return { data, error };
}

export async function getCertificateByAssetId(assetId) {
  if (!supabase) return notConfigured(null);
  if (!assetId) return { data: null, error: { message: "Asset ID is required" } };

  const { data, error } = await supabase
    .from("certificates")
    .select(`
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
      updated_at
    `)
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data, error };
}

export async function registerEquipment(equipmentData) {
  if (!supabase) return notConfigured(null);

  const payload = normalizeEquipmentPayload(equipmentData);

  if (!payload.client_id) {
    return { data: null, error: { message: "Client is required" } };
  }

  if (!payload.asset_type) {
    return { data: null, error: { message: "Equipment type is required" } };
  }

  if (!payload.serial_number) {
    return { data: null, error: { message: "Serial number is required" } };
  }

  if (!payload.manufacturer) {
    return { data: null, error: { message: "Manufacturer is required" } };
  }

  if (!payload.asset_name) {
    return { data: null, error: { message: "Asset name is required" } };
  }

  const { data, error } = await supabase
    .from("assets")
    .insert([payload])
    .select(EQUIPMENT_SELECT)
    .single();

  return { data, error };
}

export async function updateEquipmentByTag(tag, updates) {
  if (!supabase) return notConfigured(null);
  if (!tag) return { data: null, error: { message: "Equipment tag is required" } };

  const payload = normalizeEquipmentPayload(updates);

  const { data, error } = await supabase
    .from("assets")
    .update(payload)
    .eq("asset_tag", tag)
    .select(EQUIPMENT_SELECT)
    .single();

  return { data, error };
}

export async function deleteEquipmentById(id) {
  if (!supabase) return notConfigured(null);
  if (!id) return { data: null, error: { message: "Equipment ID is required" } };

  const { error } = await supabase
    .from("assets")
    .delete()
    .eq("id", id);

  return { data: !error, error };
}

export async function getEquipmentStats(clientId = null) {
  if (!supabase) {
    return { total: 0, active: 0, expiring: 0, expired: 0 };
  }

  let query = supabase.from("assets").select("status, license_status, client_id");

  if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return { total: 0, active: 0, expiring: 0, expired: 0 };
  }

  return {
    total: data.length,
    active: data.filter((e) => e.status === "active").length,
    expiring: data.filter((e) => e.license_status === "expiring").length,
    expired: data.filter((e) => e.license_status === "expired").length,
  };
}
