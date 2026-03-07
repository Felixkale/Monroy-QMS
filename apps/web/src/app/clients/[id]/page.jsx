"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { getClientById } from "@/services/clients";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = {
  [C.green]:"0,245,196", [C.blue]:"79,195,247",
  [C.purple]:"124,92,252", [C.pink]:"244,114,182", [C.yellow]:"251,191,36",
};

function InfoRow({ label, value, color }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, padding:"14px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 }}>{label}</span>
      <span style={{ fontSize:14, color: color || "#e2e8f0", fontWeight:500 }}>{value || "—"}</span>
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams();
  const router  = useRouter();
  const [client,  setClient]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      const { data, error: err } = await getClientById(id);
      if (err || !data) setError("Client not found.");
      else setClient(data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return (
    <AppLayout title="Client Details">
      <div style={{ textAlign:"center", padding:"80px 20px", color:"#64748b" }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
        <div style={{ fontSize:14 }}>Loading client…</div>
      </div>
    </AppLayout>
  );

  if (error || !client) return (
    <AppLayout title="Client Not Found">
      <div style={{ textAlign:"center", padding:"80px 20px" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
        <div style={{ fontSize:18, fontWeight:700, color:"#e2e8f0", marginBottom:8 }}>Client Not Found</div>
        <div style={{ fontSize:13, color:"#64748b", marginBottom:24 }}>This client may have been removed or the ID is invalid.</div>
        <a href="/clients" style={{
          padding:"10px 24px", borderRadius:10, textDecoration:"none",
          background:`linear-gradient(135deg,${C.purple},${C.blue})`,
          color:"#fff", fontWeight:700, fontSize:13,
        }}>← Back to Clients</a>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title={client.company_name}>

      {/* Top Bar */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:28 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <a href="/clients" style={{
            padding:"8px 14px", borderRadius:10, textDecoration:"none",
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)",
            color:"#94a3b8", fontSize:13, fontWeight:600,
          }}>← Back</a>
          <span style={{
            padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:700,
            background: client.status==="active" ? "rgba(0,245,196,0.12)" : "rgba(244,114,182,0.12)",
            color: client.status==="active" ? C.green : C.pink,
            border:`1px solid rgba(${client.status==="active"?"0,245,196":"244,114,182"},0.3)`,
            textTransform:"capitalize",
          }}>{client.status}</span>
        </div>
        <a href={`/clients/${id}/edit`} style={{
          padding:"9px 20px", borderRadius:10, textDecoration:"none",
          background:`linear-gradient(135deg,${C.purple},${C.blue})`,
          color:"#fff", fontWeight:700, fontSize:13,
        }}>✏️ Edit Client</a>
      </div>

      {/* Header Card */}
      <div style={{
        background:"linear-gradient(135deg,rgba(124,92,252,0.1),rgba(79,195,247,0.05))",
        border:"1px solid rgba(124,92,252,0.25)", borderRadius:16, padding:"24px 28px", marginBottom:20,
        position:"relative", overflow:"hidden",
      }}>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${C.purple},${C.blue})` }}/>
        <div style={{ fontSize:24, fontWeight:900, color:"#fff", marginBottom:4 }}>{client.company_name}</div>
        {client.company_code && (
          <div style={{ fontSize:13, color:"#64748b", marginBottom:12 }}>{client.company_code}</div>
        )}
        <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
          {client.city && <span style={{ fontSize:13, color:"#94a3b8" }}>📍 {[client.city, client.country].filter(Boolean).join(", ")}</span>}
          {client.contact_email && <span style={{ fontSize:13, color:"#94a3b8" }}>📧 {client.contact_email}</span>}
          {client.contact_phone && <span style={{ fontSize:13, color:"#94a3b8" }}>📞 {client.contact_phone}</span>}
        </div>
      </div>

      {/* Details Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))", gap:20 }}>

        {/* Company Info */}
        <div style={{ background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))", border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, padding:"20px 24px" }}>
          <h3 style={{ fontSize:13, fontWeight:700, color:"#fff", margin:"0 0 4px", textTransform:"uppercase", letterSpacing:"0.06em" }}>🏢 Company Information</h3>
          <InfoRow label="Company Name"   value={client.company_name} />
          <InfoRow label="Company Code"   value={client.company_code} />
          <InfoRow label="Status"         value={client.status}       color={client.status==="active" ? C.green : C.pink} />
          <InfoRow label="Address"        value={client.address} />
          <InfoRow label="City"           value={client.city} />
          <InfoRow label="Country"        value={client.country} />
          <InfoRow label="Registered On"  value={new Date(client.created_at).toLocaleDateString("en-BW", { year:"numeric", month:"long", day:"numeric" })} />
        </div>

        {/* Contact Info */}
        <div style={{ background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))", border:"1px solid rgba(79,195,247,0.2)", borderRadius:16, padding:"20px 24px" }}>
          <h3 style={{ fontSize:13, fontWeight:700, color:"#fff", margin:"0 0 4px", textTransform:"uppercase", letterSpacing:"0.06em" }}>👤 Contact Details</h3>
          <InfoRow label="Contact Person" value={client.contact_person} />
          <InfoRow label="Email"          value={client.contact_email}  color={C.blue} />
          <InfoRow label="Phone"          value={client.contact_phone} />
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop:20, display:"flex", gap:12, flexWrap:"wrap" }}>
        {[
          { label:"View Equipment",    href:`/equipment?client=${id}`,    color:C.green,  icon:"⚙️" },
          { label:"View Inspections",  href:`/inspections?client=${id}`,  color:C.purple, icon:"🔍" },
          { label:"View Certificates", href:`/certificates?client=${id}`, color:C.yellow, icon:"📜" },
          { label:"View NCRs",         href:`/ncr?client=${id}`,          color:C.pink,   icon:"⚠️" },
        ].map(a => (
          <a key={a.label} href={a.href} style={{
            padding:"10px 18px", borderRadius:10, textDecoration:"none",
            background:`rgba(${rgbaMap[a.color]},0.08)`,
            border:`1px solid rgba(${rgbaMap[a.color]},0.2)`,
            color:"#e2e8f0", fontSize:13, fontWeight:600,
            display:"flex", alignItems:"center", gap:8, transition:"all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background=`rgba(${rgbaMap[a.color]},0.18)`; e.currentTarget.style.color="#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background=`rgba(${rgbaMap[a.color]},0.08)`; e.currentTarget.style.color="#e2e8f0"; }}>
            {a.icon} {a.label}
          </a>
        ))}
      </div>

    </AppLayout>
  );
}
