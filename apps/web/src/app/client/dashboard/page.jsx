"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", yellow:"#fbbf24" };

export default function ClientDashboard() {
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
    if (!data.user.email?.includes("client")) {
      router.push("/dashboard");
      return;
    }
    setUser(data.user);
  }

  if (!user) return <div style={{ padding:"40px", color:"#fff" }}>Loading...</div>;

  async function downloadEquipmentPDF() {
    alert("Generating Equipment Register PDF...");
    // Generate PDF with equipment details
  }

  async function downloadInspectionPDF() {
    alert("Downloading Inspection Report PDF...");
  }

  async function downloadCertificatePDF() {
    alert("Downloading Certificate PDF...");
  }

  return (
    <div style={{
      minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0",
      padding:"24px",
    }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:32, fontWeight:900, margin:"0 0 8px", color:"#fff" }}>
          Compliance Dashboard
        </h1>
        <p style={{ color:"#64748b", margin:0 }}>Acme Industrial Corp - View your compliance information</p>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:2, marginBottom:20, overflowX:"auto", paddingBottom:2 }}>
        {[
          { id:"overview", label:"Overview", icon:"📊" },
          { id:"equipment", label:"Equipment Register", icon:"⚙️" },
          { id:"inspections", label:"Inspections", icon:"🔍" },
          { id:"certificates", label:"Certificates", icon:"📜" },
          { id:"licenses", label:"License Status", icon:"🔐" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding:"10px 16px", borderRadius:"10px 10px 0 0", fontSize:12, cursor:"pointer",
            fontFamily:"inherit", fontWeight:700, whiteSpace:"nowrap",
            background:activeTab===tab.id?"rgba(124,92,252,0.2)":"transparent",
            border:"none", borderBottom:activeTab===tab.id?`2px solid #7c5cfc`:"2px solid transparent",
            color:activeTab===tab.id?"#7c5cfc":"#64748b",
          }}>{tab.icon} {tab.label}</button>
        ))}
      </div>

      {activeTab==="overview" && (
        <div>
          <div style={{
            display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:16, marginBottom:32
          }}>
            {[
              { label:"Total Equipment", value:24, color:C.blue },
              { label:"Compliance Rate", value:"98%", color:C.green },
              { label:"Active Certificates", value:12, color:C.purple },
              { label:"Pending Inspections", value:2, color:C.yellow },
            ].map((s, idx) => (
              <div key={idx} style={{
                background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.1)",
                borderRadius:14, padding:"16px 18px",
              }}>
                <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", marginBottom:8 }}>{s.label}</div>
                <div style={{ fontSize:24, fontWeight:900, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{
            background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
            borderRadius:16, padding:20,
          }}>
            <h3 style={{ fontSize:16, fontWeight:700, margin:"0 0 16px", color:"#fff" }}>Quick Downloads</h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12 }}>
              <button onClick={downloadEquipmentPDF} style={{
                padding:16, borderRadius:10, background:"rgba(79,195,247,0.1)",
                border:"1px solid rgba(79,195,247,0.3)", color:C.blue, fontWeight:700,
                cursor:"pointer", fontFamily:"inherit", fontSize:13,
              }}>
                📄 Equipment Register PDF
              </button>
              <button onClick={downloadInspectionPDF} style={{
                padding:16, borderRadius:10, background:"rgba(0,245,196,0.1)",
                border:"1px solid rgba(0,245,196,0.3)", color:C.green, fontWeight:700,
                cursor:"pointer", fontFamily:"inherit", fontSize:13,
              }}>
                📊 Inspection Reports PDF
              </button>
              <button onClick={downloadCertificatePDF} style={{
                padding:16, borderRadius:10, background:"rgba(124,92,252,0.1)",
                border:"1px solid rgba(124,92,252,0.3)", color:C.purple, fontWeight:700,
                cursor:"pointer", fontFamily:"inherit", fontSize:13,
              }}>
                📜 Certificates PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab==="equipment" && (
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(79,195,247,0.2)",
          borderRadius:16, padding:20,
        }}>
          <h3 style={{ fontSize:16, fontWeight:700, margin:"0 0 16px", color:"#fff" }}>Equipment Register</h3>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:"2px solid rgba(79,195,247,0.2)" }}>
                <th style={{ padding:12, textAlign:"left", color:C.blue, fontWeight:700 }}>Equipment Tag</th>
                <th style={{ padding:12, textAlign:"left", color:C.blue, fontWeight:700 }}>Type</th>
                <th style={{ padding:12, textAlign:"left", color:C.blue, fontWeight:700 }}>License</th>
                <th style={{ padding:12, textAlign:"left", color:C.blue, fontWeight:700 }}>QR Code</th>
              </tr>
            </thead>
            <tbody>
              {[
                { tag:"PV-0041", type:"Pressure Vessel", license:"Valid" },
                { tag:"BL-0012", type:"Boiler", license:"Expiring" },
                { tag:"AR-0067", type:"Air Receiver", license:"Valid" },
              ].map((e, idx) => (
                <tr key={idx} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding:12, color:"#e2e8f0" }}>{e.tag}</td>
                  <td style={{ padding:12, color:"#94a3b8" }}>{e.type}</td>
                  <td style={{ padding:12 }}>
                    <span style={{
                      padding:"2px 8px", borderRadius:12, fontSize:10, fontWeight:700,
                      background:e.license==="Valid"?"rgba(0,245,196,0.1)":"rgba(251,191,36,0.1)",
                      color:e.license==="Valid"?C.green:C.yellow,
                    }}>{e.license}</span>
                  </td>
                  <td style={{ padding:12 }}>
                    <button style={{
                      padding:"4px 10px", borderRadius:6, background:"rgba(0,245,196,0.1)",
                      border:"1px solid rgba(0,245,196,0.3)", color:C.green, fontWeight:600,
                      fontSize:10, cursor:"pointer", fontFamily:"inherit",
                    }}>📱 Scan</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab==="inspections" && (
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(79,195,247,0.2)",
          borderRadius:16, padding:20,
        }}>
          <h3 style={{ fontSize:16, fontWeight:700, margin:"0 0 16px", color:"#fff" }}>Inspection History</h3>
          {[
            { id:"INS-1041", date:"2026-03-05", equipment:"PV-0041", result:"Pass" },
            { id:"INS-1042", date:"2025-09-15", equipment:"BL-0012", result:"Pass" },
            { id:"INS-1043", date:"2026-02-20", equipment:"AR-0067", result:"Conditional" },
          ].map((i, idx) => (
            <div key={idx} style={{
              display:"flex", justifyContent:"space-between", padding:12, marginBottom:10,
              background:"rgba(255,255,255,0.03)", borderRadius:10,
            }}>
              <div>
                <div style={{ fontWeight:600, color:"#fff" }}>{i.id}</div>
                <div style={{ fontSize:11, color:"#64748b", marginTop:4 }}>{i.equipment} - {i.date}</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{
                  padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                  background:i.result==="Pass"?"rgba(0,245,196,0.1)":"rgba(251,191,36,0.1)",
                  color:i.result==="Pass"?C.green:C.yellow,
                }}>{i.result}</span>
                <button style={{
                  padding:"4px 10px", borderRadius:6, background:"rgba(79,195,247,0.1)",
                  border:"1px solid rgba(79,195,247,0.3)", color:C.blue, fontWeight:600,
                  fontSize:10, cursor:"pointer", fontFamily:"inherit",
                }}>📥 Download</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab==="licenses" && (
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(79,195,247,0.2)",
          borderRadius:16, padding:20,
        }}>
          <h3 style={{ fontSize:16, fontWeight:700, margin:"0 0 16px", color:"#fff" }}>License Status</h3>
          {[
            { tag:"PV-0041", mawp:"10 bar", swl:"N/A", expiry:"2026-06-01", status:"Valid" },
            { tag:"BL-0012", mawp:"16 bar", swl:"N/A", expiry:"2026-04-15", status:"Expiring" },
            { tag:"AR-0067", mawp:"14 bar", swl:"N/A", expiry:"2026-08-20", status:"Valid" },
          ].map((l, idx) => (
            <div key={idx} style={{
              padding:14, marginBottom:10, background:"rgba(255,255,255,0.03)",
              borderRadius:10, borderLeft:`4px solid ${l.status==="Valid"?C.green:C.yellow}`,
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div style={{ fontWeight:600, color:"#fff" }}>{l.tag}</div>
                <span style={{
                  padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                  background:l.status==="Valid"?"rgba(0,245,196,0.1)":"rgba(251,191,36,0.1)",
                  color:l.status==="Valid"?C.green:C.yellow,
                }}>{l.status}</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, fontSize:11, color:"#94a3b8" }}>
                <div>MAWP: <strong style={{ color:"#e2e8f0" }}>{l.mawp}</strong></div>
                <div>SWL: <strong style={{ color:"#e2e8f0" }}>{l.swl}</strong></div>
                <div>Expires: <strong style={{ color:"#e2e8f0" }}>{l.expiry}</strong></div>
              </div>
            </div>
          ))}
        </div>
      )}

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
