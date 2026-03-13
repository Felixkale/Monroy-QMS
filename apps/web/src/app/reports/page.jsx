"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgba = { green:"0,245,196", blue:"79,195,247", purple:"124,92,252", pink:"244,114,182", yellow:"251,191,36" };

function formatDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

function isExpired(val) {
  return val && new Date(val) < new Date();
}

export default function ReportsPage() {
  const router  = useRouter();
  const [tab,        setTab]        = useState("overview");
  const [stats,      setStats]      = useState(null);
  const [certs,      setCerts]      = useState([]);
  const [equipment,  setEquipment]  = useState([]);
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [
        { count: totalEquip   },
        { count: totalCerts   },
        { count: expiredCerts },
        { count: passCerts    },
        { count: failCerts    },
        { count: totalClients },
        { data: recentCerts   },
        { data: expiringAssets},
      ] = await Promise.all([
        supabase.from("assets").select("*", { count:"exact", head:true }),
        supabase.from("certificates").select("*", { count:"exact", head:true }),
        supabase.from("certificates").select("*", { count:"exact", head:true }).lt("valid_to", new Date().toISOString()),
        supabase.from("certificates").select("*", { count:"exact", head:true }).eq("equipment_status", "PASS"),
        supabase.from("certificates").select("*", { count:"exact", head:true }).eq("equipment_status", "FAIL"),
        supabase.from("clients").select("*", { count:"exact", head:true }),
        supabase.from("certificates")
          .select("id, certificate_number, company, equipment_description, issued_at, valid_to, equipment_status, certificate_type")
          .order("issued_at", { ascending:false }).limit(20),
        supabase.from("assets")
          .select("id, asset_tag, asset_name, asset_type, next_inspection_date, license_status, clients(company_name)")
          .not("next_inspection_date", "is", null)
          .order("next_inspection_date", { ascending:true }).limit(20),
      ]);

      setStats({
        totalEquip:    totalEquip    || 0,
        totalCerts:    totalCerts    || 0,
        expiredCerts:  expiredCerts  || 0,
        passCerts:     passCerts     || 0,
        failCerts:     failCerts     || 0,
        totalClients:  totalClients  || 0,
        passRate: totalCerts > 0 ? Math.round(((passCerts || 0) / totalCerts) * 100) : 0,
      });
      setCerts(recentCerts    || []);
      setEquipment(expiringAssets || []);
    } catch (err) {
      setError(err.message || "Failed to load report data.");
    }
    setLoading(false);
  }

  const filteredCerts = certs.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.certificate_number || "").toLowerCase().includes(q) ||
      (c.company || "").toLowerCase().includes(q) ||
      (c.equipment_description || "").toLowerCase().includes(q)
    );
  });

  const TABS = [
    { id:"overview",  label:"Overview"        },
    { id:"certs",     label:"Certificates"    },
    { id:"expiring",  label:"Expiring"        },
    { id:"export",    label:"Export Report"   },
  ];

  return (
    <AppLayout title="Reports">

      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:"clamp(22px,4vw,32px)", fontWeight:900,
          background:`linear-gradient(90deg,#fff 30%,${C.blue})`,
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          Reports
        </h1>
        <div style={{ marginTop:8, width:72, height:4, borderRadius:999,
          background:`linear-gradient(90deg,${C.green},${C.purple},${C.blue})` }} />
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, margin:"8px 0 0" }}>
          Analytics, summaries and data exports
        </p>
      </div>

      {error && (
        <div style={{ background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)",
          borderRadius:12, padding:"12px 16px", marginBottom:20, color:C.pink, fontSize:13 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Tab nav */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:24,
        borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => t.id === "export" ? router.push("/reports/export") : setTab(t.id)} style={{
            padding:"10px 18px", border:"none", background:"none", cursor:"pointer",
            fontFamily:"inherit", fontWeight:700, fontSize:13,
            color: tab === t.id ? "#fff" : "#64748b",
            borderBottom: tab === t.id ? `2px solid ${C.blue}` : "2px solid transparent",
            transition:"all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div>
          {loading ? (
            <div style={{ color:"#64748b", padding:"40px 0", textAlign:"center" }}>Loading report data…</div>
          ) : stats && (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:24 }}>
                {[
                  { label:"Total Clients",      value:stats.totalClients,  color:C.purple, r:rgba.purple },
                  { label:"Total Equipment",     value:stats.totalEquip,    color:C.blue,   r:rgba.blue   },
                  { label:"Total Certificates",  value:stats.totalCerts,    color:C.green,  r:rgba.green  },
                  { label:"Pass Rate",           value:`${stats.passRate}%`,color:C.green,  r:rgba.green  },
                  { label:"Expired Certs",       value:stats.expiredCerts,  color:C.pink,   r:rgba.pink   },
                  { label:"Failed Inspections",  value:stats.failCerts,     color:C.pink,   r:rgba.pink   },
                ].map(s => (
                  <div key={s.label} style={{
                    background:`rgba(${s.r},0.07)`, border:`1px solid rgba(${s.r},0.25)`,
                    borderRadius:14, padding:"18px 20px",
                  }}>
                    <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>{s.label}</div>
                    <div style={{ fontSize:28, fontWeight:900, color:s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Pass/Fail visual bar */}
              <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:22, marginBottom:16 }}>
                <h3 style={{ color:"#fff", margin:"0 0 16px", fontSize:14, fontWeight:700 }}>Certificate Status Breakdown</h3>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  <div style={{ flex:1, height:12, borderRadius:999, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
                    <div style={{
                      height:"100%", borderRadius:999,
                      width: `${stats.passRate}%`,
                      background:`linear-gradient(90deg,${C.green},${C.blue})`,
                      transition:"width 1s ease",
                    }} />
                  </div>
                  <span style={{ color:C.green, fontWeight:700, fontSize:13, flexShrink:0 }}>{stats.passRate}% Pass</span>
                </div>
                <div style={{ display:"flex", gap:20, fontSize:12 }}>
                  <span style={{ color:C.green }}>✓ {stats.passCerts} Passed</span>
                  <span style={{ color:C.pink  }}>✗ {stats.failCerts} Failed</span>
                  <span style={{ color:"#64748b" }}>⏱ {stats.expiredCerts} Expired</span>
                </div>
              </div>

              <button onClick={() => router.push("/reports/export")} style={{
                padding:"11px 24px", borderRadius:10, border:"none", fontFamily:"inherit",
                background:`linear-gradient(135deg,${C.purple},${C.blue})`,
                color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer",
                boxShadow:"0 0 20px rgba(124,92,252,0.35)",
              }}>
                📤 Export Full Report
              </button>
            </>
          )}
        </div>
      )}

      {/* ── CERTIFICATES ── */}
      {tab === "certs" && (
        <div>
          <div style={{ marginBottom:14 }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search certificates…"
              style={{
                width:"100%", maxWidth:400, padding:"10px 14px",
                background:"rgba(255,255,255,0.04)", border:"1px solid rgba(102,126,234,0.25)",
                borderRadius:8, color:"#e2e8f0", fontSize:13, outline:"none", boxSizing:"border-box",
              }} />
          </div>

          {loading ? (
            <div style={{ color:"#64748b", padding:"40px 0", textAlign:"center" }}>Loading…</div>
          ) : (
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"rgba(255,255,255,0.03)" }}>
                    {["Cert No.", "Company", "Equipment", "Issued", "Expiry", "Status"].map(h => (
                      <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:11, color:"#64748b",
                        textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCerts.map((c, i) => {
                    const expired = isExpired(c.valid_to);
                    const isPASS  = (c.equipment_status || "").toUpperCase() === "PASS";
                    return (
                      <tr key={c.id} style={{ borderTop:"1px solid rgba(255,255,255,0.05)", cursor:"pointer" }}
                        onClick={() => router.push(`/certificates/${c.id}`)}
                        onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                        onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                        <td style={{ padding:"12px 16px", color:C.purple, fontWeight:700 }}>{c.certificate_number || c.id?.slice(0,8).toUpperCase()}</td>
                        <td style={{ padding:"12px 16px", color:"#e2e8f0" }}>{c.company || "—"}</td>
                        <td style={{ padding:"12px 16px", color:"#94a3b8" }}>{c.equipment_description || "—"}</td>
                        <td style={{ padding:"12px 16px", color:"#64748b", whiteSpace:"nowrap" }}>{formatDate(c.issued_at)}</td>
                        <td style={{ padding:"12px 16px", color: expired ? C.pink : "#64748b", fontWeight: expired ? 700 : 400, whiteSpace:"nowrap" }}>
                          {formatDate(c.valid_to)}
                          {expired && <div style={{ fontSize:9, color:C.pink, fontWeight:700 }}>EXPIRED</div>}
                        </td>
                        <td style={{ padding:"12px 16px" }}>
                          <span style={{
                            padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                            background: isPASS ? "rgba(0,245,196,0.1)" : "rgba(244,114,182,0.1)",
                            color:      isPASS ? C.green : C.pink,
                          }}>{c.equipment_status || "PASS"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredCerts.length === 0 && (
                <div style={{ color:"#64748b", padding:"32px", textAlign:"center" }}>No certificates found.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── EXPIRING ── */}
      {tab === "expiring" && (
        <div>
          <p style={{ color:"#64748b", fontSize:13, marginBottom:16 }}>Equipment sorted by next inspection date — earliest first.</p>
          {loading ? (
            <div style={{ color:"#64748b", padding:"40px 0", textAlign:"center" }}>Loading…</div>
          ) : (
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"rgba(255,255,255,0.03)" }}>
                    {["Asset Tag","Equipment","Type","Client","Next Inspection","Status"].map(h => (
                      <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:11, color:"#64748b",
                        textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {equipment.map((a, i) => {
                    const overdue  = isExpired(a.next_inspection_date);
                    const soon     = !overdue && a.next_inspection_date && new Date(a.next_inspection_date) < new Date(Date.now() + 30*24*60*60*1000);
                    return (
                      <tr key={a.id} style={{ borderTop:"1px solid rgba(255,255,255,0.05)", cursor:"pointer" }}
                        onClick={() => router.push(`/equipment/${a.asset_tag}`)}
                        onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                        onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                        <td style={{ padding:"12px 16px", color:C.blue, fontWeight:700 }}>{a.asset_tag}</td>
                        <td style={{ padding:"12px 16px", color:"#e2e8f0" }}>{a.asset_name || a.asset_type || "—"}</td>
                        <td style={{ padding:"12px 16px", color:"#94a3b8" }}>{a.asset_type || "—"}</td>
                        <td style={{ padding:"12px 16px", color:"#64748b" }}>{a.clients?.company_name || "—"}</td>
                        <td style={{ padding:"12px 16px", whiteSpace:"nowrap",
                          color: overdue ? C.pink : soon ? C.yellow : "#64748b",
                          fontWeight: (overdue || soon) ? 700 : 400 }}>
                          {formatDate(a.next_inspection_date)}
                          {overdue && <div style={{ fontSize:9, color:C.pink, fontWeight:700 }}>OVERDUE</div>}
                          {soon    && <div style={{ fontSize:9, color:C.yellow, fontWeight:700 }}>DUE SOON</div>}
                        </td>
                        <td style={{ padding:"12px 16px" }}>
                          <span style={{
                            padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                            background: overdue ? "rgba(244,114,182,0.1)" : soon ? "rgba(251,191,36,0.1)" : "rgba(0,245,196,0.1)",
                            color:      overdue ? C.pink : soon ? C.yellow : C.green,
                          }}>
                            {overdue ? "Overdue" : soon ? "Due Soon" : "OK"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {equipment.length === 0 && (
                <div style={{ color:"#64748b", padding:"32px", textAlign:"center" }}>No upcoming inspections found.</div>
              )}
            </div>
          )}
        </div>
      )}

    </AppLayout>
  );
}
