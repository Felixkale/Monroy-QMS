"use client";
import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196", [C.blue]:"79,195,247", [C.purple]:"124,92,252", [C.yellow]:"251,191,36" };

const mockStats = [
  { label:"Total Equipment", value:24, color:C.blue, icon:"⚙️", trend:"+2" },
  { label:"Active Inspections", value:8, color:C.green, icon:"🔍", trend:"+1" },
  { label:"Pending NCRs", value:3, color:C.yellow, icon:"⚠️", trend:"-1" },
  { label:"Certificate Renewals", value:5, color:C.purple, icon:"📜", trend:"+3" },
];

const mockRecentActivity = [
  { action:"Equipment registered", detail:"PV-0041", time:"2 hours ago" },
  { action:"Inspection completed", detail:"BL-0012", time:"5 hours ago" },
  { action:"NCR created", detail:"AR-0067", time:"1 day ago" },
  { action:"Certificate renewed", detail:"Test Lab", time:"2 days ago" },
];

export default function DashboardPage() {
  const [stats] = useState(mockStats);
  const [activities] = useState(mockRecentActivity);

  return (
    <AppLayout title="Dashboard">
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))", gap:16, marginBottom:28 }}>
        {stats.map(stat => (
          <div key={stat.label} style={{
            background:`rgba(${rgbaMap[stat.color]},0.07)`,
            border:`1px solid rgba(${rgbaMap[stat.color]},0.25)`,
            borderRadius:14, padding:"20px",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <span style={{ fontSize:10, fontWeight:700, color:"#64748b", textTransform:"uppercase" }}>{stat.label}</span>
              <span style={{ fontSize:18 }}>{stat.icon}</span>
            </div>
            <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
              <div style={{ fontSize:32, fontWeight:900, color:stat.color }}>{stat.value}</div>
              <span style={{ fontSize:11, color:stat.color, fontWeight:600 }}>{stat.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
        border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, padding:"20px",
      }}>
        <h2 style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:14, margin:"0 0 14px 0" }}>Recent Activity</h2>
        {activities.map((item, i) => (
          <div key={i} style={{
            display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"12px 0", borderBottom: i < activities.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
          }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{item.action}</div>
              <div style={{ fontSize:11, color:"#64748b" }}>{item.detail}</div>
            </div>
            <span style={{ fontSize:11, color:"#64748b" }}>{item.time}</span>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
