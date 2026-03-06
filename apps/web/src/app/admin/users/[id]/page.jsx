"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import AppLayout from "../../../../components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };

const allUsers = [
  {
    id:"USR-001", name:"Admin User", email:"admin@monroy.com", role:"Super Admin", status:"Active",
    lastLogin:"2026-03-05 10:30", avatar:"A", phone:"+27 11 555 0101", department:"Management",
    joinDate:"2022-01-15", inspectionsCompleted:156, certificatesIssued:89,
    permissions:["View All","Create Equipment","Edit Clients","Create Inspections","Manage Users","Generate Reports"],
    activity:[
      { action:"Logged in",        date:"2026-03-05 10:30", details:"Web Browser"      },
      { action:"Created Equipment",date:"2026-03-04 14:15", details:"PV-0089"          },
      { action:"Generated Report", date:"2026-03-03 09:45", details:"Q1 2026 Summary"  },
    ],
  },
  {
    id:"USR-002", name:"John Smith", email:"john@monroy.com", role:"Inspector", status:"Active",
    lastLogin:"2026-03-04 15:45", avatar:"J", phone:"+27 11 555 0102", department:"Field Operations",
    joinDate:"2023-06-20", inspectionsCompleted:89, certificatesIssued:0,
    permissions:["View Equipment","Create Inspections","View Reports"],
    activity:[
      { action:"Completed Inspection", date:"2026-03-04 15:45", details:"INS-1041"  },
      { action:"Logged in",            date:"2026-03-04 08:00", details:"Mobile App" },
    ],
  },
];

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) { router.push("/login"); return; }
    setUser(data.user);
    loadUser();
  }

  function loadUser() {
    const found = allUsers.find(u => u.id === params.id);
    if (found) setUserProfile(found);
    setLoading(false);
  }

  const roleColor = { "Super Admin":C.purple, "Supervisor":C.blue, "Inspector":C.green };

  if (loading) return <AppLayout><div style={{ padding:"40px", color:"#fff" }}>Loading...</div></AppLayout>;

  if (!userProfile) return (
    <AppLayout>
      <div style={{ padding:"40px", textAlign:"center" }}>
        <h2 style={{ color:"#fff" }}>User Not Found</h2>
        <button onClick={()=>router.push("/admin")} style={{
          marginTop:20, padding:"10px 20px", backgroundColor:"#667eea",
          color:"white", border:"none", borderRadius:6, cursor:"pointer", fontFamily:"inherit",
        }}>Back to Admin</button>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16, marginBottom:28 }}>
        <div>
          <a href="/admin" style={{ color:"#64748b", fontSize:13, textDecoration:"none", marginBottom:10, display:"block" }}>← Back to Admin</a>
          <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:"0 0 8px", color:"#fff" }}>{userProfile.name}</h1>
          <p style={{ color:"#64748b", margin:0, fontSize:13 }}>{userProfile.id} · {userProfile.email}</p>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button style={{ padding:"9px 16px", borderRadius:10, background:"rgba(79,195,247,0.15)", border:"1px solid rgba(79,195,247,0.3)", color:C.blue, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>✏️ Edit</button>
          <button style={{ padding:"9px 16px", borderRadius:10, background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)", color:C.pink, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>🔒 Reset Password</button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12, marginBottom:22 }}>
        {[
          { label:"Role",       value:userProfile.role,       color:roleColor[userProfile.role]                        },
          { label:"Status",     value:userProfile.status,     color:userProfile.status==="Active"?C.green:C.pink       },
          { label:"Department", value:userProfile.department, color:C.blue                                             },
          { label:"Join Date",  value:userProfile.joinDate,   color:C.yellow                                           },
        ].map(s=>(
          <div key={s.label} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:14 }}>
            <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:16, fontWeight:700, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16 }}>
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(79,195,247,0.2)", borderRadius:16, padding:20 }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:"#fff", marginTop:0 }}>User Information</h3>
          {[
            { label:"Email",      value:userProfile.email      },
            { label:"Phone",      value:userProfile.phone      },
            { label:"Department", value:userProfile.department },
            { label:"Last Login", value:userProfile.lastLogin  },
          ].map(f=>(
            <div key={f.label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:13 }}>
              <span style={{ color:"#64748b" }}>{f.label}</span>
              <span style={{ color:"#e2e8f0", fontWeight:600 }}>{f.value}</span>
            </div>
          ))}
        </div>
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(0,245,196,0.2)", borderRadius:16, padding:20 }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:"#fff", marginTop:0 }}>Activity Summary</h3>
          {[
            { label:"Inspections Completed", value:userProfile.inspectionsCompleted },
            { label:"Certificates Issued",   value:userProfile.certificatesIssued   },
          ].map(s=>(
            <div key={s.label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:13 }}>
              <span style={{ color:"#64748b" }}>{s.label}</span>
              <span style={{ color:C.green, fontWeight:700 }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, padding:20, marginTop:16 }}>
        <h3 style={{ fontSize:16, fontWeight:700, color:"#fff", marginTop:0 }}>Permissions</h3>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
          {userProfile.permissions.map((perm,idx)=>(
            <div key={idx} style={{ padding:"10px 14px", borderRadius:8, background:"rgba(0,245,196,0.08)", border:"1px solid rgba(0,245,196,0.2)", color:C.green, fontSize:12, fontWeight:600 }}>
              ✓ {perm}
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(79,195,247,0.2)", borderRadius:16, padding:20, marginTop:16 }}>
        <h3 style={{ fontSize:16, fontWeight:700, color:"#fff", marginTop:0 }}>Recent Activity</h3>
        {userProfile.activity.map((act,idx)=>(
          <div key={idx} style={{ display:"flex", alignItems:"flex-start", gap:14, padding:"14px 0", borderBottom:idx<userProfile.activity.length-1?"1px solid rgba(255,255,255,0.04)":"none" }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:C.green, boxShadow:`0 0 6px ${C.green}`, flexShrink:0, marginTop:5 }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{act.action}</div>
              <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{act.details}</div>
            </div>
            <div style={{ fontSize:11, color:"#64748b", flexShrink:0 }}>{act.date}</div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
