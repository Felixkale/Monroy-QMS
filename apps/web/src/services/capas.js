// src/services/capas.js
import { supabase } from "@/lib/supabaseClient";

export async function getCAPAs() {
  if (!supabase) return { data: [], error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("capas")
    .select(`
      id, capa_number, title, type, stage, priority, status,
      raised_by, assigned_to, target_date, actual_close_date, created_at,
      ncrs ( id, ncr_number ),
      assets (
        id, asset_tag, asset_name,
        clients ( id, company_name )
      )
    `)
    .order("created_at", { ascending: false });

  return { data: data || [], error: error || null };
}

export async function getCAPA(id) {
  if (!supabase) return { data: null, error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("capas")
    .select(`
      *,
      ncrs ( id, ncr_number, description ),
      assets (
        id, asset_tag, asset_name, asset_type, location,
        clients ( id, company_name )
      )
    `)
    .eq("id", id)
    .maybeSingle();

  return { data: data || null, error: error || null };
}

export async function getCAPAStats() {
  if (!supabase) return { total: 0, open: 0, closed: 0, critical: 0, high: 0 };

  const { data, error } = await supabase
    .from("capas")
    .select("id, status, priority, stage");

  if (error || !data) return { total: 0, open: 0, closed: 0, critical: 0, high: 0 };

  return {
    total:    data.length,
    open:     data.filter(c => c.status !== "closed").length,
    closed:   data.filter(c => c.status === "closed").length,
    critical: data.filter(c => c.priority === "critical").length,
    high:     data.filter(c => c.priority === "high").length,
  };
}

export async function createCAPA(payload) {
  if (!supabase) return { data: null, error: "Supabase not configured" };
  const { data, error } = await supabase
    .from("capas")
    .insert(payload)
    .select("id")
    .single();
  return { data, error };
}

export async function updateCAPA(id, payload) {
  if (!supabase) return { data: null, error: "Supabase not configured" };
  const { data, error } = await supabase
    .from("capas")
    .update(payload)
    .eq("id", id)
    .select("id")
    .single();
  return { data, error };
}

export async function advanceCAPAStage(id, nextStage) {
  const isClosed = nextStage === "closed";
  return updateCAPA(id, {
    stage: nextStage,
    status: isClosed ? "closed" : nextStage === "verification" ? "pending_verification" : "in_progress",
    actual_close_date: isClosed ? new Date().toISOString().slice(0, 10) : null,
  });
}
