"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

const allUsers = [
  { id:"USR-001", name:"Admin User", email:"admin@monroy.com", role:"Super Admin", status:"Active", lastLogin:"2026-03-05 10:30", avatar:"A" },
  { id:"USR-002", name:"John Smith", email:"john@monroy.com", role:"Inspector", status:"Active", lastLogin:"2026-03-04 15:45", avatar:"J" },
  { id:"USR-003", name:"Sarah Johnson", email:"sarah@monroy.com", role:"Inspector", status:"Active", lastLogin:"2026-03-03 09:15", avatar:"S" },
  { id:"USR-004", name:"Michael Chen", email:"michael@monroy.com", role:"Supervisor", status:"Active", lastLogin:"2026-02-28 14:20", avatar:"M" },
  { id:"USR-005", name:"Emily Davis", email:"emily@monroy.com", role:"Inspector", status:"Inactive", lastLogin:"2026-01-15 11:00", avatar:"E" },
];

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState(allUsers);
  const [filterRole, setFilterRole] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      router.push("/login");
      return;
    }
    setUser(data.user);
  }

  const roles = ["All", ...Array.from(new Set(allUsers.map(u => u.role)))];
  const filtered = users.filter(u =>
    (filterRole === "All" || u.role === filterRole) &&
    (u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleUserClick = (id) => {
    router.push(`/admin/users/${id}`);
  };

  const roleColor = {
    "Super Admin": C.purple,
    "Supervisor": C.blue,
    "Inspector": C.green,
  };

  return (
    <AppLayout>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:28 }}>
        <div>
          <h1 style={{
            fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.purple})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Administration</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Manage users and system settings</p>
        </div>
        <button style={{
          padding:"10px 18px", borderRadius:12, textDecoration:"none",
          background:`linear-gradient(135deg,${C.purple},${C.blue})`,
          border:"none", color:"#fff", fontWeight:700, fontSize:13,
          boxShadow:`0 0 20px rgba(124,92,252,0.4)`, cursor:"pointer", fontFamily:"inherit",
        }}>
          ➕ Add User
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:22 }}>
        {[
          { label:"Total Users", value:allUsers.length, color:C.blue },
          { label:"Active", value:allUsers.filter(u=>u.status==="Active").length, color:C.green },
          { label:"Inactive", value:allUsers.filter(u=>u.status==="Inactive").length, color:C.pink },
          { label:"Super Admin", value:allUsers.filter(u=>u.role==="Super Admin").length, color:C.purple },
        ].map(s=>(
          <div key={s.label} style={{
            background:`rgba(${rgbaMap[s.color]||"100,116,139"},0.07)`,
            border:`1px solid rgba(${rgbaMap[s.color]||"100,116,139"},0.25)`,
            borderRadius:14, padding:"16px 18px",
          }}>
            <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:28, fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
        <input
          value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
          placeholder="Search users…"
          style={{
            flex:"1 1 220px", padding:"10px 16px",
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.3)",
            borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
          }}
        />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {roles.map(r=>(
            <button key={r} onClick={()=>setFilterRole(r)} style={{
              padding:"8px 14px", borderRadius:20, fontSize:12, cursor:"pointer",
              fontFamily:"inherit", fontWeight:600,
              background: filterRole===r ? "rgba(124,92,252,0.25)" : "rgba(255,255,255,0.04)",
              border: filterRole===r ? `1px solid ${C.purple}` : "1px solid rgba(255,255,255,0.08)",
              color: filterRole===r ? C.purple : "#64748b",
            }}>{r}</button>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
        {filtered.map(u=>(
          <div
            key={u.id}
            onClick={() => handleUserClick(u.id)}
            style={{
              background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
              border:"1px solid rgba(124,92,252,0.25)",
              borderRadius:14, padding:"20px",
              cursor:"pointer", transition:"all 0.25s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(124,92,252,0.5)";
              e.currentTarget.style.boxShadow = "0 0 30px rgba(124,92,252,0.2)";
              e.currentTarget.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(124,92,252,0.25)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
              <div style={{
                width:48, height:48, borderRadius:10,
                background:`linear-gradient(135deg,${C.purple},${C.blue})`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontWeight:700, fontSize:18, color:"#fff",
              }}>
                {u.avatar}
              </div>
              <div>
                <h3 style={{ fontSize:16, fontWeight:700, color:"#fff", margin:"0 0 2px" }}>{u.name}</h3>
                <p style={{ fontSize:11, color:"#64748b", margin:0 }}>{u.email}</p>
              </div>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.04)" }}>
              <span style={{
                padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                background:`rgba(${rgbaMap[roleColor[u.role]]},0.15)`, color:roleColor[u.role],
                border:`1px solid rgba(${rgbaMap[roleColor[u.role]]},0.3)`,
              }}>{u.role}</span>
              <span style={{
                padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                background:u.status==="Active"?"rgba(0,245,196,0.1)":"rgba(100,116,139,0.15)",
                color:u.status==="Active"?C.green:"#64748b",
                border:u.status==="Active"?"1px solid rgba(0,245,196,0.3)":"1px solid rgba(100,116,139,0.2)",
              }}>{u.status}</span>
            </div>
            <p style={{ fontSize:11, color:"#64748b", margin:"8px 0 0" }}>Last login: {u.lastLogin}</p>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
