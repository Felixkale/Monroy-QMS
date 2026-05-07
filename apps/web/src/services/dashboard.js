// src/services/dashboard.js  —  Monroy QMS
import { supabase } from "@/lib/supabaseClient";

export async function getDashboardStats() {
  if (!supabase) return getEmptyStats();
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);
    const todayStr    = today.toISOString().split("T")[0];
    const in30DaysStr = in30Days.toISOString().split("T")[0];

    const [
      totalClientsRes,
      activeClientsRes,
      totalEquipmentRes,
      activeEquipmentRes,
      totalCertificatesRes,
      expiringSoonRes,
      openNcrsRes,
      totalNcrsRes,
    ] = await Promise.all([
      // Clients
      supabase.from("clients").select("*", { count: "exact", head: true }),
      supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "active"),

      // Equipment
      supabase.from("equipment").select("*", { count: "exact", head: true }),
      supabase.from("equipment").select("*", { count: "exact", head: true }).eq("status", "active"),

      // Certificates — exact count bypasses the 1000-row Supabase cap
      supabase.from("certificates").select("*", { count: "exact", head: true }),

      // Expiring within 30 days and not yet expired
      supabase
        .from("certificates")
        .select("*", { count: "exact", head: true })
        .gte("expiry_date", todayStr)
        .lte("expiry_date", in30DaysStr),

      // NCRs
      supabase.from("ncrs").select("*", { count: "exact", head: true }).neq("status", "closed"),
      supabase.from("ncrs").select("*", { count: "exact", head: true }),
    ]);

    return {
      totalClients:      totalClientsRes.count      ?? 0,
      activeClients:     activeClientsRes.count     ?? 0,
      totalEquipment:    totalEquipmentRes.count    ?? 0,
      activeEquipment:   activeEquipmentRes.count   ?? 0,
      totalCertificates: totalCertificatesRes.count ?? 0,
      expiringSoon:      expiringSoonRes.count       ?? 0,
      openNcrs:          openNcrsRes.count           ?? 0,
      totalNcrs:         totalNcrsRes.count          ?? 0,
    };
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return getEmptyStats();
  }
}

function getEmptyStats() {
  return {
    totalClients: 0,
    activeClients: 0,
    totalEquipment: 0,
    activeEquipment: 0,
    totalCertificates: 0,
    expiringSoon: 0,
    openNcrs: 0,
    totalNcrs: 0,
  };
}
