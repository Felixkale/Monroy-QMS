import { supabase } from "@/lib/supabaseClient";

function normalizeInspection(ins) {
  const certificates = Array.isArray(ins?.certificates) ? ins.certificates : [];
  const latestCertificate =
    certificates.length > 0
      ? [...certificates].sort((a, b) => {
          const aTime = new Date(a.issued_at || 0).getTime();
          const bTime = new Date(b.issued_at || 0).getTime();
          return bTime - aTime;
        })[0]
      : null;

  return {
    ...ins,
    certificates,
    certificate_count: certificates.length,
    has_certificate: certificates.length > 0,
    latest_certificate: latestCertificate,
    certificate_number: latestCertificate?.certificate_number || null,
    certificate_type: latestCertificate?.certificate_type || null,
    certificate_valid_to: latestCertificate?.valid_to || null,
    certificate_issued_at: latestCertificate?.issued_at || null,
  };
}

export async function getInspections(clientId = null) {
  if (!supabase) {
    return { data: [], error: "Supabase not configured" };
  }

  let query = supabase
    .from("inspections")
    .select(`
      id,
      inspection_number,
      inspection_date,
      result,
      status,
      notes,
      inspector_name,
      created_at,
      updated_at,
      assets (
        id,
        asset_tag,
        asset_name,
        asset_type,
        serial_number,
        client_id,
        clients (
          id,
          company_name
        )
      ),
      certificates (
        id,
        certificate_number,
        certificate_type,
        equipment_status,
        issued_at,
        valid_to,
        inspection_id
      )
    `)
    .order("inspection_date", { ascending: false })
    .order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    return { data: [], error };
  }

  let rows = (data || []).map(normalizeInspection);

  if (clientId) {
    rows = rows.filter((i) => i.assets?.client_id === clientId);
  }

  return { data: rows, error: null };
}

export async function getInspectionById(id) {
  if (!supabase) {
    return { data: null, error: "Supabase not configured" };
  }

  const { data, error } = await supabase
    .from("inspections")
    .select(`
      id,
      inspection_number,
      inspection_date,
      result,
      status,
      notes,
      inspector_name,
      created_at,
      updated_at,
      assets (
        id,
        asset_tag,
        asset_name,
        asset_type,
        serial_number,
        model,
        manufacturer,
        client_id,
        clients (
          id,
          company_name
        )
      ),
      certificates (
        id,
        certificate_number,
        certificate_type,
        equipment_status,
        issued_at,
        valid_to,
        inspection_id
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data: normalizeInspection(data), error: null };
}

export async function createInspection(payload) {
  if (!supabase) {
    return { data: null, error: "Supabase not configured" };
  }

  const cleanPayload = {
    asset_id: payload.asset_id || null,
    inspection_number: payload.inspection_number?.trim() || null,
    inspection_date: payload.inspection_date || null,
    inspector_name: payload.inspector_name?.trim() || null,
    result: payload.result || "pass",
    status: payload.status || "completed",
    notes: payload.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from("inspections")
    .insert(cleanPayload)
    .select(`
      id,
      inspection_number,
      inspection_date,
      result,
      status,
      notes,
      inspector_name,
      created_at
    `)
    .single();

  return { data: data || null, error: error || null };
}

export async function updateInspection(id, payload) {
  if (!supabase) {
    return { data: null, error: "Supabase not configured" };
  }

  const cleanPayload = {
    ...(payload.asset_id !== undefined ? { asset_id: payload.asset_id || null } : {}),
    ...(payload.inspection_number !== undefined
      ? { inspection_number: payload.inspection_number?.trim() || null }
      : {}),
    ...(payload.inspection_date !== undefined
      ? { inspection_date: payload.inspection_date || null }
      : {}),
    ...(payload.inspector_name !== undefined
      ? { inspector_name: payload.inspector_name?.trim() || null }
      : {}),
    ...(payload.result !== undefined ? { result: payload.result || "pass" } : {}),
    ...(payload.status !== undefined ? { status: payload.status || "completed" } : {}),
    ...(payload.notes !== undefined ? { notes: payload.notes?.trim() || null } : {}),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("inspections")
    .update(cleanPayload)
    .eq("id", id)
    .select(`
      id,
      inspection_number,
      inspection_date,
      result,
      status,
      notes,
      inspector_name,
      created_at,
      updated_at
    `)
    .single();

  return { data: data || null, error: error || null };
}

export async function deleteInspection(id) {
  if (!supabase) {
    return { error: "Supabase not configured" };
  }

  const { error } = await supabase.from("inspections").delete().eq("id", id);
  return { error: error || null };
}

export async function getInspectionStats(clientId = null) {
  const { data, error } = await getInspections(clientId);

  if (error || !data) {
    return {
      total: 0,
      pass: 0,
      fail: 0,
      conditional: 0,
      withCertificate: 0,
      withoutCertificate: 0,
    };
  }

  return {
    total: data.length,
    pass: data.filter((i) => i.result === "pass").length,
    fail: data.filter((i) => i.result === "fail").length,
    conditional: data.filter((i) => i.result === "conditional").length,
    withCertificate: data.filter((i) => i.has_certificate).length,
    withoutCertificate: data.filter((i) => !i.has_certificate).length,
  };
}

export async function linkCertificateToInspection({ inspectionId, certificateId }) {
  if (!supabase) {
    return { data: null, error: "Supabase not configured" };
  }

  const { data, error } = await supabase
    .from("certificates")
    .update({ inspection_id: inspectionId })
    .eq("id", certificateId)
    .select("id, certificate_number, inspection_id")
    .single();

  return { data: data || null, error: error || null };
}

export async function unlinkCertificateFromInspection(certificateId) {
  if (!supabase) {
    return { data: null, error: "Supabase not configured" };
  }

  const { data, error } = await supabase
    .from("certificates")
    .update({ inspection_id: null })
    .eq("id", certificateId)
    .select("id, certificate_number, inspection_id")
    .single();

  return { data: data || null, error: error || null };
}

export async function getCertificatesForInspection(inspectionId) {
  if (!supabase) {
    return { data: [], error: "Supabase not configured" };
  }

  const { data, error } = await supabase
    .from("certificates")
    .select(`
      id,
      certificate_number,
      certificate_type,
      equipment_status,
      issued_at,
      valid_to,
      inspection_id
    `)
    .eq("inspection_id", inspectionId)
    .order("issued_at", { ascending: false });

  return { data: data || [], error: error || null };
}
