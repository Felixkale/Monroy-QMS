"use client";
import { useState } from "react";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7" };

const inputStyle = {
  width:"100%", padding:"11px 14px",
  background:"rgba(255,255,255,0.04)",
  border:"1px solid rgba(124,92,252,0.25)",
  borderRadius:10, color:"#e2e8f0",
  fontSize:13, fontFamily:"inherit", outline:"none",
};

const labelStyle = {
  fontSize:11, fontWeight:700, color:"#64748b",
  textTransform:"uppercase", letterSpacing:"0.08em",
  marginBottom:6, display:"block",
};

export default function ExportReportPage() {
  const [formData, setFormData] = useState({
    reportType:"Inspection",
    startDate:"",
    endDate:"",
    client:"All",
    format:"PDF",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0", alignItems:"center", justifyContent:"center", padding:"20px" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:64, marginBottom:20 }}>✅</div>
          <h2 style={{ fontSize:28, fontWeight:900, color:"#fff", marginBottom:10 }}>Report Generated</h2>
          <p style={{ color:"#64748b", marginBottom:20 }}>Your {formData.reportType} report has been created</p>
          <button onClick={() => setSubmitted(false)} style={{
            padding:"11px 24px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700,
            background:`linear-gradient(135deg,${C.purple},${C.blue})`,
            border:"none", color:"#fff", boxShadow:`0 0 20px rgba(124,92,252,0.4)`,
          }}>⬇ Download Report</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0", flexDirection:"column" }}>
      <main style={{ flex:1, padding:"32px", overflowY:"auto" }}>
        <div style={{ marginBottom:28 }}>
          <h1 style={{
            fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.blue})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Generate Report</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Create custom reports from QMS data</p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
          border:"1px solid rgba(124,92,252,0.2)", borderRadius:18,
          padding:"28px", maxWidth:600,
        }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))", gap:16, marginBottom:24 }}>
            <div>
              <label style={labelStyle}>Report Type *</label>
              <select style={{...inputStyle, cursor:"pointer"}} name="reportType" value={formData.reportType} onChange={handleChange}>
                <option>Inspection</option>
                <option>Compliance</option>
                <option>NCR</option>
                <option>Equipment</option>
                <option>License</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Format *</label>
              <select style={{...inputStyle, cursor:"pointer"}} name="format" value={formData.format} onChange={handleChange}>
                <option>PDF</option>
                <option>Excel</option>
                <option>CSV</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Start Date</label>
              <input style={inputStyle} type="date" name="startDate" value={formData.startDate} onChange={handleChange} />
            </div>

            <div>
              <label style={labelStyle}>End Date</label>
              <input style={inputStyle} type="date" name="endDate" value={formData.endDate} onChange={handleChange} />
            </div>

            <div>
              <label style={labelStyle}>Client</label>
              <select style={{...inputStyle, cursor:"pointer"}} name="client" value={formData.client} onChange={handleChange}>
                <option>All</option>
                <option>Acme Corp</option>
                <option>SteelWorks Ltd</option>
                <option>MineOps Ltd</option>
              </select>
            </div>
          </div>

          <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
            <button type="button" onClick={() => window.history.back()} style={{
              padding:"11px 24px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700,
              background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8",
            }}>Cancel</button>
            <button type="submit" style={{
              padding:"11px 28px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700,
              background:`linear-gradient(135deg,${C.purple},${C.blue})`,
              border:"none", color:"#fff", boxShadow:`0 0 20px rgba(124,92,252,0.4)`,
            }}>Generate Report</button>
          </div>
        </form>
      </main>
    </div>
  );
}
