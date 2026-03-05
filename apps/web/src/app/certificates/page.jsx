"use client";
import { useState } from "react";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

const certs = [
  { id:"CERT-0889", type:"Equipment Certification",    equipment:"PV-0041",  client:"Acme Industrial Corp", issued:"2025-06-01", expiry:"2026-06-01", status:"Valid"    },
  { id:"CERT-0888", type:"Inspection Approval",        equipment:"AR-0067",  client:"MineOps Ltd",          issued:"2025-08-20", expiry:"2026-08-20", status:"Valid"    },
  { id:"CERT-0887", type:"ISO Certification",          equipment:"N/A",      client:"TechPlant Inc",        issued:"2025-01-15", expiry:"2026-04-15", status:"Expiring" },
  { id:"CERT-0886", type:"Compliance Certificate",     equipment:"LE-0034",  client:"Cargo Hub",            issued:"2025-05-10", expiry:"2026-05-10", status:"Valid"    },
  { id:"CERT-0885", type:"Equipment Certification",    equipment:"BL-0031",  client:"SafePort Holdings",    issued:"2025-09-12", expiry:"2026-09-12", status:"Valid"    },
  { id:"CERT-0884", type:"Inspection Approval",        equipment:"ST-0023",  client:"Delta Refineries",     issued:"2025-07-30", expiry:"2026-07-30", status:"Valid"    },
  { id:"CERT-0883", type:"Equipment Certification",    equipment:"CP-0089",  client:"TechPlant Inc",        issued:"2024-03-01", expiry:"2025-03-01", status:"Expired"  },
  { id:"CERT-0882", type:"ISO Certification",          equipment:"N/A",      client:"PowerGen Africa",      issued:"2024-01-01", expiry:"2025-01-01", status:"Expired"  },
];

const statusColor = { Valid:C.green, Expiring:C.yellow, Expired:C.pink };

export default function CertificatesPage() {
  const [filter, setFilter] = useState("All");
  const filters = ["All","Valid","Expiring","Expired"];
  const filtered = certs.filter(c => filter==="All" || c.status===filter);

  return (
    <AppLayout>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:28 }}>
        <div>
          <h1 style={{
            fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.yellow})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Certificates</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Certificate issuance and license tracking</p>
        </div>
        <button style={{
          padding:"10px 20px", borderRadius:12,
          background:`linear-gradient(135deg,${C.yellow}cc,${C.green})`,
          border:"none", color:"#0d0d1a", fontWeight:700, fontSize:13,
          cursor:"pointer", fontFamily:"inherit", boxShadow:`0 0 20px rgba(251,191,36,0.4)`,
        }}>+ Issue Certificate</button>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:22 }}>
        {[
          { label:"Total Issued", value:156, color:C.blue   },
          { label:"Valid",        value:141, color:C.green  },
          { label:"Expiring Soon",value:11,  color:C.yellow },
          { label:"Expired",      value:4,   color:C.pink   },
        ].map(s=>(
          <div key={s.label} style={{
            background:`rgba(${rgbaMap[s.color]},0.07)`,
            border:`1px solid rgba(${rgbaMap[s.color]},0.25)`,
            borderRadius:14, padding:"16px 18px",
          }}>
            <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:28, fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display:"flex", gap:6, marginBottom:18, flexWrap:"wrap" }}>
        {filters.map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{
            padding:"8px 16px", borderRadius:20, fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:600,
            background: filter===f ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.04)",
            border: filter===f ? `1px solid ${C.yellow}` : "1px solid rgba(255,255,255,0.08)",
            color: filter===f ? C.yellow : "#64748b",
          }}>{f}</button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
        {filtered.map(cert=>(
          <div key={cert.id} style={{
            background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
            border:`1px solid rgba(${statusColor[cert.status]===C.green?"0,245,196":statusColor[cert.status]===C.yellow?"251,191,36":"244,114,182"},0.25)`,
            borderRadius:16, padding:"20px",
            boxShadow:`0 0 20px rgba(${statusColor[cert.status]===C.green?"0,245,196":statusColor[cert.status]===C.yellow?"251,191,36":"244,114,182"},0.08)`,
            position:"relative", overflow:"hidden",
          }}>
            {/* Top stripe */}
            <div style={{
              position:"absolute", top:0, left:0, right:0, height:3,
              background:`linear-gradient(90deg,${statusColor[cert.status]},transparent)`,
            }}/>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:"#fff" }}>{cert.id}</div>
                <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{cert.type}</div>
              </div>
              <span style={{
                padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700,
                background:`rgba(${statusColor[cert.status]===C.green?"0,245,196":statusColor[cert.status]===C.yellow?"251,191,36":"244,114,182"},0.12)`,
                color: statusColor[cert.status],
                border:`1px solid rgba(${statusColor[cert.status]===C.green?"0,245,196":statusColor[cert.status]===C.yellow?"251,191,36":"244,114,182"},0.3)`,
              }}>
                {cert.status==="Valid"?"✅":cert.status==="Expiring"?"⏳":"❌"} {cert.status}
              </span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6, fontSize:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"#64748b" }}>Client</span>
                <span style={{ color:"#e2e8f0", fontWeight:600 }}>{cert.client}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"#64748b" }}>Equipment</span>
                <span style={{ color:"#e2e8f0", fontWeight:600 }}>{cert.equipment}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"#64748b" }}>Issued</span>
                <span style={{ color:"#e2e8f0" }}>{cert.issued}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"#64748b" }}>Expires</span>
                <span style={{ color: statusColor[cert.status], fontWeight:700 }}>{cert.expiry}</span>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              <button style={{
                flex:1, padding:"8px", borderRadius:8, fontSize:12, cursor:"pointer",
                fontFamily:"inherit", fontWeight:600,
                background:"rgba(124,92,252,0.15)", border:"1px solid rgba(124,92,252,0.3)", color:C.purple,
              }}>⬇ Download PDF</button>
              <button style={{
                flex:1, padding:"8px", borderRadius:8, fontSize:12, cursor:"pointer",
                fontFamily:"inherit", fontWeight:600,
                background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)", color:C.green,
              }}>🔗 View QR</button>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
