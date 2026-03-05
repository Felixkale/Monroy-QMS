"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

export default function AdminDashboard() {
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
    if (data.user.email !== "admin@monroy.com") {
      router.push("/dashboard");
      return;
    }
    setUser(data.user);
  }

  if (!user) {
    return <div style={{ padding:"40px", color:"#fff" }}>Loading...</div>;
  }

  const adminStats = [
    { label:"Total Clients", value:45, color:C.purple },
    { label:"Total Equipment", value:892, color:C.blue },
    { label:"Pending Inspections", value:23, color:C.yellow },
    { label:"System Uptime", value:"99.8%", color:C.green },
  ];

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
        <div>
          <h1 style={{ margin:0, fontSize:18, fontWeight:900, color:"#fff" }}>Admin Dashboard</h1>
          <p style={{ margin:"2px 0 0", fontSize:11, color:"#64748b" }}>System Administration</p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ textAlign:"right" }}>
            <p style={{ margin:0, fontSize:13, fontWeight:600, color:"#fff" }}>Admin</p>
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
          width:180, background:"rgba(255,255,255,0.02)", borderRight:"1px solid rgba(124,92,252,0.2)",
          padding:"20px 0", display:"flex", flexDirection:"column", gap:2,
        }}>
          {[
            { id:"overview", label:"Overview", icon:"📊" },
            { id:"users", label:"User Management", icon:"👥" },
            { id:"clients", label:"Manage Clients", icon:"🏢" },
            { id:"equipment", label:"Equipment", icon:"⚙️" },
            { id:"inspections", label:"Inspections", icon:"🔍" },
            { id:"logs", label:"Activity Logs", icon:"📋" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding:"12px 16px", border:"none", background:"none", cursor:"pointer",
              color:activeTab===tab.id?"#fff":"#64748b", fontFamily:"inherit",
              borderLeft:activeTab===tab.id?`3px solid ${C.purple}`:"3px solid transparent",
              transition:"all 0.25s", textAlign:"left", display:"flex", alignItems:"center", gap:10,
            }}>
              <span style={{ fontSize:14 }}>{tab.icon}</span>
              <span style={{ fontWeight:600, fontSize:12 }}>{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <div style={{ flex:1, padding:"24px", overflowY:"auto" }}>
          {activeTab==="overview" && (
            <div>
              <h2 style={{ fontSize:24, fontWeight:900, margin:"0 0 24px", color:"#fff" }}>System Overview</h2>
              
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:16, marginBottom:32 }}>
                {adminStats.map((stat, idx) => (
                  <div key={idx} style={{
                    background:`rgba(${rgbaMap[stat.color]},0.07)`,
                    border:`1px solid rgba(${rgbaMap[stat.color]},0.25)`,
                    borderRadius:14, padding:"16px 18px",
                  }}>
                    <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", marginBottom:8 }}>{stat.label}</div>
                    <div style={{ fontSize:22, fontWeight:900, color:stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              <div style={{
                background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
                borderRadius:16, padding:20,
              }}>
                <h3 style={{ fontSize:16, fontWeight:700, margin:"0 0 16px", color:"#fff" }}>Admin Functions</h3>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12 }}>
                  {[
                    "Add Client",
                    "Edit Client",
                    "Delete Client",
                    "Add Equipment",
                    "Manage Users",
                    "View Logs",
                    "Assign Roles",
                    "Generate Report",
                  ].map((action, idx) => (
                    <button key={idx} style={{
                      padding:12, borderRadius:10, border:"1px solid rgba(255,255,255,0.1)",
                      background:"rgba(124,92,252,0.1)", color:C.purple,
                      fontWeight:600, fontSize:12, cursor:"pointer", fontFamily:"inherit",
                    }}>{action}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab==="clients" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <h2 style={{ fontSize:24, fontWeight:900, margin:0, color:"#fff" }}>Manage Clients</h2>
                <button style={{
                  padding:"10px 18px", borderRadius:12, background:`linear-gradient(135deg,${C.purple},${C.blue})`,
                  border:"none", color:"#fff", fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                  fontSize:12,
                }}>➕ Add Client</button>
              </div>
              <div style={{
                background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
                borderRadius:16, padding:20, overflowX:"auto",
              }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr style={{ borderBottom:"2px solid rgba(124,92,252,0.2)" }}>
                      <th style={{ padding:12, textAlign:"left", color:"#7c5cfc", fontWeight:700 }}>Client Name</th>
                      <th style={{ padding:12, textAlign:"left", color:"#7c5cfc", fontWeight:700 }}>Industry</th>
                      <th style={{ padding:12, textAlign:"left", color:"#7c5cfc", fontWeight:700 }}>Equipment</th>
                      <th style={{ padding:12, textAlign:"left", color:"#7c5cfc", fontWeight:700 }}>Status</th>
                      <th style={{ padding:12, textAlign:"left", color:"#7c5cfc", fontWeight:700 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name:"Acme Industrial", industry:"Manufacturing", equipment:24, status:"Active" },
                      { name:"SteelWorks Ltd", industry:"Heavy Industry", equipment:18, status:"Active" },
                      { name:"TechPlant Inc", industry:"Technology", equipment:12, status:"Active" },
                    ].map((c, idx) => (
                      <tr key={idx} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding:12, color:"#e2e8f0" }}>{c.name}</td>
                        <td style={{ padding:12, color:"#94a3b8" }}>{c.industry}</td>
                        <td style={{ padding:12, color:"#00f5c4" }}>{c.equipment}</td>
                        <td style={{ padding:12 }}>
                          <span style={{
                            padding:"2px 8px", borderRadius:12, fontSize:10, fontWeight:700,
                            background:"rgba(0,245,196,0.1)", color:C.green,
                          }}>{c.status}</span>
                        </td>
                        <td style={{ padding:12, display:"flex", gap:6 }}>
                          <button style={{
                            padding:"4px 10px", borderRadius:6, background:"rgba(124,92,252,0.15)",
                            border:"none", color:C.purple, fontWeight:600, fontSize:10, cursor:"pointer",
                            fontFamily:"inherit",
                          }}>Edit</button>
                          <button style={{
                            padding:"4px 10px", borderRadius:6, background:"rgba(244,114,182,0.15)",
                            border:"none", color:C.pink, fontWeight:600, fontSize:10, cursor:"pointer",
                            fontFamily:"inherit",
                          }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
