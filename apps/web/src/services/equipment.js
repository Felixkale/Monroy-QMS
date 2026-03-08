import { supabase } from "@/lib/supabaseClient";

export async function getEquipment(clientId = null) {
  if (!supabase) return { data: [], error: "Supabase not configured" };

  let query = supabase
    .from("assets")
    .select(`
      id, asset_tag, asset_type, description, manufacturer, model,
      serial_number, status, license_status, license_expiry,
      location, condition, created_at, client_id,
      clients ( id, company_name )
    `)
    .order("created_at", { ascending: false });

  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  return { data: data || [], error };
}

export async function getEquipmentStats(clientId = null) {
  if (!supabase) return { total: 0, active: 0, expiring: 0, expired: 0 };

  let query = supabase.from("assets").select("status, license_status");
  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error || !data) return { total: 0, active: 0, expiring: 0, expired: 0 };

  return {
    total:    data.length,
    active:   data.filter(e => e.status === "active").length,
    expiring: data.filter(e => e.license_status === "expiring").length,
    expired:  data.filter(e => e.license_status === "expired").length,
  };
}
