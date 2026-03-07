import { supabase } from "@/lib/supabaseClient";

// Fetch all clients
export async function getClients() {
  if (!supabase) return { data: [], error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("clients")
    .select(`
      id,
      company_name,
      company_code,
      contact_person,
      contact_email,
      contact_phone,
      address,
      city,
      country,
      status,
      created_at
    `)
    .order("created_at", { ascending: false });

  return { data: data || [], error };
}

// Fetch a single client by ID
export async function getClientById(id) {
  if (!supabase) return { data: null, error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  return { data, error };
}

// Register a new client
export async function registerClient(clientData) {
  if (!supabase) return { data: null, error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("clients")
    .insert([{
      company_name:   clientData.company_name,
      company_code:   clientData.company_code,
      contact_person: clientData.contact_person,
      contact_email:  clientData.contact_email,
      contact_phone:  clientData.contact_phone,
      address:        clientData.address,
      city:           clientData.city,
      country:        clientData.country || "Botswana",
      status:         clientData.status || "active",
    }])
    .select()
    .single();

  return { data, error };
}

// Update a client
export async function updateClient(id, updates) {
  if (!supabase) return { data: null, error: "Supabase not configured" };

  const { data, error } = await supabase
    .from("clients")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  return { data, error };
}

// Get client stats for dashboard
export async function getClientStats() {
  if (!supabase) return { total: 0, active: 0, suspended: 0 };

  const { data, error } = await supabase
    .from("clients")
    .select("status");

  if (error || !data) return { total: 0, active: 0, suspended: 0 };

  return {
    total:     data.length,
    active:    data.filter(c => c.status === "active").length,
    suspended: data.filter(c => c.status === "suspended").length,
  };
}
