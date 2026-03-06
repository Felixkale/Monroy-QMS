"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabaseClient";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196", [C.blue]:"79,195,247", [C.purple]:"124,92,252", [C.pink]:"244,114,182", [C.yellow]:"251,191,36" };

const mockNCRs = [
  { id:"NCR-001", equipment:"BL-0012", severity:"Major", status:"Open", date:"2026-02-28", description:"Corrosion detected on boiler shell" },
  { id:"NCR-002", equipment:"PV-0041", severity:"Minor", status:"Closed", date:"2026-02-15", description:"Paint touch-up required" },
  { id:"NCR-003", equipment:"AR-0067", severity:"Critical", status:"Open", date:"2026-03-01", description:"Pressure relief valve malfunction" },
];

export default function NCRPage() {
  const router = useRouter();
  const [ncrs, setNCRs] = useState(mockNCRs);
  const [filterStatus, setFilterStatus] = useState("All");

  const filtered = ncrs.filter(ncr => filterStatus === "All" || ncr.status === filterStatus);
  
  const severityColor = {
    "Critical": C.pink,
    "Major": C.yellow,
    "Minor": C.blue,
  };

  const statusColor = {
    "Open": C.pink,
    "Closed": C.green,
    "In Progress": C.yellow,
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0", flexDirection:"column" }}>
      <main style={{ flex:1, padding:"32px", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:28 }}>
          <div>
            <h1 style={{
              fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
              background:`linear-gradient(90deg,#fff 30%,${C.pink})`,
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            }}>Non-Conformance Reports</h1>
            <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Track and manage equipment non-conformances</p>
          </div>
          <button style={{
            padding:"10px 18px", borderRadius:12,
            background:`linear-gradient(135deg,${C.purple},${C.blue})`,
            border:"none", color:"#fff", fontWeight:700, fontSize:13,
            boxShadow:`0 0 20px rgba(124,92,252,0.4)`, cursor:"pointer", fontFamily:"inherit",
          }}>+ Create NCR</button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:22 }}>
          {[
            { label:"Total NCRs", value:ncrs.length, color:C.blue },
            { label:"Open", value:ncrs.filter(n => n.status === "Open").length, color:C.pink },
            { label:"Closed", value:ncrs.filter(n => n.status === "Closed").length, color:C.green },
            { label:"Critical", value:ncrs.filter(n => n.severity === "Critical").length, color:C.yellow },
          ].map(s => (
            <div key={s.label} style={{
              background:`rgba(${rgbaMap[s.color]},0.07)`,
              border:`1px solid rgba(${rgbaMap[s.color]},0.25)`,
              borderRadius:14, padding:"16px 18px",
            }}>
              <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
              <div style={{ fontSize:28, fontWeight:900, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
          {["All", "Open", "Closed", "In Progress"].map(status => (
            <button key={status} onClick={() => setFilterStatus(status)} style={{
              padding:"8px 14px", borderRadius:20, fontSize:12, cursor:"pointer",
              fontFamily:"inherit", fontWeight:600,
              background: filterStatus === status ? "rgba(124,92,252,0.25)" : "rgba(255,255,255,0.04)",
              border: filterStatus === status ? `1px solid ${C.purple}` : "1px solid rgba(255,255,255,0.08)",
              color: filterStatus === status ? C.purple : "#64748b",
            }}>{status}</button>
          ))}
        </div>

        <div style={{
          background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
          border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, overflow:"hidden",
        }}>
          {filtered.length > 0 ? (
            filtered.map((ncr, i) => (
              <div key={ncr.id} style={{
                display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"14px 20px", borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                flexWrap:"wrap", gap:10, cursor:"pointer",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{ncr.id}</div>
                  <div style={{ fontSize:11, color:"#64748b" }}>{ncr.equipment} · {ncr.description}</div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{
                    padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:700,
                    background:`rgba(${rgbaMap[severityColor[ncr.severity]]},0.15)`,
                    color:severityColor[ncr.severity],
                    border:`1px solid rgba(${rgbaMap[severityColor[ncr.severity]]},0.3)`,
                  }}>{ncr.severity}</span>
                  <span style={{
                    padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:700,
                    background:`rgba(${rgbaMap[statusColor[ncr.status]]},0.15)`,
                    color:statusColor[ncr.status],
                    border:`1px solid rgba(${rgbaMap[statusColor[ncr.status]]},0.3)`,
                  }}>{ncr.status}</span>
                  <div style={{ fontSize:11, color:"#64748b", minWidth:"80px", textAlign:"right" }}>{ncr.date}</div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding:"40px", textAlign:"center", color:"#64748b" }}>No NCRs found</div>
          )}
        </div>
      </main>
    </div>
  );
}
