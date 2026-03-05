"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };

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

export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
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
    loadInspection();
  }

  function loadInspection() {
    const id = params.id;
    const found = allInspections.find(i => i.id === id);
    if (found) {
      setInspection(found);
    }
    setLoading(false);
  }

  if (loading) {
    return <AppLayout><div style={{ padding:"40px" }}>Loading...</div></AppLayout>;
  }

  if (!inspection) {
    return (
      <AppLayout>
        <div style={{ padding:"40px", textAlign:"center" }}>
          <h2 style={{ color:"#fff" }}>Inspection Not Found</h2>
          <button onClick={() => router.push("/inspections")} style={{
            marginTop:"20px", padding:"10px 20px",
            backgroundColor:"#667eea", color:"white", border:"none",
            borderRadius:"6px", cursor:"pointer", fontFamily:"inherit",
          }}>Back to Inspections</button>
        </div>
      </AppLayout>
    );
  }

  const resultColor = { Pass:C.green, Conditional:C.yellow, Fail:C.pink };

  return (
    <AppLayout>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16, marginBottom:28 }}>
        <div>
          <a href="/inspections" style={{ color:"#64748b", fontSize:13, textDecoration:"none", marginBottom:10, display:"block" }}>← Back to Inspections</a>
          <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:"0 0 8px", color:"#fff" }}>
            {inspection.inspectionNo}
          </h1>
          <p style={{ color:"#64748b", margin:0, fontSize:13 }}>{inspection.equipmentTag} · {inspection.equipmentType}</p>
        </div>
        <span style={{
          padding:"8px 16px", borderRadius:20, fontSize:12, fontWeight:700,
          background:`rgba(${inspection.result==="Pass"?"0,245,196":inspection.result==="Conditional"?"251,191,36":"244,114,182"},0.12)`,
          color:resultColor[inspection.result],
          border:`1px solid rgba(${inspection.result==="Pass"?"0,245,196":inspection.result==="Conditional"?"251,191,36":"244,114,182"},0.3)`,
        }}>{inspection.result}</span>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:22 }}>
        {[
          { label:"Date", value:inspection.date, color:C.blue },
          { label:"Inspector", value:inspection.inspector, color:C.green },
          { label:"Type", value:inspection.type, color:C.purple },
          { label:"Next Inspection", value:inspection.nextInspectionDate, color:C.yellow },
        ].map(s=>(
          <div key={s.label} style={{
            background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:10, padding:"14px",
          }}>
            <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:14, fontWeight:700, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{
        background:"rgba(255,255,255,0.02)", border:"1px solid rgba(79,195,247,0.2)",
        borderRadius:16, padding:"20px", marginBottom:16,
      }}>
        <h3 style={{ fontSize:16, fontWeight:700, color:"#fff", marginTop:0 }}>Equipment Information</h3>
        {[
          { label:"Equipment Tag", value:inspection.details.equipmentTag },
          { label:"Serial Number", value:inspection.details.serial },
          { label:"Manufacturer", value:inspection.details.manufacturer },
          { label:"Model", value:inspection.details.model },
          { label:"Type", value:inspection.details.inspectionType },
          { label:"Location", value:inspection.details.location },
        ].map(f=>(
          <div key={f.label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:13 }}>
            <span style={{ color:"#64748b" }}>{f.label}</span>
            <span style={{ color:"#e2e8f0", fontWeight:600 }}>{f.value}</span>
          </div>
        ))}
      </div>

      <div style={{
        background:"rgba(255,255,255,0.02)", border:"1px solid rgba(0,245,196,0.2)",
        borderRadius:16, padding:"20px", marginBottom:16,
      }}>
        <h3 style={{ fontSize:16, fontWeight:700, color:"#fff", marginTop:0 }}>Inspection Results</h3>
        {Object.entries(inspection.details).map(([key, value]) => {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return (
              <div key={key} style={{ marginBottom:12, paddingBottom:12, borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0", marginBottom:8, textTransform:"capitalize" }}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                {Object.entries(value).map(([k, v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", fontSize:12, marginLeft:12 }}>
                    <span style={{ color:"#94a3b8", textTransform:"capitalize" }}>{k}:</span>
                    <span style={{ color:k==="result"&&v==="Pass"?C.green:k==="result"&&v==="Fail"?C.pink:"#cbd5e1", fontWeight:600 }}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            );
          }
          return null;
        })}
      </div>

      <div style={{
        background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
        borderRadius:16, padding:"20px",
      }}>
        <h3 style={{ fontSize:16, fontWeight:700, color:"#fff", marginTop:0 }}>Comments</h3>
        <p style={{ color:"#cbd5e1", fontSize:13, lineHeight:"1.8", margin:0 }}>
          {inspection.comments}
        </p>
      </div>
    </AppLayout>
  );
}
