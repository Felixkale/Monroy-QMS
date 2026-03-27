// src/components/certificates/CertificateSheet.jsx
"use client";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

  /* ── Screen dark wrapper ── */
  .cs-wrap {
    background: rgba(10,18,32,0.92);
    border: 1px solid rgba(148,163,184,0.12);
    border-radius: 16px;
    padding: 20px;
  }

  /* ── A4 sheet ── */
  .cs {
    background: #ffffff;
    font-family: 'IBM Plex Sans', sans-serif;
    color: #1a2744;
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    box-shadow: 0 6px 40px rgba(0,0,0,0.22);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .cs.pm {
    box-shadow: none;
    width: 100%;
    min-height: unset;
  }

  /* ════════════════════════════════════
     HEADER — hardcoded, always present
  ════════════════════════════════════ */
  .cs-hdr {
    background: #1a2744;
    padding: 14px 24px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-shrink: 0;
  }

  /* Left: logo + brand name */
  .cs-hdr-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* Hardcoded logo mark — geometric crane icon in navy/blue */
  .cs-logo-mark {
    width: 54px;
    height: 54px;
    background: #ffffff;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
  }

  .cs-logo-mark img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  /* SVG fallback crane icon when no logo uploaded */
  .cs-logo-svg {
    width: 42px;
    height: 42px;
  }

  .cs-brand {
    min-width: 0;
  }

  .cs-brand-name {
    font-size: 22px;
    font-weight: 900;
    letter-spacing: 0.14em;
    color: #ffffff;
    line-height: 1;
  }

  .cs-brand-tagline {
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.50);
    margin-top: 4px;
  }

  /* Right: certificate number badge */
  .cs-cert-badge {
    border: 1.5px solid rgba(255,255,255,0.28);
    border-radius: 10px;
    padding: 10px 18px;
    text-align: right;
    flex-shrink: 0;
  }

  .cs-cert-badge-label {
    font-size: 7.5px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.50);
    margin-bottom: 5px;
  }

  .cs-cert-badge-value {
    font-size: 15px;
    font-weight: 900;
    color: #ffffff;
    letter-spacing: 0.05em;
    font-family: 'IBM Plex Mono', monospace;
  }

  /* Blue accent stripe under header */
  .cs-hdr-stripe {
    height: 4px;
    background: linear-gradient(90deg, #1d4ed8 0%, #3b82f6 50%, #60a5fa 100%);
    flex-shrink: 0;
  }

  /* ════════════════════════════════════
     TITLE BLOCK
  ════════════════════════════════════ */
  .cs-title-block {
    padding: 18px 24px 14px;
    text-align: center;
    border-bottom: 1px solid #e8ecf4;
    flex-shrink: 0;
  }

  .cs-doc-title {
    font-size: 20px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #1a2744;
    line-height: 1.2;
    margin-bottom: 8px;
  }

  /* Two-bar decoration */
  .cs-title-bars {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    margin-bottom: 12px;
  }

  .cs-bar-navy { width: 44px; height: 3px; background: #1a2744; border-radius: 2px; }
  .cs-bar-red  { width: 26px; height: 3px; background: #cc1111; border-radius: 2px; }

  /* Result badge */
  .cs-result {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 16px;
    border-radius: 99px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border: 1.5px solid;
  }

  .cs-result-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* ════════════════════════════════════
     INTRO TEXT
  ════════════════════════════════════ */
  .cs-intro {
    font-size: 10.5px;
    color: #475569;
    line-height: 1.65;
    padding: 10px 24px 4px;
    flex-shrink: 0;
  }

  /* ════════════════════════════════════
     BODY (grows to fill page)
  ════════════════════════════════════ */
  .cs-body {
    flex: 1;
    padding: 12px 24px 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* ── Section wrapper ── */
  .cs-sec {
    border: 1px solid #d1d9e8;
    border-radius: 7px;
    overflow: hidden;
  }

  .cs-sec-head {
    background: #1a2744;
    padding: 7px 14px;
    font-size: 8.5px;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #ffffff;
  }

  /* ── Two-column detail rows ── */
  .cs-row {
    display: grid;
    grid-template-columns: 190px 1fr;
    border-bottom: 1px solid #e8ecf4;
  }
  .cs-row:last-child { border-bottom: none; }
  .cs-row.alt { background: #f8fafc; }

  .cs-row-label {
    padding: 8px 13px;
    font-size: 8.5px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #64748b;
    border-right: 1px solid #e8ecf4;
    display: flex;
    align-items: center;
  }

  .cs-row-val {
    padding: 8px 13px;
    font-size: 11.5px;
    font-weight: 600;
    color: #1a2744;
    display: flex;
    align-items: center;
  }

  .cs-row-val.mono { font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:#0e7490; }
  .cs-row-val.empty { color: #cbd5e1; }

  /* ── Tech grid (4 col) ── */
  .cs-tech {
    display: grid;
    grid-template-columns: repeat(4, minmax(0,1fr));
  }

  .cs-tech-cell {
    padding: 9px 12px;
    border-right: 1px solid #e8ecf4;
    border-bottom: 1px solid #e8ecf4;
  }
  .cs-tech-cell:nth-child(4n) { border-right: none; }
  .cs-tech-cell:nth-last-child(-n+4) { border-bottom: none; }

  .cs-tech-label {
    font-size: 7.5px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #94a3b8;
    margin-bottom: 3px;
  }

  .cs-tech-val {
    font-size: 11.5px;
    font-weight: 600;
    color: #1a2744;
  }
  .cs-tech-val.empty { color: #cbd5e1; }

  /* ── Date boxes ── */
  .cs-dates {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .cs-date-box {
    border-radius: 7px;
    padding: 11px 15px;
    border: 1.5px solid;
  }

  .cs-date-box.issue  { border-color:#93c5fd; background:#eff6ff; }
  .cs-date-box.expiry { border-color:#fca5a5; background:#fff1f2; }

  .cs-date-lbl {
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin-bottom: 5px;
  }
  .cs-date-box.issue  .cs-date-lbl { color:#1d4ed8; }
  .cs-date-box.expiry .cs-date-lbl { color:#dc2626; }

  .cs-date-val {
    font-size: 15px;
    font-weight: 800;
    color: #1a2744;
  }

  /* ── Signature section ── */
  .cs-sigs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border: 1px solid #d1d9e8;
    border-radius: 7px;
    overflow: hidden;
  }

  .cs-sig {
    padding: 12px 16px;
  }
  .cs-sig:first-child { border-right: 1px solid #d1d9e8; }

  .cs-sig-lbl {
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 8px;
  }

  .cs-sig-line {
    border-bottom: 1.5px solid #cbd5e1;
    height: 44px;
    display: flex;
    align-items: flex-end;
    padding-bottom: 4px;
    margin-bottom: 6px;
  }

  .cs-sig-line img {
    max-height: 38px;
    max-width: 170px;
    object-fit: contain;
  }

  .cs-sig-name { font-size: 11px; font-weight: 700; color: #1a2744; }
  .cs-sig-meta { font-size: 9.5px; color: #64748b; margin-top: 2px; line-height: 1.5; }
  .cs-sig-ghost { font-size: 9.5px; color: #cbd5e1; font-style: italic; }

  /* ════════════════════════════════════
     FOOTER — hardcoded red banner
     No image file needed — pure CSS/HTML
  ════════════════════════════════════ */
  .cs-footer {
    flex-shrink: 0;
    margin-top: auto;
  }

  /* Top section: blue-grey geometric shapes + white space (matches letterhead top) */
  .cs-footer-top {
    background: #f0f4f8;
    padding: 6px 0 0;
    position: relative;
    height: 10px;
    overflow: hidden;
  }

  /* Red services banner */
  .cs-footer-red {
    background: #cc1111;
    padding: 11px 24px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
  }

  .cs-footer-services {
    font-size: 9px;
    font-weight: 700;
    color: #ffffff;
    text-align: center;
    line-height: 1.85;
    letter-spacing: 0.01em;
  }

  .cs-footer-services .bold { font-weight: 900; }
  .cs-footer-services .sep  { color: rgba(255,255,255,0.60); margin: 0 4px; }

  /* Optional page number */
  .cs-footer-pg {
    background: #1a2744;
    padding: 4px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .cs-footer-pg-text {
    font-size: 7.5px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.45);
  }

  /* ════════════════════════════════════
     PRINT
  ════════════════════════════════════ */
  @media print {
    .cs {
      box-shadow: none !important;
      width: 210mm !important;
      min-height: 297mm !important;
    }
    .cs-hdr, .cs-hdr-stripe, .cs-footer-red, .cs-footer-pg,
    .cs-result, .cs-date-box, .cs-sec-head, .cs-bar-navy, .cs-bar-red {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }

  /* ════════════════════════════════════
     RESPONSIVE (screen view)
  ════════════════════════════════════ */
  @media (max-width: 860px) {
    .cs-wrap { padding: 10px; }
    .cs { width: 100%; min-height: unset; }
    .cs-tech { grid-template-columns: repeat(2, minmax(0,1fr)); }
    .cs-tech-cell:nth-child(4n) { border-right: 1px solid #e8ecf4; }
    .cs-tech-cell:nth-child(2n) { border-right: none; }
  }

  @media (max-width: 600px) {
    .cs-hdr { flex-direction: column; align-items: flex-start; gap: 10px; }
    .cs-cert-badge { text-align: left; }
    .cs-doc-title { font-size: 15px; }
    .cs-body { padding: 10px 14px 8px; }
    .cs-intro { padding: 8px 14px 2px; }
    .cs-dates { grid-template-columns: 1fr; gap: 8px; }
    .cs-sigs { grid-template-columns: 1fr; }
    .cs-sig:first-child { border-right: none; border-bottom: 1px solid #d1d9e8; }
    .cs-row { grid-template-columns: 130px 1fr; }
    .cs-tech { grid-template-columns: 1fr 1fr; }
    .cs-footer-services { font-size: 8px; }
  }

  @media (max-width: 400px) {
    .cs-row { grid-template-columns: 1fr; }
    .cs-row-label { border-right: none; border-bottom: 1px solid #e8ecf4; }
    .cs-brand-name { font-size: 17px; }
    .cs-doc-title { font-size: 13px; }
  }
`;

/* ── Helpers ─────────────────────────────────────────────────── */
function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

function nz(v, fb = "—") {
  if (v === null || v === undefined) return fb;
  const s = String(v).trim();
  return s || fb;
}

function pickResult(c) {
  const ex = c?.extracted_data || {};
  const candidates = [
    c?.result, c?.equipment_status,
    ex.result, ex.equipment_status, ex.inspection_result,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const n = String(raw).trim().toUpperCase().replace(/\s+/g, "_");
    if (n === "UNKNOWN") continue;
    if (n === "CONDITIONAL" || n === "REPAIR REQUIRED") return "REPAIR_REQUIRED";
    if (n === "OUT OF SERVICE") return "OUT_OF_SERVICE";
    if (["PASS", "FAIL", "REPAIR_REQUIRED", "OUT_OF_SERVICE"].includes(n)) return n;
  }
  return "UNKNOWN";
}

function resultStyle(v) {
  if (v === "PASS")            return { bg:"#dcfce7", color:"#15803d", brd:"#86efac",  label:"PASS",            dot:"#15803d" };
  if (v === "FAIL")            return { bg:"#fee2e2", color:"#b91c1c", brd:"#fca5a5",  label:"FAIL",            dot:"#b91c1c" };
  if (v === "REPAIR_REQUIRED") return { bg:"#fef9c3", color:"#92400e", brd:"#fde68a",  label:"Repair Required", dot:"#d97706" };
  if (v === "OUT_OF_SERVICE")  return { bg:"#ede9fe", color:"#5b21b6", brd:"#c4b5fd",  label:"Out of Service",  dot:"#7c3aed" };
  return                              { bg:"#f1f5f9", color:"#475569", brd:"#cbd5e1",  label:"Unknown",         dot:"#94a3b8" };
}

function Row({ label, value, mono = false, alt = false }) {
  const empty = !value || value === "—";
  return (
    <div className={`cs-row${alt ? " alt" : ""}`}>
      <div className="cs-row-label">{label}</div>
      <div className={`cs-row-val${mono ? " mono" : ""}${empty ? " empty" : ""}`}>
        {empty ? "—" : value}
      </div>
    </div>
  );
}

function TechCell({ label, value }) {
  const empty = !value || value === "—";
  return (
    <div className="cs-tech-cell">
      <div className="cs-tech-label">{label}</div>
      <div className={`cs-tech-val${empty ? " empty" : ""}`}>{empty ? "—" : value}</div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────── */
export default function CertificateSheet({ certificate: c, index = 0, total = 1, printMode = false }) {
  if (!c) return null;

  const ex = c.extracted_data || {};

  const company      = nz(c.company || c.client_name || ex.client_name, "Monroy (Pty) Ltd");
  const certType     = nz(c.certificate_type || ex.certificate_type || c.document_category, "Certificate of Compliance");
  const certNumber   = nz(c.certificate_number);
  const inspNumber   = nz(c.inspection_no || c.inspection_number || ex.inspection_no);
  const issueDate    = formatDate(c.issue_date || c.issued_at || ex.issue_date);
  const expiryDate   = formatDate(c.expiry_date || c.valid_to || c.next_inspection_date || ex.expiry_date || ex.next_inspection_date);
  const equipDesc    = nz(c.equipment_description || c.asset_name || ex.equipment_description);
  const equipType    = nz(c.equipment_type || c.asset_type || ex.equipment_type);
  const equipId      = nz(c.equipment_id || c.asset_tag || ex.equipment_id);
  const idNumber     = nz(c.identification_number || ex.identification_number);
  const lanyardSN    = nz(c.lanyard_serial_no || ex.lanyard_serial_no);
  const location     = nz(c.equipment_location || c.location || ex.equipment_location);
  const manufacturer = nz(c.manufacturer || ex.manufacturer);
  const model        = nz(c.model || ex.model);
  const yearBuilt    = nz(c.year_built || ex.year_built);
  const swl          = nz(c.swl || ex.swl);
  const mawp         = nz(c.mawp || ex.mawp);
  const capacity     = nz(c.capacity || ex.capacity);
  const designP      = nz(c.design_pressure || ex.design_pressure);
  const testP        = nz(c.test_pressure || ex.test_pressure);
  const countryOrig  = nz(c.country_of_origin || ex.country_of_origin);
  const legalFmwk    = nz(c.legal_framework, "Mines, Quarries, Works and Machinery Act Cap 44:02");
  const inspName     = nz(c.inspector_name || ex.inspector_name);
  const inspId       = nz(c.inspector_id || ex.inspector_id);
  const inspContact  = nz(c.inspector_contact || ex.inspector_contact);
  const logoUrl      = c.logo_url || "/logo.png";
  const sigUrl       = c.signature_url || "";
  const remarks      = nz(c.remarks || c.comments || ex.remarks, "");

  const resolvedResult = pickResult(c);
  const tone = resultStyle(resolvedResult);

  const isPressure = /pressure|boiler|vessel|air receiver/i.test(certType + " " + equipType);
  const hasLanyard = lanyardSN && lanyardSN !== "—";

  const techFields = isPressure ? [
    { label:"MAWP / Working Pressure", value:mawp },
    { label:"Design Pressure",         value:designP },
    { label:"Test Pressure",           value:testP },
    { label:"Capacity / Volume",       value:capacity },
  ] : [
    { label:"Safe Working Load (SWL)", value:swl },
    { label:"Capacity",                value:capacity },
    { label:"Test Load",               value:testP },
    { label:"Design Pressure",         value:designP },
  ];

  return (
    <>
      <style>{CSS}</style>

      <div className={printMode ? "" : "cs-wrap"}>
        <div className={`cs${printMode ? " pm" : ""}`}>

          {/* ══ HARDCODED HEADER ══ */}
          <div className="cs-hdr">
            <div className="cs-hdr-left">
              {/* Logo box — shows logo.png or falls back to text mark */}
              <div className="cs-logo-mark">
                <img
                  src={logoUrl}
                  alt="Monroy Logo"
                  onError={e => { e.currentTarget.style.display = "none"; }}
                />
                {/* Inline SVG crane icon fallback */}
                <svg className="cs-logo-svg" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="42" height="42" fill="#ffffff"/>
                  <rect x="20" y="8" width="3" height="26" fill="#1a2744"/>
                  <rect x="8"  y="8" width="15" height="3" fill="#1a2744"/>
                  <rect x="8"  y="8" width="3"  height="8"  fill="#1a2744"/>
                  <rect x="20" y="11" width="1.5" height="12" fill="#3b82f6" transform="rotate(30 20 11)"/>
                  <circle cx="21" cy="34" r="3" stroke="#1a2744" strokeWidth="2" fill="none"/>
                  <circle cx="11" cy="34" r="3" stroke="#1a2744" strokeWidth="2" fill="none"/>
                  <rect x="11" y="32" width="10" height="2" fill="#1a2744"/>
                </svg>
              </div>
              <div className="cs-brand">
                <div className="cs-brand-name">MONROY</div>
                <div className="cs-brand-tagline">Quality Management System</div>
              </div>
            </div>

            <div className="cs-cert-badge">
              <div className="cs-cert-badge-label">Certificate No.</div>
              <div className="cs-cert-badge-value">{certNumber}</div>
            </div>
          </div>

          {/* Blue accent stripe */}
          <div className="cs-hdr-stripe" />

          {/* ══ TITLE BLOCK ══ */}
          <div className="cs-title-block">
            <div className="cs-doc-title">{certType}</div>
            <div className="cs-title-bars">
              <div className="cs-bar-navy" />
              <div className="cs-bar-red"  />
            </div>
            <span
              className="cs-result"
              style={{ background:tone.bg, color:tone.color, borderColor:tone.brd }}
            >
              <span className="cs-result-dot" style={{ background:tone.dot }} />
              {tone.label}
            </span>
          </div>

          {/* ══ INTRO TEXT ══ */}
          <div className="cs-intro">
            This is to certify that the equipment described below has been inspected and tested in
            accordance with the applicable standards and regulations, and is hereby declared to be
            in a safe and serviceable condition.
            {total > 1 && (
              <span style={{ marginLeft:6, color:"#1a2744", fontWeight:700 }}>
                (Page {index + 1} of {total}{c.folder_name ? ` · ${c.folder_name}` : ""})
              </span>
            )}
          </div>

          {/* ══ BODY ══ */}
          <div className="cs-body">

            {/* Equipment Details */}
            <div className="cs-sec">
              <div className="cs-sec-head">Equipment Details</div>
              <Row label="Company / Client"       value={company}     />
              <Row label="Equipment Description"  value={equipDesc}   alt />
              <Row label="Equipment Type"         value={equipType}   />
              <Row label="Equipment Location"     value={location}    alt />
              <Row label="Serial Number / ID"     value={equipId}     mono />
              {idNumber !== "—" && <Row label="Identification Number"  value={idNumber}    mono alt />}
              {inspNumber !== "—" && <Row label="Inspection Number"    value={inspNumber}  mono />}
              {hasLanyard && <Row label="Lanyard Serial No."          value={lanyardSN}   mono alt />}
              {manufacturer !== "—" && <Row label="Manufacturer"      value={manufacturer} />}
              {model !== "—" && <Row label="Model"                    value={model}        alt />}
              {yearBuilt !== "—" && <Row label="Year Built"           value={yearBuilt}   />}
              {countryOrig !== "—" && <Row label="Country of Origin"  value={countryOrig} alt />}
            </div>

            {/* Technical Data */}
            <div className="cs-sec">
              <div className="cs-sec-head">{isPressure ? "Pressure Vessel Technical Data" : "Lifting Equipment Technical Data"}</div>
              <div className="cs-tech">
                {techFields.map((f, i) => <TechCell key={i} label={f.label} value={f.value} />)}
              </div>
            </div>

            {/* Dates */}
            <div className="cs-dates">
              <div className="cs-date-box issue">
                <div className="cs-date-lbl">Date of Issue</div>
                <div className="cs-date-val">{issueDate}</div>
              </div>
              <div className="cs-date-box expiry">
                <div className="cs-date-lbl">Expiry Date</div>
                <div className="cs-date-val">{expiryDate}</div>
              </div>
            </div>

            {/* Legal Framework */}
            <div className="cs-sec">
              <div className="cs-sec-head">Legal Framework</div>
              <div style={{ padding:"9px 14px", fontSize:"10.5px", color:"#334155", fontWeight:500, lineHeight:1.55 }}>
                {legalFmwk}
              </div>
            </div>

            {/* Remarks */}
            {remarks && remarks !== "—" && (
              <div className="cs-sec">
                <div className="cs-sec-head">Remarks / Conditions</div>
                <div style={{ padding:"9px 14px", fontSize:"10.5px", color:"#334155", lineHeight:1.6 }}>
                  {remarks}
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="cs-sigs">
              <div className="cs-sig">
                <div className="cs-sig-lbl">Inspector</div>
                <div className="cs-sig-line">
                  {sigUrl && (
                    <img
                      src={sigUrl}
                      alt="Inspector signature"
                      onError={e => { e.currentTarget.style.display = "none"; }}
                    />
                  )}
                </div>
                <div className="cs-sig-name">{inspName !== "—" ? inspName : "Authorised Inspector"}</div>
                <div className="cs-sig-meta">
                  {inspId !== "—" ? `ID: ${inspId}` : ""}
                  {inspContact !== "—" && inspContact ? `\nContact: ${inspContact}` : ""}
                </div>
              </div>

              <div className="cs-sig">
                <div className="cs-sig-lbl">Customer Acknowledgement</div>
                <div className="cs-sig-line">
                  <span className="cs-sig-ghost">Signature &amp; Date</span>
                </div>
                <div className="cs-sig-meta" style={{ color:"#cbd5e1" }}>Authorised representative</div>
              </div>
            </div>

          </div>{/* end body */}

          {/* ══ HARDCODED FOOTER — no image file needed ══ */}
          <div className="cs-footer">

            {/* Red services banner — matches the letterhead exactly */}
            <div className="cs-footer-red">
              <div className="cs-footer-services">
                Mobile Crane Hire
                <span className="sep">|</span>
                <span className="bold">Rigging</span>
                <span className="sep">|</span>
                NDT Test
                <span className="sep">|</span>
                <span className="bold">Scaffolding</span>
                <span className="sep">|</span>
                Painting
                <span className="sep">|</span>
                <span className="bold">Inspection of Lifting Equipment and Machinery, Pressure Vessels &amp; Air Receiver</span>
                <span className="sep">|</span>
                Inspection of Lifting Equipment
                <span className="sep">|</span>
                <span className="bold">Steel Fabricating and Structural</span>
                <span className="sep">|</span>
                Mechanical Engineering
                <span className="sep">|</span>
                <span className="bold">Fencing</span>
                <span className="sep">|</span>
                Maintenance
              </div>
            </div>

            {/* Page info bar */}
            <div className="cs-footer-pg">
              <span className="cs-footer-pg-text">Monroy (Pty) Ltd — Quality Management System</span>
              <span className="cs-footer-pg-text">
                Page {index + 1} / {total}
                {c.folder_name ? ` · ${c.folder_name}` : ""}
              </span>
            </div>

          </div>

        </div>
      </div>
    </>
  );
}
