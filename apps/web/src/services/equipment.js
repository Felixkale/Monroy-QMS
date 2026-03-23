// apps/web/src/services/equipment.js
import { supabase } from "@/lib/supabaseClient";

function notConfigured(defaultData = null) {
  return { data: defaultData, error: "Supabase not configured" };
}

function normalizeText(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  const trimmed = String(value).trim();
  return trimmed === "" ? fallback : trimmed;
}

function slugify(value, fallback = "equipment") {
  const text = normalizeText(value, fallback) || fallback;
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function buildAssetName(data = {}) {
  const explicitName = normalizeText(data.asset_name);
  if (explicitName) return explicitName;

  const description = normalizeText(data.equipment_description);
  if (description) return description;

  const assetType = normalizeText(data.asset_type || data.equipment_type, "Equipment");
  const model = normalizeText(data.model);
  const serial = normalizeText(data.serial_number);

  if (model) return `${assetType} - ${model}`;
  if (serial) return `${assetType} - ${serial}`;
  return assetType;
}

function buildAssetTag(data = {}) {
  const explicitTag = normalizeText(data.asset_tag);
  if (explicitTag) return explicitTag;

  const type = slugify(data.asset_type || data.equipment_type || "eq", "eq").toUpperCase();
  const serial = normalizeText(data.serial_number);
  if (serial) {
    return `${type}-${serial.replace(/[^a-zA-Z0-9]+/g, "").toUpperCase()}`.slice(0, 60);
  }

  const model = normalizeText(data.model);
  if (model) {
    return `${type}-${model.replace(/[^a-zA-Z0-9]+/g, "").toUpperCase()}`.slice(0, 60);
  }

  return `${type}-${Date.now()}`;
}

function normalizeEquipmentPayload(equipmentData = {}) {
  const assetType = normalizeText(
    equipmentData.asset_type || equipmentData.equipment_type,
    ""
  );

  return {
    client_id: normalizeText(equipmentData.client_id),
    site_id: normalizeText(equipmentData.site_id),
    asset_tag: buildAssetTag(equipmentData),
    asset_name: buildAssetName(equipmentData),
    asset_type: assetType,
    equipment_type: assetType,
    equipment_description: normalizeText(
      equipmentData.equipment_description || equipmentData.asset_name
    ),
    serial_number: normalizeText(equipmentData.serial_number),
    manufacturer: normalizeText(equipmentData.manufacturer),
    model: normalizeText(equipmentData.model),
    year_built: normalizeText(equipmentData.year_built),
    country_of_origin: normalizeText(equipmentData.country_of_origin),
    capacity_volume: normalizeText(equipmentData.capacity_volume),
    swl: normalizeText(equipmentData.swl),
    proof_load: normalizeText(equipmentData.proof_load),
    lift_height: normalizeText(equipmentData.lift_height),
    sling_length: normalizeText(equipmentData.sling_length),
    working_pressure: normalizeText(equipmentData.working_pressure),
    design_pressure: normalizeText(equipmentData.design_pressure),
    test_pressure: normalizeText(equipmentData.test_pressure),
    pressure_unit: normalizeText(equipmentData.pressure_unit),
    temperature_range: normalizeText(equipmentData.temperature_range),
    material: normalizeText(equipmentData.material),
    standard_code: normalizeText(equipmentData.standard_code),
    location: normalizeText(equipmentData.location),
    status: normalizeText(equipmentData.status, "Active"),
    inspection_date: normalizeText(
      equipmentData.inspection_date || equipmentData.last_inspection_date
    ),
    next_inspection_due: normalizeText(
      equipmentData.next_inspection_due || equipmentData.next_inspection_date
    ),
    certificate_number: normalizeText(equipmentData.certificate_number),
    inspection_number: normalizeText(equipmentData.inspection_number),
    identification_number: normalizeText(equipmentData.identification_number),
    equipment_id: normalizeText(equipmentData.equipment_id),
    lanyard_serial_no: normalizeText(equipmentData.lanyard_serial_no),
    comments: normalizeText(equipmentData.comments),
  };
}

export async function listEquipment() {
  if (!supabase) return notConfigured([]);

  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false });

  return { data: data || [], error: error?.message || null };
}

export async function getEquipment(tag) {
  if (!supabase) return notConfigured(null);

  const cleanTag = normalizeText(tag);
  if (!cleanTag) return { data: null, error: "Equipment tag is required." };

  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("asset_tag", cleanTag)
    .maybeSingle();

  return { data: data || null, error: error?.message || null };
}

export async function getEquipmentById(id) {
  if (!supabase) return notConfigured(null);

  const cleanId = normalizeText(id);
  if (!cleanId) return { data: null, error: "Equipment id is required." };

  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("id", cleanId)
    .maybeSingle();

  return { data: data || null, error: error?.message || null };
}

export async function registerEquipment(equipmentData = {}) {
  if (!supabase) return notConfigured(null);

  const payload = normalizeEquipmentPayload(equipmentData);

  if (!payload.asset_name) {
    return { data: null, error: "Asset name is required." };
  }

  const { data, error } = await supabase
    .from("assets")
    .insert(payload)
    .select()
    .single();

  return { data: data || null, error: error?.message || null };
}

export async function updateEquipment(tag, equipmentData = {}) {
  if (!supabase) return notConfigured(null);

  const cleanTag = normalizeText(tag);
  if (!cleanTag) return { data: null, error: "Equipment tag is required." };

  const payload = normalizeEquipmentPayload(equipmentData);

  const { data, error } = await supabase
    .from("assets")
    .update(payload)
    .eq("asset_tag", cleanTag)
    .select()
    .single();

  return { data: data || null, error: error?.message || null };
}

export async function deleteEquipment(tag) {
  if (!supabase) return notConfigured(null);

  const cleanTag = normalizeText(tag);
  if (!cleanTag) return { data: null, error: "Equipment tag is required." };

  const { error } = await supabase.from("assets").delete().eq("asset_tag", cleanTag);

  return { data: !error, error: error?.message || null };
}

export async function findOrCreateEquipment(equipmentData = {}) {
  if (!supabase) return notConfigured(null);

  const payload = normalizeEquipmentPayload(equipmentData);

  if (payload.asset_tag) {
    const existing = await getEquipment(payload.asset_tag);
    if (existing.data) return existing;
  }

  const { data, error } = await supabase
    .from("assets")
    .insert(payload)
    .select()
    .single();

  return { data: data || null, error: error?.message || null };
}
