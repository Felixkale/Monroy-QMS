"use client";
import { useState } from "react";
// import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7" };

export default function QRCodesPage() {
  const [selectedTag, setSelectedTag] = useState("");
  
  const equipmentList = [
    { tag:"PV-0041", name:"Pressure Vessel - Acme Corp" },
    { tag:"BL-0012", name:"Boiler - SteelWorks Ltd" },
    { tag:"AR-0067", name:"Air Receiver - MineOps Ltd" },
  ];

  return (
    <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0", flexDirection:"column" }}>
      <main style={{ flex:1, padding:"32px", overflowY:"auto" }}>
        <div style={{ marginBottom:28 }}>
          <h1 style={{
            fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.green})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>QR Code Generator</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Generate QR codes for equipment tracking</p>
        </div>

        <div style={{
          background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
          border:"1px solid rgba(124,92,252,0.2)", borderRadius:18,
          padding:"28px", maxWidth:600,
        }}>
          <label style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12, display:"block" }}>
            Select Equipment
          </label>
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            style={{
              width:"100%", padding:"11px 14px", marginBottom:20,
              background:"rgba(255,255,255,0.04)",
              border:"1px solid rgba(124,92,252,0.25)",
              borderRadius:10, color:"#e2e8f0",
              fontSize:13, fontFamily:"inherit", cursor:"pointer",
            }}
          >
            <option value="">Select equipment...</option>
            {equipmentList.map(e => (
              <option key={e.tag} value={e.tag}>{e.name}</option>
            ))}
          </select>

          {selectedTag && (
            <div style={{ textAlign:"center", padding:"20px", backgroundColor:"rgba(255,255,255,0.02)", borderRadius:12 }}>
              <div style={{ fontSize:14, color:"#64748b", marginBottom:8 }}>QR Code for {selectedTag}</div>
              <div style={{
                width:200, height:200, margin:"0 auto",
                background:"#fff", borderRadius:8,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:12, color:"#000",
              }}>
                [QR: {selectedTag}]
              </div>
              <button style={{
                marginTop:16, padding:"8px 16px", borderRadius:8,
                background:`linear-gradient(135deg,${C.green},${C.blue})`,
                border:"none", color:"#fff", fontWeight:600, fontSize:12,
                cursor:"pointer", fontFamily:"inherit",
              }}>⬇ Download QR Code</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
