"use client";
import { useState } from "react";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

const ncrs = [
  { id:"NCR-0089", equipment:"BL-0012 – Boiler",        client:"SteelWorks Ltd",   severity:"Major",    raised:"2026-03-04", status:"Open",   description:"Excessive corrosion found on shell exterior. Wall thickness below minimum allowable." },
  { id:"NCR-0088", equipment:"CP-0089 – Compressor",    client:"TechPlant Inc",    severity:"Minor",    raised:"2026-02-28", status:"Open",   description:"Minor vibration during load test exceeding acceptable limits by 8%." },
  { id:"NCR-0087", equipment:"PV-0055 – Pressure Vessel",client:"PowerGen Africa", severity:"Critical", raised:"2026-02-15", status:"Open",   description:"Safety relief valve failed to open at set pressure during hydro test. Critical safety concern." },
  { id:"NCR-0086", equipment:"ST-0023 – Storage Tank",  client:"Delta Refineries", severity:"Major",    raised:"2026-02-10", status:"Closed", description:"Weld seam showing signs of micro-cracking. NDT results indicate subsurface defects." },
  { id:"NCR-0085", equipment:"LE-0034 – Lifting Equip", client:"Cargo Hub",        severity:"Minor",    raised:"2026-01-25", status:"Closed", description:"Hook latch spring worn. Replaced during inspection. Load test passed post-repair." },
];

const severityColor  = { Critical:C.pink, Major:C.yellow, Minor:C.blue };
const statusColor    = { Open:C.pink, Closed:C.green };

export default function NCRPage() {
  const [filter, setFilter] = useState("All");
  const filters = ["All","Open","Closed","Critical","Major","Minor"];
  const filtered = ncrs.filter(n =>
    filter==="All" || n.status===filter || n.severity===filter
  );

  return (
    <AppLayout>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:28 }}>
        <div>
          <h1 style={{
            fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.yellow})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Non-Conformance Reports</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Track and manage quality non-conformances</p>
        </div>
        <button style={{
          padding:"10px 20px", borderRadius:12,
          background:`linear-gradient(135deg,${C.pink},${C.purple})`,
          border:"none", color:"#fff", fontWeight:700, fontSize:13,
          cursor:"pointer", fontFamily:"inherit", boxShadow:`0 0 20px rgba(244,114,182,0.4)`,
        }}>+ Raise NCR</button>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:14, marginBottom:22 }}>
        {[
          { label:"Total NCRs", value:3,  color:C.blue   },
          { label:"Open",       value:3,  color:C.pink   },
          { label:"Closed",     value:2,  color:C.green  },
          { label:"Critical",   value:1,  color:C.pink   },
          { label:"Major",      value:2,  color:C.yellow },
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

      {/* Filter pills */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:18 }}>
        {filters.map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{
            padding:"8px 16px", borderRadius:20, fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:600,
            background: filter===f ? "rgba(244,114,182,0.2)" : "rgba(255,255,255,0.04)",
            border: filter===f ? `1px solid ${C.pink}` : "1px solid rgba(255,255,255,0.08)",
            color: filter===f ? C.pink : "#64748b",
          }}>{f}</button>
        ))}
      </div>

      {/* NCR Cards */}
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {filtered.map(ncr=>(
          <div key={ncr.id} style={{
            background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
            border:`1px solid rgba(${severityColor[ncr.severity]===C.pink?"244,114,182":severityColor[ncr.severity]===C.yellow?"251,191,36":"79,195,247"},0.25)`,
            borderRadius:16, padding:"20px 22px",
            position:"relative", overflow:"hidden",
          }}>
            {/* Severity bar */}
            <div style={{
              position:"absolute", left:0, top:0, bottom:0, width:4,
              background: severityColor[ncr.severity],
              boxShadow:`0 0 12px ${severityColor[ncr.severity]}88`,
            }}/>
            <div style={{ paddingLeft:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10, marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:15, fontWeight:800, color:"#fff" }}>{ncr.id}</span>
                  <span style={{
                    padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                    background:`rgba(${severityColor[ncr.severity]===C.pink?"244,114,182":severityColor[ncr.severity]===C.yellow?"251,191,36":"79,195,247"},0.15)`,
                    color: severityColor[ncr.severity],
                    border:`1px solid rgba(${severityColor[ncr.severity]===C.pink?"244,114,182":severityColor[ncr.severity]===C.yellow?"251,191,36":"79,195,247"},0.35)`,
                  }}>⚠ {ncr.severity}</span>
                  <span style={{
                    padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                    background:`rgba(${ncr.status==="Open"?"244,114,182":"0,245,196"},0.12)`,
                    color: statusColor[ncr.status],
                    border:`1px solid rgba(${ncr.status==="Open"?"244,114,182":"0,245,196"},0.3)`,
                  }}>{ncr.status}</span>
                </div>
                <div style={{ fontSize:11, color:"#64748b" }}>Raised: {ncr.raised}</div>
              </div>
              <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0", marginBottom:4 }}>{ncr.equipment}</div>
              <div style={{ fontSize:12, color:"#64748b", marginBottom:8 }}>{ncr.client}</div>
              <div style={{ fontSize:13, color:"#94a3b8", lineHeight:1.5 }}>{ncr.description}</div>
              <div style={{ display:"flex", gap:10, marginTop:14, flexWrap:"wrap" }}>
                <button style={{
                  padding:"7px 16px", borderRadius:8, fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:600,
                  background:"rgba(124,92,252,0.15)", border:"1px solid rgba(124,92,252,0.3)", color:C.purple,
                }}>View Full Report</button>
                {ncr.status==="Open" && (
                  <button style={{
                    padding:"7px 16px", borderRadius:8, fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:600,
                    background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)", color:C.green,
                  }}>Close NCR</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
