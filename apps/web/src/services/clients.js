import { supabase } from "@/lib/supabaseClient";

function notConfigured(defaultData = null) {
  return { data: defaultData, error: "Supabase not configured" };
}

function normalizeClientPayload(clientData = {}) {
  return {
    company_name: (clientData.company_name || "").trim(),
    company_code: (clientData.company_code || "").trim(),
    industry: (clientData.industry || "").trim(),
    contact_person: (clientData.contact_person || "").trim(),
    contact_email: (clientData.contact_email || "").trim(),
    contact_phone: (clientData.contact_phone || "").trim(),
    address: (clientData.address || "").trim(),
    city: (clientData.city || "").trim(),
    country: (clientData.country || "Botswana").trim(),
    status: clientData.status || "active",
  };
}

// Fetch all clients
export async function getClients() {
  if (!supabase) return notConfigured([]);

  const { data, error } = await supabase
    .from("clients")
    .select(`
      id,
      company_name,
      company_code,
      industry,
      contact_person,
      contact_email,
      contact_phone,
      address,
      city,
      country,
      status,
      created_at,
      updated_at
    `)
    .order("created_at", { ascending: false });

  return { data: data || [], error };
}

// Fetch a single client by ID
export async function getClientById(id) {
  if (!supabase) return notConfigured(null);
  if (!id) return { data: null, error: "Client ID is required" };

  const { data, error } = await supabase
    .from("clients")
    .select(`
      id,
      company_name,
      company_code,
      industry,
      contact_person,
      contact_email,
      contact_phone,
      address,
      city,
      country,
      status,
      created_at,
      updated_at
    `)
    .eq("id", id)
    .single();

  return { data, error };
}

// Register a new client
export async function registerClient(clientData) {
  if (!supabase) return notConfigured(null);

  const payload = normalizeClientPayload(clientData);

  const { data, error } = await supabase
    .from("clients")
    .insert([payload])
    .select()
    .single();

  return { data, error };
}

// Update a client
export async function updateClient(id, updates) {
  if (!supabase) return notConfigured(null);
  if (!id) return { data: null, error: "Client ID is required" };

  const payload = {
    ...normalizeClientPayload(updates),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("clients")
    .update(payload)
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

  if (error || !data) {
    return { total: 0, active: 0, suspended: 0 };
  }

  return {
    total: data.length,
    active: data.filter(c => c.status === "active").length,
    suspended: data.filter(c => c.status === "suspended").length,
  };
}
