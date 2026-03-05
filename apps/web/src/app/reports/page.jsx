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
];

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState(allReports);
  const [filterType, setFilterType] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [formData, setFormData] = useState({ reportType: "inspection", clientFilter: "all" });

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

  async function handleGenerateReport() {
    setGenerating(true);

    try {
      const newReport = {
        id: `RPT-${String(reports.length + 1).padStart(3, '0')}`,
        title: `Generated ${formData.reportType} Report - ${new Date().toLocaleDateString()}`,
        type: formData.reportType === "inspection" ? "Inspection" : formData.reportType === "license" ? "License" : "Compliance",
        client: formData.clientFilter === "all" ? "All Clients" : "Acme Industrial Corp",
        date: new Date().toISOString().split('T')[0],
        status: "Completed",
        equipment: Math.floor(Math.random() * 50) + 10,
        inspections: Math.floor(Math.random() * 30) + 5,
        compliance: Math.floor(Math.random() * 30) + 70 + "%",
        content: "Report generated successfully. This report contains comprehensive analysis based on current data.",
        details: {
          totalEquipment: Math.floor(Math.random() * 50) + 10,
          passedInspections: Math.floor(Math.random() * 25) + 5,
          failedInspections: Math.floor(Math.random() * 5),
          pendingInspections: Math.floor(Math.random() * 10),
          averageCompliance: Math.floor(Math.random() * 30) + 70 + "%"
        }
      };

      setReports([newReport, ...reports]);
      setShowGenerateForm(false);
      setFormData({ reportType: "inspection", clientFilter: "all" });
      alert("✅ Report generated successfully!");
    } catch (error) {
      alert("Error generating report: " + error.message);
    } finally {
      setGenerating(false);
    }
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
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        flexWrap:"wrap", gap:"1rem", marginBottom:"2rem"
      }}>
        <div>
          <h1 style={{
            fontSize:"clamp(20px,5vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.blue})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Reports & Analytics</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>View detailed inspection and compliance reports</p>
        </div>
        <button onClick={() => setShowGenerateForm(!showGenerateForm)} style={{
          padding:"10px 18px", borderRadius:12,
          background:`linear-gradient(135deg,${C.purple},${C.blue})`,
          border:"none", color:"#fff", fontWeight:700, fontSize:"clamp(11px,2vw,13px)",
          boxShadow:`0 0 20px rgba(124,92,252,0.4)`, cursor:"pointer", fontFamily:"inherit",
          whiteSpace:"nowrap",
        }}>
          📊 {showGenerateForm ? "Cancel" : "Generate Report"}
        </button>
      </div>

      {/* Generate Report Form */}
      {showGenerateForm && (
        <div style={{
          background:"rgba(124,92,252,0.1)", border:"1px solid rgba(124,92,252,0.3)",
          borderRadius:16, padding:"clamp(16px,4vw,20px)", marginBottom:"2rem",
        }}>
          <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 16px", color:"#fff" }}>Create New Report</h3>
          <div style={{
            display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:"1rem", marginBottom:"1rem"
          }}>
            <div>
              <label style={{
                display:"block", fontSize:11, fontWeight:700, color:"#64748b",
                textTransform:"uppercase", marginBottom:6
              }}>Report Type</label>
              <select value={formData.reportType} onChange={e=>setFormData({...formData, reportType: e.target.value})} style={{
                width:"100%", padding:"10px 12px", background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(124,92,252,0.25)", borderRadius:10, color:"#e2e8f0",
                fontSize:13, fontFamily:"inherit", cursor:"pointer",
              }}>
                <option value="inspection">Inspection Report</option>
                <option value="license">License Status Report</option>
                <option value="compliance">Compliance Report</option>
              </select>
            </div>
            <div>
              <label style={{
                display:"block", fontSize:11, fontWeight:700, color:"#64748b",
                textTransform:"uppercase", marginBottom:6
              }}>Filter by Client</label>
              <select value={formData.clientFilter} onChange={e=>setFormData({...formData, clientFilter: e.target.value})} style={{
                width:"100%", padding:"10px 12px", background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(124,92,252,0.25)", borderRadius:10, color:"#e2e8f0",
                fontSize:13, fontFamily:"inherit", cursor:"pointer",
              }}>
                <option value="all">All Clients</option>
                <option value="acme">Acme Industrial Corp</option>
                <option value="steelworks">SteelWorks Ltd</option>
              </select>
            </div>
          </div>
          <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
            <button onClick={handleGenerateReport} disabled={generating} style={{
              padding:"10px 20px", borderRadius:10, cursor:generating?"not-allowed":"pointer",
              background:`linear-gradient(135deg,${C.green},${C.blue})`, border:"none",
              color:"#fff", fontWeight:700, fontSize:12, fontFamily:"inherit", opacity:generating?0.6:1,
            }}>
              {generating ? "Generating..." : "✓ Generate"}
            </button>
            <button onClick={() => setShowGenerateForm(false)} style={{
              padding:"10px 20px", borderRadius:10, cursor:"pointer",
              background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
              color:"#94a3b8", fontWeight:700, fontSize:12, fontFamily:"inherit",
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{
        display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:"0.75rem", marginBottom:"1.5rem"
      }}>
        {[
          { label:"Total Reports", value:allReports.length, color:C.blue },
          { label:"Completed", value:allReports.filter(r=>r.status==="Completed").length, color:C.green },
          { label:"Pending", value:allReports.filter(r=>r.status==="Pending").length, color:C.yellow },
          { label:"Avg Compliance", value:"93%", color:C.green },
        ].map(s=>(
          <div key={s.label} style={{
            background:`rgba(${rgbaMap[s.color]||"100,116,139"},0.07)`,
            border:`1px solid rgba(${rgbaMap[s.color]||"100,116,139"},0.25)`,
            borderRadius:14, padding:"12px 14px",
          }}>
            <div style={{ fontSize:9, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:"clamp(14px,3vw,22px)", fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap", marginBottom:"1rem" }}>
        <input
          value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
          placeholder="Search reports…"
          style={{
            flex:"1 1 220px", padding:"10px 14px", minWidth:0,
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.3)",
            borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
          }}
        />
        <div style={{ display:"flex", gap:"0.4rem", flexWrap:"wrap" }}>
          {types.map(t=>(
            <button key={t} onClick={()=>setFilterType(t)} style={{
              padding:"8px 12px", borderRadius:20, fontSize:"clamp(10px,2vw,12px)", cursor:"pointer",
              fontFamily:"inherit", fontWeight:600, whiteSpace:"nowrap",
              background: filterType===t ? "rgba(79,195,247,0.25)" : "rgba(255,255,255,0.04)",
              border: filterType===t ? `1px solid ${C.blue}` : "1px solid rgba(255,255,255,0.08)",
              color: filterType===t ? C.blue : "#64748b",
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Reports Grid */}
      <div style={{
        display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:"1rem"
      }}>
        {filtered.map(r=>(
          <div
            key={r.id}
            onClick={() => handleReportClick(r.id)}
            style={{
              background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
              border:"1px solid rgba(79,195,247,0.25)",
              borderRadius:14, padding:"1.25rem",
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
              <div style={{ minWidth:0 }}>
                <h3 style={{ fontSize:"clamp(12px,3vw,16px)", fontWeight:800, color:"#fff", margin:"0 0 4px", wordBreak:"break-word" }}>{r.title}</h3>
                <p style={{ fontSize:11, color:"#64748b", margin:0 }}>{r.id}</p>
              </div>
              <span style={{
                padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:700, flexShrink:0, marginLeft:"0.5rem",
                background:`rgba(79,195,247,0.15)`, color:C.blue,
                border:`1px solid rgba(79,195,247,0.3)`,
              }}>{r.type}</span>
            </div>
            <p style={{ fontSize:"clamp(11px,2vw,12px)", color:"#94a3b8", margin:"0 0 12px", lineHeight:"1.5" }}>{r.content}</p>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem", paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ display:"flex", gap:"0.75rem", fontSize:"clamp(10px,2vw,11px)", flexWrap:"wrap" }}>
                <span style={{ color:"#64748b" }}>📅 {r.date}</span>
              </div>
              <span style={{
                padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:700, flexShrink:0,
                background:`rgba(${rgbaMap[statusColor[r.status]]},0.12)`, color:statusColor[r.status],
                border:`1px solid rgba(${rgbaMap[statusColor[r.status]]},0.3)`,
              }}>{r.status}</span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          h1 { font-size: 20px !important; }
          button { font-size: 11px !important; }
        }
      `}</style>
    </AppLayout>
  );
}
