"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgba = { green:"0,245,196", blue:"79,195,247", purple:"124,92,252", pink:"244,114,182", yellow:"251,191,36" };

const ROLE_COLOR  = { "Super Admin": C.purple, "Supervisor": C.blue, "Inspector": C.green, "Viewer": C.yellow };
const ROLE_RGBA   = { "Super Admin": rgba.purple,"Supervisor": rgba.blue,"Inspector": rgba.green,"Viewer": rgba.yellow };

export default function AdminPage() {
  const router = useRouter();
  const [tab,       setTab]       = useState("overview");
  const [stats,     setStats]     = useState({ clients:0, equipment:0, certificates:0, inspections:0 });
  const [profiles,  setProfiles]  = useState([]);
  const [clients,   setClients]   = useState([]);
  const [search,    setSearch]    = useState("");
  const [roleFilter,setRoleFilter]= useState("All");
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [
        { count: clientCount },
        { count: assetCount  },
        { count: certCount   },
        { count: inspCount   },
        { data:  profileData },
        { data:  clientData  },
      ] = await Promise.all([
        supabase.from("clients").select("*", { count:"exact", head:true }),
        supabase.from("assets").select("*",  { count:"exact", head:true }),
        supabase.from("certificates").select("*", { count:"exact", head:true }),
        supabase.from("inspections").select("*",  { count:"exact", head:true }),
        supabase.from("profiles").select("id, full_name, email, role, status, created_at, last_sign_in_at").order("created_at", { ascending:false }),
        supabase.from("clients").select("id, company_name, company_code, status, created_at").order("company_name"),
      ]);

      setStats({
        clients:      clientCount  || 0,
        equipment:    assetCount   || 0,
        certificates: certCount    || 0,
        inspections:  inspCount    || 0,
      });
      setProfiles(profileData  || []);
      setClients(clientData    || []);
    } catch (err) {
      setError(err.message || "Failed to load admin data.");
    }
    setLoading(false);
  }

  const roles = ["All", ...Array.from(new Set(profiles.map(p => p.role).filter(Boolean)))];

  const filteredProfiles = profiles.filter(p => {
    const matchRole = roleFilter === "All" || p.role === roleFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (p.full_name || "").toLowerCase().includes(q) ||
      (p.email     || "").toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const TABS = [
    { id:"overview",  label:"Overview",       icon:"📊" },
    { id:"users",     label:"User Management",icon:"👥" },
    { id:"clients",   label:"Clients",        icon:"🏢" },
    { id:"system",    label:"System",         icon:"⚙️" },
  ];

  return (
    <AppLayout title="Administration">

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:"clamp(22px,4vw,32px)", fontWeight:900,
          background:`linear-gradient(90deg,#fff 30%,${C.purple})`,
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          Administration
        </h1>
        <div style={{ marginTop:8, width:72, height:4, borderRadius:999,
          background:`linear-gradient(90deg,${C.green},${C.purple},${C.blue})` }} />
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, margin:"8px 0 0" }}>
          System management, users and configuration
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
        borderBottom:"1px solid rgba(255,255,255,0.08)", paddingBottom:0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"10px 18px", border:"none", background:"none", cursor:"pointer",
            fontFamily:"inherit", fontWeight:700, fontSize:13,
            color: tab === t.id ? "#fff" : "#64748b",
            borderBottom: tab === t.id ? `2px solid ${C.purple}` : "2px solid transparent",
            transition:"all 0.2s",
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:14, marginBottom:24 }}>
            {[
              { label:"Clients",      value: stats.clients,      color:C.purple, r:rgba.purple },
              { label:"Equipment",    value: stats.equipment,    color:C.blue,   r:rgba.blue   },
              { label:"Certificates", value: stats.certificates, color:C.green,  r:rgba.green  },
              { label:"Inspections",  value: stats.inspections,  color:C.yellow, r:rgba.yellow },
            ].map(s => (
              <div key={s.label} style={{
                background:`rgba(${s.r},0.07)`, border:`1px solid rgba(${s.r},0.25)`,
                borderRadius:14, padding:"18px 20px",
              }}>
                <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>{s.label}</div>
                <div style={{ fontSize:32, fontWeight:900, color:s.color }}>
                  {loading ? "—" : s.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, padding:22 }}>
            <h3 style={{ color:"#fff", margin:"0 0 16px", fontSize:14, fontWeight:700 }}>Quick Actions</h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:10 }}>
              {[
                { label:"Register Client",    action:() => router.push("/clients/register") },
                { label:"Register Equipment", action:() => router.push("/equipment/register") },
                { label:"Bulk Import Certs",  action:() => router.push("/certificates/import") },
                { label:"Generate Report",    action:() => router.push("/reports/export") },
                { label:"View Certificates",  action:() => router.push("/certificates") },
                { label:"View Inspections",   action:() => router.push("/inspections") },
              ].map((a, i) => (
                <button key={i} onClick={a.action} style={{
                  padding:"12px 14px", borderRadius:10,
                  border:"1px solid rgba(124,92,252,0.25)",
                  background:"rgba(124,92,252,0.08)",
                  color:C.purple, fontWeight:700, fontSize:12,
                  cursor:"pointer", fontFamily:"inherit", textAlign:"left",
                }}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── USERS ── */}
      {tab === "users" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:18 }}>
            <div>
              <h2 style={{ color:"#fff", margin:0, fontSize:18, fontWeight:800 }}>User Management</h2>
              <p style={{ color:"#64748b", fontSize:12, margin:"4px 0 0" }}>{profiles.length} user(s) registered</p>
            </div>
          </div>

          {/* Search + role filter */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              style={{
                flex:"1 1 220px", padding:"10px 14px",
                background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.3)",
                borderRadius:8, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
              }} />
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {roles.map(r => (
                <button key={r} onClick={() => setRoleFilter(r)} style={{
                  padding:"8px 14px", borderRadius:20, fontSize:12, cursor:"pointer",
                  fontFamily:"inherit", fontWeight:600,
                  background: roleFilter===r ? "rgba(124,92,252,0.2)" : "rgba(255,255,255,0.04)",
                  border:     roleFilter===r ? `1px solid ${C.purple}` : "1px solid rgba(255,255,255,0.08)",
                  color:      roleFilter===r ? C.purple : "#64748b",
                }}>{r}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ color:"#64748b", padding:"40px 0", textAlign:"center" }}>Loading users…</div>
          ) : filteredProfiles.length === 0 ? (
            <div style={{ color:"#64748b", padding:"40px 0", textAlign:"center" }}>
              {profiles.length === 0
                ? "No profiles found. Make sure a 'profiles' table exists in Supabase."
                : "No users match your search."}
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:14 }}>
              {filteredProfiles.map(u => {
                const role  = u.role || "Inspector";
                const color = ROLE_COLOR[role]  || C.blue;
                const rgb   = ROLE_RGBA[role]   || rgba.blue;
                const initials = (u.full_name || u.email || "?")
                  .split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
                const isActive = u.status !== "inactive";

                return (
                  <div key={u.id}
                    onClick={() => router.push(`/admin/users/${u.id}`)}
                    style={{
                      background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
                      border:"1px solid rgba(124,92,252,0.25)",
                      borderRadius:14, padding:20, cursor:"pointer", transition:"all 0.2s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(124,92,252,0.5)"; e.currentTarget.style.transform="translateY(-3px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(124,92,252,0.25)"; e.currentTarget.style.transform="none"; }}
                  >
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                      <div style={{
                        width:44, height:44, borderRadius:10, flexShrink:0,
                        background:`linear-gradient(135deg,${color},${C.blue})`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontWeight:800, fontSize:16, color:"#fff",
                      }}>{initials}</div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ color:"#fff", fontWeight:700, fontSize:15, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {u.full_name || "Unnamed User"}
                        </div>
                        <div style={{ color:"#64748b", fontSize:11, marginTop:2, overflow:"hidden", textOverflow:"ellipsis" }}>
                          {u.email}
                        </div>
                      </div>
                    </div>

                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                      <span style={{
                        padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                        background:`rgba(${rgb},0.15)`, color:color, border:`1px solid rgba(${rgb},0.3)`,
                      }}>{role}</span>
                      <span style={{
                        padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                        background: isActive ? "rgba(0,245,196,0.1)" : "rgba(100,116,139,0.15)",
                        color:      isActive ? C.green : "#64748b",
                        border:     isActive ? "1px solid rgba(0,245,196,0.3)" : "1px solid rgba(100,116,139,0.2)",
                      }}>{isActive ? "Active" : "Inactive"}</span>
                    </div>

                    {u.last_sign_in_at && (
                      <div style={{ fontSize:11, color:"#475569", marginTop:8 }}>
                        Last login: {new Date(u.last_sign_in_at).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CLIENTS ── */}
      {tab === "clients" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:18 }}>
            <h2 style={{ color:"#fff", margin:0, fontSize:18, fontWeight:800 }}>Clients</h2>
            <button onClick={() => router.push("/clients/register")} style={{
              padding:"10px 18px", borderRadius:10,
              background:`linear-gradient(135deg,${C.purple},${C.blue})`,
              border:"none", color:"#fff", fontWeight:700, fontSize:13,
              cursor:"pointer", fontFamily:"inherit",
            }}>➕ Register Client</button>
          </div>

          {loading ? (
            <div style={{ color:"#64748b", padding:"40px 0", textAlign:"center" }}>Loading clients…</div>
          ) : (
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"rgba(255,255,255,0.03)" }}>
                    {["Company", "Code", "Status", "Registered", "Actions"].map(h => (
                      <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:11, color:"#64748b",
                        textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c, i) => (
                    <tr key={c.id} style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}
                      onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                      onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                      <td style={{ padding:"12px 16px", color:"#e2e8f0", fontWeight:600 }}>{c.company_name}</td>
                      <td style={{ padding:"12px 16px", color:"#64748b" }}>{c.company_code || "—"}</td>
                      <td style={{ padding:"12px 16px" }}>
                        <span style={{
                          padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                          background: c.status === "active" ? "rgba(0,245,196,0.1)" : "rgba(100,116,139,0.15)",
                          color:      c.status === "active" ? C.green : "#64748b",
                          border:     c.status === "active" ? "1px solid rgba(0,245,196,0.3)" : "1px solid rgba(100,116,139,0.2)",
                        }}>{c.status || "active"}</span>
                      </td>
                      <td style={{ padding:"12px 16px", color:"#64748b", fontSize:12 }}>
                        {c.created_at ? new Date(c.created_at).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td style={{ padding:"12px 16px" }}>
                        <button onClick={() => router.push(`/clients/${c.id}`)} style={{
                          padding:"5px 12px", borderRadius:6, border:"none",
                          background:"rgba(124,92,252,0.15)", color:C.purple,
                          fontWeight:700, fontSize:11, cursor:"pointer", fontFamily:"inherit",
                        }}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clients.length === 0 && (
                <div style={{ color:"#64748b", padding:"32px", textAlign:"center", fontSize:13 }}>No clients found.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SYSTEM ── */}
      {tab === "system" && (
        <div style={{ display:"grid", gap:16 }}>
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, padding:22 }}>
            <h3 style={{ color:"#fff", margin:"0 0 16px", fontSize:14, fontWeight:700 }}>System Info</h3>
            {[
              { label:"Platform",  value:"Monroy QMS Platform" },
              { label:"Version",   value:"v1.0.0" },
              { label:"Database",  value:"Supabase (PostgreSQL)" },
              { label:"Auth",      value:"Supabase Auth" },
              { label:"Storage",   value:"Supabase Storage" },
            ].map(item => (
              <div key={item.label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0",
                borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:13 }}>
                <span style={{ color:"#64748b" }}>{item.label}</span>
                <span style={{ color:"#e2e8f0", fontWeight:600 }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(0,245,196,0.2)", borderRadius:16, padding:22 }}>
            <h3 style={{ color:"#fff", margin:"0 0 16px", fontSize:14, fontWeight:700 }}>Database Tables</h3>
            {["clients","assets","certificates","inspections","profiles","ncrs"].map(t => (
              <div key={t} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0",
                borderBottom:"1px solid rgba(255,255,255,0.05)", fontSize:13 }}>
                <span style={{ color:"#64748b", fontFamily:"monospace" }}>{t}</span>
                <span style={{ color:C.green, fontSize:11, fontWeight:700 }}>● Connected</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </AppLayout>
  );
}
