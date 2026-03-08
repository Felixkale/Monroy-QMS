import { supabase } from "@/lib/supabaseClient";

export async function getNCRs(clientId = null) {
  if (!supabase) return { data: [], error: "Supabase not configured" };

  let query = supabase
    .from("ncrs")
    .select(`
      id, ncr_number, description, severity, status, due_date, created_at,
      assets ( id, asset_tag, asset_type, client_id,
        clients ( id, company_name )
      )
    `)
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) return { data: [], error };

  const filtered = clientId
    ? (data || []).filter(n => n.assets?.client_id === clientId)
    : (data || []);

  return { data: filtered, error: null };
}

export async function getNCRStats(clientId = null) {
  if (!supabase) return { total: 0, open: 0, closed: 0, critical: 0 };

  const { data, error } = await getNCRs(clientId);
  if (error || !data) return { total: 0, open: 0, closed: 0, critical: 0 };

  return {
    total:    data.length,
    open:     data.filter(n => n.status === "open").length,
    closed:   data.filter(n => n.status === "closed").length,
    critical: data.filter(n => n.severity === "critical").length,
  };
}
