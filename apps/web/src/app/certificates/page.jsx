"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import { getClientById } from "@/services/clients";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24", red:"#ef4444" };

function normalizeStatus(cert) {
  const raw = cert?.equipment_status || cert?.status || "";
  const v   = String(raw).toLowerCase();
  if (v.includes("fail"))        return "fail";
  if (v.includes("conditional")) return "conditional";
  if (v.includes("pass"))        return "pass";
  return "unknown";
}

function getStatusMeta(cert) {
  const st = normalizeStatus(cert);
  if (st === "pass")        return { label:"PASS",        color:C.green,  bg:"rgba(0,245,196,0.10)",  border:"rgba(0,245,196,0.25)"  };
  if (st === "fail")        return { label:"FAIL",        color:C.red,    bg:"rgba(239,68,68,0.10)",  border:"rgba(239,68,68,0.25)"  };
  if (st === "conditional") return { label:"CONDITIONAL", color:C.yellow, bg:"rgba(251,191,36,0.10)", border:"rgba(251,191,36,0.25)" };
  return { label:"UNKNOWN", color:"#cbd5e1", bg:"rgba(255,255,255,0.06)", border:"rgba(255,255,255,0.10)" };
}

function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

function Th({ children }) {
  return <th style={{ textAlign:"left", padding:"14px", color:"#94a3b8", fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:0.5 }}>{children}</th>;
}
function Td({ children, strong }) {
  return <td style={{ padding:"14px", color: strong ? "#fff" : "#cbd5e1", fontSize:13, fontWeight: strong ? 800 : 500, verticalAlign:"middle" }}>{children}</td>;
}

function CertificatesPageInner() {
  const searchParams = useSearchParams();
  const clientId     = searchParams.get("client");

  const [certificates, setCertificates] = useState([]);
  const [client, setClient]             = useState(null);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      let query = supabase.from("certificates").select("*").order("created_at", { ascending:false });
      if (clientId) query = query.eq("asset_id", clientId); // filter by asset's client

      // For client filtering, fetch all and filter by company field
      const { data } = await supabase.from("certificates").select("*").order("created_at", { ascending:false });

      let certs = data || [];

      // If filtering by client, match by company name or asset_id
      if (clientId) {
        const { data: clientData } = await getClientById(clientId);
        setClient(clientData);
        if (clientData) {
          certs = certs.filter(c =>
            (c.company || "").toLowerCase().includes((clientData.company_name || "").toLowerCase()) ||
            c.asset_id === clientId
          );
        }
      }

      setCertificates(certs);
      setLoading(false);
    }
    load();
  }, [clientId]);

  const filtered = useMemo(() => {
    return certificates.filter(cert => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q ||
        (cert.certificate_number || "").toLowerCase().includes(q) ||
        (cert.certificate_type   || "").toLowerCase().includes(q) ||
        (cert.company            || "").toLowerCase().includes(q) ||
        (cert.equipment_id       || "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || normalizeStatus(cert) === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [certificates, search, statusFilter]);

  const title = client ? `Certificates — ${client.company_name}` : "Certificates";

  return (
    <AppLayout title={title}>

      {client && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20, fontSize:13 }}>
          <a href="/clients" style={{ color:"#64748b", textDecoration:"none" }}>Clients</a>
          <span style={{ color:"#64748b" }}>→</span>
          <a href={`/clients/${clientId}`} style={{ color:"#64748b", textDecoration:"none" }}>{client.company_name}</a>
          <span style={{ color:"#64748b" }}>→</span>
          <span style={{ color:"#e2e8f0" }}>Certificates</span>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:24 }}>
        <p style={{ color:"#64748b", fontSize:13, margin:0 }}>
          {client ? `All certificates issued for ${client.company_name}` : "View, search, and manage all issued certificates"}
        </p>
        <div style={{ display:"flex", gap:10 }}>
          {clientId && (
            <a href={`/clients/${clientId}`} style={{ padding:"9px 16px", borderRadius:10, textDecoration:"none", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8", fontSize:13, fontWeight:600 }}>
              ← Back to Client
            </a>
          )}
          <button onClick={() => window.location.href="/certificates/create"} style={{ padding:"11px 18px", borderRadius:12, cursor:"pointer", fontFamily:"inherit", fontWeight:800, fontSize:13, background:`linear-gradient(135deg,${C.purple},${C.blue})`, border:"none", color:"#fff" }}>
            + Create Certificate
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:12, marginBottom:20 }}>
        {[
          { label:"Total",       value: loading ? "…" : certificates.length,                                        color:"#fff"  },
          { label:"Pass",        value: loading ? "…" : certificates.filter(c => normalizeStatus(c)==="pass").length,        color:C.green },
          { label:"Conditional", value: loading ? "…" : certificates.filter(c => normalizeStatus(c)==="conditional").length, color:C.yellow},
          { label:"Fail",        value: loading ? "…" : certificates.filter(c => normalizeStatus(c)==="fail").length,        color:C.red   },
        ].map(s => (
          <div key={s.label} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:14 }}>
            <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", marginBottom:8 }}>{s.label}</div>
            <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center", marginBottom:18 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search certificate number, client, equipment…"
          style={{ minWidth:260, flex:1, padding:"10px 12px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)", borderRadius:10, color:"#e2e8f0", fontSize:13, outline:"none", fontFamily:"inherit" }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding:"10px 12px", background:"#1a1f2e", border:"1px solid rgba(124,92,252,0.25)", borderRadius:10, color:"#e2e8f0", fontSize:13, outline:"none", fontFamily:"inherit", cursor:"pointer", minWidth:150 }}>
          <option value="all">All Statuses</option>
          <option value="pass">Pass</option>
          <option value="conditional">Conditional</option>
          <option value="fail">Fail</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.18)", borderRadius:16, overflow:"hidden" }}>
        {loading ? (
          <div style={{ padding:40, textAlign:"center", color:"#64748b" }}>Loading certificates…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:"center" }}>
            <div style={{ fontSize:36, marginBottom:12 }}>📜</div>
            <div style={{ color:"#e2e8f0", fontWeight:700, marginBottom:6 }}>
              {client ? `No certificates found for ${client.company_name}` : "No certificates found"}
            </div>
            <div style={{ color:"#64748b", fontSize:13 }}>Create a certificate to get started</div>
          </div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:900 }}>
              <thead>
                <tr style={{ background:"rgba(255,255,255,0.03)" }}>
                  <Th>Certificate No</Th>
                  <Th>Type</Th>
                  <Th>Client</Th>
                  <Th>Equipment</Th>
                  <Th>Issued</Th>
                  <Th>Valid To</Th>
                  <Th>Status</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cert, i) => {
                  const status = getStatusMeta(cert);
                  return (
                    <tr key={cert.id || i} style={{ borderTop:"1px solid rgba(255,255,255,0.06)", background: i%2===0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                      <Td strong>{cert.certificate_number || "—"}</Td>
                      <Td>{cert.certificate_type || "—"}</Td>
                      <Td>{cert.company || "—"}</Td>
                      <Td>{cert.equipment_description || cert.equipment_id || "—"}</Td>
                      <Td>{formatDate(cert.issued_at)}</Td>
                      <Td>{formatDate(cert.valid_to)}</Td>
                      <Td>
                        <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", padding:"6px 10px", borderRadius:999, fontSize:11, fontWeight:800, color:status.color, background:status.bg, border:`1px solid ${status.border}`, minWidth:92 }}>
                          {status.label}
                        </span>
                      </Td>
                      <Td>
                        <a href={`/certificates/${cert.id}`} style={{ padding:"8px 12px", borderRadius:10, fontFamily:"inherit", fontWeight:700, fontSize:12, background:"rgba(79,195,247,0.12)", border:"1px solid rgba(79,195,247,0.25)", color:C.blue, textDecoration:"none" }}>
                          Open
                        </a>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function CertificatesPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:"100vh", background:"#0f1419", display:"flex", alignItems:"center", justifyContent:"center", color:"#64748b" }}>Loading…</div>}>
      <CertificatesPageInner />
    </Suspense>
  );
}
