import { supabase } from "@/lib/supabaseClient";

export async function getInspections(clientId = null) {
  if (!supabase) return { data: [], error: "Supabase not configured" };

  let query = supabase
    .from("inspections")
    .select(`
      id, inspection_number, inspection_date, result, status, notes, created_at,
      assets ( id, asset_tag, asset_type, client_id,
        clients ( id, company_name )
      )
    `)
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) return { data: [], error };

  // Filter by client if needed
  const filtered = clientId
    ? (data || []).filter(i => i.assets?.client_id === clientId)
    : (data || []);

  return { data: filtered, error: null };
}

export async function getInspectionStats(clientId = null) {
  if (!supabase) return { total: 0, pass: 0, fail: 0, conditional: 0 };

  const { data, error } = await getInspections(clientId);
  if (error || !data) return { total: 0, pass: 0, fail: 0, conditional: 0 };

  return {
    total:       data.length,
    pass:        data.filter(i => i.result === "pass").length,
    fail:        data.filter(i => i.result === "fail").length,
    conditional: data.filter(i => i.result === "conditional").length,
  };
}
