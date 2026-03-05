"use client";
import { useState } from "react";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

const users = [
  { name:"Felix Monroy",    email:"admin@monroy.com",       role:"Super Admin", status:"Active", lastLogin:"2026-03-05 09:12" },
  { name:"John Smith",      email:"jsmith@monroy.com",      role:"Inspector",   status:"Active", lastLogin:"2026-03-05 08:40" },
  { name:"Sarah Johnson",   email:"sjohnson@monroy.com",    role:"Inspector",   status:"Active", lastLogin:"2026-03-04 16:22" },
  { name:"Michael Chen",    email:"mchen@monroy.com",       role:"Auditor",     status:"Active", lastLogin:"2026-03-04 14:05" },
  { name:"Emily Davis",     email:"edavis@monroy.com",      role:"Inspector",   status:"Active", lastLogin:"2026-03-03 11:30" },
  { name:"Acme Portal",     email:"portal@acme.com",        role:"Client",      status:"Active", lastLogin:"2026-03-02 09:00" },
  { name:"PowerGen Portal", email:"portal@powgen.com",      role:"Client",      status:"Suspended",lastLogin:"2026-01-15 10:20" },
];

const roleColor = {
  "Super Admin":C.pink, "Admin":C.purple, "Inspector":C.blue,
  "Auditor":C.green, "Client":C.yellow,
};

const auditLog = [
  { user:"admin@monroy.com",    action:"Certificate issued",     detail:"CERT-0889 for PV-0041",   time:"2026-03-05 09:15" },
  { user:"jsmith@monroy.com",   action:"Inspection submitted",   detail:"INS-1041 completed",      time:"2026-03-05 08:45" },
  { user:"sjohnson@monroy.com", action:"NCR raised",             detail:"NCR-0089 on BL-0012",     time:"2026-03-04 16:30" },
  { user:"mchen@monroy.com",    action:"Equipment registered",   detail:"AR-0067 added",           time:"2026-03-04 14:10" },
  { user:"admin@monroy.com",    action:"User role updated",      detail:"edavis role → Inspector", time:"2026-03-03 10:00" },
];

export default function AdminPage() {
  const [tab, setTab] = useState("users");

  return (
    <AppLayout>
      <div style={{ marginBottom:28 }}>
        <h1 style={{
          fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
          background:`linear-gradient(90deg,#fff 30%,${C.pink})`,
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}>Admin Panel</h1>
        <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>System administration and user management</p>
      </div>

      {/* System Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:24 }}>
        {[
          { label:"Total Users",   value:7,  color:C.blue   },
          { label:"Active Users",  value:6,  color:C.green  },
          { label:"Inspectors",    value:3,  color:C.purple },
          { label:"Client Portals",value:2,  color:C.yellow },
          { label:"Suspended",     value:1,  color:C.pink   },
        ].map(s=>(
          <div key={s.label} style={{
            background:`rgba(${rgbaMap[s.color]},0.07)`,
            border:`1px solid rgba(${rgbaMap[s.color]},0.25)`,
            borderRadius:14, padding:"16px 18px",
          }}>
            <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:28, fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:20, borderBottom:"1px solid rgba(255,255,255,0.07)", paddingBottom:0 }}>
        {["users","audit","system"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:"10px 20px", borderRadius:"10px 10px 0 0", fontSize:13, cursor:"pointer",
            fontFamily:"inherit", fontWeight:700, textTransform:"capitalize", border:"none",
            background: tab===t ? "rgba(124,92,252,0.2)" : "transparent",
            color: tab===t ? C.purple : "#64748b",
            borderBottom: tab===t ? `2px solid ${C.purple}` : "2px solid transparent",
          }}>
            {t==="users"?"👥 Users":t==="audit"?"📋 Audit Log":"⚙️ System"}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {tab==="users" && (
        <div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
            <button style={{
              padding:"10px 18px", borderRadius:12,
              background:`linear-gradient(135deg,${C.purple},${C.blue})`,
              border:"none", color:"#fff", fontWeight:700, fontSize:13,
              cursor:"pointer", fontFamily:"inherit",
            }}>+ Add User</button>
          </div>
          <div style={{
            background:"linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))",
            border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, overflow:"hidden",
          }}>
            {users.map((u,i)=>(
              <div key={u.email} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"14px 20px", flexWrap:"wrap", gap:10,
                borderBottom: i<users.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(124,92,252,0.06)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{
                    width:36, height:36, borderRadius:"50%", flexShrink:0,
                    background:`linear-gradient(135deg,${C.purple},${C.green})`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontWeight:800, fontSize:14,
                  }}>{u.name[0]}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{u.name}</div>
                    <div style={{ fontSize:11, color:"#64748b" }}>{u.email}</div>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                  <span style={{
                    padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                    background:`rgba(${rgbaMap[roleColor[u.role]]||"124,92,252"},0.15)`,
                    color: roleColor[u.role] || C.purple,
                    border:`1px solid rgba(${rgbaMap[roleColor[u.role]]||"124,92,252"},0.3)`,
                  }}>{u.role}</span>
                  <span style={{
                    padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                    background: u.status==="Active"?"rgba(0,245,196,0.1)":"rgba(244,114,182,0.1)",
                    color: u.status==="Active"?C.green:C.pink,
                    border:`1px solid rgba(${u.status==="Active"?"0,245,196":"244,114,182"},0.3)`,
                  }}>{u.status}</span>
                  <span style={{ fontSize:11, color:"#475569" }}>{u.lastLogin}</span>
                  <button style={{
                    padding:"5px 12px", borderRadius:8, fontSize:11, cursor:"pointer",
                    fontFamily:"inherit", fontWeight:600,
                    background:"rgba(124,92,252,0.12)", border:"1px solid rgba(124,92,252,0.3)", color:C.purple,
                  }}>Edit</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {tab==="audit" && (
        <div style={{
          background:"linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))",
          border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, overflow:"hidden",
        }}>
          {auditLog.map((a,i)=>(
            <div key={i} style={{
              display:"flex", alignItems:"center", gap:14, padding:"14px 20px",
              borderBottom: i<auditLog.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              flexWrap:"wrap",
            }}>
              <div style={{
                width:8, height:8, borderRadius:"50%", background:C.green,
                boxShadow:`0 0 6px ${C.green}`, flexShrink:0,
              }}/>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{a.action}</div>
                <div style={{ fontSize:11, color:"#64748b" }}>{a.detail}</div>
              </div>
              <div style={{ fontSize:11, color:"#64748b" }}>{a.user}</div>
              <div style={{ fontSize:11, color:"#475569" }}>{a.time}</div>
            </div>
          ))}
        </div>
      )}

      {/* System Tab */}
      {tab==="system" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:14 }}>
          {[
            { title:"Database",      icon:"🗄️", status:"Healthy",     color:C.green,  detail:"PostgreSQL · Supabase · 99.9% uptime" },
            { title:"Storage",       icon:"📦", status:"68% used",    color:C.yellow, detail:"Supabase Storage · 6.8 GB / 10 GB" },
            { title:"Auth Service",  icon:"🔐", status:"Operational", color:C.green,  detail:"JWT · Supabase Auth · Active sessions: 6" },
            { title:"API",           icon:"⚡", status:"Online",      color:C.blue,   detail:"Node.js + Express · Render.com · 45ms avg" },
            { title:"Hosting",       icon:"🌐", status:"Deployed",    color:C.green,  detail:"Render.com · Next.js 14 · Auto-deploy on push" },
            { title:"Exports",       icon:"📄", status:"PDF + Word",  color:C.purple, detail:"PDF & DOCX only · No CSV/Excel" },
          ].map(s=>(
            <div key={s.title} style={{
              background:`rgba(${rgbaMap[s.color]},0.06)`,
              border:`1px solid rgba(${rgbaMap[s.color]},0.2)`,
              borderRadius:14, padding:"18px 20px",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                <span style={{ fontSize:22 }}>{s.icon}</span>
                <span style={{ fontSize:14, fontWeight:700, color:"#fff" }}>{s.title}</span>
              </div>
              <div style={{
                display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11,
                fontWeight:700, color:s.color,
                background:`rgba(${rgbaMap[s.color]},0.15)`,
                border:`1px solid rgba(${rgbaMap[s.color]},0.3)`,
                marginBottom:8,
              }}>{s.status}</div>
              <div style={{ fontSize:12, color:"#64748b" }}>{s.detail}</div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
