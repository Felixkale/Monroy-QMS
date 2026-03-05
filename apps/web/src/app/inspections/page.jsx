"use client";
import { useState } from "react";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

const inspections = [
  { id:"INS-1041", equipment:"PV-0041 – Pressure Vessel", client:"Acme Industrial Corp",  inspector:"John Smith",    date:"2026-03-05", type:"Statutory",   result:"Pass",        status:"Completed"      },
  { id:"INS-1040", equipment:"BL-0012 – Boiler",          client:"SteelWorks Ltd",        inspector:"Sarah Johnson", date:"2026-03-04", type:"Visual",      result:"Fail",        status:"Pending Review" },
  { id:"INS-1039", equipment:"AR-0067 – Air Receiver",    client:"MineOps Ltd",           inspector:"Michael Chen",  date:"2026-03-03", type:"UT Thickness",result:"Pass",        status:"Completed"      },
  { id:"INS-1038", equipment:"CP-0089 – Compressor",      client:"TechPlant Inc",         inspector:"Emily Davis",   date:"2026-02-28", type:"Hydro Test",  result:"Pass",        status:"Completed"      },
  { id:"INS-1037", equipment:"LE-0034 – Lifting Equip",   client:"Cargo Hub",             inspector:"John Smith",    date:"2026-02-25", type:"Load Test",   result:"Pass",        status:"Completed"      },
  { id:"INS-1036", equipment:"ST-0023 – Storage Tank",    client:"Delta Refineries",      inspector:"Sarah Johnson", date:"2026-02-20", type:"NDT",         result:"Conditional", status:"In Progress"    },
  { id:"INS-1035", equipment:"PV-0055 – Pressure Vessel", client:"PowerGen Africa",       inspector:"Michael Chen",  date:"2026-02-15", type:"Statutory",   result:"Fail",        status:"Completed"      },
  { id:"INS-1034", equipment:"BL-0031 – Boiler",          client:"SafePort Holdings",     inspector:"Emily Davis",   date:"2026-02-10", type:"Visual",      result:"Pass",        status:"Completed"      },
];

const resultColor = { Pass:C.green, Fail:C.pink, Conditional:C.yellow };
const statusColor = { Completed:C.green, "Pending Review":C.yellow, "In Progress":C.blue };
const typeColor   = {
  Statutory:C.purple, Visual:C.blue, "UT Thickness":C.green,
  "Hydro Test":C.yellow, "Load Test":C.pink, NDT:"#a78bfa",
};

export default function InspectionsPage() {
  const [search,       setSearch]  = useState("");
  const [filterStatus, setFilter]  = useState("All");

  const statuses = ["All","Completed","Pending Review","In Progress"];
  const filtered = inspections.filter(i =>
    (filterStatus==="All" || i.status===filterStatus) &&
    (i.equipment.toLowerCase().includes(search.toLowerCase()) ||
     i.client.toLowerCase().includes(search.toLowerCase()) ||
     i.id.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AppLayout>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:28 }}>
        <div>
          <h1 style={{
            fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.purple})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Inspections</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Manage and track all inspection activities</p>
        </div>
        <a href="/inspections/create" style={{
          padding:"10px 20px", borderRadius:12, textDecoration:"none",
          background:`linear-gradient(135deg,${C.purple},${C.blue})`,
          color:"#fff", fontWeight:700, fontSize:13,
          boxShadow:`0 0 20px rgba(124,92,252,0.4)`,
        }}>+ Create Inspection</a>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:22 }}>
        {[
          { label:"Total",         value:38, color:C.blue   },
          { label:"Completed",     value:32, color:C.green  },
          { label:"In Progress",   value:3,  color:C.yellow },
          { label:"Pending Review",value:3,  color:C.purple },
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

      {/* Filters */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search inspections…"
          style={{
            flex:"1 1 220px", padding:"10px 16px",
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.3)",
            borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
          }}
        />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {statuses.map(s=>(
            <button key={s} onClick={()=>setFilter(s)} style={{
              padding:"8px 14px", borderRadius:20, fontSize:12, cursor:"pointer",
              fontFamily:"inherit", fontWeight:600,
              background: filterStatus===s ? "rgba(124,92,252,0.25)" : "rgba(255,255,255,0.04)",
              border: filterStatus===s ? `1px solid ${C.purple}` : "1px solid rgba(255,255,255,0.08)",
              color: filterStatus===s ? C.purple : "#64748b",
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.map(insp=>{
          const tColor = typeColor[insp.type] || C.purple;
          const tRgba  = rgbaMap[tColor] || "124,92,252";
          const rColor = resultColor[insp.result];
          const rRgba  = rgbaMap[rColor];
          const sColor = statusColor[insp.status];
          const sRgba  = rgbaMap[sColor];
          return (
            <div key={insp.id} style={{
              background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
              border:"1px solid rgba(124,92,252,0.15)", borderRadius:14,
              padding:"16px 20px", cursor:"pointer",
              display:"grid", gridTemplateColumns:"auto 1fr auto", gap:16, alignItems:"center",
            }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(124,92,252,0.4)"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(124,92,252,0.15)"}>
              <div style={{ minWidth:120 }}>
                <div style={{ fontSize:13, fontWeight:800, color:"#fff" }}>{insp.id}</div>
                <span style={{
                  display:"inline-block", marginTop:4, padding:"2px 8px", borderRadius:20,
                  fontSize:10, fontWeight:700,
                  background:`rgba(${tRgba},0.15)`, color:tColor,
                  border:`1px solid rgba(${tRgba},0.3)`,
                }}>{insp.type}</span>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{insp.equipment}</div>
                <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>
                  {insp.client} · {insp.inspector} · {insp.date}
                </div>
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end" }}>
                <span style={{
                  padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700,
                  background:`rgba(${rRgba},0.12)`, color:rColor,
                  border:`1px solid rgba(${rRgba},0.3)`,
                }}>{insp.result}</span>
                <span style={{
                  padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700,
                  background:`rgba(${sRgba},0.12)`, color:sColor,
                  border:`1px solid rgba(${sRgba},0.3)`,
                }}>{insp.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
