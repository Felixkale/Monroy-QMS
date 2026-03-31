// src/app/clients/[id]/page.jsx
"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { getClientById } from "@/services/clients";

const T = {
  bg:"#070e18", surface:"rgba(13,22,38,0.80)", panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)", border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff", textMid:"rgba(240,246,255,0.72)", textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee", accentDim:"rgba(34,211,238,0.10)", accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399", greenDim:"rgba(52,211,153,0.10)", greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",   redDim:"rgba(248,113,113,0.10)",   redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24", amberDim:"rgba(251,191,36,0.10)",  amberBrd:"rgba(251,191,36,0.25)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
  blue:"#60a5fa",  blueDim:"rgba(96,165,250,0.10)",   blueBrd:"rgba(96,165,250,0.25)",
};

function InfoRow({ label, value, color }) {
  if (!value) return null;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, padding:"12px 0", borderBottom:`1px solid ${T.border}` }}>
      <span style={{ fontSize:10, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700 }}>{label}</span>
      <span style={{ fontSize:14, color: color || T.text, fontWeight:500 }}>{value}</span>
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
      <div style={{ textAlign:"center", padding:"80px 20px", color:T.textDim }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
        <div style={{ fontSize:14 }}>Loading client…</div>
      </div>
    </AppLayout>
  );

  if (error || !client) return (
    <AppLayout title="Client Not Found">
      <div style={{ textAlign:"center", padding:"80px 20px" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
        <div style={{ fontSize:18, fontWeight:700, color:T.text, marginBottom:8 }}>Client Not Found</div>
        <div style={{ fontSize:13, color:T.textDim, marginBottom:24 }}>This client may have been removed or the ID is invalid.</div>
        <a href="/clients" style={{ padding:"10px 24px", borderRadius:10, textDecoration:"none", background:"linear-gradient(135deg,#22d3ee,#0891b2)", color:"#052e16", fontWeight:900, fontSize:13 }}>← Back to Clients</a>
      </div>
    </AppLayout>
  );

  const isActive = client.status === "active";

  return (
    <AppLayout title={client.company_name}>

      {/* Top Bar */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <a href="/clients" style={{ padding:"8px 14px", borderRadius:9, textDecoration:"none", background:T.card, border:`1px solid ${T.border}`, color:T.textMid, fontSize:13, fontWeight:600 }}>← Back</a>
          <span style={{
            padding:"4px 12px", borderRadius:99, fontSize:11, fontWeight:800,
            background: isActive ? T.greenDim : T.redDim,
            color: isActive ? T.green : T.red,
            border:`1px solid ${isActive ? T.greenBrd : T.redBrd}`,
            textTransform:"capitalize",
          }}>{client.status}</span>
        </div>
        <a href={`/clients/${id}/edit`} style={{ padding:"9px 18px", borderRadius:10, textDecoration:"none", background:"linear-gradient(135deg,#fbbf24,#f97316)", color:"#1a0a00", fontWeight:900, fontSize:13 }}>✏️ Edit Client</a>
      </div>

      {/* Header Card */}
      <div style={{ background:T.surface, border:`1px solid ${T.purpleBrd}`, borderRadius:16, padding:"22px 26px", marginBottom:18, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${T.accent},${T.purple})` }}/>
        <div style={{ fontSize:24, fontWeight:900, color:T.text, marginBottom:4 }}>{client.company_name}</div>
        {client.company_code && <div style={{ fontSize:13, color:T.textDim, marginBottom:10, fontFamily:"'IBM Plex Mono',monospace" }}>{client.company_code}</div>}
        <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
          {client.city         && <span style={{ fontSize:13, color:T.textMid }}>📍 {[client.city, client.country].filter(Boolean).join(", ")}</span>}
          {client.contact_email&& <span style={{ fontSize:13, color:T.textMid }}>📧 {client.contact_email}</span>}
          {client.contact_phone&& <span style={{ fontSize:13, color:T.textMid }}>📞 {client.contact_phone}</span>}
          {client.industry     && <span style={{ fontSize:13, color:T.textMid }}>🏭 {client.industry}</span>}
        </div>
      </div>

      {/* Details Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))", gap:16, marginBottom:18 }}>
        <div style={{ background:T.panel, border:`1px solid ${T.purpleBrd}`, borderRadius:14, padding:"18px 22px" }}>
          <div style={{ fontSize:12, fontWeight:800, color:T.purple, marginBottom:12, textTransform:"uppercase", letterSpacing:"0.06em" }}>🏢 Company Information</div>
          <InfoRow label="Company Name"  value={client.company_name} />
          <InfoRow label="Company Code"  value={client.company_code} />
          <InfoRow label="Industry"      value={client.industry} />
          <InfoRow label="Status"        value={client.status} color={isActive ? T.green : T.red} />
          <InfoRow label="Address"       value={client.address} />
          <InfoRow label="City"          value={client.city} />
          <InfoRow label="Country"       value={client.country} />
          <InfoRow label="Registered On" value={client.created_at ? new Date(client.created_at).toLocaleDateString("en-GB", { year:"numeric", month:"long", day:"numeric" }) : null} />
        </div>
        <div style={{ background:T.panel, border:`1px solid ${T.accentBrd}`, borderRadius:14, padding:"18px 22px" }}>
          <div style={{ fontSize:12, fontWeight:800, color:T.accent, marginBottom:12, textTransform:"uppercase", letterSpacing:"0.06em" }}>👤 Contact Details</div>
          <InfoRow label="Contact Person" value={client.contact_person} />
          <InfoRow label="Email"          value={client.contact_email} color={T.accent} />
          <InfoRow label="Phone"          value={client.contact_phone} />
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        {[
          { label:"Equipment",    href:`/equipment?client=${id}`,    color:T.green,  bg:T.greenDim,  brd:T.greenBrd,  icon:"⚙️" },
          { label:"Certificates", href:`/certificates?client=${id}`, color:T.accent, bg:T.accentDim, brd:T.accentBrd, icon:"📜" },
          { label:"NCRs",         href:`/ncr?client=${id}`,          color:T.red,    bg:T.redDim,    brd:T.redBrd,    icon:"⚠️" },
          { label:"CAPAs",        href:`/capa?client=${id}`,         color:T.purple, bg:T.purpleDim, brd:T.purpleBrd, icon:"🔧" },
        ].map(a => (
          <a key={a.label} href={a.href} style={{
            padding:"10px 16px", borderRadius:10, textDecoration:"none",
            background:a.bg, border:`1px solid ${a.brd}`, color:a.color,
            fontSize:13, fontWeight:700, display:"flex", alignItems:"center", gap:7,
            transition:"filter .15s",
          }}
          onMouseEnter={e=>e.currentTarget.style.filter="brightness(1.2)"}
          onMouseLeave={e=>e.currentTarget.style.filter=""}>
            {a.icon} {a.label}
          </a>
        ))}
      </div>
    </AppLayout>
  );
}
