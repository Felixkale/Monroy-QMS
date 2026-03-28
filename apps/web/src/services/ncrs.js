// src/services/ncrs.js
import { supabase } from "@/lib/supabaseClient";

export async function getNCRs(clientId = null) {
  if (!supabase) return { data: [], error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("ncrs")
    .select(`
      id, ncr_number, title, description, severity, status,
      due_date, closed_date, raised_by, assigned_to, created_at,
      assets (
        id, asset_tag, asset_name, asset_type, client_id,
        clients ( id, company_name )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error };

  const filtered = clientId
    ? (data || []).filter(n => n.assets?.client_id === clientId)
    : (data || []);

  return { data: filtered, error: null };
}

export async function getNCR(id) {
  if (!supabase) return { data: null, error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("ncrs")
    .select(`
      *,
      assets (
        id, asset_tag, asset_name, asset_type, location, serial_number,
        clients ( id, company_name )
      )
    `)
    .eq("id", id)
    .maybeSingle();

  return { data: data || null, error: error || null };
}

export async function getNCRStats(clientId = null) {
  if (!supabase) return { total: 0, open: 0, closed: 0, in_progress: 0, critical: 0, major: 0, minor: 0 };

  const { data, error } = await getNCRs(clientId);
  if (error || !data) return { total: 0, open: 0, closed: 0, in_progress: 0, critical: 0, major: 0, minor: 0 };

  return {
    total:       data.length,
    open:        data.filter(n => n.status === "open").length,
    closed:      data.filter(n => n.status === "closed").length,
    in_progress: data.filter(n => n.status === "in_progress").length,
    critical:    data.filter(n => n.severity === "critical").length,
    major:       data.filter(n => n.severity === "major").length,
    minor:       data.filter(n => n.severity === "minor").length,
  };
}

export async function createNCR(payload) {
  if (!supabase) return { data: null, error: "Supabase not configured" };
  const { data, error } = await supabase
    .from("ncrs")
    .insert(payload)
    .select("id")
    .single();
  return { data, error };
}

export async function updateNCR(id, payload) {
  if (!supabase) return { data: null, error: "Supabase not configured" };
  const { data, error } = await supabase
    .from("ncrs")
    .update(payload)
    .eq("id", id)
    .select("id")
    .single();
  return { data, error };
}

export async function closeNCR(id) {
  return updateNCR(id, {
    status: "closed",
    closed_date: new Date().toISOString().slice(0, 10),
  });
}
