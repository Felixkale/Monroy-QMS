"use client";
import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { getClients, getClientStats } from "@/services/clients";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = {
  [C.green]:"0,245,196", [C.blue]:"79,195,247",
  [C.purple]:"124,92,252", [C.pink]:"244,114,182", [C.yellow]:"251,191,36",
};

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [stats, setStats]     = useState({ total:0, active:0, suspended:0 });
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("All");
  const [view, setView]       = useState("grid");
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const [clientsRes, statsRes] = await Promise.all([getClients(), getClientStats()]);
      if (clientsRes.error) setError("Failed to load clients. Check Supabase connection.");
      setClients(clientsRes.data || []);
      setStats(statsRes);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = clients.filter(c => {
    const matchFilter =
      filter === "All" ||
      (filter === "Active"    && c.status === "active") ||
      (filter === "Suspended" && c.status === "suspended");
    const q = search.toLowerCase();
    const matchSearch =
      (c.company_name  || "").toLowerCase().includes(q) ||
      (c.company_code  || "").toLowerCase().includes(q) ||
      (c.city          || "").toLowerCase().includes(q) ||
      (c.country       || "").toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  return (
    <AppLayout title="Clients">

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:24 }}>
        <p style={{ color:"#64748b", fontSize:13, margin:0 }}>Manage registered client organisations</p>
        <a href="/clients/register" style={{
          padding:"10px 20px", borderRadius:12, textDecoration:"none",
          background:`linear-gradient(135deg,${C.purple},${C.blue})`,
          color:"#fff", fontWeight:700, fontSize:13,
          boxShadow:`0 0 20px rgba(124,92,252,0.35)`,
          display:"inline-flex", alignItems:"center", gap:6,
        }}>+ Register Client</a>
      </div>

      {error && (
        <div style={{ background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)", borderRadius:12, padding:"12px 16px", marginBottom:20, color:C.pink, fontSize:13 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:14, marginBottom:22 }}>
        {[
          { label:"Total Clients",  value: loading ? "…" : stats.total,     color:C.blue  },
          { label:"Active",         value: loading ? "…" : stats.active,    color:C.green },
          { label:"Suspended",      value: loading ? "…" : stats.suspended, color:C.pink  },
        ].map(s => (
          <div key={s.label} style={{ background:`rgba(${rgbaMap[s.color]},0.07)`, border:`1px solid rgba(${rgbaMap[s.color]},0.25)`, borderRadius:14, padding:"16px 18px" }}>
            <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:26, fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16, alignItems:"center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, code or city…"
          style={{ flex:"1 1 220px", padding:"10px 16px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.3)", borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none" }}
        />
        <div style={{ display:"flex", gap:6 }}>
          {["All","Active","Suspended"].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding:"8px 14px", borderRadius:20, fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:600,
              background: filter===s ? "rgba(124,92,252,0.25)" : "rgba(255,255,255,0.04)",
              border: filter===s ? `1px solid ${C.purple}` : "1px solid rgba(255,255,255,0.08)",
              color: filter===s ? C.purple : "#94a3b8",
            }}>{s}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:4, marginLeft:"auto" }}>
          {[["grid","▦"],["table","☰"]].map(([v,icon]) => (
            <button key={v} onClick={() => setView(v)} style={{
              width:34, height:34, borderRadius:8, cursor:"pointer", fontSize:15,
              display:"flex", alignItems:"center", justifyContent:"center",
              background: view===v ? "rgba(124,92,252,0.2)" : "rgba(255,255,255,0.04)",
              border: view===v ? `1px solid ${C.purple}` : "1px solid rgba(255,255,255,0.08)",
              color: view===v ? C.purple : "#94a3b8",
            }}>{icon}</button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:14 }}>
          {Array.from({length:6}).map((_,i) => (
            <div key={i} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, padding:"20px 22px", height:150 }} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign:"center", padding:"60px 20px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.15)", borderRadius:16 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🏢</div>
          <div style={{ fontSize:16, fontWeight:700, color:"#e2e8f0", marginBottom:6 }}>
            {search || filter !== "All" ? "No clients match your search" : "No clients registered yet"}
          </div>
          <div style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>
            {search || filter !== "All" ? "Try a different search or filter" : "Get started by registering your first client"}
          </div>
          {!search && filter === "All" && (
            <a href="/clients/register" style={{ padding:"10px 24px", borderRadius:10, textDecoration:"none", background:`linear-gradient(135deg,${C.purple},${C.blue})`, color:"#fff", fontWeight:700, fontSize:13 }}>
              + Register First Client
            </a>
          )}
        </div>
      )}

      {/* Grid View */}
      {!loading && view === "grid" && filtered.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:14 }}>
          {filtered.map(c => (
            <a key={c.id} href={`/clients/${c.id}`} style={{ textDecoration:"none" }}>
              <div
                style={{
                  background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
                  border:`1px solid rgba(${c.status==="active"?"79,195,247":"244,114,182"},0.2)`,
                  borderRadius:16, padding:"20px 22px", cursor:"pointer",
                  transition:"all 0.2s", position:"relative", overflow:"hidden",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform="translateY(-2px)";
                  e.currentTarget.style.background="rgba(79,195,247,0.08)";
                  e.currentTarget.style.borderColor="rgba(79,195,247,0.5)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform="translateY(0)";
                  e.currentTarget.style.background="linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))";
                  e.currentTarget.style.borderColor=`rgba(${c.status==="active"?"79,195,247":"244,114,182"},0.2)`;
                }}
              >
                <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${c.status==="active"?C.blue:C.pink},transparent)` }}/>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:800, color:"#fff", marginBottom:2 }}>{c.company_name}</div>
                    <div style={{ fontSize:11, color:"#64748b" }}>{c.company_code} · {c.city}{c.country ? `, ${c.country}` : ""}</div>
                  </div>
                  <span style={{
                    padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                    background: c.status==="active" ? "rgba(0,245,196,0.12)" : "rgba(244,114,182,0.12)",
                    color: c.status==="active" ? C.green : C.pink,
                    border:`1px solid rgba(${c.status==="active"?"0,245,196":"244,114,182"},0.3)`,
                    textTransform:"capitalize",
                  }}>{c.status}</span>
                </div>
                {c.contact_person && (
                  <div style={{ fontSize:12, color:"#94a3b8", marginBottom:8 }}>
                    👤 {c.contact_person}
                    {c.contact_email && <span> · 📧 {c.contact_email}</span>}
                  </div>
                )}
                <div style={{ fontSize:11, color:"#64748b" }}>
                  Registered: {new Date(c.created_at).toLocaleDateString()}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Table View */}
      {!loading && view === "table" && filtered.length > 0 && (
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, overflow:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
            <thead>
              <tr style={{ background:"rgba(124,92,252,0.1)" }}>
                {["Company","Code","Contact","Location","Status",""].map(h => (
                  <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid rgba(124,92,252,0.15)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id}
                  onMouseEnter={e => {
                    e.currentTarget.style.background="rgba(124,92,252,0.08)";
                    // Keep text visible on hover
                    Array.from(e.currentTarget.querySelectorAll("td")).forEach(td => td.style.color="#e2e8f0");
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background="transparent";
                    Array.from(e.currentTarget.querySelectorAll("td")).forEach(td => td.style.color="");
                  }}
                  style={{ borderBottom: i < filtered.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <td style={{ padding:"14px 16px" }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{c.company_name}</div>
                  </td>
                  <td style={{ padding:"14px 16px", fontSize:12, color:"#94a3b8" }}>{c.company_code || "—"}</td>
                  <td style={{ padding:"14px 16px", fontSize:12, color:"#94a3b8" }}>{c.contact_person || "—"}</td>
                  <td style={{ padding:"14px 16px", fontSize:12, color:"#94a3b8" }}>{[c.city, c.country].filter(Boolean).join(", ") || "—"}</td>
                  <td style={{ padding:"14px 16px" }}>
                    <span style={{
                      padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                      background: c.status==="active" ? "rgba(0,245,196,0.12)" : "rgba(244,114,182,0.12)",
                      color: c.status==="active" ? C.green : C.pink,
                      border:`1px solid rgba(${c.status==="active"?"0,245,196":"244,114,182"},0.3)`,
                      textTransform:"capitalize",
                    }}>{c.status}</span>
                  </td>
                  <td style={{ padding:"14px 16px" }}>
                    <a href={`/clients/${c.id}`} style={{ padding:"6px 14px", borderRadius:8, fontSize:12, background:"rgba(124,92,252,0.12)", border:"1px solid rgba(124,92,252,0.3)", color:C.purple, textDecoration:"none", fontWeight:600 }}>
                      View →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
