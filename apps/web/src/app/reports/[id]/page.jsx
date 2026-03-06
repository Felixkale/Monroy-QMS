"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabaseClient";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7" };
const rgbaMap = { [C.green]:"0,245,196", [C.blue]:"79,195,247", [C.purple]:"124,92,252" };

const mockReports = {
  "RPT-001": {
    id:"RPT-001",
    title:"Q1 2026 Inspection Summary",
    date:"2026-03-05",
    type:"Inspection",
    summary:"Comprehensive inspection report for Q1 2026 covering all registered equipment.",
    stats:[
      { label:"Total Inspections", value:38, color:C.blue },
      { label:"Pass Rate", value:"95.2%", color:C.green },
      { label:"NCRs Raised", value:7, color:C.purple },
    ],
  },
};

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id;
    const rpt = mockReports[id];
    if (rpt) {
      setReport(rpt);
    }
    setLoading(false);
  }, [params.id]);

  if (loading) {
    return (
      <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0" }}>
        <main style={{ flex:1, padding:"40px" }}>Loading...</main>
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0" }}>
        <main style={{ flex:1, padding:"40px", textAlign:"center" }}>
          <h2 style={{ color:"#fff" }}>Report Not Found</h2>
          <button onClick={() => router.push("/reports")} style={{
            marginTop:"20px", padding:"10px 20px",
            backgroundColor:"#667eea", color:"white", border:"none",
            borderRadius:"6px", cursor:"pointer", fontFamily:"inherit",
          }}>Back to Reports</button>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0", flexDirection:"column" }}>
      <main style={{ flex:1, padding:"32px", overflowY:"auto" }}>
        <div style={{ marginBottom:28 }}>
          <a href="/reports" style={{ color:"#64748b", fontSize:13, textDecoration:"none", marginBottom:10, display:"block" }}>← Back to Reports</a>
          <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:"0 0 8px", color:"#fff" }}>
            {report.title}
          </h1>
          <p style={{ color:"#64748b", margin:0, fontSize:13 }}>{report.date} · {report.type}</p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12, marginBottom:28 }}>
          {report.stats.map(s => (
            <div key={s.label} style={{
              background:`rgba(${rgbaMap[s.color]},0.07)`,
              border:`1px solid rgba(${rgbaMap[s.color]},0.25)`,
              borderRadius:14, padding:"16px 18px",
            }}>
              <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
              <div style={{ fontSize:24, fontWeight:900, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{
          background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
          border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, padding:"20px", marginBottom:20,
        }}>
          <h2 style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:12 }}>Summary</h2>
          <p style={{ color:"#cbd5e1", fontSize:13, lineHeight:1.6, margin:0 }}>{report.summary}</p>
        </div>

        <div style={{ display:"flex", gap:12 }}>
          <button style={{
            padding:"11px 22px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700,
            background:`linear-gradient(135deg,${C.green},${C.blue})`,
            border:"none", color:"#0d0d1a", boxShadow:`0 0 20px rgba(0,245,196,0.4)`,
          }}>⬇ Download PDF</button>
          <button onClick={() => window.print()} style={{
            padding:"11px 22px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700,
            background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8",
          }}>🖨️ Print</button>
        </div>
      </main>
    </div>
  );
}
