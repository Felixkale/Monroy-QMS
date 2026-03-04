import { supabaseServer } from "./supabaseServer";

export async function dbSelect(table, select = "*") {
  const sb = supabaseServer();
  const { data, error } = await sb.from(table).select(select);
  if (error) throw new Error(error.message);
  return data;
}

export async function dbInsert(table, payload) {
  const sb = supabaseServer();
  const { data, error } = await sb.from(table).insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}
