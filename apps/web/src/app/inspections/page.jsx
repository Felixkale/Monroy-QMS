"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabaseClient";
// import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

const mockInspections = [
  { id:"INS-001", equipment:"PV-0041", date:"2026-03-05", inspector:"John Smith", result:"Pass" },
  { id:"INS-002", equipment:"BL-0012", date:"2026-02-28", inspector:"Sarah Johnson", result:"Conditional Pass" },
  { id:"INS-003", equipment:"AR-0067", date:"2026-02-15", inspector:"John Smith", result:"Pass" },
];

export default function InspectionsPage() {
  const router = useRouter();
  const [inspections, setInspections] = useState(mockInspections);
  const [search, setSearch] = useState("");

  const filtered = inspections.filter(i =>
    i.equipment.toLowerCase().includes(search.toLowerCase()) ||
    i.inspector.toLowerCase().includes(search.toLowerCase())
  );

  const resultColor = { Pass:C.green, Fail:C.pink, "Conditional Pass":C.yellow };

  return (
    <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0", flexDirection:"column" }}>
      <main style={{ flex:1, padding:"32px", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:28 }}>
          <div>
            <h1 style={{
              fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
              background:`linear-gradient(90deg,#fff 30%,${C.green})`,
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            }}>Inspections</h1>
            <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>All equipment inspections</p>
          </div>
          <button onClick={() => router.push("/inspections/create")} style={{
            padding:"10px 18px", borderRadius:12,
            background:`linear-gradient(135deg,${C.purple},${C.blue})`,
            border:"none", color:"#fff", fontWeight:700, fontSize:13,
            boxShadow:`0 0 20px rgba(124,92,252,0.4)`, cursor:"pointer", fontFamily:"inherit",
          }}>+ New Inspection</button>
        </div>

        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search inspections…"
          style={{
            width:"100%", padding:"10px 16px", marginBottom:22,
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.3)",
            borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
          }}
        />

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:14 }}>
          {filtered.map(insp => (
            <div
              key={insp.id}
              onClick={() => router.push(`/inspections/${insp.id}`)}
              style={{
                background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
                border:"1px solid rgba(124,92,252,0.25)",
                borderRadius:14, padding:"18px 20px",
                cursor:"pointer", transition:"all 0.25s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(124,92,252,0.5)";
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(124,92,252,0.25)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:"#fff" }}>{insp.id}</div>
                  <div style={{ fontSize:11, color:"#64748b" }}>{insp.date}</div>
                </div>
                <span style={{
                  padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                  background:`rgba(${rgbaMap[resultColor[insp.result]]},0.15)`,
                  color:resultColor[insp.result],
                  border:`1px solid rgba(${rgbaMap[resultColor[insp.result]]},0.3)`,
                }}>{insp.result}</span>
              </div>
              <div style={{ fontSize:12, color:"#cbd5e1", marginBottom:8 }}>Equipment: {insp.equipment}</div>
              <div style={{ fontSize:12, color:"#64748b" }}>Inspector: {insp.inspector}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
