"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

const licenseColor = { Valid:C.green, Expiring:C.yellow, Expired:C.pink };

const allClients = {
  "CLT-001": {
    tag:"CLT-001", name:"Acme Industrial Corp", tradingName:"Acme Corp", regNo:"2022/456789", vatNo:"4589654123",
    industry:"Manufacturing", website:"www.acmecorp.com", contractStartDate:"2022-01-15",
    status:"Active", email:"contact@acme.com", phone:"+27 11 555 0101",
    address:"14 Industrial Drive, Germiston, 1401", city:"Johannesburg", province:"Gauteng", country:"South Africa",
    primaryContact:"James Wright", primaryEmail:"jwright@acme.com", primaryPhone:"+27 11 555 0101",
    portalEnabled:true, portalEmail:"portal@acme.com",
    compliance:"98%", totalEquipment:24, activeInspections:18, certificates:12,
    equipment_list:[
      { tag:"PV-0041", serial:"S-10041", type:"Pressure Vessel", status:"Active", license:"Valid", nextInsp:"2026-06-01" },
      { tag:"BL-0012", serial:"S-20012", type:"Boiler", status:"Active", license:"Expiring", nextInsp:"2026-04-15" },
      { tag:"CP-0089", serial:"S-50089", type:"Compressor", status:"Active", license:"Expired", nextInsp:"2026-03-01" },
      { tag:"AR-0011", serial:"S-40011", type:"Air Receiver", status:"Active", license:"Valid", nextInsp:"2026-07-20" },
    ],
    inspection_history:[
      { id:"INS-1041", date:"2026-03-05", type:"Statutory", result:"Pass", equipment:"PV-0041" },
      { id:"INS-1042", date:"2025-09-15", type:"Safety Check", result:"Pass", equipment:"BL-0012" },
      { id:"INS-1043", date:"2026-02-20", type:"Visual", result:"Conditional", equipment:"AR-0067" },
      { id:"INS-1044", date:"2026-02-15", type:"Hydrostatic", result:"Fail", equipment:"CP-0089" },
    ],
    certificates:[
      { certNo:"CERT-0889", type:"Equipment Cert", equipment:"PV-0041", issued:"2025-06-01", expiry:"2026-06-01", status:"Valid" },
      { certNo:"CERT-0901", type:"ISO Cert", equipment:"BL-0012", issued:"2024-06-01", expiry:"2027-06-01", status:"Valid" },
      { certNo:"CERT-0856", type:"Compliance Cert", equipment:"AR-0011", issued:"2025-01-15", expiry:"2026-01-15", status:"Expiring" },
    ],
    activity:[
      { action:"Inspection Completed", date:"2026-03-05", user:"John Smith", equipment:"PV-0041" },
      { action:"Certificate Renewed", date:"2026-02-20", user:"Admin", equipment:"AR-0011" },
      { action:"Equipment Registered", date:"2026-01-10", user:"Admin", equipment:"CP-0089" },
      { action:"Portal Access Enabled", date:"2025-12-15", user:"Admin", details:"Granted portal access" },
    ],
    documents:[
      { name:"Company Registration", type:"PDF", size:"2.4MB", date:"2022-01-15" },
      { name:"Insurance Certificate", type:"PDF", size:"1.8MB", date:"2025-12-01" },
      { name:"Safety File", type:"PDF", size:"5.2MB", date:"2026-01-20" },
    ]
  },
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("overview");

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
    loadClient();
  }

  function loadClient() {
    const tag = params.id;
    const foundClient = allClients[tag];
    if (foundClient) {
      setClient(foundClient);
    }
    setLoading(false);
  }

  if (loading) {
    return <AppLayout><div style={{ padding:"40px" }}>Loading...</div></AppLayout>;
  }

  if (!client) {
    return (
      <AppLayout>
        <div style={{ padding:"40px", textAlign:"center" }}>
          <h2 style={{ color:"#fff" }}>Client Not Found</h2>
          <button onClick={() => router.push("/clients")} style={{
            marginTop:"20px", padding:"10px 20px",
            backgroundColor:"#667eea", color:"white", border:"none",
            borderRadius:"6px", cursor:"pointer", fontFamily:"inherit",
          }}>Back to Clients</button>
        </div>
      </AppLayout>
    );
  }

  const tabs = [
    { id:"overview", label:"Overview", icon:"📊" },
    { id:"equipment", label:"Equipment", icon:"⚙️" },
    { id:"inspections", label:"Inspections", icon:"🔍" },
    { id:"certificates", label:"Certificates", icon:"📜" },
    { id:"documents", label:"Documents", icon:"📁" },
    { id:"activity", label:"Activity", icon:"📈" },
  ];

  return (
    <AppLayout>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16, marginBottom:28 }}>
        <div>
          <a href="/clients" style={{ color:"#64748b", fontSize:13, textDecoration:"none", marginBottom:10, display:"block" }}>← Back to Clients</a>
          <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:"0 0 8px", color:"#fff" }}>
            {client.name}
          </h1>
          <p style={{ color:"#64748b", margin:0, fontSize:13 }}>{client.tag} · {client.industry}</p>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button onClick={() => router.push(`/clients/${client.tag}/edit`)} style={{
            padding:"9px 16px", borderRadius:10,
            background:"rgba(124,92,252,0.15)", border:"1px solid rgba(124,92,252,0.3)",
            color:"#7c5cfc", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit",
          }}>✏️ Edit</button>
          <button style={{
            padding:"9px 16px", borderRadius:10,
            background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)",
            color:C.pink, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit",
          }}>🗑️ Delete</button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:22 }}>
        {[
          { label:"Status", value:client.status, color:C.green },
          { label:"Compliance", value:client.compliance, color:C.green },
          { label:"Equipment", value:client.totalEquipment, color:C.blue },
          { label:"Inspections", value:client.activeInspections, color:C.yellow },
        ].map(s=>(
          <div key={s.label} style={{
            background:`rgba(${rgbaMap[s.color]},0.07)`,
            border:`1px solid rgba(${rgbaMap[s.color]},0.25)`,
            borderRadius:14, padding:"16px 18px",
          }}>
            <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:18, fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:2, marginBottom:20, overflowX:"auto", paddingBottom:2 }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"10px 16px", borderRadius:"10px 10px 0 0", fontSize:12, cursor:"pointer",
            fontFamily:"inherit", fontWeight:700, whiteSpace:"nowrap",
            background: tab===t.id ? "rgba(124,92,252,0.2)" : "transparent",
            border:"none", borderBottom: tab===t.id ? `2px solid #7c5cfc` : "2px solid transparent",
            color: tab===t.id ? "#7c5cfc" : "#64748b",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {tab==="overview" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16 }}>
          <div style={{
            background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
            borderRadius:16, padding:"20px",
          }}>
            <h3 style={{ fontSize:16, fontWeight:700, color:"#fff", marginTop:0 }}>Company Information</h3>
            {[
              { label:"Company Name", value:client.name },
              { label:"Trading Name", value:client.tradingName },
              { label:"Registration No", value:client.regNo },
              { label:"VAT No", value:client.vatNo },
              { label:"Industry", value:client.industry },
              { label:"Website", value:client.website },
            ].map(f=>(
              <div key={f.label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:13 }}>
                <span style={{ color:"#64748b" }}>{f.label}</span>
                <span style={{ color:"#e2e8f0", fontWeight:600 }}>{f.value}</span>
              </div>
            ))}
          </div>

          <div style={{
            background:"rgba(255,255,255,0.02)", border:"1px solid rgba(0,245,196,0.2)",
            borderRadius:16, padding:"20px",
          }}>
            <h3 style={{ fontSize:16, fontWeight:700, color:"#fff", marginTop:0 }}>Contact Information</h3>
            {[
              { label:"Email", value:client.email },
              { label:"Phone", value:client.phone },
              { label:"Address", value:client.address },
              { label:"City", value:client.city },
              { label:"Province", value:client.province },
              { label:"Country", value:client.country },
            ].map(f=>(
              <div key={f.label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:13 }}>
                <span style={{ color:"#64748b" }}>{f.label}</span>
                <span style={{ color:"#e2e8f0", fontWeight:600 }}>{f.value}</span>
              </div>
            ))}
          </div>

          <div style={{
            background:"rgba(255,255,255,0.02)", border:"1px solid rgba(79,195,247,0.2)",
            borderRadius:16, padding:"20px",
          }}>
            <h3 style={{ fontSize:16, fontWeight:700, color:"#fff", marginTop:0 }}>Primary Contact</h3>
            {[
              { label:"Name", value:client.primaryContact },
              { label:"Email", value:client.primaryEmail },
              { label:"Phone", value:client.primaryPhone },
              { label:"Portal Access", value:client.portalEnabled?"Enabled":"Disabled" },
              { label:"Portal Email", value:client.portalEmail },
            ].map(f=>(
              <div key={f.label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:13 }}>
                <span style={{ color:"#64748b" }}>{f.label}</span>
                <span style={{ color:"#e2e8f0", fontWeight:600 }}>{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="equipment" && (
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
          borderRadius:16, overflow:"hidden",
        }}>
          {client.equipment_list.map((eq, i) => (
            <div key={i} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"14px 20px", borderBottom: i < client.equipment_list.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              flexWrap:"wrap", gap:10,
            }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{eq.tag}</div>
                <div style={{ fontSize:11, color:"#64748b" }}>{eq.serial} · {eq.type}</div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <span style={{
                  padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                  background:eq.status==="Active"?"rgba(0,245,196,0.1)":"rgba(100,116,139,0.15)",
                  color:eq.status==="Active"?C.green:"#64748b",
                  border:eq.status==="Active"?"1px solid rgba(0,245,196,0.3)":"1px solid rgba(100,116,139,0.2)",
                }}>{eq.status}</span>
                <span style={{
                  padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                  background:`rgba(${licenseColor[eq.license].substring(1).match(/.{1,2}/g).map(x=>parseInt(x,16))},0.12)`,
                  color:licenseColor[eq.license],
                  border:`1px solid rgba(${licenseColor[eq.license].substring(1).match(/.{1,2}/g).map(x=>parseInt(x,16))},0.3)`,
                }}>🔐 {eq.license}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==="inspections" && (
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(79,195,247,0.2)",
          borderRadius:16, overflow:"hidden",
        }}>
          {client.inspection_history.map((insp, i) => (
            <div key={i} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"14px 20px", borderBottom: i < client.inspection_history.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              flexWrap:"wrap", gap:10,
            }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{insp.id}</div>
                <div style={{ fontSize:11, color:"#64748b" }}>{insp.date} · {insp.type}</div>
              </div>
              <span style={{
                padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                background:insp.result==="Pass"?"rgba(0,245,196,0.1)":insp.result==="Conditional"?"rgba(251,191,36,0.1)":"rgba(244,114,182,0.1)",
                color:insp.result==="Pass"?C.green:insp.result==="Conditional"?C.yellow:C.pink,
                border:insp.result==="Pass"?"1px solid rgba(0,245,196,0.3)":insp.result==="Conditional"?"1px solid rgba(251,191,36,0.3)":"1px solid rgba(244,114,182,0.3)",
              }}>{insp.result}</span>
            </div>
          ))}
        </div>
      )}

      {tab==="certificates" && (
        <div style={{
          display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:12
        }}>
          {client.certificates.map((cert, i) => (
            <div key={i} style={{
              background:"rgba(255,255,255,0.02)", border:"1px solid rgba(0,245,196,0.2)",
              borderRadius:12, padding:"16px",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{cert.certNo}</div>
                  <div style={{ fontSize:11, color:"#64748b" }}>{cert.type}</div>
                </div>
                <span style={{
                  padding:"3px 8px", borderRadius:16, fontSize:10, fontWeight:700,
                  background:cert.status==="Valid"?"rgba(0,245,196,0.1)":"rgba(251,191,36,0.1)",
                  color:cert.status==="Valid"?C.green:C.yellow,
                  border:cert.status==="Valid"?"1px solid rgba(0,245,196,0.3)":"1px solid rgba(251,191,36,0.3)",
                }}>{cert.status}</span>
              </div>
              <div style={{ fontSize:11, color:"#64748b", marginBottom:10 }}>
                <p style={{ margin:"2px 0" }}>Equipment: {cert.equipment}</p>
                <p style={{ margin:"2px 0" }}>Expires: {cert.expiry}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==="documents" && (
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
          borderRadius:16, overflow:"hidden",
        }}>
          {client.documents.map((doc, i) => (
            <div key={i} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"14px 20px", borderBottom: i < client.documents.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              flexWrap:"wrap", gap:10,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{
                  width:36, height:36, borderRadius:8, flexShrink:0,
                  background:"rgba(79,195,247,0.12)", display:"flex",
                  alignItems:"center", justifyContent:"center", fontSize:16,
                }}>📄</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{doc.name}</div>
                  <div style={{ fontSize:11, color:"#64748b" }}>{doc.type} · {doc.size} · {doc.date}</div>
                </div>
              </div>
              <button style={{
                padding:"6px 14px", borderRadius:8, cursor:"pointer", fontFamily:"inherit",
                fontWeight:600, fontSize:12, background:"rgba(0,245,196,0.1)",
                border:"1px solid rgba(0,245,196,0.3)", color:C.green,
              }}>⬇ Download</button>
            </div>
          ))}
        </div>
      )}

      {tab==="activity" && (
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
          borderRadius:16, overflow:"hidden",
        }}>
          {client.activity.map((entry, i) => (
            <div key={i} style={{
              display:"flex", alignItems:"flex-start", gap:14, padding:"14px 20px",
              borderBottom: i < client.activity.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              <div style={{
                width:8, height:8, borderRadius:"50%", background:"#00f5c4",
                boxShadow:"0 0 6px #00f5c4", flexShrink:0, marginTop:5,
              }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{entry.action}</div>
                <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{entry.details || entry.equipment}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:11, color:"#64748b" }}>{entry.user}</div>
                <div style={{ fontSize:10, color:"#475569" }}>{entry.date}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
