// src/components/certificates/CertificateSheet.jsx
"use client";

const SERVICES = "Mobile Crane Hire | Rigging | NDT Test | Scaffolding | Painting | Inspection of Lifting Equipment and Machinery, Pressure Vessels & Air Receiver | Inspection of Lifting Equipment | Steel Fabricating and Structural | Mechanical Engineering | Fencing | Maintenance";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

  /* ── A4 wrapper ── */
  .cs-wrap {
    background: rgba(10,18,32,0.92);
    border: 1px solid rgba(148,163,184,0.12);
    border-radius: 16px;
    padding: 20px;
    display: flex;
    justify-content: center;
  }
  .cs-page {
    background: #ffffff;
    width: 210mm;
    min-height: 297mm;
    display: flex;
    flex-direction: column;
    font-family: 'IBM Plex Sans', sans-serif;
    color: #0f1923;
    box-shadow: 0 8px 40px rgba(0,0,0,0.28);
    position: relative;
    overflow: hidden;
  }
  .cs-page.print-mode {
    box-shadow: none;
    border-radius: 0;
    width: 100%;
    min-height: unset;
  }

  /* ── HEADER ── */
  .cs-header {
    background: #0b1d3a;
    padding: 0;
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
  }
  /* Geometric chevron shapes - matches letterhead */
  .cs-geo {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
  }
  .cs-header-inner {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: stretch;
    min-height: 110px;
  }
  /* Logo box */
  .cs-logo-box {
    background: #ffffff;
    width: 130px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 14px;
    position: relative;
  }
  .cs-logo-box::after {
    content: '';
    position: absolute;
    right: -22px;
    top: 0;
    width: 0;
    height: 0;
    border-top: 55px solid #ffffff;
    border-bottom: 55px solid #ffffff;
    border-right: 22px solid transparent;
  }
  .cs-logo-box img {
    width: 96px;
    height: 96px;
    object-fit: contain;
  }
  /* Company + title */
  .cs-header-text {
    flex: 1;
    padding: 18px 24px 18px 40px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .cs-brand {
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #4fc3f7;
    margin-bottom: 5px;
  }
  .cs-cert-title {
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -0.02em;
    color: #ffffff;
    line-height: 1.1;
    margin-bottom: 6px;
  }
  .cs-cert-sub {
    font-size: 10px;
    color: rgba(255,255,255,0.50);
    font-weight: 500;
  }
  /* Result badge + cert number on right */
  .cs-header-right {
    padding: 18px 22px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .cs-result-badge {
    font-size: 11px;
    font-weight: 900;
    padding: 5px 14px;
    border-radius: 99px;
    letter-spacing: 0.10em;
    text-transform: uppercase;
  }
  .cs-cert-no {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    font-weight: 600;
    color: rgba(255,255,255,0.55);
  }

  /* Cyan accent line under header */
  .cs-accent {
    height: 4px;
    background: linear-gradient(90deg, #22d3ee 0%, #3b82f6 60%, #a78bfa 100%);
    flex-shrink: 0;
  }

  /* ── BODY ── */
  .cs-body {
    flex: 1;
    padding: 16px 22px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* Section */
  .cs-section {
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    overflow: hidden;
  }
  .cs-sec-title {
    background: linear-gradient(90deg, #f0f7ff, #f8fafc);
    border-bottom: 1px solid #e2e8f0;
    padding: 5px 12px;
    font-size: 8.5px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #0b1d3a;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .cs-sec-title::before {
    content: '';
    width: 3px;
    height: 10px;
    background: #22d3ee;
    border-radius: 2px;
    flex-shrink: 0;
  }

  /* Field grid — auto fills, no fixed columns */
  .cs-fields {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  .cs-field {
    padding: 8px 12px;
    border-right: 1px solid #f1f5f9;
    border-bottom: 1px solid #f1f5f9;
  }
  .cs-field:last-child { border-right: none; }
  .cs-field-label {
    font-size: 7.5px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #94a3b8;
    margin-bottom: 3px;
  }
  .cs-field-value {
    font-size: 11.5px;
    font-weight: 600;
    color: #0f1923;
    line-height: 1.3;
    word-break: break-word;
  }
  .cs-field-value.mono  { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: #0e7490; }
  .cs-field-value.large { font-size: 13px; font-weight: 800; color: #0b1d3a; }

  .cs-remarks {
    font-size: 11px;
    color: #334155;
    line-height: 1.65;
    padding: 9px 12px;
  }

  /* ── SIGNATURES ── */
  .cs-sig-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
    padding: 12px 22px 10px;
    border-top: 1px solid #e2e8f0;
    flex-shrink: 0;
  }
  .cs-sig-label {
    font-size: 7.5px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #94a3b8;
    margin-bottom: 4px;
  }
  .cs-sig-line {
    border-bottom: 1px solid #cbd5e1;
    height: 38px;
    margin-bottom: 4px;
    display: flex;
    align-items: flex-end;
    padding-bottom: 4px;
  }
  .cs-sig-line img { max-height: 32px; max-width: 100%; object-fit: contain; }
  .cs-sig-name { font-size: 11px; font-weight: 600; color: #1e293b; }
  .cs-sig-id   { font-size: 9.5px; color: #94a3b8; margin-top: 1px; }

  /* ── LEGAL STRIP ── */
  .cs-legal {
    padding: 6px 22px 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }
  .cs-legal-text {
    font-size: 7.5px;
    color: #94a3b8;
    line-height: 1.5;
    max-width: 500px;
  }
  .cs-page-info {
    font-size: 8px;
    font-weight: 700;
    color: #cbd5e1;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  /* ── RED SERVICES FOOTER ── */
  .cs-services-bar {
    background: #cc1111;
    padding: 10px 28px;
    text-align: center;
    flex-shrink: 0;
  }
  .cs-services-text {
    font-size: 8.5px;
    font-weight: 500;
    color: #ffffff;
    line-height: 1.7;
    letter-spacing: 0.01em;
  }
  .cs-services-text b { font-weight: 800; }

  /* Dark navy page strip at very bottom */
  .cs-footer-strip {
    background: #0b1d3a;
    padding: 5px 22px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }
  .cs-footer-strip span {
    font-size: 8px;
    color: rgba(255,255,255,0.45);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  /* ── PRINT ── */
  @page { size: A4; margin: 0; }
  @media print {
    .cs-wrap  { background: none!important; border: none!important; border-radius: 0!important; padding: 0!important; }
    .cs-page  { box-shadow: none!important; width: 210mm!important; min-height: 297mm!important; }
    .cs-header, .cs-accent, .cs-services-bar, .cs-footer-strip,
    .cs-sec-title, .cs-result-badge {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }

  /* ── RESPONSIVE (screen only) ── */
  @media (max-width: 860px) {
    .cs-wrap { padding: 8px; }
    .cs-page { width: 100%; min-height: unset; }
    .cs-cert-title { font-size: 16px; }
    .cs-logo-box { width: 90px; }
    .cs-logo-box img { width: 66px; height: 66px; }
    .cs-sig-row { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 560px) {
    .cs-header-inner { flex-wrap: wrap; }
    .cs-header-right { width: 100%; flex-direction: row; justify-content: flex-start; padding-top: 0; padding-left: 22px; }
    .cs-fields { grid-template-columns: 1fr 1fr!important; }
    .cs-sig-row { grid-template-columns: 1fr; }
    .cs-services-text { font-size: 7.5px; }
  }
`;

/* ─── Helpers ─────────────────────────────────────────────────── */
function val(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^(—|-|null|undefined|n\/a|unknown)$/i.test(s)) return null;
  return s;
}

function formatDate(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return val(v);
  return d.toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
}

function pickResult(c) {
  if (!c) return "UNKNOWN";
  const ex = c.extracted_data || {};
  const candidates = [c.result, c.equipment_status, ex.result, ex.equipment_status, ex.inspection_result];
  for (const raw of candidates) {
    if (!raw) continue;
    const n = String(raw).trim().toUpperCase().replace(/\s+/g,"_");
    if (n === "UNKNOWN") continue;
    if (["CONDITIONAL","REPAIR REQUIRED","REPAIR_REQUIRED"].includes(n)) return "REPAIR_REQUIRED";
    if (n === "OUT_OF_SERVICE" || n === "OUT OF SERVICE") return "OUT_OF_SERVICE";
    if (["PASS","FAIL","REPAIR_REQUIRED","OUT_OF_SERVICE"].includes(n)) return n;
  }
  return "UNKNOWN";
}

function resultStyle(v) {
  if (v === "PASS")            return { bg:"#dcfce7", color:"#14532d", label:"✓ PASS" };
  if (v === "FAIL")            return { bg:"#fee2e2", color:"#7f1d1d", label:"✗ FAIL" };
  if (v === "REPAIR_REQUIRED") return { bg:"#fef3c7", color:"#78350f", label:"⚠ Repair Required" };
  if (v === "OUT_OF_SERVICE")  return { bg:"#ede9fe", color:"#3b0764", label:"⊘ Out of Service" };
  return { bg:"#f1f5f9", color:"#475569", label:"Unknown" };
}

/* ─── Sub-components ─────────────────────────────────────────── */
function Field({ label, value, mono=false, large=false }) {
  if (!value) return null;
  return (
    <div className="cs-field">
      <div className="cs-field-label">{label}</div>
      <div className={`cs-field-value${mono?" mono":""}${large?" large":""}`}>{value}</div>
    </div>
  );
}

function Section({ title, children }) {
  const kids = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  if (!kids.length) return null;
  return (
    <div className="cs-section">
      {title && <div className="cs-sec-title">{title}</div>}
      <div className="cs-fields">{kids}</div>
    </div>
  );
}

/* ─── Geometric SVG shapes matching letterhead ───────────────── */
function HeaderGeo() {
  return (
    <svg className="cs-geo" viewBox="0 0 794 110" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      {/* Large teal chevron left */}
      <polygon points="0,0 90,0 55,110 0,110" fill="#4fc3f7" opacity="0.18" />
      {/* Medium navy chevron */}
      <polygon points="0,0 58,0 24,110 0,110" fill="#22d3ee" opacity="0.22" />
      {/* Right side subtle accent */}
      <polygon points="794,0 720,0 760,110 794,110" fill="#3b82f6" opacity="0.10" />
    </svg>
  );
}

/* ─── Main export ────────────────────────────────────────────── */
export default function CertificateSheet({ certificate: c, index=0, total=1, printMode=false }) {
  if (!c) return null;
  const ex = c.extracted_data || {};

  const company    = val(c.company      || c.client_name    || ex.client_name) || "Monroy (Pty) Ltd";
  const certType   = val(c.certificate_type || ex.certificate_type || c.document_category) || "Certificate of Inspection";
  const certNumber = val(c.certificate_number);
  const inspNumber = val(c.inspection_no || c.inspection_number || ex.inspection_no);
  const issueDate  = formatDate(c.issue_date || c.issued_at || ex.issue_date);
  const expiryDate = formatDate(c.expiry_date || c.valid_to || c.next_inspection_date || ex.expiry_date || ex.next_inspection_date);
  const equipDesc  = val(c.equipment_description || c.asset_name || ex.equipment_description);
  const equipType  = val(c.equipment_type || c.asset_type || ex.equipment_type);
  const equipId    = val(c.equipment_id  || c.asset_tag   || ex.equipment_id);
  const idNumber   = val(c.identification_number || ex.identification_number);
  const lanyardSN  = val(c.lanyard_serial_no || ex.lanyard_serial_no);
  const location   = val(c.equipment_location || c.location || ex.equipment_location);
  const mfg        = val(c.manufacturer || ex.manufacturer);
  const model      = val(c.model        || ex.model);
  const yearBuilt  = val(c.year_built   || ex.year_built);
  const swl        = val(c.swl          || ex.swl || c.safe_working_load);
  const mawp       = val(c.mawp         || ex.mawp || c.working_pressure);
  const capacity   = val(c.capacity     || ex.capacity || c.capacity_volume);
  const designP    = val(c.design_pressure  || ex.design_pressure);
  const testP      = val(c.test_pressure    || ex.test_pressure);
  const countryOrig= val(c.country_of_origin || ex.country_of_origin);
  const legalFmwk  = val(c.legal_framework);
  const inspName   = val(c.inspector_name || ex.inspector_name);
  const inspId     = val(c.inspector_id   || ex.inspector_id);
  const remarks    = val(c.remarks || c.comments || ex.remarks);
  const sigUrl     = val(c.signature_url);
  const logoUrl    = c.logo_url || "/logo.png";

  const resolvedResult = pickResult(c);
  const tone = resultStyle(resolvedResult);

  return (
    <>
      <style>{CSS}</style>
      <div className={printMode ? "" : "cs-wrap"}>
        <div className={`cs-page${printMode ? " print-mode" : ""}`}>

          {/* ── HEADER ── */}
          <div className="cs-header">
            <div className="cs-header-inner">
              <HeaderGeo />

              {/* Large visible logo */}
              <div className="cs-logo-box">
                <img
                  src={logoUrl}
                  alt="Monroy Logo"
                  onError={e => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextSibling.style.display = "flex";
                  }}
                />
                <div style={{ display:"none", width:"100%", height:"100%", alignItems:"center", justifyContent:"center", fontSize:28, fontWeight:900, color:"#0b1d3a", fontFamily:"'IBM Plex Mono',monospace" }}>M</div>
              </div>

              {/* Company & title */}
              <div className="cs-header-text">
                <div className="cs-brand">Monroy (Pty) Ltd · Botswana</div>
                <div className="cs-cert-title">{certType}</div>
                <div className="cs-cert-sub">
                  {company}
                  {total > 1 && c.folder_name ? ` · ${c.folder_name}` : ""}
                  {total > 1 ? ` · Page ${index + 1} of ${total}` : ""}
                </div>
              </div>

              {/* Result + cert number */}
              <div className="cs-header-right">
                <span className="cs-result-badge" style={{ background:tone.bg, color:tone.color }}>
                  {tone.label}
                </span>
                {certNumber && <div className="cs-cert-no">{certNumber}</div>}
              </div>
            </div>
          </div>

          {/* Cyan accent bar */}
          <div className="cs-accent" />

          {/* ── BODY ── */}
          <div className="cs-body">

            <Section title="Certificate Details">
              <Field label="Certificate Number"       value={certNumber}   mono large />
              <Field label="Inspection Number"        value={inspNumber}   mono />
              <Field label="Issue Date"               value={issueDate} />
              <Field label="Expiry / Next Inspection" value={expiryDate} />
            </Section>

            <Section title="Client & Location">
              <Field label="Client / Company" value={company} />
              <Field label="Location"         value={location} />
              <Field label="Certificate Type" value={certType} />
            </Section>

            <Section title="Equipment">
              <Field label="Description"        value={equipDesc} />
              <Field label="Type"               value={equipType} />
              <Field label="Equipment ID"       value={equipId}   mono />
              <Field label="Identification No." value={idNumber}  mono />
              <Field label="Manufacturer"       value={mfg} />
              <Field label="Model"              value={model} />
              <Field label="Year Built"         value={yearBuilt} />
              <Field label="Country of Origin"  value={countryOrig} />
              <Field label="Lanyard Serial No." value={lanyardSN} mono />
            </Section>

            <Section title="Technical Data">
              <Field label="Safe Working Load (SWL)"  value={swl} />
              <Field label="MAWP / Working Pressure"  value={mawp} />
              <Field label="Capacity / Volume"        value={capacity} />
              <Field label="Design Pressure"          value={designP} />
              <Field label="Test Pressure"            value={testP} />
            </Section>

            <Section title="Inspector">
              <Field label="Inspector Name" value={inspName} />
              <Field label="Inspector ID"   value={inspId}  mono />
            </Section>

            {remarks && (
              <div className="cs-section">
                <div className="cs-sec-title">Remarks / Conditions</div>
                <div className="cs-remarks">{remarks}</div>
              </div>
            )}

          </div>

          {/* ── SIGNATURES ── */}
          <div className="cs-sig-row">
            <div>
              <div className="cs-sig-label">Authorised Inspector</div>
              <div className="cs-sig-line">
                {sigUrl && <img src={sigUrl} alt="Signature" onError={e=>{e.currentTarget.style.display="none";}} />}
              </div>
              {inspName && <div className="cs-sig-name">{inspName}</div>}
              {inspId   && <div className="cs-sig-id">ID: {inspId}</div>}
            </div>

            <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
              <div className="cs-sig-label">Company Stamp</div>
              <div className="cs-sig-line" style={{ width:"100%", justifyContent:"center" }}>
                <div style={{ width:56, height:56, borderRadius:"50%", border:"1.5px dashed #cbd5e1", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                  <img src={logoUrl} alt="" style={{ width:44, height:44, objectFit:"contain", opacity:.3 }} onError={e=>{e.currentTarget.style.display="none";}} />
                </div>
              </div>
            </div>

            <div style={{ textAlign:"right" }}>
              <div className="cs-sig-label">Dates</div>
              <div className="cs-sig-line" style={{ justifyContent:"flex-end" }}>
                {issueDate && <span style={{ fontSize:11, fontWeight:700, color:"#1e293b" }}>{issueDate}</span>}
              </div>
              {expiryDate && <div className="cs-sig-name" style={{ textAlign:"right" }}>Next: {expiryDate}</div>}
            </div>
          </div>

          {/* Legal strip */}
          <div className="cs-legal">
            <div className="cs-legal-text">
              {legalFmwk ? `Issued in accordance with: ${legalFmwk}. ` : "Issued by Monroy (Pty) Ltd. "}
              This certificate is valid only for the equipment and conditions stated herein. Any alterations render this certificate void.
            </div>
            <div className="cs-page-info">
              {index + 1} / {total}
              {c.folder_name ? ` · ${c.folder_name}` : ""}
            </div>
          </div>

          {/* ── RED SERVICES BANNER ── */}
          <div className="cs-services-bar">
            <div className="cs-services-text">
              <b>Mobile Crane Hire</b> | <b>Rigging</b> | <b>NDT Test</b> | <b>Scaffolding</b> | <b>Painting</b> | <b>Inspection of Lifting Equipment and Machinery, Pressure Vessels &amp; Air Receiver</b> | Inspection of Lifting Equipment | <b>Steel Fabricating and Structural</b> | <b>Mechanical Engineering</b> | <b>Fencing</b> | <b>Maintenance</b>
            </div>
          </div>

          {/* Dark navy bottom strip */}
          <div className="cs-footer-strip">
            <span>Monroy (Pty) Ltd · Mophane Avenue, Maun, Botswana</span>
            <span>Quality · Safety · Excellence</span>
          </div>

        </div>
      </div>
    </>
  );
}
