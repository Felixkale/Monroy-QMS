"use client";
import { useState, useEffect } from "react";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196", [C.blue]:"79,195,247", [C.purple]:"124,92,252", [C.pink]:"244,114,182", [C.yellow]:"251,191,36" };

const mockData = [
  { id:1, equipment:"PV-0041", lastInspection:"2026-03-05", nextInspection:"2026-06-01", status:"Active" },
  { id:2, equipment:"BL-0012", lastInspection:"2026-02-28", nextInspection:"2026-05-28", status:"Active" },
  { id:3, equipment:"AR-0067", lastInspection:"2026-02-15", nextInspection:"2026-05-15", status:"Active" },
];

export default function ClientDashboardPage() {
  const [user, setUser] = useState(null);
  const [equipmentData, setEquipmentData] = useState(mockData);

  useEffect(() => {
    setUser({ name: "Client User", company: "Acme Corp" });
  }, []);

  return (
    <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0", flexDirection:"column" }}>
      <main style={{ flex:1, padding:"32px", overflowY:"auto" }}>
        <div style={{ marginBottom:28 }}>
          <h1 style={{
            fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.green})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Client Dashboard</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Welcome {user?.company || "Client"}</p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:22 }}>
          {[
            { label:"Total Equipment", value:equipmentData.length, color:C.blue, icon:"⚙️" },
            { label:"Active", value:equipmentData.filter(e => e.status === "Active").length, color:C.green, icon:"✅" },
            { label:"Pending Inspection", value:2, color:C.yellow, icon:"📋" },
          ].map(stat => (
            <div key={stat.label} style={{
              background:`rgba(${rgbaMap[stat.color]},0.07)`,
              border:`1px solid rgba(${rgbaMap[stat.color]},0.25)`,
              borderRadius:14, padding:"20px",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                <span style={{ fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase" }}>{stat.label}</span>
                <span style={{ fontSize:18 }}>{stat.icon}</span>
              </div>
              <div style={{ fontSize:28, fontWeight:900, color:stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={{
          background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
          border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, padding:"20px",
        }}>
          <h2 style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:14 }}>Your Equipment</h2>
          {equipmentData.map((item, i) => (
            <div key={item.id} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"14px 0", borderBottom: i < equipmentData.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{item.equipment}</div>
                <div style={{ fontSize:11, color:"#64748b" }}>Last inspected: {item.lastInspection}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:11, color:"#64748b", marginBottom:4 }}>Next: {item.nextInspection}</div>
                <span style={{
                  padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:700,
                  background:`rgba(${rgbaMap[C.green]},0.15)`,
                  color:C.green,
                  border:`1px solid rgba(${rgbaMap[C.green]},0.3)`,
                }}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
