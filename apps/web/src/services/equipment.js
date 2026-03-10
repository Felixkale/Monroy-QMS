import { supabase } from "@/lib/supabaseClient";

function notConfigured(defaultData = null) {
  return { data: defaultData, error: "Supabase not configured" };
}

export async function getEquipment(clientId = null) {
  if (!supabase) return notConfigured([]);

  let query = supabase
    .from("assets")
    .select(`
      id,
      asset_tag,
      asset_type,
      description,
      manufacturer,
      model,
      serial_number,
      license_status,
      license_expiry,
      location,
      condition,
      status,
      year_built,
      department,
      created_at,
      updated_at,
      client_id,
      clients (
        company_name,
        company_code
      )
    `)
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
    .select(`
      *,
      clients (
        company_name,
        company_code
      )
    `)
    .eq("id", id)
    .single();

  return { data, error };
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
