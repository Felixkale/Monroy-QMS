"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7" };

export default function InspectorDashboard() {
  const router = useRouter();
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
    if (!data.user.email?.includes("inspector")) {
      router.push("/dashboard");
      return;
    }
    setUser(data.user);
  }

  if (!user) return <div style={{ padding:"40px", color:"#fff" }}>Loading...</div>;

  return (
    <div style={{
      minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0",
      padding:"24px",
    }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:32, fontWeight:900, margin:"0 0 8px", color:"#fff" }}>
          Inspector Dashboard
        </h1>
        <p style={{ color:"#64748b", margin:0 }}>Manage your inspections and reports</p>
      </div>

      <div style={{
        display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:32
      }}>
        {[
          { label:"My Inspections", value:24, color:C.blue },
          { label:"Completed", value:18, color:C.green },
          { label:"Pending", value:6, color:"#fbbf24" },
          { label:"Reports Due", value:3, color:C.purple },
        ].map((s, idx) => (
          <div key={idx} style={{
            background:`rgba(${s.color.substring(1).match(/.{1,2}/g).map(x=>parseInt(x,16))},0.07)`,
            border:`1px solid rgba(${s.color.substring(1).match(/.{1,2}/g).map(x=>parseInt(x,16))},0.25)`,
            borderRadius:14, padding:"16px 18px",
          }}>
            <div style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", marginBottom:8 }}>{s.label}</div>
            <div style={{ fontSize:24, fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{
        background:"rgba(255,255,255,0.02)", border:"1px solid rgba(79,195,247,0.2)",
        borderRadius:16, padding:20,
      }}>
        <h2 style={{ fontSize:18, fontWeight:700, color:"#fff", margin:"0 0 16px" }}>Recent Inspections</h2>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[
            { equipment:"PV-0041", client:"Acme Corp", date:"2026-03-05", status:"Completed" },
            { equipment:"BL-0012", client:"SteelWorks", date:"2026-03-04", status:"In Progress" },
            { equipment:"AR-0067", client:"MineOps", date:"2026-03-03", status:"Pending" },
          ].map((i, idx) => (
            <div key={idx} style={{
              display:"flex", justifyContent:"space-between", padding:12,
              background:"rgba(255,255,255,0.03)", borderRadius:10,
            }}>
              <div>
                <div style={{ fontWeight:600, color:"#fff" }}>{i.equipment}</div>
                <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>{i.client}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:12, color:"#94a3b8" }}>{i.date}</div>
                <span style={{
                  padding:"2px 8px", borderRadius:12, fontSize:10, fontWeight:700,
                  background:i.status==="Completed"?"rgba(0,245,196,0.1)":"rgba(251,191,36,0.1)",
                  color:i.status==="Completed"?C.green:"#fbbf24",
                  marginTop:4, display:"inline-block",
                }}>{i.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => {
        supabase.auth.signOut();
        router.push("/login");
      }} style={{
        marginTop:24, padding:"10px 20px", borderRadius:8,
        background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)",
        color:C.pink, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
      }}>Logout</button>
    </div>
  );
}
