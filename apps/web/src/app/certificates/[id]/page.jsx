// src/app/certificates/[id]/page.jsx
// Auto-raises NCR + CAPA whenever a non-PASS certificate is opened.
// Shows a live status banner while it runs, then links to the created NCR/CAPA.
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
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
  @keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
  @keyframes slideIn{from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}

  .cv-spinner{width:16px;height:16px;border-radius:50%;border:2px solid rgba(34,211,238,0.25);border-top-color:#22d3ee;animation:spin .7s linear infinite;flex-shrink:0}
  .cv-ncr-banner{animation:slideIn .25s ease}
  .cv-row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:9px 0;border-bottom:1px solid rgba(148,163,184,0.08);font-size:13px}
  .cv-row:last-child{border-bottom:none}
  .cv-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .cv-btns{display:flex;gap:8px;flex-wrap:wrap}
  .cv-hdr{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}

  @media(max-width:768px){
    .cv-page{padding:12px!important}
    .cv-grid{grid-template-columns:1fr}
    .cv-hdr{flex-direction:column}
    .cv-btns{width:100%}
    .cv-btns a,.cv-btns button{flex:1;text-align:center;justify-content:center}
  }
  @media(max-width:480px){.cv-btns{flex-direction:column}}
`;

const NON_PASS = ["FAIL","REPAIR_REQUIRED","OUT_OF_SERVICE","CONDITIONAL"];

function normalizeResult(v) {
  return String(v || "").toUpperCase().replace(/\s+/g, "_");
}

function resultStyle(r) {
  const x = normalizeResult(r);
  if (x === "PASS")            return { color: T.green,  bg: T.greenDim,  brd: T.greenBrd,  label: "Pass" };
  if (x === "FAIL")            return { color: T.red,    bg: T.redDim,    brd: T.redBrd,    label: "Fail" };
  if (x === "REPAIR_REQUIRED") return { color: T.amber,  bg: T.amberDim,  brd: T.amberBrd,  label: "Repair Required" };
  if (x === "OUT_OF_SERVICE")  return { color: T.purple, bg: T.purpleDim, brd: T.purpleBrd, label: "Out of Service" };
  if (x === "CONDITIONAL")     return { color: T.amber,  bg: T.amberDim,  brd: T.amberBrd,  label: "Conditional" };
  return { color: T.textDim, bg: T.card, brd: T.border, label: r || "Unknown" };
}

function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

function nz(v, fb = "—") {
  if (!v && v !== 0) return fb;
  return String(v).trim() || fb;
}

function Badge({ label, color, bg, brd, size = 11 }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: 99, background: bg, color, border: `1px solid ${brd}`, fontSize: size, fontWeight: 800, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function Row({ label, value, mono = false, accent = false }) {
  return (
    <div className="cv-row">
      <span style={{ color: T.textDim, fontSize: 12, flexShrink: 0, minWidth: 130 }}>{label}</span>
      <span style={{ color: accent ? T.accent : T.textMid, fontWeight: 600, textAlign: "right", wordBreak: "break-word", ...(mono ? { fontFamily: "'IBM Plex Mono',monospace" } : {}) }}>
        {nz(value)}
      </span>
    </div>
  );
}

function Sec({ icon, title, children, brd }) {
  return (
    <div style={{ background: T.panel, border: `1px solid ${brd || T.border}`, borderRadius: 16, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{title}</div>
      </div>
      {children}
    </div>
  );
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
        <Link href={`/ncr/${ncr.id}`} style={{ padding: "7px 14px", borderRadius: 9, border: `1px solid ${T.amberBrd}`, background: T.amberDim, color: T.amber, fontWeight: 800, fontSize: 12, textDecoration: "none" }}>
          View NCR →
        </Link>
        {capa && (
          <Link href={`/capa/${capa.id}`} style={{ padding: "7px 14px", borderRadius: 9, border: `1px solid ${T.purpleBrd}`, background: T.purpleDim, color: T.purple, fontWeight: 800, fontSize: 12, textDecoration: "none" }}>
            View CAPA →
          </Link>
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
          <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
            Non-compliance detected — compliance records created automatically
          </div>
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
          <Link href={`/ncr/${ncr.id}`} style={{ padding: "8px 14px", borderRadius: 9, border: `1px solid ${T.redBrd}`, background: "rgba(248,113,113,0.2)", color: T.red, fontWeight: 900, fontSize: 12, textDecoration: "none", whiteSpace: "nowrap" }}>
            Open NCR →
          </Link>
        )}
        {capa && (
          <Link href={`/capa/${capa.id}`} style={{ padding: "8px 14px", borderRadius: 9, border: `1px solid ${T.purpleBrd}`, background: T.purpleDim, color: T.purple, fontWeight: 900, fontSize: 12, textDecoration: "none", whiteSpace: "nowrap" }}>
            Open CAPA →
          </Link>
        )}
      </div>
    </div>
  );

  if (status === "error") return (
    <div className="cv-ncr-banner" style={{ padding: "11px 14px", borderRadius: 12, background: T.redDim, border: `1px solid ${T.redBrd}`, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 14 }}>⚠</span>
      <div style={{ fontSize: 12, color: T.red, fontWeight: 700 }}>NCR auto-generation failed: {error} — <Link href="/ncr/new" style={{ color: T.red }}>create manually</Link></div>
    </div>
  );

  return null;
}

export default function CertificateViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [cert,    setCert]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // NCR/CAPA auto-generation state
  const [ncrStatus, setNcrStatus] = useState(null); // null|"generating"|"done"|"skipped"|"error"
  const [ncrResult, setNcrResult] = useState({ ncr: null, capa: null });
  const [ncrError,  setNcrError]  = useState("");
  const autoRanRef = useRef(false);

  // Load certificate
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true); setError("");
      const { data, error: e } = await supabase
        .from("certificates")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (e || !data) {
        setError(e?.message || "Certificate not found.");
        setLoading(false);
        return;
      }
      setCert(data);
      setLoading(false);
    })();
  }, [id]);

  // Auto-raise NCR/CAPA once cert is loaded and result is non-pass
  useEffect(() => {
    if (!cert || autoRanRef.current) return;
    const result = normalizeResult(cert.result);
    if (!NON_PASS.includes(result)) return;

    autoRanRef.current = true;
    setNcrStatus("generating");

    autoRaiseNcr(cert, { createCapa: true })
      .then(({ ncr, capa, skipped, error: ncrErr }) => {
        if (ncrErr && !ncr) {
          setNcrStatus("error");
          setNcrError(ncrErr);
          return;
        }
        setNcrResult({ ncr, capa });
        setNcrStatus(skipped ? "skipped" : "done");
      })
      .catch(err => {
        setNcrStatus("error");
        setNcrError(err?.message || "Unknown error");
      });
  }, [cert]);

  if (loading) return (
    <>
      <style>{CSS}</style>
      <AppLayout title="Certificate">
        <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans',sans-serif" }}>
          <div style={{ textAlign: "center", color: T.textDim }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${T.accentBrd}`, borderTopColor: T.accent, animation: "spin .8s linear infinite", margin: "0 auto 14px" }}/>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Loading certificate…</div>
          </div>
        </div>
      </AppLayout>
    </>
  );

  if (error || !cert) return (
    <>
      <style>{CSS}</style>
      <AppLayout title="Certificate">
        <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'IBM Plex Sans',sans-serif" }}>
          <div style={{ background: T.redDim, border: `1px solid ${T.redBrd}`, borderRadius: 14, padding: 24, color: T.red, fontWeight: 700, maxWidth: 400, textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>⚠</div>
            {error || "Certificate not found."}
            <br/>
            <button onClick={() => router.push("/certificates")} style={{ marginTop: 14, padding: "9px 18px", borderRadius: 10, border: "none", background: T.redDim, color: T.red, cursor: "pointer", fontWeight: 700, fontFamily: "'IBM Plex Sans',sans-serif" }}>
              ← Back to Certificates
            </button>
          </div>
        </div>
      </AppLayout>
    </>
  );

  const rs = resultStyle(cert.result);
  const isNonPass = NON_PASS.includes(normalizeResult(cert.result));
  const encodedId = encodeURIComponent(String(cert.id));

  return (
    <>
      <style>{CSS}</style>
      <AppLayout title={cert.certificate_number || "Certificate"}>
        <div className="cv-page" style={{ minHeight: "100vh", background: `radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.05),transparent),${T.bg}`, color: T.text, fontFamily: "'IBM Plex Sans',sans-serif", padding: 24 }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 16 }}>

            {/* HEADER */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: "18px 20px", backdropFilter: "blur(20px)" }}>
              <div className="cv-hdr">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: T.accent, marginBottom: 7 }}>
                    ISO 9001 · Certificate
                  </div>
                  <h1 style={{ margin: 0, fontSize: "clamp(16px,3vw,22px)", fontWeight: 900, letterSpacing: "-0.02em", fontFamily: "'IBM Plex Mono',monospace", color: T.accent }}>
                    {cert.certificate_number || "Certificate"}
                  </h1>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <Badge label={rs.label} color={rs.color} bg={rs.bg} brd={rs.brd}/>
                    {cert.equipment_type && (
                      <span style={{ padding: "4px 10px", borderRadius: 99, background: T.card, border: `1px solid ${T.border}`, fontSize: 10, fontWeight: 700, color: T.textDim }}>
                        {cert.equipment_type}
                      </span>
                    )}
                    {ncrStatus === "generating" && (
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: T.accent }}>
                        <div className="cv-spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }}/>
                        Raising NCR…
                      </span>
                    )}
                  </div>
                </div>
                <div className="cv-btns">
                  <button type="button" onClick={() => router.push("/certificates")}
                    style={{ padding: "9px 14px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.card, color: T.textMid, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'IBM Plex Sans',sans-serif" }}>
                    ← Back
                  </button>
                  <Link href={`/certificates/${encodedId}/edit`}
                    style={{ padding: "9px 14px", borderRadius: 10, border: `1px solid ${T.amberBrd}`, background: T.amberDim, color: T.amber, fontWeight: 800, fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                    Edit
                  </Link>
                  <Link href={`/certificates/print/${encodedId}`} target="_blank"
                    style={{ padding: "9px 14px", borderRadius: 10, border: `1px solid ${T.greenBrd}`, background: T.greenDim, color: T.green, fontWeight: 800, fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                    🖨 Print
                  </Link>
                </div>
              </div>
            </div>

            {/* NCR/CAPA AUTO-RAISE BANNER */}
            {isNonPass && (
              <NcrBanner
                status={ncrStatus}
                ncr={ncrResult.ncr}
                capa={ncrResult.capa}
                error={ncrError}
              />
            )}

            {/* MAIN CONTENT GRID */}
            <div className="cv-grid">

              {/* Certificate Info */}
              <Sec icon="📋" title="Certificate Details">
                <Row label="Certificate No."    value={cert.certificate_number} mono accent />
                <Row label="Certificate Type"   value={cert.certificate_type} />
                <Row label="Inspection No."     value={cert.inspection_number || cert.inspection_no} />
                <Row label="Result"             value={rs.label} />
                <Row label="Issue Date"         value={formatDate(cert.issue_date || cert.issued_at)} />
                <Row label="Inspection Date"    value={formatDate(cert.inspection_date)} />
                <Row label="Expiry Date"        value={formatDate(cert.expiry_date)} />
                <Row label="Status"             value={cert.status} />
              </Sec>

              {/* Client & Equipment */}
              <Sec icon="⚙️" title="Equipment & Client">
                <Row label="Client"             value={cert.client_name || cert.company} />
                <Row label="Location"           value={cert.location} />
                <Row label="Equipment"          value={cert.equipment_description || cert.asset_name} />
                <Row label="Type"               value={cert.equipment_type || cert.asset_type} />
                <Row label="Serial Number"      value={cert.serial_number} mono />
                <Row label="Fleet Number"       value={cert.fleet_number} />
                <Row label="Reg. Number"        value={cert.registration_number} />
                <Row label="Manufacturer"       value={cert.manufacturer} />
                <Row label="Model"              value={cert.model} />
                <Row label="SWL / Capacity"     value={cert.swl} />
              </Sec>
            </div>

            {/* Technical Data */}
            {(cert.mawp || cert.working_pressure || cert.test_pressure || cert.swl || cert.capacity_volume) && (
              <Sec icon="📐" title="Technical Data">
                <div className="cv-grid">
                  <div>
                    {cert.swl             && <Row label="Safe Working Load"   value={cert.swl} />}
                    {cert.mawp            && <Row label="MAWP"                value={`${cert.mawp} ${cert.pressure_unit || "bar"}`} />}
                    {cert.working_pressure&& <Row label="Working Pressure"    value={`${cert.working_pressure} ${cert.pressure_unit || "bar"}`} />}
                    {cert.test_pressure   && <Row label="Test Pressure"       value={`${cert.test_pressure} ${cert.pressure_unit || "bar"}`} />}
                    {cert.design_pressure && <Row label="Design Pressure"     value={`${cert.design_pressure} ${cert.pressure_unit || "bar"}`} />}
                    {cert.capacity_volume && <Row label="Capacity / Volume"   value={cert.capacity_volume} />}
                  </div>
                  <div>
                    {cert.inspector_name  && <Row label="Inspector"           value={cert.inspector_name} />}
                    {cert.inspector_id    && <Row label="Inspector ID"        value={cert.inspector_id} mono />}
                    {cert.machine_hours   && <Row label="Machine Hours"       value={cert.machine_hours} />}
                    {cert.lanyard_serial_no && <Row label="Lanyard Serial"    value={cert.lanyard_serial_no} mono />}
                  </div>
                </div>
              </Sec>
            )}

            {/* Defects — highlighted red if non-pass */}
            {cert.defects_found && (
              <div style={{ background: T.redDim, border: `1px solid ${T.redBrd}`, borderRadius: 14, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 16 }}>🔴</span>
                  <div style={{ fontSize: 13, fontWeight: 900, color: T.red }}>Defects Found</div>
                </div>
                <p style={{ fontSize: 13, color: "#fca5a5", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{cert.defects_found}</p>
              </div>
            )}

            {/* Recommendations */}
            {cert.recommendations && (
              <Sec icon="💡" title="Recommendations" brd={T.amberBrd}>
                <p style={{ fontSize: 13, color: T.amber, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{cert.recommendations}</p>
              </Sec>
            )}

            {/* Comments */}
            {cert.comments && (
              <Sec icon="💬" title="Comments">
                <p style={{ fontSize: 13, color: T.textMid, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{cert.comments}</p>
              </Sec>
            )}

            {/* Legal compliance */}
            <Sec icon="⚖️" title="Legal Compliance">
              <p style={{ fontSize: 12, color: T.textDim, lineHeight: 1.7, margin: 0 }}>
                This inspection has been performed by a <strong style={{ color: T.textMid }}>competent person</strong> as defined under the{" "}
                <strong style={{ color: T.textMid }}>Mines, Quarries, Works and Machinery Act Cap 44:02</strong> of the Laws of Botswana.
              </p>
            </Sec>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingBottom: 16 }}>
              <Link href={`/certificates/${encodedId}/edit`}
                style={{ padding: "11px 20px", borderRadius: 11, border: `1px solid ${T.amberBrd}`, background: T.amberDim, color: T.amber, fontWeight: 900, fontSize: 13, textDecoration: "none" }}>
                ✏️ Edit Certificate
              </Link>
              <Link href={`/certificates/print/${encodedId}`} target="_blank"
                style={{ padding: "11px 20px", borderRadius: 11, border: `1px solid ${T.greenBrd}`, background: T.greenDim, color: T.green, fontWeight: 900, fontSize: 13, textDecoration: "none" }}>
                🖨 Print / Save PDF
              </Link>
              {/* Manual NCR override — if auto-raise failed or was skipped with no NCR */}
              {isNonPass && ncrStatus !== "generating" && !ncrResult.ncr && (
                <Link
                  href={`/ncr/new?certificate_id=${cert.id}&certificate_number=${encodeURIComponent(cert.certificate_number||"")}&result=${encodeURIComponent(cert.result||"")}&client_name=${encodeURIComponent(cert.client_name||"")}&equipment_description=${encodeURIComponent(cert.equipment_description||cert.asset_name||"")}&equipment_type=${encodeURIComponent(cert.equipment_type||"")}&inspection_date=${encodeURIComponent(cert.inspection_date||"")}&expiry_date=${encodeURIComponent(cert.expiry_date||"")}`}
                  style={{ padding: "11px 20px", borderRadius: 11, border: `1px solid ${T.redBrd}`, background: T.redDim, color: T.red, fontWeight: 900, fontSize: 13, textDecoration: "none" }}>
                  🚨 Raise NCR Manually
                </Link>
              )}
              {isNonPass && ncrResult.ncr && (
                <Link href={`/ncr/${ncrResult.ncr.id}`}
                  style={{ padding: "11px 20px", borderRadius: 11, border: `1px solid ${T.redBrd}`, background: T.redDim, color: T.red, fontWeight: 900, fontSize: 13, textDecoration: "none" }}>
                  🚨 View NCR
                </Link>
              )}
            </div>

          </div>
        </div>
      </AppLayout>
    </>
  );
}
