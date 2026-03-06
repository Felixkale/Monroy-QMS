"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabaseClient";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6" };
const rgbaMap = { [C.green]:"0,245,196", [C.blue]:"79,195,247", [C.purple]:"124,92,252", [C.pink]:"244,114,182" };

const mockReports = [
  { id:"RPT-001", title:"Q1 2026 Inspection Summary", date:"2026-03-05", type:"Inspection", client:"All" },
  { id:"RPT-002", title:"Equipment License Audit", date:"2026-02-28", type:"Compliance", client:"All" },
  { id:"RPT-003", title:"NCR Analysis Report", date:"2026-02-20", type:"Analysis", client:"All" },
];

export default function ReportsPage() {
  const router = useRouter();
  const [reports] = useState(mockReports);

  return (
    <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0", flexDirection:"column" }}>
      <main style={{ flex:1, padding:"32px", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:28 }}>
          <div>
            <h1 style={{
              fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
              background:`linear-gradient(90deg,#fff 30%,${C.blue})`,
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            }}>Reports</h1>
            <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>View and download QMS reports</p>
          </div>
          <button onClick={() => router.push("/reports/export")} style={{
            padding:"10px 18px", borderRadius:12,
            background:`linear-gradient(135deg,${C.purple},${C.blue})`,
            border:"none", color:"#fff", fontWeight:700, fontSize:13,
            boxShadow:`0 0 20px rgba(124,92,252,0.4)`, cursor:"pointer", fontFamily:"inherit",
          }}>+ Generate Report</button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
          {reports.map(report => (
            <div
              key={report.id}
              onClick={() => router.push(`/reports/${report.id}`)}
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
                  <div style={{ fontSize:16, fontWeight:800, color:"#fff" }}>{report.id}</div>
                  <div style={{ fontSize:11, color:"#64748b" }}>{report.date}</div>
                </div>
                <span style={{
                  padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                  background:`rgba(${rgbaMap[C.blue]},0.15)`,
                  color:C.blue,
                  border:`1px solid rgba(${rgbaMap[C.blue]},0.3)`,
                }}>{report.type}</span>
              </div>
              <div style={{ fontSize:13, color:"#e2e8f0", marginBottom:8 }}>{report.title}</div>
              <div style={{ fontSize:12, color:"#64748b" }}>Client: {report.client}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
