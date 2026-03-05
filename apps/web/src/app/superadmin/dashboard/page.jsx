"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

const systemStats = {
  totalUsers: 127,
  activeUsers: 98,
  totalClients: 45,
  totalEquipment: 892,
  systemHealth: "99.8%",
  uptime: "45 days",
  apiCalls: "2.4M",
  storage: "142GB / 500GB",
};

const recentLogs = [
  { id:1, action:"User Login", user:"admin@monroy.com", timestamp:"2026-03-05 14:32:10", status:"Success" },
  { id:2, action:"Equipment Added", user:"inspector@monroy.com", timestamp:"2026-03-05 13:45:22", status:"Success" },
  { id:3, action:"Client Updated", user:"admin@monroy.com", timestamp:"2026-03-05 12:15:45", status:"Success" },
  { id:4, action:"Report Generated", user:"superadmin@monroy.com", timestamp:"2026-03-05 11:22:18", status:"Success" },
  { id:5, action:"Role Changed", user:"superadmin@monroy.com", timestamp:"2026-03-04 16:40:32", status:"Success" },
];

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      router.push("/login");
      return;
    }
    if (data.user.email !== "superadmin@monroy.com") {
      router.push("/dashboard");
      return;
    }
    setUser(data.user);
  }

  if (!user) {
    return <div style={{ padding:"40px", color:"#fff" }}>Loading...</div>;
  }

  return (
    <div style={{
      minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0",
      display:"flex", flexDirection:"column",
    }}>
      {/* Top Bar */}
      <div style={{
        background:"linear-gradient(90deg, #1a1f2e 0%, #16192b 100%)",
        borderBottom:"1px solid rgba(124,92,252,0.2)", padding:"16px 24px",
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <img src="/logo.png" alt="Logo" style={{ width:40, height:40 }} />
          <div>
            <h1 style={{ margin:0, fontSize:16, fontWeight:900, color:"#fff" }}>Monroy QMS</h1>
            <p style={{ margin:"2px 0 0", fontSize:10, color:"#64748b" }}>Super Admin Control Panel</p>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ textAlign:"right" }}>
            <p style={{ margin:0, fontSize:13, fontWeight:600, color:"#fff" }}>Super Admin</p>
            <p style={{ margin:"2px 0 0", fontSize:11, color:"#64748b" }}>{user.email}</p>
          </div>
          <button onClick={() => {
            supabase.auth.signOut();
            router.push("/login");
          }} style={{
            padding:"8px 16px", borderRadius:8, background:"rgba(244,114,182,0.1)",
            border:"1px solid rgba(244,114,182,0.3)", color:C.pink, fontWeight:600,
            fontSize:12, cursor:"pointer", fontFamily:"inherit",
          }}>Logout</button>
        </div>
      </div>

      <div style={{ display:"flex", flex:1 }}>
        {/* Sidebar */}
        <aside style={{
          width:200, background:"rgba(255,255,255,0.02)", borderRight:"1px solid rgba(124,92,252,0.2)",
          padding:"20px 0", display:"flex", flexDirection:"column", gap:2,
        }}>
          {[
            { id:"overview", label:"Overview", icon:"📊" },
            { id:"users", label:"User Management", icon:"👥" },
            { id:"clients", label:"Clients", icon:"🏢" },
            { id:"equipment", label:"Equipment", icon:"⚙️" },
            { id:"modules", label:"Modules Config", icon:"🔧" },
            { id:"logs", label:"System Logs", icon:"📋" },
            { id:"monitoring", label:"Monitoring", icon:"📈" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding:"12px 16px", border:"none", background:"none", cursor:"pointer",
                color:activeTab===tab.id?"#fff":"#64748b", fontFamily:"inherit",
                borderLeft:activeTab===tab.id?`3px solid ${C.purple}`:"3px solid transparent",
                transition:"all 0.25s", textAlign:"left", display:"flex", alignItems:"center", gap:10,
              }}
            >
              <span style={{ fontSize:16 }}>{tab.icon}</span>
              <span style={{ fontWeight:600, fontSize:13 }}>{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <div style={{ flex:1, padding:"24px", overflowY:"auto" }}>
          {activeTab==="overview" && (
            <div>
              <h2 style={{ fontSize:24, fontWeight:900, margin:"0 0 24px", color:"#fff" }}>System Overview</h2>
              
              {/* Stats Grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:32 }}>
                {[
                  { label:"Total Users", value:systemStats.totalUsers, color:C.blue },
                  { label:"Active Users", value:systemStats.activeUsers, color:C.green },
                  { label:"Total Clients", value:systemStats.totalClients, color:C.purple },
                  { label:"Equipment", value:systemStats.totalEquipment, color:C.yellow },
                  { label:"System Health", value:systemStats.systemHealth, color:C.green },
                  { label:"Uptime", value:systemStats.uptime, color:C.blue },
                  { label:"API Calls", value:systemStats.apiCalls, color:C.purple },
                  { label:"Storage", value:systemStats.storage, color:C.yellow },
                ].map((stat, idx) => (
                  <div key={idx} style={{
                    background:`rgba(${rgbaMap[stat.color]},0.07)`,
                    border:`1px solid rgba(${rgbaMap[stat.color]},0.25)`,
                    borderRadius:14, padding:"16px 18px",
                  }}>
                    <div style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", marginBottom:8 }}>{stat.label}</div>
                    <div style={{ fontSize:24, fontWeight:900, color:stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div style={{
                background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
                borderRadius:16, padding:20, marginBottom:32,
              }}>
                <h3 style={{ fontSize:16, fontWeight:700, margin:"0 0 16px", color:"#fff" }}>Quick Actions</h3>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12 }}>
                  {[
                    { label:"Add New User", color:C.green },
                    { label:"Manage Roles", color:C.blue },
                    { label:"Configure Modules", color:C.purple },
                    { label:"View System Logs", color:C.pink },
                    { label:"Generate Report", color:C.yellow },
                    { label:"Backup System", color:C.green },
                  ].map((action, idx) => (
                    <button key={idx} style={{
                      padding:12, borderRadius:10, border:"1px solid rgba(255,255,255,0.1)",
                      background:`rgba(${rgbaMap[action.color]},0.1)`, color:action.color,
                      fontWeight:600, fontSize:12, cursor:"pointer", fontFamily:"inherit",
                    }}>{action.label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab==="users" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <h2 style={{ fontSize:24, fontWeight:900, margin:0, color:"#fff" }}>User Management</h2>
                <button style={{
                  padding:"10px 18px", borderRadius:12, background:`linear-gradient(135deg,${C.purple},${C.blue})`,
                  border:"none", color:"#fff", fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                }}>➕ Add User</button>
              </div>
              <div style={{
                background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
                borderRadius:16, padding:20, overflowX:"auto",
              }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ borderBottom:"2px solid rgba(124,92,252,0.2)" }}>
                      <th style={{ padding:12, textAlign:"left", color:"#7c5cfc", fontWeight:700 }}>Name</th>
                      <th style={{ padding:12, textAlign:"left", color:"#7c5cfc", fontWeight:700 }}>Email</th>
                      <th style={{ padding:12, textAlign:"left", color:"#7c5cfc", fontWeight:700 }}>Role</th>
                      <th style={{ padding:12, textAlign:"left", color:"#7c5cfc", fontWeight:700 }}>Status</th>
                      <th style={{ padding:12, textAlign:"left", color:"#7c5cfc", fontWeight:700 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name:"John Smith", email:"inspector@monroy.com", role:"Inspector", status:"Active" },
                      { name:"Sarah Johnson", email:"supervisor@monroy.com", role:"Supervisor", status:"Active" },
                      { name:"Admin User", email:"admin@monroy.com", role:"Admin", status:"Active" },
                    ].map((u, idx) => (
                      <tr key={idx} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding:12, color:"#e2e8f0", fontSize:13 }}>{u.name}</td>
                        <td style={{ padding:12, color:"#94a3b8", fontSize:13 }}>{u.email}</td>
                        <td style={{ padding:12, color:"#00f5c4", fontSize:13, fontWeight:600 }}>{u.role}</td>
                        <td style={{ padding:12 }}>
                          <span style={{
                            padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                            background:"rgba(0,245,196,0.1)", color:C.green,
                          }}>{u.status}</span>
                        </td>
                        <td style={{ padding:12 }}>
                          <button style={{
                            padding:"4px 10px", borderRadius:6, background:"rgba(124,92,252,0.15)",
                            border:"none", color:C.purple, fontWeight:600, fontSize:11, cursor:"pointer",
                            fontFamily:"inherit",
                          }}>Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab==="logs" && (
            <div>
              <h2 style={{ fontSize:24, fontWeight:900, margin:"0 0 20px", color:"#fff" }}>System Logs</h2>
              <div style={{
                background:"rgba(255,255,255,0.02)", border:"1px solid rgba(79,195,247,0.2)",
                borderRadius:16, padding:20, maxHeight:"600px", overflowY:"auto",
              }}>
                {recentLogs.map((log, idx) => (
                  <div key={idx} style={{
                    display:"flex", justifyContent:"space-between", padding:"12px 0",
                    borderBottom:"1px solid rgba(255,255,255,0.04)", alignItems:"center",
                  }}>
                    <div>
                      <div style={{ color:"#e2e8f0", fontWeight:600, fontSize:13 }}>{log.action}</div>
                      <div style={{ color:"#64748b", fontSize:11, marginTop:4 }}>{log.user}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ color:"#64748b", fontSize:11 }}>{log.timestamp}</div>
                      <span style={{
                        padding:"2px 8px", borderRadius:12, fontSize:10, fontWeight:700,
                        background:"rgba(0,245,196,0.1)", color:C.green, marginTop:4, display:"inline-block",
                      }}>{log.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab==="modules" && (
            <div>
              <h2 style={{ fontSize:24, fontWeight:900, margin:"0 0 20px", color:"#fff" }}>Module Configuration</h2>
              <div style={{
                display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))", gap:16
              }}>
                {[
                  { name:"Equipment Register", enabled:true, icon:"⚙️" },
                  { name:"Inspections", enabled:true, icon:"🔍" },
                  { name:"Certificates", enabled:true, icon:"📜" },
                  { name:"NCR Management", enabled:true, icon:"⚠️" },
                  { name:"Reports", enabled:true, icon:"📊" },
                  { name:"Client Portal", enabled:true, icon:"🌐" },
                ].map((mod, idx) => (
                  <div key={idx} style={{
                    background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
                    borderRadius:14, padding:16, display:"flex", justifyContent:"space-between", alignItems:"center",
                  }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:4 }}>{mod.icon} {mod.name}</div>
                      <div style={{ fontSize:11, color:"#64748b" }}>Status: {mod.enabled ? "Active" : "Inactive"}</div>
                    </div>
                    <button style={{
                      padding:"6px 12px", borderRadius:6, cursor:"pointer", fontFamily:"inherit",
                      background:mod.enabled?"rgba(0,245,196,0.15)":"rgba(255,255,255,0.05)",
                      border:`1px solid ${mod.enabled?"rgba(0,245,196,0.3)":"rgba(255,255,255,0.1)"}`,
                      color:mod.enabled?C.green:"#94a3b8", fontWeight:600, fontSize:11,
                    }}>
                      {mod.enabled ? "Disable" : "Enable"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
