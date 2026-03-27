// src/app/superadmin/dashboard/page.jsx  (or wherever your super admin page lives)
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

/* ── Tokens ── */
const T = {
  bg:         "#070e18",
  surface:    "rgba(13,22,38,0.80)",
  panel:      "rgba(10,18,32,0.92)",
  card:       "rgba(255,255,255,0.025)",
  border:     "rgba(148,163,184,0.12)",
  text:       "#f0f6ff",
  textMid:    "rgba(240,246,255,0.72)",
  textDim:    "rgba(240,246,255,0.40)",
  accent:     "#22d3ee",
  accentDim:  "rgba(34,211,238,0.10)",
  accentBrd:  "rgba(34,211,238,0.25)",
  accentGlow: "rgba(34,211,238,0.18)",
  green:      "#34d399", greenDim: "rgba(52,211,153,0.10)",  greenBrd: "rgba(52,211,153,0.25)",
  red:        "#f87171", redDim:   "rgba(248,113,113,0.10)", redBrd:   "rgba(248,113,113,0.25)",
  amber:      "#fbbf24", amberDim: "rgba(251,191,36,0.10)",  amberBrd: "rgba(251,191,36,0.25)",
  purple:     "#a78bfa", purpleDim:"rgba(167,139,250,0.10)", purpleBrd:"rgba(167,139,250,0.25)",
  blue:       "#60a5fa", blueDim:  "rgba(96,165,250,0.10)",  blueBrd:  "rgba(96,165,250,0.25)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}

  /* Stat cards */
  .sa-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
  .sa-stat{transition:transform .2s,border-color .2s;cursor:default}
  .sa-stat:hover{transform:translateY(-2px);border-color:rgba(148,163,184,0.22)!important}

  /* Two-col layout */
  .sa-cols{display:grid;grid-template-columns:1.3fr 0.7fr;gap:16px;align-items:start}

  /* Quick action buttons */
  .sa-action{transition:transform .15s,border-color .15s,background .15s;cursor:pointer}
  .sa-action:hover{transform:translateX(3px)}

  @media(max-width:1100px){
    .sa-stats{grid-template-columns:repeat(3,minmax(0,1fr))}
    .sa-cols{grid-template-columns:1fr}
  }
  @media(max-width:768px){
    .sa-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .sa-cols{grid-template-columns:1fr}
    .sa-page-pad{padding:12px!important}
  }
  @media(max-width:400px){
    .sa-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
  }
`;

/* ── Helpers ── */
function formatNum(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString();
}

function relativeTime(v) {
  if (!v) return "";
  const diff = Date.now() - new Date(v).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24)return `${hours}h ago`;
  return `${days}d ago`;
}

/* ── Stat card ── */
function StatCard({ label, value, color, glow, icon, loading }) {
  return (
    <div className="sa-stat" style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: "16px 18px", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at top right,${glow},transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textDim }}>{label}</span>
        <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
      </div>
      <div style={{ fontSize: loading ? 20 : 30, fontWeight: 900, color, lineHeight: 1 }}>
        {loading ? "…" : value}
      </div>
    </div>
  );
}

/* ── Panel wrapper ── */
function Panel({ title, children, accent }) {
  const c = accent || T.accent;
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 18, padding: 20 }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 4, height: 18, borderRadius: 2, background: `linear-gradient(to bottom,${c},rgba(34,211,238,0.3))`, flexShrink: 0 }} />
          <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{title}</div>
        </div>
      )}
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════ */
export default function SuperAdminDashboardPage() {
  const router = useRouter();

  const [loading,        setLoading]       = useState(true);
  const [pageError,      setPageError]     = useState("");
  const [userName,       setUserName]      = useState("Admin");
  const [stats,          setStats]         = useState({ totalUsers:0, activeClients:0, activeAssets:0, activeCertificates:0, openNcrs:0, activeAlerts:0 });
  const [recentActivity, setRecentActivity]= useState([]);
  const [systemHealth,   setSystemHealth]  = useState({ label:"Healthy", value:"100%", color:T.green });

  useEffect(() => {
    async function load() {
      setLoading(true); setPageError("");
      try {
        const [
          authRes, usersRes, clientsRes, assetsRes,
          certsRes, ncrsRes, alertsRes,
          recentUsersRes, recentCertsRes, recentNcrsRes,
        ] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from("users").select("id",       { count:"exact", head:true }),
          supabase.from("clients").select("id",     { count:"exact", head:true }).eq("status","active"),
          supabase.from("assets").select("id",      { count:"exact", head:true }).eq("status","active"),
          supabase.from("certificates").select("id",{ count:"exact", head:true }).neq("status","revoked"),
          supabase.from("ncrs").select("id",        { count:"exact", head:true }).neq("status","closed"),
          supabase.from("alerts").select("id",      { count:"exact", head:true }).eq("status","active"),
          supabase.from("users").select("email,full_name,created_at,status").order("created_at",{ascending:false}).limit(4),
          supabase.from("certificates").select("certificate_number,company,status,created_at").order("created_at",{ascending:false}).limit(4),
          supabase.from("ncrs").select("ncr_number,description,status,created_at").order("created_at",{ascending:false}).limit(4),
        ]);

        const u = authRes?.data?.user;
        setUserName(u?.user_metadata?.full_name || u?.email?.split("@")[0] || "Admin");

        const s = {
          totalUsers:         usersRes.count  || 0,
          activeClients:      clientsRes.count|| 0,
          activeAssets:       assetsRes.count || 0,
          activeCertificates: certsRes.count  || 0,
          openNcrs:           ncrsRes.count   || 0,
          activeAlerts:       alertsRes.count || 0,
        };
        setStats(s);

        const score = Math.max(0, 100 - Math.min(20, s.openNcrs * 2) - Math.min(15, s.activeAlerts) - (s.activeClients === 0 ? 25 : 0));
        setSystemHealth(
          score >= 85 ? { label:"Healthy",   value:`${score}%`, color:T.green  } :
          score >= 65 ? { label:"Attention",  value:`${score}%`, color:T.amber  } :
                        { label:"Critical",   value:`${score}%`, color:T.red    }
        );

        const activity = [
          ...(recentUsersRes.data||[]).map(r=>({ action:"User registered",   detail:r.full_name||r.email||"User",    time:r.created_at, ok:r.status==="active" })),
          ...(recentCertsRes.data||[]).map(r=>({ action:"Certificate saved", detail:r.certificate_number||r.company||"Certificate", time:r.created_at, ok:r.status==="issued" })),
          ...(recentNcrsRes.data||[]).map(r=>({ action:"NCR logged",         detail:r.ncr_number||r.description||"NCR", time:r.created_at, ok:r.status==="closed" })),
        ];
        activity.sort((a,b)=>new Date(b.time)-new Date(a.time));
        setRecentActivity(activity.slice(0,8));
      } catch(err) {
        setPageError(err?.message||"Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = useMemo(()=>[
    { label:"Total Users",         value:formatNum(stats.totalUsers),         color:T.blue,   glow:"rgba(96,165,250,0.14)",   icon:"👥" },
    { label:"Active Clients",      value:formatNum(stats.activeClients),      color:T.green,  glow:"rgba(52,211,153,0.14)",   icon:"🏢" },
    { label:"Registered Assets",   value:formatNum(stats.activeAssets),       color:T.purple, glow:"rgba(167,139,250,0.14)",  icon:"⚙️" },
    { label:"Certificates",        value:formatNum(stats.activeCertificates), color:T.amber,  glow:"rgba(251,191,36,0.14)",   icon:"📜" },
    { label:"Open NCRs",           value:formatNum(stats.openNcrs),           color:stats.openNcrs>0?T.red:T.green,    glow:stats.openNcrs>0?"rgba(248,113,113,0.14)":"rgba(52,211,153,0.14)",   icon:"⚠️" },
    { label:"Active Alerts",       value:formatNum(stats.activeAlerts),       color:stats.activeAlerts>0?T.red:T.green,glow:stats.activeAlerts>0?"rgba(248,113,113,0.14)":"rgba(52,211,153,0.14)",icon:"🔔" },
    { label:"System Health",       value:systemHealth.value,                  color:systemHealth.color,                glow:"rgba(34,211,238,0.14)",   icon:"💚" },
    { label:"Platform Status",     value:systemHealth.label,                  color:systemHealth.color,                glow:"rgba(34,211,238,0.10)",   icon:"🖥️" },
  ],[stats,systemHealth]);

  const quickActions = [
    { label:"Manage Users",        detail:"Roles, access, activation",           href:"/superadmin/users", color:T.blue,   icon:"👤" },
    { label:"Manage Clients",      detail:"Client accounts and status",          href:"/clients",          color:T.green,  icon:"🏢" },
    { label:"Equipment Register",  detail:"Assets and certification records",    href:"/equipment",        color:T.purple, icon:"⚙️" },
    { label:"Certificates",        detail:"View and edit issued certificates",   href:"/certificates",     color:T.amber,  icon:"📜" },
  ];

  return (
    <AppLayout title="Super Admin Dashboard">
      <style>{CSS}</style>
      <div className="sa-page-pad" style={{ minHeight:"100vh", background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.06),transparent),radial-gradient(ellipse 60% 50% at 100% 100%,rgba(167,139,250,0.06),transparent),${T.bg}`, color:T.text, fontFamily:"'IBM Plex Sans',sans-serif", padding:24 }}>
        <div style={{ maxWidth:1400, margin:"0 auto", display:"grid", gap:20 }}>

          {/* HEADER */}
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:20, padding:"22px 26px", backdropFilter:"blur(20px)", boxShadow:"0 24px 64px rgba(0,0,0,0.35)" }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:14, flexWrap:"wrap" }}>
              <div>
                <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", color:T.accent, marginBottom:8 }}>Super Admin</div>
                <h1 style={{ margin:0, fontSize:"clamp(22px,3vw,30px)", fontWeight:900, letterSpacing:"-0.02em", lineHeight:1.1 }}>
                  {loading ? "Loading…" : `Welcome back, ${userName}`}
                </h1>
                <p style={{ margin:"6px 0 0", color:T.textDim, fontSize:13 }}>Full system overview and administration controls</p>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ padding:"8px 14px", borderRadius:12, background:T.accentDim, border:`1px solid ${T.accentBrd}`, fontSize:12, fontWeight:700, color:T.accent }}>
                  {systemHealth.label}
                </div>
              </div>
            </div>
          </div>

          {/* ERROR */}
          {pageError && (
            <div style={{ padding:"12px 16px", borderRadius:12, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontSize:13, fontWeight:600 }}>
              ⚠ {pageError}
            </div>
          )}

          {/* STATS GRID */}
          <div className="sa-stats">
            {statCards.map(s=>(
              <StatCard key={s.label} {...s} loading={loading}/>
            ))}
          </div>

          {/* TWO-COL */}
          <div className="sa-cols">

            {/* Activity feed */}
            <Panel title="System Activity">
              {loading ? (
                <div style={{ padding:"24px 0", textAlign:"center", color:T.textDim, fontSize:13 }}>Loading activity…</div>
              ) : recentActivity.length === 0 ? (
                <div style={{ padding:"24px 0", textAlign:"center", color:T.textDim, fontSize:13 }}>No recent activity.</div>
              ) : (
                <div style={{ display:"grid", gap:0 }}>
                  {recentActivity.map((log, i) => (
                    <div key={`${log.action}-${log.time}-${i}`} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, padding:"12px 0", borderBottom: i < recentActivity.length-1 ? `1px solid ${T.border}` : "none" }}>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{log.action}</div>
                        <div style={{ fontSize:11, color:T.textDim, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginTop:2 }}>{log.detail}</div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:99, background:log.ok?T.greenDim:T.amberDim, color:log.ok?T.green:T.amber, border:`1px solid ${log.ok?T.greenBrd:T.amberBrd}` }}>
                          {log.ok ? "✓" : "⚠"} {log.ok ? "success" : "pending"}
                        </span>
                        <div style={{ fontSize:10, color:T.textDim, marginTop:4 }}>{relativeTime(log.time)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* Right col */}
            <div style={{ display:"grid", gap:16 }}>

              {/* Quick actions */}
              <Panel title="Quick Actions">
                <div style={{ display:"grid", gap:10 }}>
                  {quickActions.map(item=>(
                    <button
                      key={item.label}
                      type="button"
                      onClick={()=>router.push(item.href)}
                      className="sa-action"
                      style={{ textAlign:"left", padding:"13px 14px", borderRadius:12, border:`1px solid rgba(148,163,184,0.12)`, background:T.card, color:T.text, width:"100%", fontFamily:"'IBM Plex Sans',sans-serif" }}
                    >
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                        <span style={{ fontWeight:800, fontSize:13 }}>{item.label}</span>
                        <span style={{ fontSize:16 }}>{item.icon}</span>
                      </div>
                      <div style={{ fontSize:11, color:T.textDim }}>{item.detail}</div>
                    </button>
                  ))}
                </div>
              </Panel>

              {/* Oversight summary */}
              <Panel title="Oversight Summary">
                <div style={{ display:"grid", gap:10 }}>
                  {[
                    { label:"User accounts",    value:stats.totalUsers,         color:T.text },
                    { label:"Client base",      value:stats.activeClients,      color:T.text },
                    { label:"Assets monitored", value:stats.activeAssets,       color:T.text },
                    { label:"Certificates",     value:stats.activeCertificates, color:T.text },
                    { label:"Open NCRs",        value:stats.openNcrs,           color:stats.openNcrs>0?T.red:T.text },
                    { label:"Active alerts",    value:stats.activeAlerts,       color:stats.activeAlerts>0?T.red:T.text },
                  ].map(row=>(
                    <div key={row.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:13 }}>
                      <span style={{ color:T.textDim }}>{row.label}</span>
                      <span style={{ color:row.color, fontWeight:800 }}>{loading?"…":formatNum(row.value)}</span>
                    </div>
                  ))}
                </div>
              </Panel>

            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
