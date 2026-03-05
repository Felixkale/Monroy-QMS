"use client";
import { useState } from "react";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

const reportTypes = [
  {
    id:"inspection-performance",
    title:"Inspection Performance Report",
    desc:"All inspections by period, inspector, result and trends.",
    icon:"🔍", color:C.purple,
    filters:["dateFrom","dateTo","inspector","client"],
  },
  {
    id:"equipment-compliance",
    title:"Equipment Compliance Report",
    desc:"Per-equipment compliance status, license validity, overdue alerts.",
    icon:"⚙️", color:C.green,
    filters:["client","equipmentType","licenseStatus"],
  },
  {
    id:"client-inspection",
    title:"Client Inspection Report",
    desc:"Client-specific inspection history and certification status.",
    icon:"🏢", color:C.blue,
    filters:["client","dateFrom","dateTo"],
  },
  {
    id:"ncr-statistics",
    title:"NCR Statistics Report",
    desc:"NCR trends, severity analysis and root cause summary.",
    icon:"⚠️", color:C.yellow,
    filters:["dateFrom","dateTo","severity"],
  },
  {
    id:"certification-status",
    title:"Certification Status Report",
    desc:"All certificate validity, expiry tracking and renewal pipeline.",
    icon:"📜", color:C.pink,
    filters:["client","status"],
  },
  {
    id:"equipment-register",
    title:"Equipment Register Export",
    desc:"Full asset register with nameplate data and QR references.",
    icon:"📋", color:C.blue,
    filters:["client","equipmentType"],
  },
  {
    id:"equipment-passport",
    title:"Equipment Passport",
    desc:"Single equipment full history, nameplate, certs and inspections.",
    icon:"🪪", color:C.green,
    filters:["equipmentTag"],
  },
];

const inputStyle = {
  width:"100%", padding:"10px 14px",
  background:"rgba(255,255,255,0.04)",
  border:"1px solid rgba(124,92,252,0.25)",
  borderRadius:10, color:"#e2e8f0",
  fontSize:13, fontFamily:"inherit", outline:"none",
};
const selectStyle = { ...inputStyle, cursor:"pointer" };
const labelStyle = {
  fontSize:11, fontWeight:700, color:"#64748b",
  textTransform:"uppercase", letterSpacing:"0.08em",
  marginBottom:5, display:"block",
};

export default function ExportReportPage() {
  const [selected,    setSelected]    = useState(null);
  const [format,      setFormat]      = useState("PDF");
  const [generating,  setGenerating]  = useState(false);
  const [done,        setDone]        = useState(false);
  const [filters,     setFilters]     = useState({
    dateFrom:"", dateTo:"", inspector:"", client:"",
    equipmentType:"", licenseStatus:"", severity:"",
    status:"", equipmentTag:"",
  });

  const setF = (k,v) => setFilters(f=>({...f,[k]:v}));

  const selectedReport = reportTypes.find(r=>r.id===selected);

  function handleGenerate() {
    setGenerating(true);
    setTimeout(()=>{ setGenerating(false); setDone(true); }, 2200);
  }

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
          <a href="/reports" style={{ color:"#64748b", fontSize:13, textDecoration:"none" }}>Reports</a>
          <span style={{ color:"#475569" }}>›</span>
          <span style={{ color:"#e2e8f0", fontSize:13 }}>Export Report</span>
        </div>
        <h1 style={{
          fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
          background:`linear-gradient(90deg,#fff 30%,${C.pink})`,
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}>Export Report</h1>
        <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Select a report type and configure filters</p>
      </div>

      {/* Restriction Notice */}
      <div style={{
        padding:"12px 18px", borderRadius:12, marginBottom:24,
        background:"rgba(79,195,247,0.06)", border:"1px solid rgba(79,195,247,0.18)",
        fontSize:13, color:"#94a3b8", display:"flex", alignItems:"center", gap:10,
      }}>
        <span style={{ fontSize:16 }}>ℹ️</span>
        <span>Exports are available in <strong style={{ color:C.blue }}>PDF</strong> and <strong style={{ color:C.blue }}>Word (.docx)</strong> format only. No Excel or CSV exports are available in this system.</span>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:24, alignItems:"start" }}>

        {/* Report Type Grid */}
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14 }}>
            Select Report Type
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:10 }}>
            {reportTypes.map(r=>(
              <div key={r.id} onClick={()=>{ setSelected(r.id); setDone(false); }} style={{
                padding:"16px 18px", borderRadius:14, cursor:"pointer",
                background: selected===r.id ? `rgba(${rgbaMap[r.color]},0.1)` : "rgba(255,255,255,0.03)",
                border: selected===r.id ? `2px solid rgba(${rgbaMap[r.color]},0.5)` : "2px solid rgba(255,255,255,0.06)",
                transition:"all 0.2s",
                position:"relative", overflow:"hidden",
              }}>
                {selected===r.id && (
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
                    background:`linear-gradient(90deg,${r.color},transparent)` }}/>
                )}
                <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                  <div style={{
                    width:36, height:36, borderRadius:10, fontSize:18, flexShrink:0,
                    background:`rgba(${rgbaMap[r.color]},0.12)`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>{r.icon}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color: selected===r.id ? "#fff" : "#94a3b8", marginBottom:3 }}>{r.title}</div>
                    <div style={{ fontSize:11, color:"#475569", lineHeight:1.4 }}>{r.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Config Panel */}
        <div style={{
          background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
          border:"1px solid rgba(124,92,252,0.2)", borderRadius:18,
          padding:"24px",
          position:"sticky", top:20,
        }}>
          {!selectedReport ? (
            <div style={{ textAlign:"center", padding:"40px 0" }}>
              <div style={{ fontSize:36, marginBottom:10, opacity:0.3 }}>📄</div>
              <div style={{ fontSize:13, color:"#475569" }}>Select a report type to configure</div>
            </div>
          ) : (
            <>
              {/* Report Info */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
                <div style={{
                  width:40, height:40, borderRadius:12, fontSize:20,
                  background:`rgba(${rgbaMap[selectedReport.color]},0.12)`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>{selectedReport.icon}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:"#fff" }}>{selectedReport.title}</div>
                  <div style={{ fontSize:11, color:"#64748b" }}>{selectedReport.desc}</div>
                </div>
              </div>

              {/* Format Selector */}
              <div style={{ marginBottom:20 }}>
                <label style={labelStyle}>Export Format</label>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {["PDF","Word"].map(f=>(
                    <button key={f} onClick={()=>setFormat(f)} style={{
                      padding:"12px", borderRadius:10, cursor:"pointer", fontFamily:"inherit", fontWeight:700, fontSize:13,
                      background: format===f
                        ? f==="PDF" ? "rgba(244,114,182,0.15)" : "rgba(79,195,247,0.15)"
                        : "rgba(255,255,255,0.04)",
                      border: format===f
                        ? `2px solid ${f==="PDF"?C.pink:C.blue}`
                        : "2px solid rgba(255,255,255,0.08)",
                      color: format===f ? (f==="PDF"?C.pink:C.blue) : "#64748b",
                    }}>
                      {f==="PDF"?"📄 PDF":"📝 Word (.docx)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Filters */}
              <div style={{ marginBottom:20 }}>
                <label style={labelStyle}>Filters</label>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {selectedReport.filters.includes("dateFrom") && (
                    <div>
                      <label style={{ ...labelStyle, fontSize:10 }}>Date From</label>
                      <input type="date" style={inputStyle} value={filters.dateFrom} onChange={e=>setF("dateFrom",e.target.value)}/>
                    </div>
                  )}
                  {selectedReport.filters.includes("dateTo") && (
                    <div>
                      <label style={{ ...labelStyle, fontSize:10 }}>Date To</label>
                      <input type="date" style={inputStyle} value={filters.dateTo} onChange={e=>setF("dateTo",e.target.value)}/>
                    </div>
                  )}
                  {selectedReport.filters.includes("client") && (
                    <div>
                      <label style={{ ...labelStyle, fontSize:10 }}>Client</label>
                      <select style={selectStyle} value={filters.client} onChange={e=>setF("client",e.target.value)}>
                        <option value="">All clients</option>
                        {["Acme Industrial Corp","SteelWorks Ltd","TechPlant Inc","MineOps Ltd","Cargo Hub","Delta Refineries","SafePort Holdings"].map(c=>(
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {selectedReport.filters.includes("inspector") && (
                    <div>
                      <label style={{ ...labelStyle, fontSize:10 }}>Inspector</label>
                      <select style={selectStyle} value={filters.inspector} onChange={e=>setF("inspector",e.target.value)}>
                        <option value="">All inspectors</option>
                        {["John Smith","Sarah Johnson","Michael Chen","Emily Davis"].map(i=>(
                          <option key={i} value={i}>{i}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {selectedReport.filters.includes("equipmentType") && (
                    <div>
                      <label style={{ ...labelStyle, fontSize:10 }}>Equipment Type</label>
                      <select style={selectStyle} value={filters.equipmentType} onChange={e=>setF("equipmentType",e.target.value)}>
                        <option value="">All types</option>
                        {["Pressure Vessel","Boiler","Air Receiver","Compressor","Lifting Equipment","Storage Tank"].map(t=>(
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {selectedReport.filters.includes("licenseStatus") && (
                    <div>
                      <label style={{ ...labelStyle, fontSize:10 }}>License Status</label>
                      <select style={selectStyle} value={filters.licenseStatus} onChange={e=>setF("licenseStatus",e.target.value)}>
                        <option value="">All statuses</option>
                        <option>Valid</option><option>Expiring</option><option>Expired</option>
                      </select>
                    </div>
                  )}
                  {selectedReport.filters.includes("severity") && (
                    <div>
                      <label style={{ ...labelStyle, fontSize:10 }}>NCR Severity</label>
                      <select style={selectStyle} value={filters.severity} onChange={e=>setF("severity",e.target.value)}>
                        <option value="">All severities</option>
                        <option>Critical</option><option>Major</option><option>Minor</option>
                      </select>
                    </div>
                  )}
                  {selectedReport.filters.includes("status") && (
                    <div>
                      <label style={{ ...labelStyle, fontSize:10 }}>Certificate Status</label>
                      <select style={selectStyle} value={filters.status} onChange={e=>setF("status",e.target.value)}>
                        <option value="">All</option>
                        <option>Valid</option><option>Expiring</option><option>Expired</option>
                      </select>
                    </div>
                  )}
                  {selectedReport.filters.includes("equipmentTag") && (
                    <div>
                      <label style={{ ...labelStyle, fontSize:10 }}>Equipment Tag</label>
                      <input style={inputStyle} placeholder="e.g. PV-0041" value={filters.equipmentTag} onChange={e=>setF("equipmentTag",e.target.value)}/>
                    </div>
                  )}
                </div>
              </div>

              {/* Generate Button */}
              {!done ? (
                <button onClick={handleGenerate} disabled={generating} style={{
                  width:"100%", padding:"13px",
                  borderRadius:12, cursor: generating?"default":"pointer",
                  fontFamily:"inherit", fontWeight:700, fontSize:14,
                  background: generating
                    ? "rgba(255,255,255,0.06)"
                    : `linear-gradient(135deg,${format==="PDF"?C.pink:C.blue},${C.purple})`,
                  border:"none",
                  color: generating ? "#475569" : "#fff",
                  boxShadow: generating ? "none" : `0 0 24px rgba(${format==="PDF"?"244,114,182":"79,195,247"},0.4)`,
                  transition:"all 0.3s",
                }}>
                  {generating
                    ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                        <span style={{ display:"inline-block", animation:"spin 1s linear infinite" }}>⏳</span>
                        Generating {format}…
                      </span>
                    : `⬇ Generate ${format} Report`
                  }
                </button>
              ) : (
                <div>
                  <div style={{
                    padding:"14px", borderRadius:12, textAlign:"center",
                    background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.25)",
                    marginBottom:10,
                  }}>
                    <div style={{ fontSize:20, marginBottom:4 }}>✅</div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.green }}>Report Ready</div>
                    <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{selectedReport.title} · {format}</div>
                  </div>
                  <button style={{
                    width:"100%", padding:"11px", borderRadius:12, cursor:"pointer",
                    fontFamily:"inherit", fontWeight:700, fontSize:13,
                    background: format==="PDF" ? "rgba(244,114,182,0.15)" : "rgba(79,195,247,0.15)",
                    border: `1px solid ${format==="PDF"?C.pink:C.blue}`,
                    color: format==="PDF" ? C.pink : C.blue,
                  }}>⬇ Download {format}</button>
                  <button onClick={()=>setDone(false)} style={{
                    width:"100%", marginTop:8, padding:"9px", borderRadius:12, cursor:"pointer",
                    fontFamily:"inherit", fontWeight:600, fontSize:12,
                    background:"transparent", border:"1px solid rgba(255,255,255,0.08)", color:"#64748b",
                  }}>Generate Another</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .export-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AppLayout>
  );
}
