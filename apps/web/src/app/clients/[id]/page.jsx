"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

const allClients = {
  "CLT-001": {
    id:"CLT-001", name:"Acme Industrial Corp", contact:"James Wright",
    email:"jwright@acme.com", phone:"+27 11 555 0101", location:"Johannesburg, ZA",
    address:"14 Industrial Drive, Germiston, 1401", website:"www.acmeindustrial.co.za",
    equipment:24, inspections:18, certificates:12, status:"Active", compliance:98,
    industry:"Manufacturing", since:"2022-01-15", portalAccess:true,
    equipment_list:[
      { tag:"PV-0041", type:"Pressure Vessel", license:"Valid",    nextInsp:"2026-06-01" },
      { tag:"PV-0042", type:"Pressure Vessel", license:"Valid",    nextInsp:"2026-07-15" },
      { tag:"CP-0021", type:"Compressor",      license:"Expiring", nextInsp:"2026-04-10" },
      { tag:"AR-0011", type:"Air Receiver",    license:"Valid",    nextInsp:"2026-09-20" },
    ],
    inspection_history:[
      { id:"INS-1041", type:"Statutory",   date:"2026-03-05", result:"Pass",        inspector:"John Smith"    },
      { id:"INS-1028", type:"Visual",      date:"2026-01-14", result:"Pass",        inspector:"Sarah Johnson" },
      { id:"INS-1015", type:"UT Thickness",date:"2025-11-22", result:"Conditional", inspector:"Michael Chen"  },
      { id:"INS-1002", type:"Hydro Test",  date:"2025-09-08", result:"Pass",        inspector:"John Smith"    },
    ],
    certificates:[
      { id:"CERT-0889", type:"Equipment Certification", issued:"2025-06-01", expiry:"2026-06-01", status:"Valid"    },
      { id:"CERT-0856", type:"ISO Certification",       issued:"2025-01-15", expiry:"2026-01-15", status:"Expired"  },
      { id:"CERT-0901", type:"Compliance Certificate",  issued:"2025-09-10", expiry:"2026-09-10", status:"Valid"    },
    ],
    activity:[
      { action:"Inspection completed",  detail:"PV-0041 statutory inspection passed", time:"2026-03-05 09:15", user:"John Smith"    },
      { action:"Certificate renewed",   detail:"CERT-0901 compliance cert issued",    time:"2026-02-20 14:30", user:"Admin"         },
      { action:"Equipment registered",  detail:"AR-0011 air receiver added",          time:"2026-01-10 11:00", user:"Admin"         },
      { action:"NCR closed",            detail:"NCR-0071 resolved and closed",        time:"2025-12-15 16:45", user:"Sarah Johnson" },
    ],
    documents:[
      { name:"Company Registration",       type:"PDF", size:"1.2 MB", date:"2022-01-15" },
      { name:"Safety File 2026",           type:"PDF", size:"4.8 MB", date:"2026-01-01" },
      { name:"Insurance Certificate",      type:"PDF", size:"890 KB", date:"2025-07-01" },
      { name:"Inspection Agreement",       type:"DOCX",size:"340 KB", date:"2022-01-15" },
    ],
  },
};

function buildFallback(id) {
  const names = {
    "CLT-002":"SteelWorks Ltd","CLT-003":"TechPlant Inc","CLT-004":"MineOps Ltd",
    "CLT-005":"Cargo Hub","CLT-006":"PowerGen Africa","CLT-007":"Delta Refineries","CLT-008":"SafePort Holdings",
  };
  return {
    id, name: names[id]||id, contact:"Contact Person", email:"contact@company.com",
    phone:"+27 00 000 0000", location:"South Africa", address:"Company Address",
    website:"www.company.co.za", equipment:10, inspections:8, certificates:5,
    status:"Active", compliance:85, industry:"Industrial", since:"2022-01-01", portalAccess:false,
    equipment_list:[], inspection_history:[], certificates:[], activity:[], documents:[],
  };
}

const resultColor = { Pass:C.green, Fail:C.pink, Conditional:C.yellow };
const certColor   = { Valid:C.green, Expiring:C.yellow, Expired:C.pink };

export default function ClientProfilePage() {
  const { id } = useParams();
  const client = allClients[id] || buildFallback(id);
  const [tab, setTab] = useState("overview");

  const tabs = [
    { id:"overview",   label:"Overview",    icon:"📊" },
    { id:"equipment",  label:"Equipment",   icon:"⚙️" },
    { id:"inspections",label:"Inspections", icon:"🔍" },
    { id:"certificates",label:"Certificates",icon:"📜" },
    { id:"documents",  label:"Documents",   icon:"📁" },
    { id:"activity",   label:"Activity Log",icon:"📋" },
  ];

  return (
    <AppLayout>
      {/* Breadcrumb */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20, fontSize:13 }}>
        <a href="/clients" style={{ color:"#64748b", textDecoration:"none" }}>Clients</a>
        <span style={{ color:"#475569" }}>›</span>
        <span style={{ color:"#e2e8f0" }}>{client.name}</span>
      </div>

      {/* Profile Header */}
      <div style={{
        background:"linear-gradient(135deg,rgba(79,195,247,0.08),rgba(124,92,252,0.04))",
        border:"1px solid rgba(79,195,247,0.2)", borderRadius:18,
        padding:"24px 28px", marginBottom:22, position:"relative", overflow:"hidden",
      }}>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:3,
          background:`linear-gradient(90deg,${C.blue},${C.purple},transparent)` }}/>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16 }}>
          {/* Left */}
          <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
            <div style={{
              width:60, height:60, borderRadius:16, flexShrink:0,
              background:`linear-gradient(135deg,${C.blue},${C.purple})`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:24, fontWeight:900, color:"#fff",
              boxShadow:`0 0 20px rgba(79,195,247,0.4)`,
            }}>{client.name[0]}</div>
            <div>
              <h1 style={{ fontSize:"clamp(18px,3vw,26px)", fontWeight:900, margin:"0 0 4px",
                color:"#fff" }}>{client.name}</h1>
              <div style={{ fontSize:12, color:"#64748b", marginBottom:8 }}>
                {client.id} · {client.industry} · Client since {client.since}
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <span style={{
                  padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                  background: client.status==="Active" ? "rgba(0,245,196,0.12)" : "rgba(244,114,182,0.12)",
                  color: client.status==="Active" ? C.green : C.pink,
                  border:`1px solid rgba(${client.status==="Active"?"0,245,196":"244,114,182"},0.3)`,
                }}>{client.status}</span>
                {client.portalAccess && (
                  <span style={{
                    padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                    background:"rgba(124,92,252,0.12)", color:C.purple,
                    border:"1px solid rgba(124,92,252,0.3)",
                  }}>🔐 Portal Access</span>
                )}
              </div>
            </div>
          </div>
          {/* Right actions */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <a href={`/inspections/create`} style={{
              padding:"9px 16px", borderRadius:10, textDecoration:"none",
              background:"rgba(124,92,252,0.15)", border:"1px solid rgba(124,92,252,0.3)",
              color:C.purple, fontWeight:700, fontSize:12,
            }}>+ Inspection</a>
            <a href={`/reports/export`} style={{
              padding:"9px 16px", borderRadius:10, textDecoration:"none",
              background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)",
              color:C.green, fontWeight:700, fontSize:12,
            }}>⬇ Export Report</a>
            <button style={{
              padding:"9px 16px", borderRadius:10,
              background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.3)",
              color:C.yellow, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit",
            }}>✏️ Edit Client</button>
          </div>
        </div>

        {/* Contact + KPI row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginTop:20 }}>
          {[
            { icon:"📧", label:"Email",    value:client.email    },
            { icon:"📞", label:"Phone",    value:client.phone    },
            { icon:"📍", label:"Location", value:client.location },
            { icon:"🌐", label:"Website",  value:client.website  },
          ].map(f=>(
            <div key={f.label} style={{
              background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)",
              borderRadius:10, padding:"10px 12px",
            }}>
              <div style={{ fontSize:10, color:"#64748b", marginBottom:3 }}>{f.icon} {f.label}</div>
              <div style={{ fontSize:12, color:"#e2e8f0", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:22 }}>
        {[
          { label:"Equipment",    value:client.equipment,    color:C.blue,   icon:"⚙️" },
          { label:"Inspections",  value:client.inspections,  color:C.purple, icon:"🔍" },
          { label:"Certificates", value:client.certificates, color:C.yellow, icon:"📜" },
          { label:"Compliance",   value:`${client.compliance}%`, color: client.compliance>=90?C.green:client.compliance>=70?C.yellow:C.pink, icon:"✅" },
        ].map(s=>(
          <div key={s.label} style={{
            background:`rgba(${rgbaMap[s.color]},0.07)`,
            border:`1px solid rgba(${rgbaMap[s.color]},0.25)`,
            borderRadius:14, padding:"16px 18px",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <span style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.1em" }}>{s.label}</span>
              <span style={{ fontSize:16 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize:26, fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:2, marginBottom:20, overflowX:"auto", paddingBottom:2 }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"10px 16px", borderRadius:"10px 10px 0 0", fontSize:12, cursor:"pointer",
            fontFamily:"inherit", fontWeight:700, whiteSpace:"nowrap",
            background: tab===t.id ? "rgba(124,92,252,0.2)" : "transparent",
            border:"none", borderBottom: tab===t.id ? `2px solid ${C.purple}` : "2px solid transparent",
            color: tab===t.id ? C.purple : "#64748b",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {tab==="overview" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16 }}>
          {/* Performance */}
          <div style={{
            background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
            borderRadius:16, padding:"20px",
          }}>
            <SectionTitle color={C.purple} title="Performance Metrics"/>
            {[
              { label:"Compliance Rate",      value:client.compliance, max:100, color: client.compliance>=90?C.green:client.compliance>=70?C.yellow:C.pink, suffix:"%" },
              { label:"Inspection Pass Rate", value:87, max:100, color:C.blue,   suffix:"%" },
              { label:"Cert Validity Rate",   value:92, max:100, color:C.yellow, suffix:"%" },
            ].map(m=>(
              <div key={m.label} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:12, color:"#94a3b8" }}>{m.label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:m.color }}>{m.value}{m.suffix}</span>
                </div>
                <div style={{ height:6, background:"rgba(255,255,255,0.07)", borderRadius:10, overflow:"hidden" }}>
                  <div style={{
                    height:"100%", width:`${(m.value/m.max)*100}%`, borderRadius:10,
                    background:`linear-gradient(90deg,${m.color},${m.color}aa)`,
                    boxShadow:`0 0 8px ${m.color}66`,
                  }}/>
                </div>
              </div>
            ))}
          </div>
          {/* Recent Activity preview */}
          <div style={{
            background:"rgba(255,255,255,0.02)", border:"1px solid rgba(79,195,247,0.2)",
            borderRadius:16, padding:"20px",
          }}>
            <SectionTitle color={C.blue} title="Recent Activity"/>
            {client.activity.slice(0,4).map((a,i)=>(
              <div key={i} style={{
                display:"flex", gap:10, padding:"8px 0",
                borderBottom: i<3 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                <div style={{
                  width:28, height:28, borderRadius:8, flexShrink:0,
                  background:"rgba(79,195,247,0.12)",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:12,
                }}>📋</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"#e2e8f0" }}>{a.action}</div>
                  <div style={{ fontSize:11, color:"#64748b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.detail}</div>
                </div>
                <div style={{ fontSize:10, color:"#475569", flexShrink:0 }}>{a.time.split(" ")[0]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Equipment Tab ── */}
      {tab==="equipment" && (
        <div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
            <a href="/equipment/register" style={{
              padding:"9px 16px", borderRadius:10, textDecoration:"none",
              background:`linear-gradient(135deg,${C.purple},${C.blue})`,
              color:"#fff", fontWeight:700, fontSize:12,
            }}>+ Register Equipment</a>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 }}>
            {client.equipment_list.map(e=>{
              const lColor = e.license==="Valid"?C.green:e.license==="Expiring"?C.yellow:C.pink;
              const lRgba  = rgbaMap[lColor];
              return (
                <div key={e.tag} style={{
                  background:"rgba(255,255,255,0.03)", border:`1px solid rgba(${lRgba},0.2)`,
                  borderRadius:12, padding:"16px 18px", position:"relative", overflow:"hidden",
                }}>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:3,
                    background:`linear-gradient(90deg,${lColor},transparent)` }}/>
                  <div style={{ fontSize:15, fontWeight:800, color:"#fff", marginBottom:2 }}>{e.tag}</div>
                  <div style={{ fontSize:12, color:"#64748b", marginBottom:10 }}>{e.type}</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{
                      padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                      background:`rgba(${lRgba},0.12)`, color:lColor,
                      border:`1px solid rgba(${lRgba},0.3)`,
                    }}>🔐 {e.license}</span>
                    <span style={{ fontSize:11, color:"#64748b" }}>Due: {e.nextInsp}</span>
                  </div>
                </div>
              );
            })}
            {client.equipment_list.length===0 && (
              <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"40px", color:"#475569", fontSize:13 }}>
                No equipment registered for this client yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Inspections Tab ── */}
      {tab==="inspections" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {client.inspection_history.map(insp=>{
            const rColor = resultColor[insp.result];
            const rRgba  = rgbaMap[rColor];
            return (
              <div key={insp.id} style={{
                background:"rgba(255,255,255,0.03)", border:"1px solid rgba(124,92,252,0.15)",
                borderRadius:12, padding:"14px 18px",
                display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10,
              }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{insp.id}</div>
                  <div style={{ fontSize:12, color:"#64748b" }}>{insp.type} · {insp.inspector} · {insp.date}</div>
                </div>
                <span style={{
                  padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700,
                  background:`rgba(${rRgba},0.12)`, color:rColor,
                  border:`1px solid rgba(${rRgba},0.3)`,
                }}>{insp.result}</span>
              </div>
            );
          })}
          {client.inspection_history.length===0 && (
            <div style={{ textAlign:"center", padding:"40px", color:"#475569", fontSize:13 }}>
              No inspection history available.
            </div>
          )}
        </div>
      )}

      {/* ── Certificates Tab ── */}
      {tab==="certificates" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
          {client.certificates.map(cert=>{
            const cColor = certColor[cert.status];
            const cRgba  = rgbaMap[cColor];
            return (
              <div key={cert.id} style={{
                background:"rgba(255,255,255,0.03)", border:`1px solid rgba(${cRgba},0.2)`,
                borderRadius:14, padding:"18px 20px", position:"relative", overflow:"hidden",
              }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:3,
                  background:`linear-gradient(90deg,${cColor},transparent)` }}/>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:800, color:"#fff" }}>{cert.id}</div>
                    <div style={{ fontSize:11, color:"#64748b" }}>{cert.type}</div>
                  </div>
                  <span style={{
                    padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                    background:`rgba(${cRgba},0.12)`, color:cColor,
                    border:`1px solid rgba(${cRgba},0.3)`,
                  }}>{cert.status}</span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:5, fontSize:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ color:"#64748b" }}>Issued</span>
                    <span style={{ color:"#e2e8f0" }}>{cert.issued}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ color:"#64748b" }}>Expires</span>
                    <span style={{ color:cColor, fontWeight:700 }}>{cert.expiry}</span>
                  </div>
                </div>
                <button style={{
                  marginTop:12, width:"100%", padding:"8px", borderRadius:8, cursor:"pointer",
                  fontFamily:"inherit", fontWeight:600, fontSize:12,
                  background:`rgba(${cRgba},0.1)`, border:`1px solid rgba(${cRgba},0.3)`, color:cColor,
                }}>⬇ Download PDF</button>
              </div>
            );
          })}
          {client.certificates.length===0 && (
            <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"40px", color:"#475569", fontSize:13 }}>
              No certificates issued yet.
            </div>
          )}
        </div>
      )}

      {/* ── Documents Tab ── */}
      {tab==="documents" && (
        <div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
            <button style={{
              padding:"9px 16px", borderRadius:10, cursor:"pointer", fontFamily:"inherit",
              background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)",
              color:C.green, fontWeight:700, fontSize:12,
            }}>+ Upload Document</button>
          </div>
          <div style={{
            background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
            borderRadius:16, overflow:"hidden",
          }}>
            {client.documents.map((doc,i)=>(
              <div key={i} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"14px 20px", flexWrap:"wrap", gap:10,
                borderBottom: i<client.documents.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(124,92,252,0.06)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{
                    width:36, height:36, borderRadius:8, flexShrink:0,
                    background: doc.type==="PDF" ? "rgba(244,114,182,0.12)" : "rgba(79,195,247,0.12)",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:16,
                  }}>{doc.type==="PDF"?"📄":"📝"}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{doc.name}</div>
                    <div style={{ fontSize:11, color:"#64748b" }}>{doc.type} · {doc.size} · {doc.date}</div>
                  </div>
                </div>
                <button style={{
                  padding:"6px 14px", borderRadius:8, cursor:"pointer", fontFamily:"inherit",
                  fontWeight:600, fontSize:12,
                  background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)", color:C.green,
                }}>⬇ Download</button>
              </div>
            ))}
            {client.documents.length===0 && (
              <div style={{ textAlign:"center", padding:"40px", color:"#475569", fontSize:13 }}>
                No documents uploaded yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Activity Log Tab ── */}
      {tab==="activity" && (
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
          borderRadius:16, overflow:"hidden",
        }}>
          {client.activity.map((a,i)=>(
            <div key={i} style={{
              display:"flex", alignItems:"flex-start", gap:14, padding:"14px 20px",
              borderBottom: i<client.activity.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              flexWrap:"wrap",
            }}>
              <div style={{
                width:8, height:8, borderRadius:"50%", background:C.green,
                boxShadow:`0 0 6px ${C.green}`, flexShrink:0, marginTop:5,
              }}/>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{a.action}</div>
                <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{a.detail}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:11, color:"#64748b" }}>{a.user}</div>
                <div style={{ fontSize:10, color:"#475569" }}>{a.time}</div>
              </div>
            </div>
          ))}
          {client.activity.length===0 && (
            <div style={{ textAlign:"center", padding:"40px", color:"#475569", fontSize:13 }}>
              No activity recorded yet.
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}

function SectionTitle({ color, title }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
      <div style={{ width:4, height:18, borderRadius:2, background:color }}/>
      <span style={{ fontWeight:700, fontSize:14, color:"#fff" }}>{title}</span>
    </div>
  );
}
