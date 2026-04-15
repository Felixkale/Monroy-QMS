// src/app/certificates/[id]/page.jsx
// Old view template (CertificateSheet + folder/bundle + link/unlink + delete)
// + NCR/CAPA auto-raise from newer version
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import CertificateSheet from "@/components/certificates/CertificateSheet";
import { autoRaiseNcr } from "@/lib/autoNcr";

const T = {
  bg:"#070e18",surface:"rgba(13,22,38,0.80)",panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)",border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff",textMid:"rgba(240,246,255,0.72)",textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee",accentDim:"rgba(34,211,238,0.10)",accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399",greenDim:"rgba(52,211,153,0.10)",greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",  redDim:"rgba(248,113,113,0.10)",  redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24",amberDim:"rgba(251,191,36,0.10)", amberBrd:"rgba(251,191,36,0.25)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
  blue:"#60a5fa", blueDim:"rgba(96,165,250,0.10)",  blueBrd:"rgba(96,165,250,0.25)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@500;700&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes slideIn{from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1}}
  .cv-spinner{width:16px;height:16px;border-radius:50%;border:2px solid rgba(34,211,238,0.25);border-top-color:#22d3ee;animation:spin .7s linear infinite;flex-shrink:0}
  .cv-ncr-banner{animation:slideIn .25s ease}
  .view-hdr{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap}
  .view-btn-row{display:flex;gap:8px;flex-wrap:wrap;flex-shrink:0}
  .bundle-item{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
  .link-search-result{cursor:pointer;padding:10px 12px;border-radius:10px;border:1px solid rgba(148,163,184,0.12);background:rgba(255,255,255,0.025);transition:background .15s}
  .link-search-result:hover{background:rgba(34,211,238,0.07);border-color:rgba(34,211,238,0.25)}
  @media(max-width:768px){
    .view-page-pad{padding:12px!important}
    .view-hdr{flex-direction:column!important;gap:12px!important}
    .view-btn-row{width:100%}
    .view-btn-row a,.view-btn-row button{flex:1;text-align:center;justify-content:center}
  }
  @media(max-width:480px){
    .view-cert-title{font-size:18px!important}
    .view-btn-row a,.view-btn-row button{font-size:11px!important;padding:8px 10px!important}
  }
`;

const NON_PASS = ["FAIL","REPAIR_REQUIRED","OUT_OF_SERVICE","CONDITIONAL"];

function normalizeId(v){ return Array.isArray(v) ? v[0] : v; }

function pickResult(c) {
  if (!c) return "UNKNOWN";
  const ex = c.extracted_data || {};
  const candidates = [c.result, c.equipment_status, ex.result, ex.equipment_status, ex.inspection_result];
  for (const raw of candidates) {
    if (!raw) continue;
    const n = String(raw).trim().toUpperCase().replace(/\s+/g, "_");
    if (n === "UNKNOWN") continue;
    if (n === "CONDITIONAL" || n === "REPAIR REQUIRED") return "REPAIR_REQUIRED";
    if (n === "OUT OF SERVICE") return "OUT_OF_SERVICE";
    if (["PASS","FAIL","REPAIR_REQUIRED","OUT_OF_SERVICE"].includes(n)) return n;
  }
  return "UNKNOWN";
}

function resultTone(v) {
  if (v === "PASS")            return { color: T.green,  bg: T.greenDim,  brd: T.greenBrd,  label: "Pass" };
  if (v === "FAIL")            return { color: T.red,    bg: T.redDim,    brd: T.redBrd,    label: "Fail" };
  if (v === "REPAIR_REQUIRED") return { color: T.amber,  bg: T.amberDim,  brd: T.amberBrd,  label: "Repair Required" };
  if (v === "OUT_OF_SERVICE")  return { color: T.purple, bg: T.purpleDim, brd: T.purpleBrd, label: "Out of Service" };
  return { color: T.textMid, bg: T.card, brd: T.border, label: "Unknown" };
}

// ── NCR/CAPA status banner ────────────────────────────────────────────────────
function NcrBanner({ status, ncr, capa, error }) {
  if (!status) return null;

  if (status === "generating") return (
    <div className="cv-ncr-banner" style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderRadius: 12, background: "rgba(34,211,238,0.07)", border: `1px solid ${T.accentBrd}` }}>
      <div className="cv-spinner"/>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: T.accent }}>Auto-generating NCR &amp; CAPA…</div>
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>Non-compliant result detected — raising compliance report automatically</div>
      </div>
    </div>
  );

  if (status === "skipped" && ncr) return (
    <div className="cv-ncr-banner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "13px 16px", borderRadius: 12, background: T.amberDim, border: `1px solid ${T.amberBrd}`, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16 }}>⚠️</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.amber }}>Non-compliance already reported</div>
          <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>NCR exists for this certificate</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href={`/ncr/${ncr.id}`} style={{ padding: "7px 14px", borderRadius: 9, border: `1px solid ${T.amberBrd}`, background: T.amberDim, color: T.amber, fontWeight: 800, fontSize: 12, textDecoration: "none" }}>View NCR →</Link>
        {capa && (
          <Link href={`/capa/${capa.id}`} style={{ padding: "7px 14px", borderRadius: 9, border: `1px solid ${T.purpleBrd}`, background: T.purpleDim, color: T.purple, fontWeight: 800, fontSize: 12, textDecoration: "none" }}>View CAPA →</Link>
        )}
      </div>
    </div>
  );

  if (status === "done") return (
    <div className="cv-ncr-banner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", borderRadius: 12, background: T.redDim, border: `1px solid ${T.redBrd}`, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>🚨</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: T.red }}>NCR &amp; CAPA auto-raised</div>
          <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>Non-compliance detected — compliance records created automatically</div>
          {ncr && (
            <div style={{ marginTop: 5, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.red, fontWeight: 700 }}>{ncr.ncr_number}</span>
              {capa && <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.purple, fontWeight: 700 }}>{capa.capa_number}</span>}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {ncr && (
          <Link href={`/ncr/${ncr.id}`} style={{ padding: "8px 14px", borderRadius: 9, border: `1px solid ${T.redBrd}`, background: "rgba(248,113,113,0.2)", color: T.red, fontWeight: 900, fontSize: 12, textDecoration: "none", whiteSpace: "nowrap" }}>Open NCR →</Link>
        )}
        {capa && (
          <Link href={`/capa/${capa.id}`} style={{ padding: "8px 14px", borderRadius: 9, border: `1px solid ${T.purpleBrd}`, background: T.purpleDim, color: T.purple, fontWeight: 900, fontSize: 12, textDecoration: "none", whiteSpace: "nowrap" }}>Open CAPA →</Link>
        )}
      </div>
    </div>
  );

  if (status === "error") return (
    <div className="cv-ncr-banner" style={{ padding: "11px 14px", borderRadius: 12, background: T.redDim, border: `1px solid ${T.redBrd}`, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 14 }}>⚠</span>
      <div style={{ fontSize: 12, color: T.red, fontWeight: 700 }}>
        NCR auto-generation failed: {error} — <Link href="/ncr/new" style={{ color: T.red }}>create manually</Link>
      </div>
    </div>
  );

  return null;
}

// ── Main inner component ──────────────────────────────────────────────────────
function CertificateDetailsInner() {
  const params       = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const id           = normalizeId(params?.id);

  const [loading,     setLoading]     = useState(true);
  const [record,      setRecord]      = useState(null);
  const [bundle,      setBundle]      = useState([]);
  const [error,       setError]       = useState("");
  const [showLink,    setShowLink]    = useState(false);
  const [linkSearch,  setLinkSearch]  = useState("");
  const [linkResults, setLinkResults] = useState([]);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linking,     setLinking]     = useState(false);
  const [unlinking,   setUnlinking]   = useState(false);
  const [linkMsg,     setLinkMsg]     = useState("");
  const [savingPdf,   setSavingPdf]   = useState(false);
  const [deleting,    setDeleting]    = useState(false);

  // NCR/CAPA auto-raise state
  const [ncrStatus, setNcrStatus] = useState(null); // null|"generating"|"done"|"skipped"|"error"
  const [ncrResult, setNcrResult] = useState({ ncr: null, capa: null });
  const [ncrError,  setNcrError]  = useState("");
  const autoRanRef = useRef(false);

  useEffect(() => { if (id) loadCertificate(); }, [id]);

  useEffect(() => {
    if (!id) return;
    if (searchParams.get("download") === "1")
      window.location.replace(`/certificates/print/${id}`);
  }, [searchParams, id]);

  // Auto-raise NCR/CAPA once record is loaded and result is non-pass
  useEffect(() => {
    if (!record || autoRanRef.current) return;
    const result = String(record.result || "").toUpperCase().replace(/\s+/g, "_");
    if (!NON_PASS.includes(result)) return;
    autoRanRef.current = true;
    setNcrStatus("generating");
    autoRaiseNcr(record, { createCapa: true })
      .then(({ ncr, capa, skipped, error: ncrErr }) => {
        if (ncrErr && !ncr) { setNcrStatus("error"); setNcrError(ncrErr); return; }
        setNcrResult({ ncr, capa });
        setNcrStatus(skipped ? "skipped" : "done");
      })
      .catch(err => { setNcrStatus("error"); setNcrError(err?.message || "Unknown error"); });
  }, [record]);

  async function loadCertificate() {
    setLoading(true); setError("");
    const { data, error: e } = await supabase.from("certificates").select("*").eq("id", id).maybeSingle();
    if (e || !data) { setRecord(null); setBundle([]); setError(e?.message || "Certificate not found."); setLoading(false); return; }
    setRecord(data);
    if (data.folder_id) {
      const { data: linked } = await supabase.from("certificates").select("*")
        .eq("folder_id", data.folder_id)
        .order("folder_position", { ascending: true })
        .order("created_at", { ascending: true });
      setBundle(linked?.length ? linked : [data]);
    } else {
      setBundle([data]);
    }
    setLoading(false);
  }

  async function searchCerts(q) {
    if (!q || q.length < 2) { setLinkResults([]); return; }
    setLinkLoading(true);
    const { data } = await supabase.from("certificates")
      .select("id,certificate_number,equipment_description,equipment_type,client_name,folder_id")
      .or(`certificate_number.ilike.%${q}%,equipment_description.ilike.%${q}%,client_name.ilike.%${q}%`)
      .neq("id", id).is("folder_id", null).limit(8);
    setLinkResults(data || []); setLinkLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(() => searchCerts(linkSearch), 300);
    return () => clearTimeout(t);
  }, [linkSearch]);

  async function handleLink(targetId) {
    setLinking(true); setLinkMsg("");
    const folderId   = record?.folder_id || crypto.randomUUID();
    const folderName = record?.folder_name || `Folder-${record?.certificate_number || id}`;
    const [r1, r2] = await Promise.all([
      supabase.from("certificates").update({ folder_id: folderId, folder_name: folderName, folder_position: 1 }).eq("id", id),
      supabase.from("certificates").update({ folder_id: folderId, folder_name: folderName, folder_position: 2 }).eq("id", targetId),
    ]);
    if (r1.error || r2.error) { setLinkMsg("Link failed: " + (r1.error?.message || r2.error?.message)); }
    else { setLinkMsg("Linked!"); setShowLink(false); setLinkSearch(""); setLinkResults([]); await loadCertificate(); }
    setLinking(false);
  }

  async function handleUnlink() {
    if (!record?.folder_id) return;
    setUnlinking(true); setLinkMsg("");
    const folderId = record.folder_id;
    const { error: e } = await supabase.from("certificates")
      .update({ folder_id: null, folder_name: null, folder_position: null }).eq("id", id);
    if (e) { setLinkMsg("Unlink failed: " + e.message); setUnlinking(false); return; }
    const { data: remaining } = await supabase.from("certificates").select("id").eq("folder_id", folderId);
    if (remaining && remaining.length === 1) {
      await supabase.from("certificates").update({ folder_id: null, folder_name: null, folder_position: null }).eq("id", remaining[0].id);
    }
    setLinkMsg("Unlinked successfully.");
    await loadCertificate();
    setUnlinking(false);
  }

  function handlePrint() {
    if (isLinked && bundle.length > 1) {
      bundle.forEach((c, i) => {
        setTimeout(() => window.open(`/certificates/print/${encodeURIComponent(String(c.id))}`, "_blank"), i * 400);
      });
    } else {
      window.open(`/certificates/print/${id}`, "_blank", "noopener,noreferrer");
    }
  }

  function handleSavePdf() {
    setSavingPdf(true);
    window.open(`/certificates/print/${id}`, "_blank", "noopener,noreferrer");
    setTimeout(() => setSavingPdf(false), 2000);
  }

  async function handleDelete() {
    const certNo = record?.certificate_number || "this certificate";
    if (!window.confirm(`Permanently delete ${certNo}? This cannot be undone.`)) return;
    setDeleting(true);
    const folderId = record?.folder_id;
    const { error: e } = await supabase.from("certificates").delete().eq("id", id);
    if (e) { alert("Delete failed: " + e.message); setDeleting(false); return; }
    if (folderId) {
      const { data: remaining } = await supabase.from("certificates").select("id").eq("folder_id", folderId);
      if (remaining && remaining.length === 1) {
        await supabase.from("certificates").update({ folder_id: null, folder_name: null, folder_position: null }).eq("id", remaining[0].id);
      }
    }
    router.replace("/certificates");
  }

  const tone      = useMemo(() => resultTone(pickResult(record)), [record]);
  const isLinked  = !!record?.folder_id;
  const isNonPass = NON_PASS.includes(String(record?.result || "").toUpperCase().replace(/\s+/g, "_"));

  return (
    <AppLayout title="Certificate View">
      <style>{CSS}</style>
      <div className="view-page-pad" style={{
        background: `radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.05),transparent),${T.bg}`,
        color: T.text, fontFamily: "'IBM Plex Sans',sans-serif", padding: 20,
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gap: 16 }}>

          {/* ── HEADER ─────────────────────────────────────────────────────── */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: "16px 20px", backdropFilter: "blur(20px)" }}>
            <div className="view-hdr">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: T.accent, marginBottom: 6 }}>Certificate Viewer</div>
                <h1 className="view-cert-title" style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {record?.certificate_number || "Certificate"}
                </h1>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ padding: "4px 10px", borderRadius: 99, background: tone.bg, color: tone.color, border: `1px solid ${tone.brd}`, fontSize: 11, fontWeight: 800 }}>{tone.label}</span>
                  {isLinked && (
                    <span style={{ padding: "4px 10px", borderRadius: 99, background: T.accentDim, color: T.accent, border: `1px solid ${T.accentBrd}`, fontSize: 11, fontWeight: 700 }}>
                      📁 {record.folder_name || "Linked"} · {bundle.length} certs
                    </span>
                  )}
                  {record?.equipment_type && (
                    <span style={{ padding: "4px 10px", borderRadius: 99, background: T.card, color: T.textMid, border: `1px solid ${T.border}`, fontSize: 11, fontWeight: 600 }}>{record.equipment_type}</span>
                  )}
                  {ncrStatus === "generating" && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: T.accent }}>
                      <div className="cv-spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }}/>
                      Raising NCR…
                    </span>
                  )}
                </div>
              </div>

              <div className="view-btn-row">
                <button type="button" onClick={() => router.back()} style={S.btnGhost}>← Back</button>

                {!isLinked ? (
                  <button type="button" onClick={() => { setShowLink(p => !p); setLinkMsg(""); }}
                    style={{ ...S.btnPurple, background: showLink ? "rgba(167,139,250,0.20)" : S.btnPurple.background }}>
                    🔗 Link
                  </button>
                ) : (
                  <button type="button" onClick={handleUnlink} disabled={unlinking}
                    style={{ ...S.btnPurple, opacity: unlinking ? 0.5 : 1 }}>
                    {unlinking ? "Unlinking…" : "Unlink"}
                  </button>
                )}

                <Link href={`/certificates/${id}/edit`} style={S.btnAmber}>✏️ Edit</Link>
                <button type="button" onClick={handlePrint} style={S.btnGhostSm2}>🖨 Print</button>
                <button type="button" onClick={handleSavePdf} disabled={savingPdf} style={S.btnGreen}>
                  {savingPdf ? "Opening…" : "⬇ Save PDF"}
                </button>
                <button type="button" onClick={handleDelete} disabled={deleting}
                  style={{ padding: "9px 14px", borderRadius: 10, border: `1px solid ${T.redBrd}`, background: T.redDim, color: T.red, fontWeight: 800, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans',sans-serif", WebkitTapHighlightColor: "transparent", opacity: deleting ? 0.5 : 1 }}>
                  {deleting ? "Deleting…" : "🗑 Delete"}
                </button>
              </div>
            </div>

            {linkMsg && (
              <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 9,
                background: linkMsg.toLowerCase().includes("fail") ? T.redDim : T.greenDim,
                color: linkMsg.toLowerCase().includes("fail") ? T.red : T.green,
                fontSize: 12, fontWeight: 700 }}>
                {linkMsg}
              </div>
            )}
          </div>

          {/* ── NCR/CAPA AUTO-RAISE BANNER ──────────────────────────────────── */}
          {isNonPass && (
            <NcrBanner
              status={ncrStatus}
              ncr={ncrResult.ncr}
              capa={ncrResult.capa}
              error={ncrError}
            />
          )}

          {/* ── LINK PANEL ──────────────────────────────────────────────────── */}
          {showLink && !isLinked && (
            <div style={{ background: T.panel, border: `1px solid ${T.purpleBrd}`, borderRadius: 14, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 14 }}>🔗</span>
                <div style={{ fontSize: 13, fontWeight: 800, color: T.purple }}>Link to Another Certificate</div>
                <div style={{ fontSize: 11, color: T.textDim, marginLeft: "auto" }}>Linked certs print together as a folder</div>
              </div>
              <input value={linkSearch} onChange={e => setLinkSearch(e.target.value)}
                placeholder="Search by certificate number, equipment, or client…"
                style={{ width: "100%", padding: "10px 13px", borderRadius: 9, border: `1px solid ${T.border}`, background: "rgba(18,30,50,0.70)", color: T.text, fontSize: 13, outline: "none", fontFamily: "'IBM Plex Sans',sans-serif", marginBottom: 10 }}
              />
              {linkLoading && <div style={{ fontSize: 12, color: T.textDim, textAlign: "center", padding: "6px 0" }}>Searching…</div>}
              {!linkLoading && linkSearch.length >= 2 && linkResults.length === 0 && (
                <div style={{ fontSize: 12, color: T.textDim, textAlign: "center", padding: "6px 0" }}>No unlinked certificates found for "{linkSearch}"</div>
              )}
              <div style={{ display: "grid", gap: 7 }}>
                {linkResults.map(cert => (
                  <div key={cert.id} className="link-search-result" onClick={() => !linking && handleLink(cert.id)} style={{ WebkitTapHighlightColor: "transparent" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: T.accent, fontFamily: "'IBM Plex Mono',monospace" }}>{cert.certificate_number || "—"}</div>
                        <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{cert.equipment_description || "No description"} · {cert.equipment_type || ""}</div>
                        {cert.client_name && <div style={{ fontSize: 11, color: T.textDim }}>{cert.client_name}</div>}
                      </div>
                      <button type="button" disabled={linking} style={{ padding: "6px 13px", borderRadius: 8, border: `1px solid ${T.purpleBrd}`, background: T.purpleDim, color: T.purple, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif", WebkitTapHighlightColor: "transparent" }}>
                        {linking ? "Linking…" : "Link →"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CERTIFICATE SHEET ───────────────────────────────────────────── */}
          {loading ? (
            <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, padding: 32, textAlign: "center", color: T.textDim }}>
              <div style={{ fontSize: 22, marginBottom: 10, opacity: .4 }}>⏳</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Loading certificate…</div>
            </div>
          ) : error ? (
            <div style={{ background: T.redDim, border: `1px solid ${T.redBrd}`, borderRadius: 16, padding: 16, color: T.red, fontSize: 14, fontWeight: 700 }}>⚠ {error}</div>
          ) : (
            <>
              <CertificateSheet certificate={record} index={0} total={bundle.length || 1} />

              {/* ── FOLDER / BUNDLE LIST ──────────────────────────────────── */}
              {bundle.length > 1 && (
                <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 4, height: 18, borderRadius: 2, background: `linear-gradient(to bottom,${T.accent},rgba(34,211,238,0.3))` }}/>
                    <div style={{ fontSize: 14, fontWeight: 900 }}>Linked certificates in this folder</div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: T.accentDim, color: T.accent, border: `1px solid ${T.accentBrd}` }}>{bundle.length}</span>
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {bundle.map(item => {
                      const active   = String(item.id) === String(id);
                      const itemTone = resultTone(pickResult(item));
                      return (
                        <div key={item.id} className="bundle-item" style={{ border: `1px solid ${active ? T.accentBrd : T.border}`, background: active ? T.accentDim : T.card, borderRadius: 12, padding: "12px 14px" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                              <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{item.certificate_number || "—"}</div>
                              <span style={{ padding: "2px 7px", borderRadius: 99, background: itemTone.bg, color: itemTone.color, border: `1px solid ${itemTone.brd}`, fontSize: 10, fontWeight: 800 }}>{itemTone.label}</span>
                              {active && <span style={{ fontSize: 10, fontWeight: 800, color: T.accent }}>← Current</span>}
                            </div>
                            <div style={{ color: T.textMid, fontSize: 12 }}>{item.equipment_description || item.asset_name || "Unnamed equipment"}</div>
                            <div style={{ color: T.textDim, fontSize: 11, marginTop: 3 }}>Position {item.folder_position || 1}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <Link href={`/certificates/${item.id}`}      style={S.btnGhostSm}>View</Link>
                            <Link href={`/certificates/${item.id}/edit`} style={S.btnGhostSm}>Edit</Link>
                            <button type="button"
                              style={{ ...S.btnGhostSm, border: `1px solid ${T.redBrd}`, color: T.red, background: T.redDim, cursor: "pointer" }}
                              onClick={async () => {
                                const fId = item.folder_id;
                                await supabase.from("certificates").update({ folder_id: null, folder_name: null, folder_position: null }).eq("id", item.id);
                                if (fId) {
                                  const { data: rem } = await supabase.from("certificates").select("id").eq("folder_id", fId);
                                  if (rem && rem.length === 1) {
                                    await supabase.from("certificates").update({ folder_id: null, folder_name: null, folder_position: null }).eq("id", rem[0].id);
                                  }
                                }
                                await loadCertificate();
                              }}>
                              Unlink
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </AppLayout>
  );
}

export default function CertificateDetailsPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#070e18", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(240,246,255,0.4)", fontSize: 14, fontFamily: "'IBM Plex Sans',sans-serif" }}>
        Loading…
      </div>
    }>
      <CertificateDetailsInner />
    </Suspense>
  );
}

const S = {
  btnGhost:    { padding: "9px 14px", borderRadius: 10, border: `1px solid rgba(148,163,184,0.18)`, background: "rgba(255,255,255,0.04)", color: "#f0f6ff", fontWeight: 700, fontSize: 12, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans',sans-serif", WebkitTapHighlightColor: "transparent" },
  btnGhostSm2: { padding: "9px 14px", borderRadius: 10, border: `1px solid rgba(148,163,184,0.18)`, background: "rgba(255,255,255,0.04)", color: "#f0f6ff", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans',sans-serif", WebkitTapHighlightColor: "transparent" },
  btnAmber:    { padding: "9px 14px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#fbbf24,#f97316)", color: "#1a0a00", fontWeight: 900, fontSize: 12, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" },
  btnGreen:    { padding: "9px 14px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#34d399,#14b8a6)", color: "#052e16", fontWeight: 900, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans',sans-serif", WebkitTapHighlightColor: "transparent" },
  btnPurple:   { padding: "9px 14px", borderRadius: 10, border: `1px solid rgba(167,139,250,0.25)`, background: "rgba(167,139,250,0.10)", color: "#a78bfa", fontWeight: 800, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans',sans-serif", WebkitTapHighlightColor: "transparent" },
  btnGhostSm:  { padding: "6px 11px", borderRadius: 8, border: `1px solid rgba(148,163,184,0.18)`, background: "rgba(255,255,255,0.04)", color: "#f0f6ff", fontWeight: 700, fontSize: 11, textDecoration: "none", display: "inline-flex", alignItems: "center", WebkitTapHighlightColor: "transparent" },
};
