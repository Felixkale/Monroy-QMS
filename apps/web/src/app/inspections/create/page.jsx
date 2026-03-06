"use client";
import { useState } from "react";
// import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };

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

export default function CreateInspectionPage() {
  const [formData, setFormData] = useState({
    equipmentTag: "",
    inspectionDate: "",
    inspectorName: "",
    result: "Pass",
    notes: "",
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
          <h2 style={{ fontSize:28, fontWeight:900, color:"#fff", marginBottom:10 }}>Inspection Created</h2>
          <p style={{ color:"#64748b", marginBottom:20 }}>Inspection for {formData.equipmentTag} has been recorded</p>
          <button onClick={() => setSubmitted(false)} style={{
            padding:"11px 24px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700,
            background:`linear-gradient(135deg,${C.purple},${C.blue})`,
            border:"none", color:"#fff", boxShadow:`0 0 20px rgba(124,92,252,0.4)`,
          }}>Create Another</button>
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
            background:`linear-gradient(90deg,#fff 30%,${C.green})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Create Inspection</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Record a new inspection for equipment</p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
          border:"1px solid rgba(124,92,252,0.2)", borderRadius:18,
          padding:"28px", maxWidth:600,
        }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))", gap:16, marginBottom:24 }}>
            <div>
              <label style={labelStyle}>Equipment Tag *</label>
              <input style={inputStyle} type="text" name="equipmentTag" placeholder="e.g. PV-0041" value={formData.equipmentTag} onChange={handleChange} required />
            </div>
            <div>
              <label style={labelStyle}>Inspection Date *</label>
              <input style={inputStyle} type="date" name="inspectionDate" value={formData.inspectionDate} onChange={handleChange} required />
            </div>
            <div>
              <label style={labelStyle}>Inspector Name *</label>
              <input style={inputStyle} type="text" name="inspectorName" placeholder="Full name" value={formData.inspectorName} onChange={handleChange} required />
            </div>
            <div>
              <label style={labelStyle}>Result *</label>
              <select style={{...inputStyle, cursor:"pointer"}} name="result" value={formData.result} onChange={handleChange}>
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
                <option value="Conditional Pass">Conditional Pass</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom:24 }}>
            <label style={labelStyle}>Notes & Observations</label>
            <textarea style={{...inputStyle, minHeight:100, resize:"vertical"}} name="notes" placeholder="Any observations or notes..." value={formData.notes} onChange={handleChange} />
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
            }}>Create Inspection</button>
          </div>
        </form>
      </main>
    </div>
  );
}
