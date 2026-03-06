"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabaseClient";
// import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

const mockInspections = {
  "INS-001": {
    id: "INS-001",
    equipmentTag: "PV-0041",
    date: "2026-03-05",
    inspector: "John Smith",
    result: "Pass",
    notes: "Statutory inspection completed successfully. No defects found.",
    attachments: [
      { name: "Inspection Report", type: "PDF", size: "2.4MB" },
      { name: "Test Photos", type: "ZIP", size: "15.3MB" },
    ],
  },
  "INS-002": {
    id: "INS-002",
    equipmentTag: "BL-0012",
    date: "2026-02-28",
    inspector: "Sarah Johnson",
    result: "Conditional Pass",
    notes: "Minor corrosion found on shell. Recommend repainting.",
    attachments: [],
  },
};

export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInspection();
  }, []);

  function loadInspection() {
    const id = params.id;
    const insp = mockInspections[id];
    if (insp) {
      setInspection(insp);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0" }}>
        <main style={{ flex:1, padding:"40px" }}>Loading...</main>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0" }}>
        <main style={{ flex:1, padding:"40px", textAlign:"center" }}>
          <h2 style={{ color:"#fff" }}>Inspection Not Found</h2>
          <button onClick={() => router.push("/inspections")} style={{
            marginTop:"20px", padding:"10px 20px",
            backgroundColor:"#667eea", color:"white", border:"none",
            borderRadius:"6px", cursor:"pointer", fontFamily:"inherit",
          }}>Back to Inspections</button>
        </main>
      </div>
    );
  }

  const resultColor = {
    "Pass": C.green,
    "Fail": C.pink,
    "Conditional Pass": C.yellow,
  }[inspection.result];

  return (
    <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0", flexDirection:"column" }}>
      <main style={{ flex:1, padding:"32px", overflowY:"auto" }}>
        <div style={{ marginBottom:28 }}>
          <a href="/inspections" style={{ color:"#64748b", fontSize:13, textDecoration:"none", marginBottom:10, display:"block" }}>← Back to Inspections</a>
          <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:"0 0 8px", color:"#fff" }}>
            {inspection.id}
          </h1>
          <p style={{ color:"#64748b", margin:0, fontSize:13 }}>Equipment {inspection.equipmentTag}</p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12, marginBottom:28 }}>
          {[
            { label:"Equipment", value:inspection.equipmentTag, color:C.blue },
            { label:"Inspector", value:inspection.inspector, color:C.purple },
            { label:"Date", value:inspection.date, color:C.green },
            { label:"Result", value:inspection.result, color:resultColor },
          ].map(s=>(
            <div key={s.label} style={{
              background:`rgba(${rgbaMap[s.color]},0.07)`,
              border:`1px solid rgba(${rgbaMap[s.color]},0.25)`,
              borderRadius:14, padding:"16px 18px",
            }}>
              <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
              <div style={{ fontSize:18, fontWeight:900, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{
          background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
          border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, padding:"20px", marginBottom:20,
        }}>
          <h2 style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:12 }}>Notes & Observations</h2>
          <p style={{ color:"#cbd5e1", fontSize:13, lineHeight:1.6, margin:0 }}>{inspection.notes}</p>
        </div>

        {inspection.attachments && inspection.attachments.length > 0 && (
          <div style={{
            background:"linear-gradient(135deg,rgba(0,245,196,0.05),rgba(79,195,247,0.04))",
            border:"1px solid rgba(79,195,247,0.18)", borderRadius:16, padding:"20px",
          }}>
            <h2 style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:14 }}>Attachments</h2>
            {inspection.attachments.map((att, i) => (
              <div key={i} style={{
                display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"12px 0", borderBottom: i < inspection.attachments.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{
                    width:36, height:36, borderRadius:8,
                    background:"rgba(79,195,247,0.12)", display:"flex",
                    alignItems:"center", justifyContent:"center", fontSize:16,
                  }}>📄</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{att.name}</div>
                    <div style={{ fontSize:11, color:"#64748b" }}>{att.type} · {att.size}</div>
                  </div>
                </div>
                <button style={{
                  padding:"6px 14px", borderRadius:8, cursor:"pointer", fontFamily:"inherit",
                  fontWeight:600, fontSize:12, background:"rgba(0,245,196,0.1)",
                  border:"1px solid rgba(0,245,196,0.3)", color:"#00f5c4",
                }}>⬇ Download</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
