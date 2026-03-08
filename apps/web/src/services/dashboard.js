import { supabase } from "@/lib/supabaseClient";

export async function getDashboardStats() {

  if (!supabase) return getEmptyStats();

  try {

    const [
      clientsRes,
      equipmentRes,
      inspectionsRes,
      ncrsRes,
      certificatesRes
    ] = await Promise.all([
      supabase.from("clients").select("status"),
      supabase.from("assets").select("status"),
      supabase.from("inspections").select("status, created_at"),
      supabase.from("ncrs").select("status"),
      supabase.from("certificates").select("status, valid_to")
    ]);

    const clients = clientsRes.data || [];
    const equipment = equipmentRes.data || [];
    const inspections = inspectionsRes.data || [];
    const ncrs = ncrsRes.data || [];
    const certData = certificatesRes.data || [];

    const today = new Date();
    today.setHours(0,0,0,0);

    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);

    const expiringSoon = certData.filter(c => {

      if (!c.valid_to) return false;

      const exp = new Date(c.valid_to);
      exp.setHours(0,0,0,0);

      return exp >= today && exp <= in30Days;

    }).length;

    const recentInspections = [...inspections]
      .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))
      .slice(0,5);

    return {

      totalClients: clients.length,
      activeClients: clients.filter(c=>c.status==="active").length,

      totalEquipment: equipment.length,
      activeEquipment: equipment.filter(e=>e.status==="active").length,

      activeInspections: inspections.filter(i=>i.status==="in_progress").length,
      totalInspections: inspections.length,

      openNcrs: ncrs.filter(n=>n.status==="open").length,
      totalNcrs: ncrs.length,

      totalCertificates: certData.length,
      expiringSoon,

      recentInspections
    };

  } catch(error) {

    console.error("Dashboard stats error:", error);
    return getEmptyStats();

  }

}

function getEmptyStats(){

  return {

    totalClients:0,
    activeClients:0,

    totalEquipment:0,
    activeEquipment:0,

    activeInspections:0,
    totalInspections:0,

    openNcrs:0,
    totalNcrs:0,

    totalCertificates:0,
    expiringSoon:0,

    recentInspections:[]
  };

}
