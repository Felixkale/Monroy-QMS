// src/components/certificates/CertificateSheet.jsx
"use client";

const PRINT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

  .cert-sheet {
    background:#ffffff; color:#0f1923;
    font-family:'IBM Plex Sans',sans-serif;
    width:100%; max-width:794px; margin:0 auto;
    box-shadow:0 4px 32px rgba(0,0,0,0.18);
    border-radius:4px; overflow:hidden;
    min-height:600px; display:flex; flex-direction:column;
  }
  .cert-sheet.print-mode { box-shadow:none; border-radius:0; min-height:unset; }

  /* Header */
  .cert-header {
    background:#0b1929; color:#fff;
    padding:20px 28px 18px;
    display:flex; align-items:flex-start;
    justify-content:space-between; gap:16px;
  }
  .cert-company-name { font-size:10px; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:#22d3ee; margin-bottom:6px; }
  .cert-doc-title    { font-size:22px; font-weight:900; letter-spacing:-.02em; color:#fff; line-height:1.1; margin-bottom:4px; }
  .cert-doc-subtitle { font-size:11px; color:rgba(255,255,255,0.55); font-weight:500; }
  .cert-header-right { display:flex; flex-direction:column; align-items:flex-end; gap:8px; flex-shrink:0; }
  .cert-logo {
    width:56px; height:56px; border-radius:10px; overflow:hidden;
    border:1px solid rgba(34,211,238,0.25); background:rgba(34,211,238,0.08);
    display:flex; align-items:center; justify-content:center;
  }
  .cert-logo img { width:100%; height:100%; object-fit:contain; }
  .cert-logo-fallback { font-size:22px; font-weight:900; color:#22d3ee; font-family:'IBM Plex Mono',monospace; }
  .cert-result-badge { font-size:11px; font-weight:800; padding:4px 12px; border-radius:99px; letter-spacing:.08em; text-transform:uppercase; }

  .cert-accent-bar { height:3px; background:linear-gradient(90deg,#22d3ee 0%,#60a5fa 50%,#a78bfa 100%); }

  /* Body */
  .cert-body  { flex:1; padding:18px 28px 14px; display:grid; gap:12px; }
  .cert-section { border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; }
  .cert-section-title { background:#f1f5f9; padding:6px 12px; font-size:9px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:#475569; border-bottom:1px solid #e2e8f0; }

  /* Fluid field grid — auto-fills columns, no fixed count */
  .cert-fields { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:0; }
  .cert-field  { padding:9px 12px; border-right:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0; }
  .cert-field:last-child { border-right:none; }
  .cert-field-label { font-size:8px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:#94a3b8; margin-bottom:3px; }
  .cert-field-value { font-size:12px; font-weight:600; color:#0f1923; line-height:1.3; word-break:break-word; }
  .cert-field-value.mono  { font-family:'IBM Plex Mono',monospace; font-size:11px; color:#0e7490; }
  .cert-field-value.large { font-size:14px; font-weight:800; }

  .cert-remarks-text { font-size:11px; color:#334155; line-height:1.6; padding:8px 12px; }

  /* Footer */
  .cert-footer { background:#f8fafc; border-top:2px solid #e2e8f0; padding:14px 28px 12px; }
  .cert-footer-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; margin-bottom:12px; }
  .cert-sig-label { font-size:8px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:#94a3b8; margin-bottom:4px; }
  .cert-sig-line  { border-bottom:1px solid #cbd5e1; height:36px; margin-bottom:4px; display:flex; align-items:flex-end; padding-bottom:4px; }
  .cert-sig-line img { max-height:30px; max-width:100%; object-fit:contain; }
  .cert-sig-name  { font-size:11px; font-weight:600; color:#334155; }
  .cert-sig-id    { font-size:10px; color:#94a3b8; }
  .cert-footer-legal { border-top:1px solid #e2e8f0; padding-top:8px; display:flex; justify-content:space-between; align-items:flex-end; gap:12px; flex-wrap:wrap; }
  .cert-legal-text   { font-size:8px; color:#94a3b8; line-height:1.5; max-width:480px; }
  .cert-page-info    { font-size:9px; font-weight:700; color:#cbd5e1; letter-spacing:.08em; text-transform:uppercase; white-space:nowrap; text-align:right; }

  .cert-sheet-wrap { background:rgba(10,18,32,0.92); border:1px solid rgba(148,163,184,0.12); border-radius:16px; padding:20px; }

  @media print {
    .cert-sheet { box-shadow:none!important; border-radius:0!important; min-height:unset!important; max-width:100%!important; }
    .cert-header,.cert-accent-bar,.cert-section-title,.cert-result-badge,.cert-footer {
      -webkit-print-color-adjust:exact; print-color-adjust:exact;
    }
  }
  @media(max-width:600px) {
    .cert-sheet-wrap { padding:8px; }
    .cert-header { flex-direction:column; }
    .cert-header-right { flex-direction:row; align-items:center; }
    .cert-fields { grid-template-columns:1fr 1fr!important; }
    .cert-doc-title { font-size:16px; }
    .cert-body { padding:10px 12px 8px; gap:8px; }
    .cert-footer { padding:10px 12px 8px; }
    .cert-footer-grid { grid-template-columns:1fr; gap:10px; }
  }
`;

/* ─── Helpers ────────────────────────────────────────────────── */
function formatDate(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).trim() || null;
  return d.toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
}

/**
 * Returns a non-empty string or null.
 * Treats "—", "null", "undefined", "n/a", "unknown" as empty.
 */
function val(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^(—|-|null|undefined|n\/a|unknown)$/i.test(s)) return null;
  return s;
}

/**
 * pickResult — skips stored "UNKNOWN" and finds the real value.
 */
function pickResult(c) {
  if (!c) return "UNKNOWN";
  const ex = c.extracted_data || {};
  const candidates = [c.result, c.equipment_status, ex.result, ex.equipment_status, ex.inspection_result];
  for (const raw of candidates) {
    if (!raw) continue;
    const n = String(raw).trim().toUpperCase().replace(/\s+/g,"_");
    if (n === "UNKNOWN") continue;
    if (n === "CONDITIONAL" || n === "REPAIR REQUIRED") return "REPAIR_REQUIRED";
    if (n === "OUT OF SERVICE") return "OUT_OF_SERVICE";
    if (["PASS","FAIL","REPAIR_REQUIRED","OUT_OF_SERVICE"].includes(n)) return n;
  }
  return "UNKNOWN";
}

function resultStyle(v) {
  if (v === "PASS")            return { bg:"#dcfce7", color:"#15803d", label:"PASS" };
  if (v === "FAIL")            return { bg:"#fee2e2", color:"#b91c1c", label:"FAIL" };
  if (v === "REPAIR_REQUIRED") return { bg:"#fef9c3", color:"#92400e", label:"Repair Required" };
  if (v === "OUT_OF_SERVICE")  return { bg:"#ede9fe", color:"#5b21b6", label:"Out of Service" };
  return { bg:"#f1f5f9", color:"#475569", label:"Unknown" };
}

/* ─── Field component — renders NOTHING if value is empty ─────── */
function Field({ label, value, mono = false, large = false }) {
  if (!value) return null;          // ← key line: skip empty fields entirely
  return (
    <div className="cert-field">
      <div className="cert-field-label">{label}</div>
      <div className={`cert-field-value${mono ? " mono" : ""}${large ? " large" : ""}`}>
        {value}
      </div>
    </div>
  );
}

/* ─── Section — renders NOTHING if all children are null ─────── */
function Section({ title, children }) {
  // Filter out null/false children
  const visible = Array.isArray(children)
    ? children.filter(Boolean)
    : children ? [children] : [];
  if (!visible.length) return null;
  return (
    <div className="cert-section">
      {title && <div className="cert-section-title">{title}</div>}
      <div className="cert-fields">{visible}</div>
    </div>
  );
}

/* ─── Main export ────────────────────────────────────────────── */
export default function CertificateSheet({ certificate: c, index = 0, total = 1, printMode = false }) {
  if (!c) return null;
  const ex = c.extracted_data || {};

  /* Resolve every field — null if empty */
  const company      = val(c.company      || c.client_name   || ex.client_name);
  const certType     = val(c.certificate_type || ex.certificate_type || c.document_category);
  const certNumber   = val(c.certificate_number);
  const inspNumber   = val(c.inspection_no || c.inspection_number || ex.inspection_no);
  const issueDate    = formatDate(c.issue_date || c.issued_at || ex.issue_date);
  const expiryDate   = formatDate(c.expiry_date || c.valid_to || c.next_inspection_date || ex.expiry_date || ex.next_inspection_date);
  const equipDesc    = val(c.equipment_description || c.asset_name || ex.equipment_description);
  const equipType    = val(c.equipment_type || c.asset_type  || ex.equipment_type);
  const equipId      = val(c.equipment_id  || c.asset_tag    || ex.equipment_id);
  const idNumber     = val(c.identification_number || ex.identification_number);
  const lanyardSN    = val(c.lanyard_serial_no || ex.lanyard_serial_no);
  const location     = val(c.equipment_location || c.location || ex.equipment_location);
  const manufacturer = val(c.manufacturer || ex.manufacturer);
  const model        = val(c.model        || ex.model);
  const yearBuilt    = val(c.year_built   || ex.year_built);
  const swl          = val(c.swl          || ex.swl);
  const mawp         = val(c.mawp         || ex.mawp);
  const capacity     = val(c.capacity     || ex.capacity);
  const designP      = val(c.design_pressure  || ex.design_pressure);
  const testP        = val(c.test_pressure    || ex.test_pressure);
  const countryOrig  = val(c.country_of_origin || ex.country_of_origin);
  const legalFmwk    = val(c.legal_framework);
  const inspName     = val(c.inspector_name || ex.inspector_name);
  const inspId       = val(c.inspector_id   || ex.inspector_id);
  const remarks      = val(c.remarks || c.comments || ex.remarks);
  const logoUrl      = c.logo_url || "/logo.png";
  const sigUrl       = val(c.signature_url);

  const resolvedResult = pickResult(c);
  const tone = resultStyle(resolvedResult);

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className={printMode ? "" : "cert-sheet-wrap"}>
        <div className={`cert-sheet${printMode ? " print-mode" : ""}`}>

          {/* HEADER */}
          <div className="cert-header">
            <div style={{ flex:1, minWidth:0 }}>
              {company   && <div className="cert-company-name">{company}</div>}
              <div className="cert-doc-title">{certType || "Certificate of Inspection"}</div>
              <div className="cert-doc-subtitle">
                Page {index + 1} of {total}
                {total > 1 && c.folder_name ? ` · ${c.folder_name}` : ""}
              </div>
            </div>
            <div className="cert-header-right">
              <div className="cert-logo">
                <img src={logoUrl} alt="Logo" onError={e => { e.currentTarget.style.display = "none"; }} />
                <span className="cert-logo-fallback">M</span>
              </div>
              <span className="cert-result-badge" style={{ background:tone.bg, color:tone.color }}>
                {tone.label}
              </span>
            </div>
          </div>

          <div className="cert-accent-bar" />

          {/* BODY — only sections with at least one non-empty field render */}
          <div className="cert-body">

            <Section title="Certificate Details">
              <Field label="Certificate Number"       value={certNumber}   mono large />
              <Field label="Inspection Number"        value={inspNumber}   mono />
              <Field label="Issue Date"               value={issueDate} />
              <Field label="Expiry / Next Inspection" value={expiryDate} />
            </Section>

            <Section title="Client & Location">
              <Field label="Client / Company"   value={company} />
              <Field label="Location"           value={location} />
              <Field label="Certificate Type"   value={certType} />
            </Section>

            <Section title="Equipment">
              <Field label="Description"         value={equipDesc} />
              <Field label="Type"                value={equipType} />
              <Field label="Equipment ID"        value={equipId}    mono />
              <Field label="Identification No."  value={idNumber}   mono />
              <Field label="Manufacturer"        value={manufacturer} />
              <Field label="Model"               value={model} />
              <Field label="Year Built"          value={yearBuilt} />
              <Field label="Country of Origin"   value={countryOrig} />
              <Field label="Lanyard Serial No."  value={lanyardSN}  mono />
            </Section>

            {/* Technical — only fields with values appear */}
            <Section title="Technical Data">
              <Field label="Safe Working Load (SWL)"     value={swl} />
              <Field label="MAWP / Working Pressure"     value={mawp} />
              <Field label="Capacity / Volume"           value={capacity} />
              <Field label="Design Pressure"             value={designP} />
              <Field label="Test Pressure"               value={testP} />
            </Section>

            {/* Inspector */}
            <Section title="Inspector">
              <Field label="Inspector Name" value={inspName} />
              <Field label="Inspector ID"   value={inspId}   mono />
            </Section>

            {/* Remarks — only if there's something to say */}
            {remarks && (
              <div className="cert-section">
                <div className="cert-section-title">Remarks / Conditions</div>
                <div className="cert-remarks-text">{remarks}</div>
              </div>
            )}

          </div>

          {/* FOOTER */}
          <div className="cert-footer">
            <div className="cert-footer-grid">

              <div>
                <div className="cert-sig-label">Authorised Inspector</div>
                <div className="cert-sig-line">
                  {sigUrl && <img src={sigUrl} alt="Signature" onError={e => { e.currentTarget.style.display="none"; }} />}
                </div>
                {inspName && <div className="cert-sig-name">{inspName}</div>}
                {inspId   && <div className="cert-sig-id">ID: {inspId}</div>}
              </div>

              <div style={{ alignItems:"center", display:"flex", flexDirection:"column" }}>
                <div className="cert-sig-label">Company Stamp</div>
                <div className="cert-sig-line" style={{ width:"100%", justifyContent:"center" }}>
                  <div style={{ width:64, height:64, borderRadius:"50%", border:"2px dashed #cbd5e1", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <img src={logoUrl} alt="" style={{ width:48, height:48, objectFit:"contain", opacity:.25 }} onError={e => { e.currentTarget.style.display="none"; }} />
                  </div>
                </div>
              </div>

              <div style={{ textAlign:"right" }}>
                <div className="cert-sig-label">Dates</div>
                <div className="cert-sig-line" style={{ justifyContent:"flex-end" }}>
                  {issueDate && <span style={{ fontSize:12, fontWeight:700, color:"#334155" }}>{issueDate}</span>}
                </div>
                {expiryDate && <div className="cert-sig-name">Next: {expiryDate}</div>}
              </div>

            </div>

            <div className="cert-footer-legal">
              <div className="cert-legal-text">
                {legalFmwk
                  ? `Issued in accordance with: ${legalFmwk}. `
                  : "Issued by Monroy (Pty) Ltd. "}
                This certificate is valid only for the equipment and conditions stated herein.
                Any alterations render this certificate void.
              </div>
              <div className="cert-page-info">
                {index + 1} / {total}
                {c.folder_name ? ` · ${c.folder_name}` : ""}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
