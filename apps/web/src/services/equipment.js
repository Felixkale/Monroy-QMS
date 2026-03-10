import { supabase } from "@/lib/supabaseClient";

function notConfigured(defaultData = null) {
  return { data: defaultData, error: "Supabase not configured" };
}

function normalizeText(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  const trimmed = String(value).trim();
  return trimmed === "" ? fallback : trimmed;
}

function normalizeNumber(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function normalizeEquipmentPayload(equipmentData = {}) {
  return {
    client_id: normalizeText(equipmentData.client_id),
    site_id: normalizeText(equipmentData.site_id),

    asset_name: normalizeText(
      equipmentData.asset_name ||
        equipmentData.equipment_name ||
        equipmentData.name,
      ""
    ),

    asset_type: normalizeText(
      equipmentData.asset_type || equipmentData.equipment_type,
      ""
    ),

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
    year_built: normalizeNumber(equipmentData.year_built),
    department: normalizeText(equipmentData.department),
    cert_type: normalizeText(equipmentData.cert_type),
    design_standard: normalizeText(equipmentData.design_standard),
    inspection_freq: normalizeText(equipmentData.inspection_freq),
    shell_material: normalizeText(equipmentData.shell_material),
    fluid_type: normalizeText(equipmentData.fluid_type),
    design_pressure: normalizeNumber(equipmentData.design_pressure),
    working_pressure: normalizeNumber(equipmentData.working_pressure),
    test_pressure: normalizeNumber(equipmentData.test_pressure),
    design_temperature: normalizeNumber(equipmentData.design_temperature),
    capacity_volume: normalizeNumber(equipmentData.capacity_volume),
    safe_working_load: normalizeNumber(
      equipmentData.safe_working_load ?? equipmentData.swl
    ),
    proof_load: normalizeNumber(equipmentData.proof_load),
    lifting_height: normalizeNumber(
      equipmentData.lifting_height ?? equipmentData.lift_height
    ),
    sling_length: normalizeNumber(equipmentData.sling_length),
    chain_size: normalizeText(equipmentData.chain_size),
    rope_diameter: normalizeText(equipmentData.rope_diameter),
    national_reg_no: normalizeText(equipmentData.national_reg_no),
    notified_body: normalizeText(equipmentData.notified_body),
    last_inspection_date: normalizeText(equipmentData.last_inspection_date),
    next_inspection_date: normalizeText(equipmentData.next_inspection_date),
    notes: normalizeText(equipmentData.notes),
  };
}

const EQUIPMENT_SELECT = `
  id,
  client_id,
  site_id,
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
  national_reg_no,
  notified_body,
  last_inspection_date,
  next_inspection_date,
  notes,
  created_at,
  updated_at,
  clients (
    id,
    company_name,
    company_code,
    contact_person,
    contact_email,
    contact_phone
  ),
  sites (
    id,
    site_name,
    site_code,
    location
  ),
  asset_nameplate (
    *
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
  if (!id) return { data: null, error: "Equipment ID is required" };

  const { data, error } = await supabase
    .from("assets")
    .select(EQUIPMENT_SELECT)
    .eq("id", id)
    .single();

  return { data, error };
}

export async function getEquipmentByTag(tag) {
  if (!supabase) return notConfigured(null);
  if (!tag) return { data: null, error: "Equipment tag is required" };

  const { data, error } = await supabase
    .from("assets")
    .select(EQUIPMENT_SELECT)
    .eq("asset_tag", tag)
    .single();

  return { data, error };
}

export async function registerEquipment(equipmentData) {
  if (!supabase) return notConfigured(null);

  const payload = normalizeEquipmentPayload(equipmentData);

  if (!payload.client_id) {
    return { data: null, error: { message: "Client is required" } };
  }

  if (!payload.asset_name) {
    return { data: null, error: { message: "Equipment name is required" } };
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

  const { data, error } = await supabase
    .from("assets")
    .insert([payload])
    .select(EQUIPMENT_SELECT)
    .single();

  return { data, error };
}

export async function updateEquipmentById(id, updates) {
  if (!supabase) return notConfigured(null);
  if (!id) return { data: null, error: "Equipment ID is required" };

  const payload = normalizeEquipmentPayload(updates);
  delete payload.asset_tag;

  if (!payload.asset_name) {
    return { data: null, error: { message: "Equipment name is required" } };
  }

  const { data, error } = await supabase
    .from("assets")
    .update(payload)
    .eq("id", id)
    .select(EQUIPMENT_SELECT)
    .single();

  return { data, error };
}

export async function updateEquipmentByTag(tag, updates) {
  if (!supabase) return notConfigured(null);
  if (!tag) return { data: null, error: "Equipment tag is required" };

  const payload = normalizeEquipmentPayload(updates);
  delete payload.asset_tag;

  if (!payload.asset_name) {
    return { data: null, error: { message: "Equipment name is required" } };
  }

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
  if (!id) return { data: null, error: "Equipment ID is required" };

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

  let query = supabase
    .from("assets")
    .select("status, license_status, client_id");

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
