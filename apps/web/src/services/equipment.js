// FILE: /apps/web/src/services/equipment.js

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

  const equipmentType = normalizeText(data.equipment_type || data.asset_type, "Equipment");
  const model = normalizeText(data.model);
  const capacity = normalizeText(data.capacity);
  const serial = normalizeText(data.serial_number);

  const parts = [equipmentType, model, capacity].filter(Boolean);
  let value = parts.join(" ");
  if (serial) value = `${value} SN:${serial}`;
  return value || equipmentType;
}

export function normalizeEquipmentPayload(equipmentData = {}) {
  const equipmentType = normalizeText(
    equipmentData.equipment_type || equipmentData.asset_type,
    ""
  );

  return {
    client_id: normalizeText(equipmentData.client_id),
    asset_name: buildAssetName(equipmentData),
    asset_type: equipmentType,
    equipment_type: equipmentType,
    equipment_description: normalizeText(
      equipmentData.equipment_description || equipmentData.asset_name || buildAssetName(equipmentData),
      null
    ),
    manufacturer: normalizeText(equipmentData.manufacturer),
    model: normalizeText(equipmentData.model),
    serial_number: normalizeText(equipmentData.serial_number),
    year_built: normalizeText(equipmentData.year_built),
    equipment_id: normalizeText(equipmentData.equipment_id),
    identification_number: normalizeText(equipmentData.identification_number),
    capacity: normalizeText(equipmentData.capacity),
    swl: normalizeText(equipmentData.swl),
    working_pressure: normalizeText(equipmentData.working_pressure || equipmentData.mawp),
    design_pressure: normalizeText(equipmentData.design_pressure),
    test_pressure: normalizeText(equipmentData.test_pressure),
    country_of_origin: normalizeText(equipmentData.country_of_origin),
    asset_tag: normalizeText(equipmentData.asset_tag),
    nameplate_image_url: normalizeText(equipmentData.nameplate_image_url),
    nameplate_data: equipmentData.nameplate_data || {},
  };
}

export async function registerEquipment(equipmentData = {}) {
  if (!supabase) return notConfigured(null);

  try {
    const payload = normalizeEquipmentPayload(equipmentData);

    const { data, error } = await supabase
      .from("assets")
      .insert([payload])
      .select("*")
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error: error.message || "Failed to register equipment." };
  }
}
