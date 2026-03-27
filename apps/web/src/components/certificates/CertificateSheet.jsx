// src/components/certificates/CertificateSheet.jsx
"use client";

const PRINT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

  .cert-sheet {
    background: #ffffff;
    color: #0f1923;
    font-family: 'IBM Plex Sans', sans-serif;
    width: 100%;
    max-width: 794px;
    margin: 0 auto;
    box-shadow: 0 4px 32px rgba(0,0,0,0.18);
    border-radius: 4px;
    overflow: hidden;
    min-height: 1080px;
    display: flex;
    flex-direction: column;
  }
  .cert-sheet.print-mode {
    box-shadow: none; border-radius: 0; min-height: unset;
  }
  .cert-header {
    background: #0b1929; color: #ffffff;
    padding: 20px 28px 18px;
    display: flex; align-items: flex-start;
    justify-content: space-between; gap: 16px;
  }
  .cert-header-left { flex: 1; min-width: 0; }
  .cert-company-name {
    font-size: 10px; font-weight: 700; letter-spacing: 0.18em;
    text-transform: uppercase; color: #22d3ee; margin-bottom: 6px;
  }
  .cert-doc-title {
    font-size: 22px; font-weight: 900; letter-spacing: -0.02em;
    color: #ffffff; line-height: 1.1; margin-bottom: 4px;
  }
  .cert-doc-subtitle { font-size: 11px; color: rgba(255,255,255,0.55); font-weight: 500; }
  .cert-header-right {
    display: flex; flex-direction: column;
    align-items: flex-end; gap: 8px; flex-shrink: 0;
  }
  .cert-logo {
    width: 56px; height: 56px; border-radius: 10px; overflow: hidden;
    border: 1px solid rgba(34,211,238,0.25); background: rgba(34,211,238,0.08);
    display: flex; align-items: center; justify-content: center;
  }
  .cert-logo img { width: 100%; height: 100%; object-fit: contain; }
  .cert-logo-fallback {
    font-size: 22px; font-weight: 900; color: #22d3ee;
    font-family: 'IBM Plex Mono', monospace;
  }
  .cert-result-badge {
    font-size: 11px; font-weight: 800; padding: 4px 12px;
    border-radius: 99px; letter-spacing: 0.08em; text-transform: uppercase;
  }
  .cert-accent-bar {
    height: 3px;
    background: linear-gradient(90deg, #22d3ee 0%, #60a5fa 50%, #a78bfa 100%);
  }
  .cert-body { flex: 1; padding: 18px 28px 14px; display: grid; gap: 14px; }
  .cert-section { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .cert-section-title {
    background: #f1f5f9; padding: 6px 12px;
    font-size: 9px; font-weight: 800; letter-spacing: 0.14em;
    text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0;
  }
  .cert-fields   { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 0; }
  .cert-fields-3 { grid-template-columns: repeat(3,minmax(0,1fr)); }
  .cert-fields-2 { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .cert-fields-1 { grid-template-columns: 1fr; }
  .cert-field {
    padding: 8px 12px;
    border-right: 1px solid #e2e8f0;
    border-bottom: 1px solid #e2e8f0;
  }
  .cert-field:last-child { border-right: none; }
  .cert-field-label {
    font-size: 8px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: #94a3b8; margin-bottom: 3px;
  }
  .cert-field-value { font-size: 12px; font-weight: 600; color: #0f1923; line-height: 1.3; word-break: break-word; }
  .cert-field-value.mono  { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #0e7490; }
  .cert-field-value.large { font-size: 14px; font-weight: 800; }
  .cert-field-value.empty { color: #cbd5e1; }
  .cert-remarks-text { font-size: 11px; color: #334155; line-height: 1.6; padding: 8px 12px; }
  .cert-footer {
    background: #f8fafc; border-top: 2px solid #e2e8f0;
    padding: 14px 28px 12px;
  }
  .cert-footer-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 12px; }
  .cert-sig-box { display: flex; flex-direction: column; gap: 4px; }
  .cert-sig-label {
    font-size: 8px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: #94a3b8; margin-bottom: 2px;
  }
  .cert-sig-line {
    border-bottom: 1px solid #cbd5e1; height: 36px;
    margin-bottom: 4px; display: flex; align-items: flex-end; padding-bottom: 4px;
  }
  .cert-sig-line img { max-height: 30px; max-width: 100%; object-fit: contain; }
  .cert-sig-name { font-size: 11px; font-weight: 600; color: #334155; }
  .cert-sig-id   { font-size: 10px; color: #94a3b8; }
  .cert-footer-legal {
    border-top: 1px solid #e2e8f0; padding-top: 8px;
    display: flex; justify-content: space-between;
    align-items: flex-end; gap: 12px; flex-wrap: wrap;
  }
  .cert-legal-text { font-size: 8px; color: #94a3b8; line-height: 1.5; max-width: 480px; }
  .cert-page-info {
    font-size: 9px; font-weight: 700; color: #cbd5e1;
    letter-spacing: 0.08em; text-transform: uppercase;
    white-space: nowrap; text-align: right;
  }
  .cert-sheet-wrap {
    background: rgba(10,18,32,0.92);
    border: 1px solid rgba(148,163,184,0.12);
    border-radius: 16px; padding: 20px;
  }

  @media print {
    .cert-sheet { box-shadow:none!important; border-radius:0!important; min-height:unset!important; max-width:100%!important; }
    .cert-header,.cert-accent-bar,.cert-section-title,.cert-result-badge,.cert-footer {
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
  }
  @media (max-width:860px) {
    .cert-sheet-wrap { padding: 10px; }
    .cert-fields { grid-template-columns: repeat(2,minmax(0,1fr))!important; }
    .cert-fields-3 { grid-template-columns: repeat(2,minmax(0,1fr)); }
    .cert-footer-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width:540px) {
    .cert-header { flex-direction: column; }
    .cert-header-right { flex-direction: row; align-items: center; }
    .cert-fields,.cert-fields-3,.cert-fields-2 { grid-template-columns: 1fr 1fr!important; }
    .cert-doc-title { font-size: 17px; }
    .cert-body { padding: 12px 14px 10px; gap: 10px; }
    .cert-footer { padding: 12px 14px 10px; }
    .cert-footer-grid { grid-template-columns: 1fr; gap: 12px; }
  }
`;

/* ─── Helpers ───────────────────────────────────────────────── */
function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
}

function nz(v, fb = "—") {
  if (v === null || v === undefined) return fb;
  const s = String(v).trim();
  return s || fb;
}

/**
 * ✅ KEY FIX: iterate all candidate fields and return the first one
 * that normalises to something other than "UNKNOWN".
 * Using simple || chains fails because a stored "UNKNOWN" string is
 * truthy and blocks every subsequent check.
 */
function pickResult(c) {
  const ex = c?.extracted_data || {};
  const candidates = [
    c?.result,
    c?.equipment_status,
    ex.result,
    ex.equipment_status,
    ex.inspection_result,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const normalised = String(raw).trim().toUpperCase().replace(/\s+/g, "_");
    // skip stored UNKNOWN — keep looking for the real value
    if (normalised === "UNKNOWN") continue;
    if (normalised === "CONDITIONAL") return "REPAIR_REQUIRED";
    if (normalised === "REPAIR REQUIRED") return "REPAIR_REQUIRED";
    if (normalised === "OUT OF SERVICE") return "OUT_OF_SERVICE";
    if (["PASS", "FAIL", "REPAIR_REQUIRED", "OUT_OF_SERVICE"].includes(normalised)) {
      return normalised;
    }
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

/* ─── Sub-components ────────────────────────────────────────── */
function Field({ label, value, mono = false, large = false }) {
  const isEmpty = !value || value === "—";
  return (
    <div className="cert-field">
      <div className="cert-field-label">{label}</div>
      <div className={`cert-field-value${mono?" mono":""}${large?" large":""}${isEmpty?" empty":""}`}>
        {isEmpty ? "—" : value}
      </div>
    </div>
  );
}

function Section({ title, children, cols = 4 }) {
  const cls = cols===3 ? "cert-fields cert-fields-3"
            : cols===2 ? "cert-fields cert-fields-2"
            : cols===1 ? "cert-fields cert-fields-1"
            : "cert-fields";
  return (
    <div className="cert-section">
      {title && <div className="cert-section-title">{title}</div>}
      <div className={cls}>{children}</div>
    </div>
  );
}

/* ─── Main export ───────────────────────────────────────────── */
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
  const logoUrl      = c.logo_url || "/logo.png";
  const sigUrl       = c.signature_url || "";
  const remarks      = nz(c.remarks || c.comments || ex.remarks, "");

  /* ✅ Use pickResult — skips stored "UNKNOWN" and finds the real value */
  const resolvedResult = pickResult(c);
  const tone = resultStyle(resolvedResult);

  const isPressure = /pressure|boiler|vessel|air receiver/i.test(certType + " " + equipType);
  const hasLanyard = lanyardSN && lanyardSN !== "—";

  return (
    <>
      <style>{PRINT_CSS}</style>

      <div className={printMode ? "" : "cert-sheet-wrap"}>
        <div className={`cert-sheet${printMode ? " print-mode" : ""}`}>

          {/* HEADER */}
          <div className="cert-header">
            <div className="cert-header-left">
              <div className="cert-company-name">{company}</div>
              <div className="cert-doc-title">{certType}</div>
              <div className="cert-doc-subtitle">
                Page {index + 1} of {total}
                {total > 1 && c.folder_name ? ` · ${c.folder_name}` : ""}
              </div>
            </div>
            <div className="cert-header-right">
              <div className="cert-logo">
                <img
                  src={logoUrl}
                  alt="Logo"
                  onError={e => { e.currentTarget.style.display = "none"; }}
                />
                <span className="cert-logo-fallback">M</span>
              </div>
              <span className="cert-result-badge" style={{ background: tone.bg, color: tone.color }}>
                {tone.label}
              </span>
            </div>
          </div>

          <div className="cert-accent-bar" />

          {/* BODY */}
          <div className="cert-body">

            <Section title="Certificate Details" cols={4}>
              <Field label="Certificate Number"       value={certNumber} mono large />
              <Field label="Inspection Number"        value={inspNumber} mono />
              <Field label="Issue Date"               value={issueDate} />
              <Field label="Expiry / Next Inspection" value={expiryDate} />
            </Section>

            <Section title="Client & Location" cols={3}>
              <Field label="Client / Company"   value={company} />
              <Field label="Equipment Location" value={location} />
              <Field label="Certificate Type"   value={certType} />
            </Section>

            <Section title="Equipment Information" cols={4}>
              <Field label="Equipment Description" value={equipDesc} />
              <Field label="Equipment Type"        value={equipType} />
              <Field label="Equipment ID"          value={equipId}   mono />
              <Field label="Identification No."    value={idNumber}  mono />
              <Field label="Manufacturer"          value={manufacturer} />
              <Field label="Model"                 value={model} />
              <Field label="Year Built"            value={yearBuilt} />
              <Field label="Country of Origin"     value={countryOrig} />
              {hasLanyard && <Field label="Lanyard Serial No." value={lanyardSN} mono />}
            </Section>

            {isPressure ? (
              <Section title="Pressure Vessel Technical Data" cols={4}>
                <Field label="MAWP / Working Pressure" value={mawp} />
                <Field label="Design Pressure"         value={designP} />
                <Field label="Test Pressure"           value={testP} />
                <Field label="Capacity / Volume"       value={capacity} />
              </Section>
            ) : (
              <Section title="Lifting Equipment Technical Data" cols={4}>
                <Field label="Safe Working Load (SWL)" value={swl} />
                <Field label="Capacity"                value={capacity} />
                <Field label="Test Load"               value={testP} />
                <Field label="Design Pressure"         value={designP} />
              </Section>
            )}

            {remarks && remarks !== "—" && (
              <div className="cert-section">
                <div className="cert-section-title">Remarks / Conditions</div>
                <div className="cert-remarks-text">{remarks}</div>
              </div>
            )}

          </div>

          {/* FOOTER */}
          <div className="cert-footer">
            <div className="cert-footer-grid">

              <div className="cert-sig-box">
                <div className="cert-sig-label">Authorised Inspector</div>
                <div className="cert-sig-line">
                  {sigUrl && (
                    <img src={sigUrl} alt="Signature" onError={e => { e.currentTarget.style.display = "none"; }} />
                  )}
                </div>
                <div className="cert-sig-name">{inspName !== "—" ? inspName : "Inspector"}</div>
                <div className="cert-sig-id">{inspId !== "—" ? `ID: ${inspId}` : ""}</div>
              </div>

              <div className="cert-sig-box" style={{ alignItems:"center" }}>
                <div className="cert-sig-label">Company Stamp</div>
                <div className="cert-sig-line" style={{ width:"100%", justifyContent:"center" }}>
                  <div style={{ width:64, height:64, borderRadius:"50%", border:"2px dashed #cbd5e1", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <img src={logoUrl} alt="" style={{ width:48, height:48, objectFit:"contain", opacity:0.25 }} onError={e => { e.currentTarget.style.display = "none"; }} />
                  </div>
                </div>
              </div>

              <div className="cert-sig-box" style={{ alignItems:"flex-end" }}>
                <div className="cert-sig-label">Date Issued</div>
                <div className="cert-sig-line" style={{ justifyContent:"flex-end" }}>
                  <span style={{ fontSize:13, fontWeight:700, color:"#334155" }}>{issueDate}</span>
                </div>
                <div className="cert-sig-name" style={{ textAlign:"right" }}>Next Inspection</div>
                <div className="cert-sig-id" style={{ textAlign:"right", color:"#0e7490", fontWeight:600 }}>{expiryDate}</div>
              </div>

            </div>

            <div className="cert-footer-legal">
              <div className="cert-legal-text">
                Issued in accordance with: {legalFmwk}.
                This certificate is valid only for the equipment and conditions stated herein.
                Any alterations render this certificate void.
              </div>
              <div className="cert-page-info">
                Page {index + 1} / {total}
                {c.folder_name ? ` · ${c.folder_name}` : ""}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
