"use client";
import { useState } from "react";
// import { supabase } from "@/lib/supabaseClient";
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

export default function RegisterEquipmentPage() {
  const [formData, setFormData] = useState({
    tag: "",
    serial: "",
    type: "Pressure Vessel",
    manufacturer: "",
    model: "",
    client: "",
    location: "",
    year: new Date().getFullYear(),
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // try {
    //   const { data, error } = await supabase
    //     .from("equipment")
    //     .insert([formData]);
    //   if (error) throw error;
    //   setSubmitted(true);
    // } catch (error) {
    //   alert("Error: " + error.message);
    // }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0", alignItems:"center", justifyContent:"center", padding:"20px" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:64, marginBottom:20 }}>✅</div>
          <h2 style={{ fontSize:28, fontWeight:900, color:"#fff", marginBottom:10 }}>Equipment Registered</h2>
          <p style={{ color:"#64748b", marginBottom:20 }}>{formData.tag} has been added to the system</p>
          <button onClick={() => setSubmitted(false)} style={{
            padding:"11px 24px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:700,
            background:`linear-gradient(135deg,${C.purple},${C.blue})`,
            border:"none", color:"#fff", boxShadow:`0 0 20px rgba(124,92,252,0.4)`,
          }}>Register Another</button>
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
          }}>Register Equipment</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Add new equipment to the asset register</p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
          border:"1px solid rgba(124,92,252,0.2)", borderRadius:18,
          padding:"28px", maxWidth:800,
        }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:24 }}>
            <div>
              <label style={labelStyle}>Equipment Tag *</label>
              <input style={inputStyle} type="text" name="tag" placeholder="e.g. PV-0042" value={formData.tag} onChange={handleChange} required />
            </div>
            <div>
              <label style={labelStyle}>Serial Number *</label>
              <input style={inputStyle} type="text" name="serial" placeholder="e.g. S-10042" value={formData.serial} onChange={handleChange} required />
            </div>
            <div>
              <label style={labelStyle}>Equipment Type *</label>
              <select style={{...inputStyle, cursor:"pointer"}} name="type" value={formData.type} onChange={handleChange}>
                <option>Pressure Vessel</option>
                <option>Boiler</option>
                <option>Air Receiver</option>
                <option>Lifting Equip</option>
                <option>Compressor</option>
                <option>Storage Tank</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Manufacturer *</label>
              <input style={inputStyle} type="text" name="manufacturer" placeholder="e.g. ASME Corp" value={formData.manufacturer} onChange={handleChange} required />
            </div>
            <div>
              <label style={labelStyle}>Model</label>
              <input style={inputStyle} type="text" name="model" placeholder="Equipment model" value={formData.model} onChange={handleChange} />
            </div>
            <div>
              <label style={labelStyle}>Client *</label>
              <input style={inputStyle} type="text" name="client" placeholder="Client name" value={formData.client} onChange={handleChange} required />
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              <input style={inputStyle} type="text" name="location" placeholder="e.g. Plant A - Bay 3" value={formData.location} onChange={handleChange} />
            </div>
            <div>
              <label style={labelStyle}>Year Built</label>
              <input style={inputStyle} type="number" name="year" placeholder="2024" value={formData.year} onChange={handleChange} />
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
            }}>Register Equipment</button>
          </div>
        </form>
      </main>
    </div>
  );
}
