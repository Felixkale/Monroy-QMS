"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

const allInspections = [
  {
    id:"INS-1041", inspectionNo:"INS-1041", equipmentTag:"PV-0041", equipmentType:"Pressure Vessel", client:"Acme Industrial Corp",
    date:"2026-03-05", inspector:"John Smith", type:"Statutory Inspection", result:"Pass", status:"Completed",
    nextInspectionDate:"2026-06-01", comments:"All tests passed. Equipment in excellent condition.",
    details: {
      equipmentTag:"PV-0041", serial:"S-10041", manufacturer:"ASME Corp", model:"PV-Standard-2020",
      inspectionType:"Statutory", location:"Plant A - Bay 3",
      visualInspection: { result:"Pass", notes:"No visible corrosion or damage" },
      pressureTest: { result:"Pass", pressure:"15 bar", notes:"Pressure maintained throughout test" },
      thicknessCheck: { result:"Pass", shellThickness:"5mm", notes:"Within acceptable limits" },
      reliefValve: { result:"Pass", pressure:"10.5 bar", notes:"Functioning correctly" },
      documentationReview: { result:"Pass", notes:"All required documents present" },
    }
  },
  {
    id:"INS-1042", inspectionNo:"INS-1042", equipmentTag:"BL-0012", equipmentType:"Boiler", client:"SteelWorks Ltd",
    date:"2025-09-15", inspector:"Sarah Johnson", type:"Annual Safety Check", result:"Pass", status:"Completed",
    nextInspectionDate:"2026-09-15", comments:"Safety systems functional. Boiler operating efficiently.",
    details: {
      equipmentTag:"BL-0012", serial:"S-20012", manufacturer:"ThermTech", model:"BL-2015",
      inspectionType:"Annual Safety", location:"Plant B - Boiler Room",
      visualInspection: { result:"Pass", notes:"External surfaces clean and secure" },
      pressureTest: { result:"Pass", pressure:"16 bar", notes:"No leakage detected" },
      safetyValves: { result:"Pass", notes:"All valves responding correctly" },
      steamGeneration: { result:"Pass", notes:"5000 kg/h capacity maintained" },
    }
  },
  {
    id:"INS-1043", inspectionNo:"INS-1043", equipmentTag:"AR-0067", equipmentType:"Air Receiver", client:"MineOps Ltd",
    date:"2026-02-20", inspector:"Michael Chen", type:"Visual Inspection", result:"Conditional", status:"Completed",
    nextInspectionDate:"2026-08-20", comments:"Minor corrosion noted. Recommend surface treatment.",
    details: {
      equipmentTag:"AR-0067", serial:"S-30067", manufacturer:"CompAir", model:"AR-2020",
      inspectionType:"Visual", location:"Mining Site - Workshop",
      visualInspection: { result:"Conditional", notes:"Minor rust on base - recommend cleaning" },
      pressureTest: { result:"Pass", pressure:"14 bar", notes:"Functional" },
      recommendation: "Apply protective coating within 30 days",
    }
  },
  {
    id:"INS-1044", inspectionNo:"INS-1044", equipmentTag:"CP-0089", equipmentType:"Compressor", client:"TechPlant Inc",
    date:"2026-02-15", inspector:"John Smith", type:"Hydrostatic Test", result:"Fail", status:"Pending Review",
    nextInspectionDate:"2026-03-15", comments:"Failed pressure test. Equipment requires maintenance.",
    details: {
      equipmentTag:"CP-0089", serial:"S-50089", manufacturer:"Atlas", model:"CP-2017",
      inspectionType:"Hydrostatic Test", location:"TechPlant Inc - Factory Floor",
      hydrostaticTest: { result:"Fail", pressure:"Leaked at 12 bar (Rated: 15 bar)", notes:"Seal failure detected" },
      recommendation: "Replace seals and retest",
      estimatedRepairTime: "7 days",
    }
  },
];

export default function InspectionsPage() {
  const router = useRouter();
  const [inspections, setInspections] = useState(allInspections);
  const [filterResult, setFilterResult] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      router.push("/login");
      return;
    }
    setUser(data.user);
  }

  const results = ["All", "Pass", "Conditional", "Fail"];
  const filtered = inspections.filter(i =>
    (filterResult === "All" || i.result === filterResult) &&
    (i.inspectionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
     i.equipmentTag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleInspectionClick = (id) => {
    router.push(`/inspections/${id}`);
  };

  const resultColor = { Pass:C.green, Conditional:C.yellow, Fail:C.pink };

  return (
    <AppLayout>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:28 }}>
        <div>
          <h1 style={{
            fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.green})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Inspections</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>View and manage equipment inspections</p>
        </div>
        <button style={{
          padding:"10px 18px", borderRadius:12, textDecoration:"none",
          background:`linear-gradient(135deg,${C.purple},${C.blue})`,
          border:"none", color:"#fff", fontWeight:700, fontSize:13,
          boxShadow:`0 0 20px rgba(124,92,252,0.4)`, cursor:"pointer", fontFamily:"inherit",
        }}>
          ➕ Create Inspection
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:22 }}>
        {[
          { label:"Total", value:allInspections.length, color:C.blue },
          { label:"Pass", value:allInspections.filter(i=>i.result==="Pass").length, color:C.green },
          { label:"Conditional", value:allInspections.filter(i=>i.result==="Conditional").length, color:C.yellow },
          { label:"Fail", value:allInspections.filter(i=>i.result==="Fail").length, color:C.pink },
        ].map(s=>(
          <div key={s.label} style={{
            background:`rgba(${rgbaMap[s.color]||"100,116,139"},0.07)`,
            border:`1px solid rgba(${rgbaMap[s.color]||"100,116,139"},0.25)`,
            borderRadius:14, padding:"16px 18px",
          }}>
            <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:28, fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
        <input
          value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
          placeholder="Search inspections…"
          style={{
            flex:"1 1 220px", padding:"10px 16px",
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.3)",
            borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
          }}
        />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {results.map(r=>(
            <button key={r} onClick={()=>setFilterResult(r)} style={{
              padding:"8px 14px", borderRadius:20, fontSize:12, cursor:"pointer",
              fontFamily:"inherit", fontWeight:600,
              background: filterResult===r ? "rgba(79,195,247,0.25)" : "rgba(255,255,255,0.04)",
              border: filterResult===r ? `1px solid ${C.blue}` : "1px solid rgba(255,255,255,0.08)",
              color: filterResult===r ? C.blue : "#64748b",
            }}>{r}</button>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
        {filtered.map(i=>(
          <div
            key={i.id}
            onClick={() => handleInspectionClick(i.id)}
            style={{
              background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
              border:"1px solid rgba(79,195,247,0.25)",
              borderRadius:14, padding:"20px",
              cursor:"pointer", transition:"all 0.25s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(79,195,247,0.5)";
              e.currentTarget.style.boxShadow = "0 0 30px rgba(79,195,247,0.2)";
              e.currentTarget.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(79,195,247,0.25)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div>
                <h3 style={{ fontSize:16, fontWeight:800, color:"#fff", margin:"0 0 4px" }}>{i.inspectionNo}</h3>
                <p style={{ fontSize:11, color:"#64748b", margin:0 }}>{i.equipmentTag} · {i.equipmentType}</p>
              </div>
              <span style={{
                padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                background:`rgba(${rgbaMap[resultColor[i.result]]},0.12)`, color:resultColor[i.result],
                border:`1px solid rgba(${rgbaMap[resultColor[i.result]]},0.3)`,
              }}>{i.result}</span>
            </div>
            <p style={{ fontSize:12, color:"#94a3b8", margin:"0 0 12px", lineHeight:"1.5" }}>{i.comments}</p>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize:11, color:"#64748b" }}>
                <p style={{ margin:0 }}>📅 {i.date}</p>
                <p style={{ margin:"2px 0 0" }}>👤 {i.inspector}</p>
              </div>
              <span style={{
                padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)",
                color:C.green,
              }}>{i.type}</span>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
