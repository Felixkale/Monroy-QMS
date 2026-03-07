import { supabase } from "@/lib/supabaseClient";

// Get all dashboard stats in one call
export async function getDashboardStats() {
  if (!supabase) return getEmptyStats();

  const [clients, equipment, inspections, ncrs, certificates] = await Promise.all([
    supabase.from("clients").select("status"),
    supabase.from("assets").select("status"),
    supabase.from("inspections").select("status, created_at"),
    supabase.from("ncrs").select("status"),
    supabase.from("certificates").select("status, valid_to"),
  ]);

  const today = new Date();
  const in30Days = new Date();
  in30Days.setDate(today.getDate() + 30);

  const certData = certificates.data || [];
  const expiringSoon = certData.filter(c => {
    if (!c.valid_to) return false;
    const exp = new Date(c.valid_to);
    return exp >= today && exp <= in30Days;
  }).length;

  // Recent activity: last 5 inspections
  const recentInspections = (inspections.data || [])
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  return {
    totalClients:      (clients.data || []).length,
    activeClients:     (clients.data || []).filter(c => c.status === "active").length,
    totalEquipment:    (equipment.data || []).length,
    activeEquipment:   (equipment.data || []).filter(e => e.status === "active").length,
    activeInspections: (inspections.data || []).filter(i => i.status === "in_progress").length,
    totalInspections:  (inspections.data || []).length,
    openNcrs:          (ncrs.data || []).filter(n => n.status === "open").length,
    totalNcrs:         (ncrs.data || []).length,
    totalCertificates: certData.length,
    expiringSoon,
    recentInspections,
  };
}

function getEmptyStats() {
  return {
    totalClients: 0, activeClients: 0,
    totalEquipment: 0, activeEquipment: 0,
    activeInspections: 0, totalInspections: 0,
    openNcrs: 0, totalNcrs: 0,
    totalCertificates: 0, expiringSoon: 0,
    recentInspections: [],
  };
}
