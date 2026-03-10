import { supabase } from "@/lib/supabaseClient";

function notConfigured(defaultData = null) {
  return { data: defaultData, error: "Supabase not configured" };
}

function normalizeText(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  const trimmed = String(value).trim();
  return trimmed === "" ? fallback : trimmed;
}

function normalizeClientPayload(clientData = {}) {
  return {
    company_name: normalizeText(clientData.company_name, ""),
    industry: normalizeText(clientData.industry),
    contact_person: normalizeText(clientData.contact_person),
    contact_email: normalizeText(clientData.contact_email, ""),
    contact_phone: normalizeText(clientData.contact_phone),
    address: normalizeText(clientData.address),
    city: normalizeText(clientData.city),
    country: normalizeText(clientData.country, "Botswana"),
    status: normalizeText(clientData.status, "active"),
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

  if (!payload.company_name) {
    return { data: null, error: { message: "Company name is required" } };
  }

  if (!payload.contact_email) {
    return { data: null, error: { message: "Contact email is required" } };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert([payload])
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
    .single();

  return { data, error };
}

// Update a client
export async function updateClient(id, updates) {
  if (!supabase) return notConfigured(null);
  if (!id) return { data: null, error: "Client ID is required" };

  const payload = normalizeClientPayload(updates);

  const { data, error } = await supabase
    .from("clients")
    .update(payload)
    .eq("id", id)
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
    .single();

  return { data, error };
}

// Delete a client
export async function deleteClient(id) {
  if (!supabase) return notConfigured(null);
  if (!id) return { data: null, error: "Client ID is required" };

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id);

  return { data: !error, error };
}

// Get client stats for dashboard
export async function getClientStats() {
  if (!supabase) return { total: 0, active: 0, suspended: 0, inactive: 0 };

  const { data, error } = await supabase
    .from("clients")
    .select("status");

  if (error || !data) {
    return { total: 0, active: 0, suspended: 0, inactive: 0 };
  }

  return {
    total: data.length,
    active: data.filter((c) => c.status === "active").length,
    suspended: data.filter((c) => c.status === "suspended").length,
    inactive: data.filter((c) => c.status === "inactive").length,
  };
}
