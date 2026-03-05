"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ── Chart data ──────────────────────────────────────────────────────────────
const inspectionTrends = [
  { month: "Aug", inspections: 28, ncrs: 4 },
  { month: "Sep", inspections: 34, ncrs: 6 },
  { month: "Oct", inspections: 29, ncrs: 3 },
  { month: "Nov", inspections: 41, ncrs: 7 },
  { month: "Dec", inspections: 36, ncrs: 5 },
  { month: "Jan", inspections: 38, ncrs: 3 },
];

const equipmentDist = [
  { name: "Pressure Vessels", value: 52, color: "#00f5c4" },
  { name: "Boilers",          value: 31, color: "#7c5cfc" },
  { name: "Lifting Equip",    value: 44, color: "#4fc3f7" },
  { name: "Air Receivers",    value: 28, color: "#f472b6" },
  { name: "Storage Tanks",    value: 31, color: "#fbbf24" },
];

const monthlyPerf = [
  { week: "W1", pass: 12, fail: 2 },
  { week: "W2", pass: 18, fail: 3 },
  { week: "W3", pass: 15, fail: 1 },
  { week: "W4", pass: 21, fail: 4 },
];

const recentActivity = [
  { action: "Inspection completed", detail: "Pressure vessel PV-0041 · Acme Corp",    time: "2m ago",  color: "#00f5c4", icon: "✅" },
  { action: "NCR raised",           detail: "Boiler BL-0012 · SteelWorks Ltd · Major", time: "18m ago", color: "#f472b6", icon: "⚠️" },
  { action: "Certificate issued",   detail: "ISO cert #C-0889 · TechPlant Inc",        time: "1h ago",  color: "#4fc3f7", icon: "📜" },
  { action: "Equipment registered", detail: "Air receiver AR-0067 · MineOps Ltd",      time: "2h ago",  color: "#7c5cfc", icon: "⚙️" },
  { action: "Inspection scheduled", detail: "Lifting equip LE-0034 · Cargo Hub",       time: "4h ago",  color: "#fbbf24", icon: "📅" },
];

const navItems = [
  { id: "dashboard",    label: "Dashboard",    icon: "📊" },
  { id: "clients",      label: "Clients",      icon: "🏢" },
  { id: "equipment",    label: "Equipment",    icon: "⚙️" },
  { id: "inspections",  label: "Inspections",  icon: "🔍" },
  { id: "ncr",          label: "NCR",          icon: "⚠️" },
  { id: "certificates", label: "Certificates", icon: "📜" },
  { id: "reports",      label: "Reports",      icon: "📈" },
  { id: "admin",        label: "Admin",        icon: "⚡" },
];

// ── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ target }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let n = 0;
    const step = Math.ceil(target / 40);
    const t = setInterval(() => {
      n += step;
      if (n >= target) { setVal(target); clearInterval(t); }
      else setVal(n);
    }, 30);
    return () => clearInterval(t);
  }, [target]);
  return <span>{val}</span>;
}

// ── Colour tokens ─────────────────────────────────────────────────────────────
const C = {
  green:  "#00f5c4",
  purple: "#7c5cfc",
  blue:   "#4fc3f7",
  pink:   "#f472b6",
  yellow: "#fbbf24",
};

// ── Main component ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [user,      setUser]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [pulse,     setPulse]     = useState(false);
  const router = useRouter();

  // ── Auth (unchanged from your original) ──────────────────────────────────
  useEffect(() => { checkUser(); }, []);
  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 2000);
    return () => clearInterval(t);
  }, []);

  async function checkUser() {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) { router.push("/login"); return; }
      setUser(data.user);
    } catch (err) {
      console.error(err);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#0d0d1a",
      color: C.green, fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 700,
      letterSpacing: "0.1em",
    }}>
      Loading Dashboard…
    </div>
  );

  // ── KPI card config ────────────────────────────────────────────────────────
  const kpiCards = [
    { label: "TOTAL CLIENTS",   value: 24,  change: "+2 this month",  changeColor: C.green,  accent: C.green,  icon: "🏢" },
    { label: "TOTAL EQUIPMENT", value: 186, change: "+12 new",         changeColor: C.green,  accent: C.blue,   icon: "⚙️" },
    { label: "INSPECTIONS",     value: 38,  change: "+5 completed",    changeColor: C.green,  accent: C.purple, icon: "🔍" },
    { label: "PENDING TASKS",   value: 7,   change: "-1 overdue",      changeColor: "#f87171",accent: C.pink,   icon: "⏳" },
    { label: "OPEN NCRs",       value: 3,   change: "→ No change",     changeColor: "#94a3b8",accent: C.yellow, icon: "⚠️" },
    { label: "CERTIFICATES",    value: 156, change: "+4 issued",       changeColor: C.green,  accent: C.green,  icon: "📜" },
  ];

  // ── Helpers ────────────────────────────────────────────────────────────────
  const glowMap = {
    [C.green]:  "0 0 30px rgba(0,245,196,0.22)",
    [C.blue]:   "0 0 30px rgba(79,195,247,0.22)",
    [C.purple]: "0 0 30px rgba(124,92,252,0.22)",
    [C.pink]:   "0 0 30px rgba(244,114,182,0.22)",
    [C.yellow]: "0 0 30px rgba(251,191,36,0.22)",
  };
  const rgbaMap = {
    [C.green]:  "0,245,196",
    [C.blue]:   "79,195,247",
    [C.purple]: "124,92,252",
    [C.pink]:   "244,114,182",
    [C.yellow]: "251,191,36",
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      background: "#0d0d1a",
      fontFamily: "'Sora', 'DM Sans', sans-serif",
      color: "#e2e8f0",
    }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 230, flexShrink: 0,
        background: "linear-gradient(180deg,#13132a 0%,#0f0f22 100%)",
        borderRight: "1px solid rgba(124,92,252,0.2)",
        display: "flex", flexDirection: "column",
        padding: "28px 0 20px",
        position: "sticky", top: 0, height: "100vh",
      }}>
        {/* Logo */}
        <div style={{ padding: "0 20px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `linear-gradient(135deg,${C.purple},${C.green})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, boxShadow: `0 0 16px rgba(124,92,252,0.5)`,
            }}>⚡</div>
            <div>
              <div style={{
                fontSize: 16, fontWeight: 800, letterSpacing: "0.04em",
                background: `linear-gradient(90deg,${C.green},${C.blue})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>Monroy QMS</div>
              <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Enterprise Platform
              </div>
            </div>
          </div>
          {/* Live pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginTop: 12,
            padding: "6px 12px",
            background: "rgba(0,245,196,0.08)", border: "1px solid rgba(0,245,196,0.2)",
            borderRadius: 20, width: "fit-content",
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%", background: C.green,
              boxShadow: pulse ? `0 0 8px ${C.green}` : "none", transition: "box-shadow 0.5s",
            }}/>
            <span style={{ fontSize: 10, color: C.green, fontWeight: 600, letterSpacing: "0.08em" }}>LIVE</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0 10px" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveNav(item.id)} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "11px 14px", borderRadius: 10, marginBottom: 3,
              cursor: "pointer", width: "100%", textAlign: "left",
              background: activeNav === item.id
                ? "linear-gradient(90deg,rgba(124,92,252,0.25),rgba(0,245,196,0.1))"
                : "transparent",
              borderLeft: activeNav === item.id ? `3px solid ${C.green}` : "3px solid transparent",
              border: "none",
              color: activeNav === item.id ? "#fff" : "#64748b",
              fontWeight: activeNav === item.id ? 700 : 400,
              fontSize: 13, transition: "all 0.2s",
            }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* User block — uses real Supabase user */}
        <div style={{ padding: "16px 16px 0" }}>
          <div style={{
            padding: "12px 14px", borderRadius: 12,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
            marginBottom: 10, display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: `linear-gradient(135deg,${C.purple},${C.green})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 13,
            }}>
              {user?.email?.[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{user?.email}</div>
              <div style={{ fontSize: 10, color: "#64748b" }}>Admin</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{
            width: "100%", padding: "9px",
            background: "linear-gradient(90deg,rgba(124,92,252,0.3),rgba(0,245,196,0.15))",
            border: "1px solid rgba(124,92,252,0.4)",
            borderRadius: 10, color: C.green,
            fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: "0.05em",
          }}>Logout</button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: "32px 32px 48px", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{
              fontSize: 32, fontWeight: 900, margin: 0,
              background: `linear-gradient(90deg,#fff 30%,${C.green})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              letterSpacing: "-0.02em",
            }}>Dashboard</h1>
            <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>
              Real-time overview of enterprise inspection operations
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{
              padding: "8px 16px", borderRadius: 20,
              background: "rgba(0,245,196,0.08)", border: `1px solid rgba(0,245,196,0.2)`,
              fontSize: 12, color: C.green, fontWeight: 600,
            }}>📅 March 2026</div>
            <div style={{
              padding: "8px 16px", borderRadius: 20,
              background: "rgba(124,92,252,0.15)", border: `1px solid rgba(124,92,252,0.3)`,
              fontSize: 12, color: C.purple, fontWeight: 600, cursor: "pointer",
            }}>⬇ Export PDF</div>
          </div>
        </div>

        {/* KPI grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginBottom: 24 }}>
          {kpiCards.map(card => (
            <div key={card.label} style={{
              background: "linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
              border: `1px solid rgba(${rgbaMap[card.accent]},0.25)`,
              borderRadius: 16, padding: "22px 24px",
              boxShadow: glowMap[card.accent],
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80,
                borderRadius: "50%", background: card.accent, opacity: 0.08, filter: "blur(20px)" }}/>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#64748b", textTransform: "uppercase" }}>
                  {card.label}
                </span>
                <span style={{
                  fontSize: 18, width: 34, height: 34, display: "flex",
                  alignItems: "center", justifyContent: "center", borderRadius: 10,
                  background: `rgba(${rgbaMap[card.accent]},0.12)`,
                }}>{card.icon}</span>
              </div>
              <div style={{
                fontSize: 40, fontWeight: 900, lineHeight: 1, color: "#fff",
                textShadow: `0 0 20px ${card.accent}66`, marginBottom: 6,
              }}>
                <AnimatedNumber target={card.value} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: card.changeColor }}>{card.change}</div>
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg,${card.accent},transparent)`, opacity: 0.7,
              }}/>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 18, marginBottom: 24 }}>

          {/* Inspection Trends */}
          <div style={{
            background: "linear-gradient(135deg,rgba(124,92,252,0.08),rgba(0,245,196,0.04))",
            border: "1px solid rgba(124,92,252,0.2)", borderRadius: 16, padding: "22px 20px",
          }}>
            <ChartHeader accent={C.purple} title="Inspection Trends" sub="Last 6 months performance" accentB={C.green}/>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={inspectionTrends}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.purple} stopOpacity={0.5}/>
                    <stop offset="95%" stopColor={C.purple} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.green} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={C.green} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="month" tick={{ fill:"#64748b", fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:"#64748b", fontSize:11 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background:"#1a1a35", border:"1px solid rgba(124,92,252,0.3)", borderRadius:8, color:"#fff" }}/>
                <Area type="monotone" dataKey="inspections" stroke={C.purple} strokeWidth={2.5} fill="url(#g1)" name="Inspections"/>
                <Area type="monotone" dataKey="ncrs"        stroke={C.green}  strokeWidth={2.5} fill="url(#g2)" name="NCRs"/>
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", gap:16, marginTop:4 }}>
              {[{label:"Inspections",color:C.purple},{label:"NCRs",color:C.green}].map(l=>(
                <div key={l.label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#94a3b8" }}>
                  <div style={{ width:12, height:3, borderRadius:2, background:l.color }}/>
                  {l.label}
                </div>
              ))}
            </div>
          </div>

          {/* Equipment Distribution */}
          <div style={{
            background: "linear-gradient(135deg,rgba(0,245,196,0.06),rgba(79,195,247,0.04))",
            border: "1px solid rgba(0,245,196,0.18)", borderRadius: 16, padding: "22px 20px",
          }}>
            <ChartHeader accent={C.green} accentB={C.blue} title="Equipment Distribution" sub="By equipment type"/>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={equipmentDist} cx="50%" cy="50%" innerRadius={44} outerRadius={72} dataKey="value" stroke="none">
                  {equipmentDist.map((e,i)=><Cell key={i} fill={e.color} opacity={0.9}/>)}
                </Pie>
                <Tooltip contentStyle={{ background:"#1a1a35", border:"1px solid rgba(0,245,196,0.3)", borderRadius:8, color:"#fff" }}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", flexDirection:"column", gap:5, marginTop:4 }}>
              {equipmentDist.map(d=>(
                <div key={d.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, color:"#94a3b8" }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:d.color }}/>
                    {d.name}
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, color:d.color }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Performance */}
          <div style={{
            background: "linear-gradient(135deg,rgba(244,114,182,0.06),rgba(124,92,252,0.04))",
            border: "1px solid rgba(244,114,182,0.18)", borderRadius: 16, padding: "22px 20px",
          }}>
            <ChartHeader accent={C.pink} accentB={C.purple} title="Monthly Performance" sub="Week by week breakdown"/>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={monthlyPerf} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="week" tick={{ fill:"#64748b", fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:"#64748b", fontSize:11 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background:"#1a1a35", border:"1px solid rgba(244,114,182,0.3)", borderRadius:8, color:"#fff" }}/>
                <Bar dataKey="pass" fill={C.green} radius={[5,5,0,0]} name="Pass"/>
                <Bar dataKey="fail" fill={C.pink}  radius={[5,5,0,0]} name="Fail"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1.3fr", gap:18 }}>

          {/* License Compliance */}
          <div style={{
            background: "linear-gradient(135deg,rgba(251,191,36,0.06),rgba(124,92,252,0.04))",
            border: "1px solid rgba(251,191,36,0.2)", borderRadius: 16, padding: "22px 24px",
          }}>
            <ChartHeader accent={C.yellow} accentB={C.pink} title="License Compliance" sub="Overall compliance status"/>
            {[
              { label:"Valid Licenses",  value:141, color:C.green,  pct:90 },
              { label:"Expiring Soon",   value:11,  color:C.yellow, pct:7  },
              { label:"Expired",         value:4,   color:C.pink,   pct:3  },
            ].map(item=>(
              <div key={item.label} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:12, color:"#94a3b8" }}>{item.label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:item.color }}>{item.value}</span>
                </div>
                <div style={{ height:6, background:"rgba(255,255,255,0.07)", borderRadius:10, overflow:"hidden" }}>
                  <div style={{
                    height:"100%", width:`${item.pct}%`,
                    background:`linear-gradient(90deg,${item.color},${item.color}aa)`,
                    borderRadius:10, boxShadow:`0 0 8px ${item.color}66`,
                  }}/>
                </div>
              </div>
            ))}
            <div style={{
              marginTop:16, padding:"12px 16px",
              background:"rgba(0,245,196,0.07)", border:"1px solid rgba(0,245,196,0.15)",
              borderRadius:10, display:"flex", justifyContent:"space-between", alignItems:"center",
            }}>
              <span style={{ fontSize:12, color:"#94a3b8" }}>Overall Compliance Rate</span>
              <span style={{ fontSize:22, fontWeight:900, color:C.green }}>90.4%</span>
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{
            background: "linear-gradient(135deg,rgba(79,195,247,0.05),rgba(124,92,252,0.03))",
            border: "1px solid rgba(79,195,247,0.18)", borderRadius: 16, padding: "22px 24px",
          }}>
            <ChartHeader accent={C.blue} accentB={C.purple} title="Recent Activity" sub="Latest system events"/>
            {recentActivity.map((item,i)=>(
              <div key={i} style={{
                display:"flex", alignItems:"flex-start", gap:12,
                padding:"11px 0",
                borderBottom: i < recentActivity.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                <div style={{
                  width:32, height:32, borderRadius:9, flexShrink:0,
                  background:`rgba(${rgbaMap[item.color]},0.12)`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:14,
                }}>{item.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"#e2e8f0", marginBottom:2 }}>{item.action}</div>
                  <div style={{ fontSize:11, color:"#64748b", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.detail}</div>
                </div>
                <div style={{ fontSize:10, color:"#475569", flexShrink:0, paddingTop:2 }}>{item.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display:"flex", gap:12, marginTop:24, flexWrap:"wrap" }}>
          {[
            { label:"📝 Create Inspection", accent:C.purple },
            { label:"🏷️ Generate QR Code",  accent:C.green  },
            { label:"➕ Register Equipment", accent:C.blue   },
            { label:"📄 Export Report",      accent:C.pink   },
          ].map(btn=>(
            <button key={btn.label} style={{
              padding:"11px 20px", borderRadius:12, cursor:"pointer",
              background:`rgba(${rgbaMap[btn.accent]},0.12)`,
              border:`1px solid rgba(${rgbaMap[btn.accent]},0.3)`,
              color:"#e2e8f0", fontWeight:700, fontSize:13, fontFamily:"inherit",
              transition:"all 0.2s",
            }}>{btn.label}</button>
          ))}
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0d0d1a; }
        ::-webkit-scrollbar-thumb { background: rgba(124,92,252,0.4); border-radius:4px; }
      `}</style>
    </div>
  );
}

// ── Shared sub-component ─────────────────────────────────────────────────────
function ChartHeader({ accent, accentB, title, sub }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{
          width:4, height:18, borderRadius:2,
          background: `linear-gradient(${accent}, ${accentB || accent})`,
        }}/>
        <span style={{ fontWeight:700, fontSize:14 }}>{title}</span>
      </div>
      {sub && <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{sub}</div>}
    </div>
  );
}
