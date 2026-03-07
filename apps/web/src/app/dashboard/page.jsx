"use client";
import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { getDashboardStats } from "@/services/dashboard";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", yellow:"#fbbf24", pink:"#f472b6" };
const rgbaMap = {
  [C.green]:"0,245,196", [C.blue]:"79,195,247",
  [C.purple]:"124,92,252", [C.yellow]:"251,191,36", [C.pink]:"244,114,182",
};

export default function DashboardPage() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (e) {
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = stats ? [
    { label:"Total Clients",      value:stats.totalClients,      sub:`${stats.activeClients} active`,       color:C.blue,   icon:"🏢", href:"/clients"      },
    { label:"Total Equipment",    value:stats.totalEquipment,    sub:`${stats.activeEquipment} active`,     color:C.green,  icon:"⚙️", href:"/equipment"    },
    { label:"Active Inspections", value:stats.activeInspections, sub:`${stats.totalInspections} total`,     color:C.purple, icon:"🔍", href:"/inspections"  },
    { label:"Open NCRs",          value:stats.openNcrs,          sub:`${stats.totalNcrs} total`,            color:C.yellow, icon:"⚠️", href:"/ncr"          },
    { label:"Certificates",       value:stats.totalCertificates, sub:`${stats.expiringSoon} expiring soon`, color:C.pink,   icon:"📜", href:"/certificates" },
  ] : [];

  return (
    <AppLayout title="Dashboard">

      {error && (
        <div style={{ background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)", borderRadius:12, padding:"12px 16px", marginBottom:20, color:C.pink, fontSize:13 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:28 }}>
        {loading
          ? Array.from({length:5}).map((_,i) => (
              <div key={i} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:"20px", height:100 }} />
            ))
          : statCards.map(stat => (
              <a key={stat.label} href={stat.href} style={{ textDecoration:"none" }}>
                <div
                  style={{ background:`rgba(${rgbaMap[stat.color]},0.07)`, border:`1px solid rgba(${rgbaMap[stat.color]},0.25)`, borderRadius:14, padding:"20px", cursor:"pointer", transition:"all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.background=`rgba(${rgbaMap[stat.color]},0.14)`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.background=`rgba(${rgbaMap[stat.color]},0.07)`; }}
                >
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em" }}>{stat.label}</span>
                    <span style={{ fontSize:20 }}>{stat.icon}</span>
                  </div>
                  <div style={{ fontSize:36, fontWeight:900, color:stat.color, lineHeight:1, marginBottom:6 }}>{stat.value}</div>
                  <div style={{ fontSize:11, color:"#64748b" }}>{stat.sub}</div>
                </div>
              </a>
            ))
        }
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:20 }}>

        {/* Quick Actions */}
        <div style={{ background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))", border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, padding:"20px" }}>
          <h2 style={{ fontSize:14, fontWeight:700, color:"#fff", margin:"0 0 16px" }}>Quick Actions</h2>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {[
              { label:"Register New Client",  href:"/clients/register",   color:C.blue,   icon:"🏢" },
              { label:"Add Equipment",        href:"/equipment/register", color:C.green,  icon:"⚙️" },
              { label:"Start Inspection",     href:"/inspections/new",    color:C.purple, icon:"🔍" },
              { label:"Create Certificate",   href:"/certificates",       color:C.yellow, icon:"📜" },
              { label:"Log NCR",              href:"/ncr/new",            color:C.pink,   icon:"⚠️" },
            ].map(action => (
              <a key={action.label} href={action.href} style={{
                display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                background:`rgba(${rgbaMap[action.color]},0.06)`,
                border:`1px solid rgba(${rgbaMap[action.color]},0.15)`,
                borderRadius:10, textDecoration:"none", color:"#e2e8f0",
                fontSize:13, fontWeight:600, transition:"all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background=`rgba(${rgbaMap[action.color]},0.16)`; e.currentTarget.style.color="#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background=`rgba(${rgbaMap[action.color]},0.06)`; e.currentTarget.style.color="#e2e8f0"; }}>
                <span style={{ fontSize:16 }}>{action.icon}</span>
                {action.label}
                <span style={{ marginLeft:"auto", color:"#64748b" }}>→</span>
              </a>
            ))}
          </div>
        </div>

        {/* System Overview */}
        <div style={{ background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))", border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, padding:"20px" }}>
          <h2 style={{ fontSize:14, fontWeight:700, color:"#fff", margin:"0 0 16px" }}>System Overview</h2>
          {loading ? (
            <div style={{ color:"#64748b", fontSize:13 }}>Loading…</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {[
                { label:"Clients Registered",  value:stats?.totalClients,      max:Math.max(stats?.totalClients,10),      color:C.blue   },
                { label:"Equipment Registered", value:stats?.totalEquipment,    max:Math.max(stats?.totalEquipment,10),    color:C.green  },
                { label:"Certificates Issued",  value:stats?.totalCertificates, max:Math.max(stats?.totalCertificates,10), color:C.yellow },
                { label:"Open NCRs",            value:stats?.openNcrs,          max:Math.max(stats?.totalNcrs,10),         color:C.pink   },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontSize:12, color:"#94a3b8" }}>{item.label}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:item.color }}>{item.value}</span>
                  </div>
                  <div style={{ height:6, background:"rgba(255,255,255,0.06)", borderRadius:4, overflow:"hidden" }}>
                    <div style={{ height:"100%", borderRadius:4, width:`${Math.min((item.value/item.max)*100,100)}%`, background:item.color, transition:"width 0.6s ease" }}/>
                  </div>
                </div>
              ))}

              {stats?.expiringSoon > 0 && (
                <div style={{ marginTop:8, padding:"10px 14px", background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:10, fontSize:12, color:C.yellow }}>
                  ⚠️ {stats.expiringSoon} certificate{stats.expiringSoon > 1 ? "s" : ""} expiring within 30 days
                </div>
              )}

              {stats?.totalClients === 0 && stats?.totalEquipment === 0 && (
                <div style={{ marginTop:8, padding:"10px 14px", background:"rgba(79,195,247,0.08)", border:"1px solid rgba(79,195,247,0.2)", borderRadius:10, fontSize:12, color:C.blue }}>
                  👋 Start by <a href="/clients/register" style={{ color:C.blue, fontWeight:700 }}>registering your first client</a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
