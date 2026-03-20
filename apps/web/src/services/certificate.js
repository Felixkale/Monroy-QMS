import { supabase } from "@/lib/supabaseClient";
import { saveCertificateFromInspection } from "@/services/certificates";

function clean(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text === "" ? fallback : text;
}

export async function saveInspectionWithCertificate(formData, inspector = null) {
  const inspectionPayload = {
    asset_id: formData.asset_id,
    inspection_date: formData.inspection_date || new Date().toISOString(),
    inspection_type: clean(formData.inspection_type),
    status: clean(formData.status, "PASS"),
    equipment_status: clean(formData.equipment_status, formData.status || "PASS"),
    result: clean(formData.result),
    company: clean(formData.company),
    equipment_description: clean(formData.equipment_description),
    equipment_location: clean(formData.equipment_location),
    equipment_id: clean(formData.equipment_id),
    identification_number: clean(formData.identification_number),
    inspection_no: clean(formData.inspection_no),
    lanyard_serial_no: clean(formData.lanyard_serial_no),
    manufacturer: clean(formData.manufacturer),
    model: clean(formData.model),
    year_built: clean(formData.year_built),
    country_of_origin: clean(formData.country_of_origin),
    capacity: clean(formData.capacity),
    mawp: clean(formData.mawp),
    design_pressure: clean(formData.design_pressure),
    test_pressure: clean(formData.test_pressure),
    swl: clean(formData.swl),
    proof_load: clean(formData.proof_load),
    lifting_height: clean(formData.lifting_height),
    sling_length: clean(formData.sling_length),
    chain_size: clean(formData.chain_size),
    rope_diameter: clean(formData.rope_diameter),
    legal_framework: clean(formData.legal_framework),
    inspector_name: clean(formData.inspector_name),
    inspector_id: clean(formData.inspector_id),
    logo_url: clean(formData.logo_url),
    signature_url: clean(formData.signature_url),
    valid_to: formData.valid_to || null,
    issued_at: formData.issued_at || null,
    updated_at: new Date().toISOString(),
  };

  let inspectionRow;

  if (formData.id) {
    const { data, error } = await supabase
      .from("inspections")
      .update(inspectionPayload)
      .eq("id", formData.id)
      .select()
      .single();

    if (error) throw new Error(error.message || "Failed to update inspection.");
    inspectionRow = data;
  } else {
    const { data, error } = await supabase
      .from("inspections")
      .insert({
        ...inspectionPayload,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message || "Failed to create inspection.");
    inspectionRow = data;
  }

  const certificate = await saveCertificateFromInspection({
    inspection: inspectionRow,
    assetId: inspectionRow.asset_id,
    inspector,
  });

  return {
    inspection: inspectionRow,
    certificate,
  };
}
