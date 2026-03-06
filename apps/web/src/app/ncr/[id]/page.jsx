"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196", [C.blue]:"79,195,247", [C.purple]:"124,92,252", [C.pink]:"244,114,182", [C.yellow]:"251,191,36" };

const mockNCRs = {
  "NCR-001": {
    id:"NCR-001",
    equipment:"BL-0012",
    severity:"Major",
    status:"Open",
    date:"2026-02-28",
    description:"Corrosion detected on boiler shell",
    details:"Surface corrosion found during routine inspection. Recommend repair within 30 days.",
  },
};

export default function NCRDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [ncr, setNCR] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id;
    const item = mockNCRs[id];
    if (item) {
      setNCR(item);
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

  if (!ncr) {
    return (
      <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0" }}>
        <main style={{ flex:1, padding:"40px", textAlign:"center" }}>
          <h2 style={{ color:"#fff" }}>NCR Not Found</h2>
          <button onClick={() => router.push("/ncr")} style={{
            marginTop:"20px", padding:"10px 20px",
            backgroundColor:"#667eea", color:"white", border:"none",
            borderRadius:"6px", cursor:"pointer", fontFamily:"inherit",
          }}>Back to NCRs</button>
        </main>
      </div>
    );
  }

  const severityColor = { Critical:C.pink, Major:C.yellow, Minor:C.blue };
  const statusColor = { Open:C.pink, Closed:C.green, "In Progress":C.yellow };

  return (
    <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0", flexDirection:"column" }}>
      <main style={{ flex:1, padding:"32px", overflowY:"auto" }}>
        <div style={{ marginBottom:28 }}>
          <a href="/ncr" style={{ color:"#64748b", fontSize:13, textDecoration:"none", marginBottom:10, display:"block" }}>← Back to NCRs</a>
          <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:"0 0 8px", color:"#fff" }}>
            {ncr.id}
          </h1>
          <p style={{ color:"#64748b", margin:0, fontSize:13 }}>{ncr.equipment} · {ncr.date}</p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12, marginBottom:28 }}>
          {[
            { label:"Severity", value:ncr.severity, color:severityColor[ncr.severity] },
            { label:"Status", value:ncr.status, color:statusColor[ncr.status] },
            { label:"Date", value:ncr.date, color:C.blue },
          ].map(s => (
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
          <h2 style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:12 }}>Description</h2>
          <p style={{ color:"#cbd5e1", fontSize:13, lineHeight:1.6, margin:0 }}>{ncr.description}</p>
        </div>

        <div style={{
          background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
          border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, padding:"20px",
        }}>
          <h2 style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:12 }}>Details</h2>
          <p style={{ color:"#cbd5e1", fontSize:13, lineHeight:1.6, margin:0 }}>{ncr.details}</p>
        </div>
      </main>
    </div>
  );
}
