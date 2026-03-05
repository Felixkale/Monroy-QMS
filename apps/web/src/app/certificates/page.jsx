"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

const allCertificates = [
  {
    id:"CERT-0889", certNo:"CERT-0889", type:"Equipment Certification", equipmentTag:"PV-0041", equipmentType:"Pressure Vessel",
    serialNo:"S-10041", model:"PV-Standard-2020", swl:"N/A", mawp:"10 bar",
    countryOfOrigin:"South Africa", yearOfManufacture:2018, manufacturer:"ASME Corp",
    inspectionDate:"2026-03-05", nextInspectionDate:"2026-06-01", testStatus:"Pass",
    legalFramework:"MIBE, Quarries Works and Machinery Act CAP 4.4:02, Factories Act 44.01",
    issued:"2025-06-01", expiry:"2026-06-01", status:"Valid", client:"Acme Industrial Corp",
  },
  {
    id:"CERT-0856", certNo:"CERT-0856", type:"ISO Certification", equipmentTag:"BL-0012", equipmentType:"Boiler",
    serialNo:"S-20012", model:"BL-2015", swl:"N/A", mawp:"16 bar",
    countryOfOrigin:"South Africa", yearOfManufacture:2015, manufacturer:"ThermTech",
    inspectionDate:"2025-09-15", nextInspectionDate:"2026-09-15", testStatus:"Pass",
    legalFramework:"MIBE, Quarries Works and Machinery Act CAP 4.4:02",
    issued:"2025-01-15", expiry:"2026-01-15", status:"Expired", client:"SteelWorks Ltd",
  },
  {
    id:"CERT-0901", certNo:"CERT-0901", type:"Compliance Certificate", equipmentTag:"AR-0067", equipmentType:"Air Receiver",
    serialNo:"S-30067", model:"AR-2020", swl:"N/A", mawp:"14 bar",
    countryOfOrigin:"South Africa", yearOfManufacture:2020, manufacturer:"CompAir",
    inspectionDate:"2026-02-20", nextInspectionDate:"2026-08-20", testStatus:"Pass",
    legalFramework:"Machinery Act CAP 4.4:02, Factories Act 44.01",
    issued:"2025-09-10", expiry:"2026-09-10", status:"Valid", client:"MineOps Ltd",
  },
];

export default function CertificatesPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState(allCertificates);
  const [filterStatus, setFilterStatus] = useState("All");
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

  const statuses = ["All", "Valid", "Expiring", "Expired"];
  const filtered = certificates.filter(c =>
    (filterStatus === "All" || c.status === filterStatus) &&
    (c.certNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
     c.client.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCertificateClick = (id) => {
    router.push(`/certificates/${id}`);
  };

  const statusColor = { Valid:C.green, Expiring:C.yellow, Expired:C.pink };

  return (
    <AppLayout>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:28 }}>
        <div>
          <h1 style={{
            fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.blue})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Certificates & Licenses</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Manage all issued certificates and licenses</p>
        </div>
        <button style={{
          padding:"10px 18px", borderRadius:12, textDecoration:"none",
          background:`linear-gradient(135deg,${C.green},${C.blue})`,
          border:"none", color:"#fff", fontWeight:700, fontSize:13,
          boxShadow:`0 0 20px rgba(0,245,196,0.4)`, cursor:"pointer", fontFamily:"inherit",
        }}>
          📜 Issue Certificate
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:22 }}>
        {[
          { label:"Total Certificates", value:allCertificates.length, color:C.blue },
          { label:"Valid", value:allCertificates.filter(c=>c.status==="Valid").length, color:C.green },
          { label:"Expiring", value:allCertificates.filter(c=>c.status==="Expiring").length, color:C.yellow },
          { label:"Expired", value:allCertificates.filter(c=>c.status==="Expired").length, color:C.pink },
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
          placeholder="Search certificates…"
          style={{
            flex:"1 1 220px", padding:"10px 16px",
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.3)",
            borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
          }}
        />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {statuses.map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)} style={{
              padding:"8px 14px", borderRadius:20, fontSize:12, cursor:"pointer",
              fontFamily:"inherit", fontWeight:600,
              background: filterStatus===s ? "rgba(79,195,247,0.25)" : "rgba(255,255,255,0.04)",
              border: filterStatus===s ? `1px solid ${C.blue}` : "1px solid rgba(255,255,255,0.08)",
              color: filterStatus===s ? C.blue : "#64748b",
            }}>{s}</button>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
        {filtered.map(c=>(
          <div
            key={c.id}
            onClick={() => handleCertificateClick(c.id)}
            style={{
              background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
              border:"1px solid rgba(79,195,247,0.25)",
              borderRadius:14, padding:"20px",
              cursor:"pointer", transition:"all 0.25s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(79,195,247,0.5)";
              e.currentTarget.style.boxShadow = "0 0 30px rgba(79,195,247,0.2)";
              e.currentTarget.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(79,195,247,0.25)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div>
                <h3 style={{ fontSize:16, fontWeight:800, color:"#fff", margin:"0 0 4px" }}>{c.certNo}</h3>
                <p style={{ fontSize:11, color:"#64748b", margin:0 }}>{c.type}</p>
              </div>
              <span style={{
                padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                background:`rgba(${rgbaMap[statusColor[c.status]]},0.12)`, color:statusColor[c.status],
                border:`1px solid rgba(${rgbaMap[statusColor[c.status]]},0.3)`,
              }}>{c.status}</span>
            </div>
            <div style={{ fontSize:12, color:"#94a3b8", marginBottom:12, lineHeight:"1.4" }}>
              <p style={{ margin:"0 0 4px" }}>Equipment: <strong>{c.equipmentTag}</strong></p>
              <p style={{ margin:0 }}>Client: <strong>{c.client}</strong></p>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.04)", fontSize:11 }}>
              <span style={{ color:"#64748b" }}>Expires: {c.expiry}</span>
              <button style={{
                padding:"4px 10px", borderRadius:6, fontSize:10, fontWeight:600,
                background:"rgba(0,245,196,0.15)", border:`1px solid rgba(0,245,196,0.3)`,
                color:C.green, cursor:"pointer", fontFamily:"inherit",
              }}>⬇ Download</button>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
