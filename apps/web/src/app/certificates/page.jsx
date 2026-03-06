"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import AppLayout from "../../components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

const allCertificates = [
  {
    id:"CERT-0889", certNo:"CERT-0889", type:"Load Test Certificate", equipmentTag:"BJ-001", equipmentType:"Bottle Jack",
    swl:"50 TON", mawp:"N/A", issued:"2026-02-07", expiry:"2026-07-07", status:"Valid", client:"B&E International",
  },
  {
    id:"CERT-0890", certNo:"CERT-0890", type:"Equipment Certification", equipmentTag:"PV-0041", equipmentType:"Pressure Vessel",
    swl:"N/A", mawp:"10 bar", issued:"2025-06-01", expiry:"2026-06-01", status:"Valid", client:"Acme Industrial Corp",
  },
];

export default function CertificatesPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState(allCertificates);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) { router.push("/login"); return; }
    setUser(data.user);
  }

  const statuses = ["All", "Valid", "Expiring", "Expired"];
  const filtered = certificates.filter(c =>
    (filterStatus === "All" || c.status === filterStatus) &&
    (c.certNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
     c.equipmentTag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const statusColor = { Valid:C.green, Expiring:C.yellow, Expired:C.pink };
  const statusRgba  = { Valid:"0,245,196", Expiring:"251,191,36", Expired:"244,114,182" };

  return (
    <AppLayout>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"1rem", marginBottom:"2rem" }}>
        <div>
          <h1 style={{
            fontSize:"clamp(20px,5vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.purple})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Certificates</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Manage equipment certificates and compliance</p>
        </div>
        <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
          <button onClick={() => router.push("/certificates/create")} style={{
            padding:"10px 18px", borderRadius:12, background:`linear-gradient(135deg,${C.purple},${C.blue})`,
            border:"none", color:"#fff", fontWeight:700, fontSize:"clamp(11px,2vw,13px)",
            boxShadow:`0 0 20px rgba(124,92,252,0.4)`, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap",
          }}>➕ Create</button>
          <button onClick={() => router.push("/certificates/import")} style={{
            padding:"10px 18px", borderRadius:12, background:`linear-gradient(135deg,${C.green},${C.blue})`,
            border:"none", color:"#fff", fontWeight:700, fontSize:"clamp(11px,2vw,13px)",
            cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap",
          }}>📤 Import</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:"0.75rem", marginBottom:"1.5rem" }}>
        {[
          { label:"Total",    value:certificates.length,                                    color:C.blue   },
          { label:"Valid",    value:certificates.filter(c=>c.status==="Valid").length,    color:C.green  },
          { label:"Expiring", value:certificates.filter(c=>c.status==="Expiring").length, color:C.yellow },
          { label:"Expired",  value:certificates.filter(c=>c.status==="Expired").length,  color:C.pink   },
        ].map(s=>(
          <div key={s.label} style={{
            background:`rgba(${rgbaMap[s.color]},0.07)`, border:`1px solid rgba(${rgbaMap[s.color]},0.25)`,
            borderRadius:14, padding:"12px 14px",
          }}>
            <div style={{ fontSize:9, color:"#64748b", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:"clamp(14px,3vw,22px)", fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap", marginBottom:"1rem" }}>
        <input
          value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
          placeholder="Search certificates…"
          style={{
            flex:"1 1 220px", padding:"10px 14px", minWidth:0,
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.3)",
            borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
          }}
        />
        <div style={{ display:"flex", gap:"0.4rem", flexWrap:"wrap" }}>
          {statuses.map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)} style={{
              padding:"8px 12px", borderRadius:20, fontSize:"clamp(10px,2vw,12px)", cursor:"pointer",
              fontFamily:"inherit", fontWeight:600, whiteSpace:"nowrap",
              background: filterStatus===s ? "rgba(124,92,252,0.25)" : "rgba(255,255,255,0.04)",
              border: filterStatus===s ? `1px solid ${C.purple}` : "1px solid rgba(255,255,255,0.08)",
              color: filterStatus===s ? C.purple : "#64748b",
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:"1rem" }}>
        {filtered.map(c=>(
          <div key={c.id} onClick={()=>router.push(`/certificates/${c.id}`)} style={{
            background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
            border:"1px solid rgba(79,195,247,0.25)", borderRadius:14, padding:"1.25rem",
            cursor:"pointer", transition:"all 0.25s",
          }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(79,195,247,0.5)"; e.currentTarget.style.transform="translateY(-4px)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(79,195,247,0.25)"; e.currentTarget.style.transform="translateY(0)"; }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div style={{ minWidth:0 }}>
                <h3 style={{ fontSize:"clamp(12px,3vw,16px)", fontWeight:800, color:"#fff", margin:"0 0 4px", wordBreak:"break-word" }}>{c.certNo}</h3>
                <p style={{ fontSize:11, color:"#64748b", margin:0 }}>{c.type}</p>
              </div>
              <span style={{
                padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:700, flexShrink:0, marginLeft:"0.5rem",
                background:`rgba(${statusRgba[c.status]},0.12)`, color:statusColor[c.status],
                border:`1px solid rgba(${statusRgba[c.status]},0.3)`,
              }}>{c.status}</span>
            </div>
            <p style={{ fontSize:"clamp(10px,2vw,11px)", color:"#94a3b8", margin:"0 0 12px" }}>
              {c.equipmentType} · {c.client}
            </p>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:"0.5rem", paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize:"clamp(9px,2vw,10px)", color:"#64748b" }}>
                <p style={{ margin:"2px 0" }}>📅 {c.issued}</p>
                <p style={{ margin:"2px 0" }}>📌 Expires: {c.expiry}</p>
              </div>
              <button onClick={e=>{ e.stopPropagation(); router.push(`/certificates/${c.id}`); }} style={{
                padding:"4px 10px", borderRadius:6, fontSize:"clamp(9px,2vw,10px)",
                background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)",
                color:C.green, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap",
              }}>View</button>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
