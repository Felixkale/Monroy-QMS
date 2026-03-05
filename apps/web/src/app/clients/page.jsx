"use client";
import { useState } from "react";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

export const clients = [
  { id:"CLT-001", name:"Acme Industrial Corp",  contact:"James Wright",   email:"jwright@acme.com",        phone:"+27 11 555 0101", location:"Johannesburg, ZA", equipment:24, inspections:18, certificates:12, status:"Active",    compliance:98,  industry:"Manufacturing", since:"2022-01-15" },
  { id:"CLT-002", name:"SteelWorks Ltd",        contact:"Maria Santos",   email:"msantos@steelworks.com",  phone:"+27 31 555 0202", location:"Durban, ZA",        equipment:41, inspections:34, certificates:22, status:"Active",    compliance:82,  industry:"Steel & Metals",since:"2021-06-20" },
  { id:"CLT-003", name:"TechPlant Inc",         contact:"David Kim",      email:"dkim@techplant.com",      phone:"+27 21 555 0303", location:"Cape Town, ZA",     equipment:17, inspections:14, certificates:9,  status:"Active",    compliance:95,  industry:"Technology",   since:"2023-03-10" },
  { id:"CLT-004", name:"MineOps Ltd",           contact:"Sarah Connor",   email:"sconnor@mineops.com",     phone:"+27 53 555 0404", location:"Kimberley, ZA",     equipment:33, inspections:28, certificates:18, status:"Active",    compliance:71,  industry:"Mining",       since:"2020-11-05" },
  { id:"CLT-005", name:"Cargo Hub",             contact:"Robert Nkosi",   email:"rnkosi@cargohub.com",     phone:"+27 41 555 0505", location:"Port Elizabeth, ZA",equipment:12, inspections:10, certificates:8,  status:"Active",    compliance:100, industry:"Logistics",    since:"2023-07-22" },
  { id:"CLT-006", name:"PowerGen Africa",       contact:"Fatima Dlamini", email:"fdlamini@powgen.com",     phone:"+27 13 555 0606", location:"Mpumalanga, ZA",    equipment:29, inspections:15, certificates:7,  status:"Suspended", compliance:45,  industry:"Energy",       since:"2021-02-14" },
  { id:"CLT-007", name:"Delta Refineries",      contact:"Alex Thompson",  email:"athompson@delta.com",     phone:"+27 11 555 0707", location:"Gauteng, ZA",       equipment:38, inspections:31, certificates:20, status:"Active",    compliance:88,  industry:"Oil & Gas",    since:"2020-08-30" },
  { id:"CLT-008", name:"SafePort Holdings",     contact:"Linda Mokoena",  email:"lmokoena@safeport.com",   phone:"+27 21 555 0808", location:"Cape Town, ZA",     equipment:9,  inspections:7,  certificates:5,  status:"Active",    compliance:93,  industry:"Maritime",     since:"2024-01-08" },
];

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [view,   setView]   = useState("grid");

  const filtered = clients.filter(c =>
    (filter==="All" || c.status===filter) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) ||
     c.id.toLowerCase().includes(search.toLowerCase()) ||
     c.industry.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:28 }}>
        <div>
          <h1 style={{
            fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.blue})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Clients</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Manage registered client organisations</p>
        </div>
        <a href="/clients/register" style={{
          padding:"10px 20px", borderRadius:12, textDecoration:"none",
          background:`linear-gradient(135deg,${C.purple},${C.blue})`,
          color:"#fff", fontWeight:700, fontSize:13,
          boxShadow:`0 0 20px rgba(124,92,252,0.4)`,
          display:"inline-flex", alignItems:"center", gap:6,
        }}>+ Register Client</a>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:14, marginBottom:22 }}>
        {[
          { label:"Total Clients",  value:24,   color:C.blue   },
          { label:"Active",         value:22,   color:C.green  },
          { label:"Suspended",      value:1,    color:C.pink   },
          { label:"Avg Compliance", value:"88%",color:C.yellow },
          { label:"Total Equipment",value:186,  color:C.purple },
        ].map(s=>(
          <div key={s.label} style={{
            background:`rgba(${rgbaMap[s.color]},0.07)`,
            border:`1px solid rgba(${rgbaMap[s.color]},0.25)`,
            borderRadius:14, padding:"16px 18px",
          }}>
            <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:26, fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16, alignItems:"center" }}>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search by name, ID or industry…"
          style={{
            flex:"1 1 220px", padding:"10px 16px",
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.3)",
            borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
          }}
        />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {["All","Active","Suspended"].map(s=>(
            <button key={s} onClick={()=>setFilter(s)} style={{
              padding:"8px 14px", borderRadius:20, fontSize:12, cursor:"pointer",
              fontFamily:"inherit", fontWeight:600,
              background: filter===s ? "rgba(124,92,252,0.25)" : "rgba(255,255,255,0.04)",
              border: filter===s ? `1px solid ${C.purple}` : "1px solid rgba(255,255,255,0.08)",
              color: filter===s ? C.purple : "#64748b",
            }}>{s}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:4, marginLeft:"auto" }}>
          {[["grid","▦"],["table","☰"]].map(([v,icon])=>(
            <button key={v} onClick={()=>setView(v)} style={{
              width:34, height:34, borderRadius:8, cursor:"pointer",
              fontSize:15, display:"flex", alignItems:"center", justifyContent:"center",
              background: view===v ? "rgba(124,92,252,0.2)" : "rgba(255,255,255,0.04)",
              border: view===v ? `1px solid ${C.purple}` : "1px solid rgba(255,255,255,0.08)",
              color: view===v ? C.purple : "#64748b",
            }}>{icon}</button>
          ))}
        </div>
      </div>

      {/* Grid View */}
      {view==="grid" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:14 }}>
          {filtered.map(c=>(
            <a key={c.id} href={`/clients/${c.id}`} style={{ textDecoration:"none" }}>
              <div style={{
                background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
                border:`1px solid rgba(${c.status==="Active"?"79,195,247":"244,114,182"},0.2)`,
                borderRadius:16, padding:"20px 22px", cursor:"pointer",
                transition:"all 0.2s", position:"relative", overflow:"hidden",
              }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(79,195,247,0.5)"; e.currentTarget.style.transform="translateY(-2px)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=`rgba(${c.status==="Active"?"79,195,247":"244,114,182"},0.2)`; e.currentTarget.style.transform="translateY(0)"; }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:3,
                  background:`linear-gradient(90deg,${c.status==="Active"?C.blue:C.pink},transparent)` }}/>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:800, color:"#fff", marginBottom:2 }}>{c.name}</div>
                    <div style={{ fontSize:11, color:"#64748b" }}>{c.id} · {c.industry}</div>
                  </div>
                  <span style={{
                    padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                    background: c.status==="Active" ? "rgba(0,245,196,0.12)" : "rgba(244,114,182,0.12)",
                    color: c.status==="Active" ? C.green : C.pink,
                    border:`1px solid rgba(${c.status==="Active"?"0,245,196":"244,114,182"},0.3)`,
                  }}>{c.status}</span>
                </div>
                <div style={{ fontSize:12, color:"#94a3b8", marginBottom:12 }}>
                  👤 {c.contact} &nbsp;·&nbsp; 📍 {c.location}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:12 }}>
                  {[
                    { label:"Equipment",    value:c.equipment,    color:C.blue   },
                    { label:"Inspections",  value:c.inspections,  color:C.purple },
                    { label:"Certificates", value:c.certificates, color:C.yellow },
                  ].map(s=>(
                    <div key={s.label} style={{
                      background:`rgba(${rgbaMap[s.color]},0.07)`,
                      border:`1px solid rgba(${rgbaMap[s.color]},0.15)`,
                      borderRadius:10, padding:"8px", textAlign:"center",
                    }}>
                      <div style={{ fontSize:16, fontWeight:900, color:s.color }}>{s.value}</div>
                      <div style={{ fontSize:9, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:11, color:"#64748b" }}>Compliance</span>
                    <span style={{ fontSize:11, fontWeight:700,
                      color: c.compliance>=90 ? C.green : c.compliance>=70 ? C.yellow : C.pink,
                    }}>{c.compliance}%</span>
                  </div>
                  <div style={{ height:5, background:"rgba(255,255,255,0.07)", borderRadius:4, overflow:"hidden" }}>
                    <div style={{
                      height:"100%", width:`${c.compliance}%`, borderRadius:4,
                      background: c.compliance>=90 ? C.green : c.compliance>=70 ? C.yellow : C.pink,
                    }}/>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Table View */}
      {view==="table" && (
        <div style={{
          background:"rgba(255,255,255,0.02)",
          border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, overflow:"auto",
        }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
            <thead>
              <tr style={{ background:"rgba(124,92,252,0.1)" }}>
                {["Client","Industry","Contact","Location","Equipment","Compliance","Status",""].map(h=>(
                  <th key={h} style={{
                    padding:"12px 16px", textAlign:"left",
                    fontSize:11, fontWeight:700, color:"#64748b",
                    textTransform:"uppercase", letterSpacing:"0.08em",
                    borderBottom:"1px solid rgba(124,92,252,0.15)",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c,i)=>(
                <tr key={c.id}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(124,92,252,0.06)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                  style={{ borderBottom:i<filtered.length-1?"1px solid rgba(255,255,255,0.04)":"none" }}>
                  <td style={{ padding:"14px 16px" }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{c.name}</div>
                    <div style={{ fontSize:11, color:"#64748b" }}>{c.id}</div>
                  </td>
                  <td style={{ padding:"14px 16px", fontSize:12, color:"#94a3b8" }}>{c.industry}</td>
                  <td style={{ padding:"14px 16px", fontSize:12, color:"#94a3b8" }}>{c.contact}</td>
                  <td style={{ padding:"14px 16px", fontSize:12, color:"#94a3b8" }}>{c.location}</td>
                  <td style={{ padding:"14px 16px", fontSize:13, fontWeight:700, color:C.blue, textAlign:"center" }}>{c.equipment}</td>
                  <td style={{ padding:"14px 16px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ flex:1, height:5, background:"rgba(255,255,255,0.07)", borderRadius:4, overflow:"hidden", minWidth:50 }}>
                        <div style={{ height:"100%", width:`${c.compliance}%`, borderRadius:4,
                          background: c.compliance>=90 ? C.green : c.compliance>=70 ? C.yellow : C.pink }}/>
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, minWidth:32,
                        color: c.compliance>=90 ? C.green : c.compliance>=70 ? C.yellow : C.pink,
                      }}>{c.compliance}%</span>
                    </div>
                  </td>
                  <td style={{ padding:"14px 16px" }}>
                    <span style={{
                      padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                      background: c.status==="Active" ? "rgba(0,245,196,0.12)" : "rgba(244,114,182,0.12)",
                      color: c.status==="Active" ? C.green : C.pink,
                      border:`1px solid rgba(${c.status==="Active"?"0,245,196":"244,114,182"},0.3)`,
                    }}>{c.status}</span>
                  </td>
                  <td style={{ padding:"14px 16px" }}>
                    <a href={`/clients/${c.id}`} style={{
                      padding:"6px 14px", borderRadius:8, fontSize:12,
                      background:"rgba(124,92,252,0.12)", border:"1px solid rgba(124,92,252,0.3)",
                      color:C.purple, textDecoration:"none", fontWeight:600,
                    }}>View →</a>
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
