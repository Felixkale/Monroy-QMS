"use client";
import { useState, useEffect } from "react";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196", [C.blue]:"79,195,247", [C.purple]:"124,92,252", [C.pink]:"244,114,182", [C.yellow]:"251,191,36" };

const mockStats = [
  { label:"Total Users", value:24, color:C.blue, icon:"👥" },
  { label:"Active Clients", value:19, color:C.green, icon:"🏢" },
  { label:"System Health", value:"98.5%", color:C.green, icon:"💚" },
  { label:"API Requests", value:"1.2M", color:C.purple, icon:"⚡" },
];

const mockLogs = [
  { action:"User registered", user:"admin@monroy.com", time:"2m ago", status:"success" },
  { action:"Client suspended", detail:"Acme Corp", time:"15m ago", status:"warning" },
  { action:"Report generated", user:"john@monroy.com", time:"1h ago", status:"success" },
  { action:"Database backup", detail:"Completed", time:"2h ago", status:"success" },
];

export default function SuperAdminDashboardPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser({ name: "Super Admin", email: "admin@monroy.com" });
  }, []);

  return (
    <div style={{ display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0", flexDirection:"column" }}>
      <main style={{ flex:1, padding:"32px", overflowY:"auto" }}>
        <div style={{ marginBottom:28 }}>
          <h1 style={{
            fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.purple})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Super Admin Dashboard</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Welcome back, {user?.name || "Admin"}</p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:22 }}>
          {mockStats.map(stat => (
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
          <h2 style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:14 }}>System Activity</h2>
          {mockLogs.map((log, i) => (
            <div key={i} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"12px 0", borderBottom: i < mockLogs.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{log.action}</div>
                <div style={{ fontSize:11, color:"#64748b" }}>{log.user || log.detail}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <span style={{
                  padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:700,
                  background: log.status === "success" ? `rgba(${rgbaMap[C.green]},0.15)` : `rgba(${rgbaMap[C.yellow]},0.15)`,
                  color: log.status === "success" ? C.green : C.yellow,
                  border: log.status === "success" ? `1px solid rgba(${rgbaMap[C.green]},0.3)` : `1px solid rgba(${rgbaMap[C.yellow]},0.3)`,
                }}>
                  {log.status === "success" ? "✓" : "⚠"} {log.status}
                </span>
                <div style={{ fontSize:10, color:"#475569", marginTop:2 }}>{log.time}</div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
