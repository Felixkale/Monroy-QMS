import { supabase } from "@/lib/supabaseClient";
import { saveCertificateFromInspection } from "@/services/certificates";

function clean(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text === "" ? fallback : text;
}

function toIsoOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function buildInspectionPayload(form = {}) {
  return {
    asset_id: clean(form.asset_id),
    inspection_date:
      toIsoOrNull(form.inspection_date) || new Date().toISOString(),
    inspection_type: clean(form.inspection_type),
    status: clean(form.status, "PASS"),
    equipment_status: clean(form.equipment_status, clean(form.status, "PASS")),
    result: clean(form.result),
    company: clean(form.company),
    equipment_description: clean(form.equipment_description),
    equipment_location: clean(form.equipment_location),
    equipment_id: clean(form.equipment_id),
    identification_number: clean(form.identification_number),
    inspection_no: clean(form.inspection_no),
    lanyard_serial_no: clean(form.lanyard_serial_no),
    manufacturer: clean(form.manufacturer),
    model: clean(form.model),
    year_built: clean(form.year_built),
    country_of_origin: clean(form.country_of_origin),
    capacity: clean(form.capacity),
    mawp: clean(form.mawp),
    design_pressure: clean(form.design_pressure),
    test_pressure: clean(form.test_pressure),
    swl: clean(form.swl),
    proof_load: clean(form.proof_load),
    lifting_height: clean(form.lifting_height),
    sling_length: clean(form.sling_length),
    chain_size: clean(form.chain_size),
    rope_diameter: clean(form.rope_diameter),
    legal_framework: clean(form.legal_framework),
    inspector_name: clean(form.inspector_name),
    inspector_id: clean(form.inspector_id),
    logo_url: clean(form.logo_url),
    signature_url: clean(form.signature_url),
    issued_at: toIsoOrNull(form.issued_at),
    valid_to: toIsoOrNull(form.valid_to),
    updated_at: new Date().toISOString(),
  };
}

export async function createInspectionWithCertificate(form = {}) {
  const payload = buildInspectionPayload(form);

  if (!payload.asset_id) {
    throw new Error("Asset is required.");
  }

  const { data: inspection, error } = await supabase
    .from("inspections")
    .insert({
      ...payload,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Failed to create inspection.");
  }

  const certificate = await saveCertificateFromInspection({
    inspection,
    assetId: inspection.asset_id,
  });

  return { inspection, certificate };
}

export async function updateInspectionWithCertificate(id, form = {}) {
  if (!id) throw new Error("Inspection ID is required.");

  const payload = buildInspectionPayload(form);

  const { data: inspection, error } = await supabase
    .from("inspections")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Failed to update inspection.");
  }

  const certificate = await saveCertificateFromInspection({
    inspection,
    assetId: inspection.asset_id,
  });

  return { inspection, certificate };
}
