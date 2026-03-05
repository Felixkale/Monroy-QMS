"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

const allReports = [
  {
    id:"RPT-001", title:"Q1 2026 Inspection Summary", type:"Inspection", client:"Acme Industrial Corp", date:"2026-03-05",
    status:"Completed", equipment:24, inspections:18, compliance:"98%",
    content:"Comprehensive inspection report for Q1 2026 covering all registered equipment. All inspections passed with flying colors.",
    details: { totalEquipment: 24, passedInspections: 18, failedInspections: 0, pendingInspections: 6, averageCompliance: "98%" }
  },
  {
    id:"RPT-002", title:"Equipment License Expiry Report", type:"License", client:"All Clients", date:"2026-02-28",
    status:"Completed", equipment:4, inspections:0, compliance:"N/A",
    content:"Report showing equipment with expiring or expired licenses in the next 90 days.",
    details: { expiringLicenses: 4, expiredLicenses: 2, validLicenses: 180 }
  },
  {
    id:"RPT-003", title:"NCR Analysis & Trends", type:"NCR", client:"All Clients", date:"2026-02-15",
    status:"Completed", equipment:3, inspections:0, compliance:"N/A",
    content:"Analysis of Non-Conformance Reports and trends across all clients.",
    details: { totalNCRs: 3, resolvedNCRs: 1, openNCRs: 2, averageResolutionTime: "15 days" }
  },
  {
    id:"RPT-004", title:"Certificate Compliance Report", type:"Compliance", client:"All Clients", date:"2026-02-01",
    status:"Pending", equipment:156, inspections:0, compliance:"92%",
    content:"Current status of all issued certificates and compliance with regulatory requirements.",
    details: { issuedCertificates: 156, validCertificates: 143, expiredCertificates: 13 }
  },
];

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState(allReports);
  const [filterType, setFilterType] = useState("All");
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

  const types = ["All", ...Array.from(new Set(allReports.map(r => r.type)))];
  const filtered = reports.filter(r =>
    (filterType === "All" || r.type === filterType) &&
    (r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
     r.client.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleReportClick = (id) => {
    router.push(`/reports/${id}`);
  };

  const statusColor = {
    "Completed": C.green,
    "Pending": C.yellow,
    "In Progress": C.blue,
  };

  return (
    <AppLayout>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:28 }}>
        <div>
          <h1 style={{
            fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.blue})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Reports & Analytics</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>View detailed inspection and compliance reports</p>
        </div>
        <button style={{
          padding:"10px 18px", borderRadius:12, textDecoration:"none",
          background:`linear-gradient(135deg,${C.purple},${C.blue})`,
          border:"none", color:"#fff", fontWeight:700, fontSize:13,
          boxShadow:`0 0 20px rgba(124,92,252,0.4)`, cursor:"pointer", fontFamily:"inherit",
        }}>
          📊 Generate Report
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:22 }}>
        {[
          { label:"Total Reports", value:allReports.length, color:C.blue },
          { label:"Completed", value:allReports.filter(r=>r.status==="Completed").length, color:C.green },
          { label:"Pending", value:allReports.filter(r=>r.status==="Pending").length, color:C.yellow },
          { label:"Avg Compliance", value:"93%", color:C.green },
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
          placeholder="Search reports…"
          style={{
            flex:"1 1 220px", padding:"10px 16px",
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.3)",
            borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
          }}
        />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {types.map(t=>(
            <button key={t} onClick={()=>setFilterType(t)} style={{
              padding:"8px 14px", borderRadius:20, fontSize:12, cursor:"pointer",
              fontFamily:"inherit", fontWeight:600,
              background: filterType===t ? "rgba(79,195,247,0.25)" : "rgba(255,255,255,0.04)",
              border: filterType===t ? `1px solid ${C.blue}` : "1px solid rgba(255,255,255,0.08)",
              color: filterType===t ? C.blue : "#64748b",
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
        {filtered.map(r=>(
          <div
            key={r.id}
            onClick={() => handleReportClick(r.id)}
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
                <h3 style={{ fontSize:16, fontWeight:800, color:"#fff", margin:"0 0 4px" }}>{r.title}</h3>
                <p style={{ fontSize:11, color:"#64748b", margin:0 }}>{r.id}</p>
              </div>
              <span style={{
                padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                background:`rgba(79,195,247,0.15)`, color:C.blue,
                border:`1px solid rgba(79,195,247,0.3)`,
              }}>{r.type}</span>
            </div>
            <p style={{ fontSize:12, color:"#94a3b8", margin:"0 0 12px", lineHeight:"1.5" }}>{r.content}</p>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ display:"flex", gap:12, fontSize:12 }}>
                <span style={{ color:"#64748b" }}>📅 {r.date}</span>
                <span style={{ color:"#64748b" }}>📊 {r.client}</span>
              </div>
              <span style={{
                padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                background:`rgba(${rgbaMap[statusColor[r.status]]},0.12)`, color:statusColor[r.status],
                border:`1px solid rgba(${rgbaMap[statusColor[r.status]]},0.3)`,
              }}>{r.status}</span>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
