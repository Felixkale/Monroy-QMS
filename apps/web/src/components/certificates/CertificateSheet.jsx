// src/components/certificates/CertificateSheet.jsx
"use client";

const CSS = `

  .cs-wrap{background:rgba(10,18,32,0.92);border:1px solid rgba(148,163,184,0.12);border-radius:16px;padding:20px;display:flex;justify-content:center}
  .cs-page{background:#fff;width:210mm;min-height:297mm;display:flex;flex-direction:column;font-family:'IBM Plex Sans',sans-serif;color:#0f1923;box-shadow:0 8px 40px rgba(0,0,0,0.28);overflow:hidden}
  .cs-page.print-mode{box-shadow:none;width:100%;min-height:unset}

  /* HEADER */
  .cs-hdr{background:#0b1d3a;position:relative;overflow:hidden;flex-shrink:0}
  .cs-geo{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none}
  .cs-hdr-inner{position:relative;z-index:2;display:flex;align-items:stretch;min-height:120px}
  .cs-logo-box{background:#fff;width:140px;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:14px;position:relative}
  .cs-logo-box::after{content:'';position:absolute;right:-24px;top:0;width:0;height:0;border-top:60px solid #fff;border-bottom:60px solid #fff;border-right:24px solid transparent}
  .cs-logo-box img{width:108px;height:108px;object-fit:contain}
  .cs-logo-fb{width:108px;height:108px;display:none;align-items:center;justify-content:center;background:#0b1d3a;border:2px solid #22d3ee;border-radius:8px;font-size:36px;font-weight:900;color:#22d3ee;font-family:'IBM Plex Mono',monospace}
  .cs-hdr-text{flex:1;padding:20px 20px 20px 44px;display:flex;flex-direction:column;justify-content:center}
  .cs-brand{font-size:9px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#4fc3f7;margin-bottom:5px}
  .cs-title{font-size:21px;font-weight:900;letter-spacing:-.02em;color:#fff;line-height:1.1;margin-bottom:6px}
  .cs-sub{font-size:10px;color:rgba(255,255,255,0.50);font-weight:500}
  .cs-hdr-right{padding:20px 22px;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:10px;flex-shrink:0}
  .cs-badge{font-size:11px;font-weight:900;padding:6px 16px;border-radius:99px;letter-spacing:.10em;text-transform:uppercase}
  .cs-certno{font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;color:rgba(255,255,255,0.50)}
  .cs-accent{height:4px;background:linear-gradient(90deg,#22d3ee 0%,#3b82f6 55%,#a78bfa 100%);flex-shrink:0}

  /* BODY */
  .cs-body{flex:1;padding:14px 22px 10px;display:flex;flex-direction:column;gap:9px}

  /* Sections — dark navy headers matching the main header */
  .cs-sec{border:1px solid #1e3a5f;border-radius:7px;overflow:hidden}
  .cs-sec-ttl{background:#0b1d3a;border-bottom:1px solid #22d3ee;padding:6px 12px;font-size:8.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#4fc3f7;display:flex;align-items:center;gap:8px}
  .cs-sec-ttl::before{content:'';width:3px;height:10px;background:#22d3ee;border-radius:2px;flex-shrink:0}
  .cs-fields{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr))}
  .cs-field{padding:8px 12px;border-right:1px solid #dbeafe;border-bottom:1px solid #dbeafe;background:#f4f8ff}
  .cs-field:nth-child(odd){background:#eef4ff}
  .cs-field:last-child{border-right:none}
  .cs-fl{font-size:7.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#3b6ea5;margin-bottom:3px}
  .cs-fv{font-size:11.5px;font-weight:600;color:#0b1d3a;line-height:1.3;word-break:break-word}
  .cs-fv.mono{font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:#0e7490}
  .cs-fv.large{font-size:13px;font-weight:900;color:#0b1d3a}
  .cs-remarks{font-size:11px;color:#334155;line-height:1.65;padding:9px 12px;background:#f4f8ff}

  /* SIGNATURES — always at bottom, dark navy card */
  .cs-sig-wrap{padding:0 22px 10px;flex-shrink:0}
  .cs-sig-card{background:#0b1d3a;border-radius:8px;padding:14px 16px}
  .cs-sig-card-title{font-size:8.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#4fc3f7;margin-bottom:12px;display:flex;align-items:center;gap:8px}
  .cs-sig-card-title::before{content:'';width:3px;height:10px;background:#22d3ee;border-radius:2px}
  .cs-sig-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
  .cs-sig-label{font-size:7.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#4fc3f7;margin-bottom:4px}
  .cs-sig-line{border-bottom:1px solid rgba(34,211,238,0.35);height:44px;margin-bottom:5px;display:flex;align-items:flex-end;padding-bottom:4px}
  .cs-sig-line img{max-height:38px;max-width:100%;object-fit:contain}
  .cs-sig-name{font-size:11px;font-weight:700;color:#fff}
  .cs-sig-id{font-size:9.5px;color:rgba(255,255,255,0.50);margin-top:2px}
  .cs-sig-hint{font-size:9px;color:rgba(255,255,255,0.28);font-style:italic;margin-top:3px}
  .cs-stamp{width:52px;height:52px;border-radius:50%;border:1.5px dashed rgba(34,211,238,0.35);display:flex;align-items:center;justify-content:center;color:rgba(34,211,238,0.28);font-size:8px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}

  /* LEGAL */
  /* LEGAL FRAMEWORK BOX */
  .cs-legal-box{margin:0 22px 8px;padding:10px 14px;border:1px solid #b8cce4;border-radius:7px;background:#eaf2fb;flex-shrink:0}
  .cs-legal-box-title{font-size:8px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#0b1d3a;margin-bottom:5px}
  .cs-legal-box-body{font-size:8px;color:#1e3a5f;line-height:1.65}
  .cs-legal-box-body b{font-weight:800;color:#0b1d3a}
  .cs-legal{padding:5px 22px 6px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-shrink:0}
  .cs-legal-txt{font-size:7px;color:#94a3b8;line-height:1.5;max-width:500px}
  .cs-page-info{font-size:7.5px;font-weight:700;color:#cbd5e1;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}

  /* RED SERVICES BANNER */
  .cs-services{background:#cc1111;padding:10px 28px;text-align:center;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .cs-services p{font-size:8.5px;font-weight:500;color:#fff;line-height:1.75;letter-spacing:.01em}
  .cs-services p b{font-weight:800}

  /* FOOTER STRIP */
  .cs-footer{background:#0b1d3a;padding:5px 22px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .cs-footer span{font-size:8px;color:rgba(255,255,255,0.40);font-weight:600;letter-spacing:.08em;text-transform:uppercase}

  /* PRINT */
  @page{size:A4;margin:0}
  @media print{
    .cs-wrap{background:none!important;border:none!important;border-radius:0!important;padding:0!important}
    .cs-page{box-shadow:none!important;width:210mm!important;min-height:297mm!important}
    .cs-hdr,.cs-accent,.cs-sec-ttl,.cs-badge,.cs-services,.cs-footer,.cs-sig-card{
      -webkit-print-color-adjust:exact;print-color-adjust:exact
    }
  }

  /* RESPONSIVE */
  @media(max-width:860px){
    .cs-wrap{padding:8px}
    .cs-page{width:100%;min-height:unset}
    .cs-title{font-size:16px}
    .cs-logo-box{width:96px}
    .cs-logo-box img{width:74px;height:74px}
    .cs-sig-grid{grid-template-columns:1fr 1fr}
  }
  @media(max-width:560px){
    .cs-hdr-inner{flex-wrap:wrap}
    .cs-hdr-right{width:100%;flex-direction:row;justify-content:flex-start;padding-top:0;padding-left:22px}
    .cs-fields{grid-template-columns:1fr 1fr!important}
    .cs-sig-grid{grid-template-columns:1fr}
    .cs-hdr-text{padding-left:24px}
  }
`;

/* ── Helpers ── */
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
  for (const raw of [c.result, c.equipment_status, ex.result, ex.equipment_status, ex.inspection_result]) {
    if (!raw) continue;
    const n = String(raw).trim().toUpperCase().replace(/\s+/g,"_");
    if (n === "UNKNOWN") continue;
    if (["CONDITIONAL","REPAIR_REQUIRED","REPAIR REQUIRED"].includes(n)) return "REPAIR_REQUIRED";
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

/* ── Sub-components ── */
function Field({ label, value, mono=false, large=false }) {
  if (!value) return null;
  return (
    <div className="cs-field">
      <div className="cs-fl">{label}</div>
      <div className={`cs-fv${mono?" mono":""}${large?" large":""}`}>{value}</div>
    </div>
  );
}
function Section({ title, children }) {
  const kids = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  if (!kids.length) return null;
  return (
    <div className="cs-sec">
      {title && <div className="cs-sec-ttl">{title}</div>}
      <div className="cs-fields">{kids}</div>
    </div>
  );
}
function HeaderGeo() {
  return (
    <svg className="cs-geo" viewBox="0 0 794 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="0,0 95,0 58,120 0,120"   fill="#4fc3f7" opacity="0.15"/>
      <polygon points="0,0 60,0 24,120 0,120"   fill="#22d3ee" opacity="0.20"/>
      <polygon points="794,0 724,0 764,120 794,120" fill="#3b82f6" opacity="0.10"/>
    </svg>
  );
}

/* ── Main ── */
export default function CertificateSheet({ certificate: c, index=0, total=1, printMode=false }) {
  if (!c) return null;
  const ex = c.extracted_data || {};

  const company    = val(c.company      || c.client_name    || ex.client_name) || "Monroy (Pty) Ltd";
  const _rawType   = String(equipType || "").toLowerCase();
  const _isLifting = /lift|hoist|crane|sling|chain|shackle|hook|swivel|beam|spreader|harness|lanyard|rope|rigging|winch|pulley|block|tackle|eyebolt|ring|clamp|grab|magnet|vacuum|below.the.hook|btl|wll|swl/i.test(_rawType);
  const _isPressure= /pressure|vessel|boiler|autoclave|receiver|accumulator|compressor|hydraulic|tank|cylinder|drum|pipeline|heat.exchanger|separator|filter.vessel/i.test(_rawType);
  const certType   = val(c.certificate_type || ex.certificate_type || c.document_category) ||
    (_isLifting  ? "Load Test Certificate" :
     _isPressure ? "Pressure Test Certificate" :
                   "Certificate of Inspection");
  const certNumber = val(c.certificate_number);
  const inspNumber = val(c.inspection_no || c.inspection_number || ex.inspection_no);
  const issueDate  = formatDate(c.issue_date  || c.issued_at  || ex.issue_date);
  const expiryDate = formatDate(c.expiry_date || c.valid_to   || c.next_inspection_date || ex.expiry_date || ex.next_inspection_date);
  const equipDesc  = val(c.equipment_description || c.asset_name   || ex.equipment_description);
  const equipType  = val(c.equipment_type        || c.asset_type   || ex.equipment_type);
  const equipId    = val(c.equipment_id           || c.asset_tag   || ex.equipment_id);
  const idNumber   = val(c.identification_number  || ex.identification_number);
  const lanyardSN  = val(c.lanyard_serial_no       || ex.lanyard_serial_no);
  const location   = val(c.equipment_location || c.location || ex.equipment_location);
  const mfg        = val(c.manufacturer   || ex.manufacturer);
  const model      = val(c.model          || ex.model);
  const yearBuilt  = val(c.year_built     || ex.year_built);
  const swl        = val(c.swl            || ex.swl  || c.safe_working_load);
  const mawp       = val(c.mawp           || ex.mawp || c.working_pressure);
  const capacity   = val(c.capacity       || ex.capacity || c.capacity_volume);
  const designP    = val(c.design_pressure  || ex.design_pressure);
  const testP      = val(c.test_pressure    || ex.test_pressure);
  const countryOrig= val(c.country_of_origin || ex.country_of_origin);
  const legalFmwk  = val(c.legal_framework) || "Mines, Quarries, Works and Machinery Act Cap 44:02";
  const inspName   = val(c.inspector_name || ex.inspector_name) || "Moemedi Masupe";
  const inspId     = val(c.inspector_id   || ex.inspector_id)   || "700117910";
  const remarks    = val(
    c.remarks ||
    c.comments ||
    ex.remarks ||
    c.notes ||           // from asset notes when synced
    c.description ||     // from asset description
    ex.comments ||
    ex.notes
  );
  const sigUrl     = val(c.signature_url) || "/Signature.png";
  const logoUrl    = c.logo_url || "/logo.png";

  const tone = resultStyle(pickResult(c));

  return (
    <>
      <style>{CSS}</style>
      <div className={printMode ? "" : "cs-wrap"}>
        <div className={`cs-page${printMode ? " print-mode" : ""}`}>

          {/* ── HEADER ── */}
          <div className="cs-hdr">
            <div className="cs-hdr-inner">
              <HeaderGeo />

              <div className="cs-logo-box">
                <img
                  src={logoUrl}
                  alt="Monroy Logo"
                  onError={e => {
                    e.currentTarget.style.display = "none";
                    const fb = e.currentTarget.nextSibling;
                    if (fb) fb.style.display = "flex";
                  }}
                />
                <div className="cs-logo-fb">M</div>
              </div>

              <div className="cs-hdr-text">
                <div className="cs-brand">Monroy (Pty) Ltd · Maun, Botswana</div>
                <div className="cs-title">{certType}</div>
                <div className="cs-sub">
                  {company}
                  {total > 1 && c.folder_name ? ` · ${c.folder_name}` : ""}
                  {total > 1 ? ` · Page ${index + 1} of ${total}` : ""}
                </div>
              </div>

              <div className="cs-hdr-right">
                <span className="cs-badge" style={{ background:tone.bg, color:tone.color }}>
                  {tone.label}
                </span>
                {certNumber && <div className="cs-certno">{certNumber}</div>}
              </div>
            </div>
          </div>
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
              <Field label="Equipment ID"       value={equipId}    mono />
              <Field label="Identification No." value={idNumber}   mono />
              <Field label="Manufacturer"       value={mfg} />
              <Field label="Model"              value={model} />
              <Field label="Year Built"         value={yearBuilt} />
              <Field label="Country of Origin"  value={countryOrig} />
              <Field label="Lanyard Serial No." value={lanyardSN}  mono />
            </Section>

            <Section title="Technical Data">
              <Field label="Safe Working Load (SWL)"  value={swl} />
              <Field label="MAWP / Working Pressure"  value={mawp} />
              <Field label="Capacity / Volume"        value={capacity} />
              <Field label="Design Pressure"          value={designP} />
              <Field label="Test Pressure"            value={testP} />
            </Section>

            {/* ── LEGAL FRAMEWORK — just below technical data ── */}
            <div className="cs-sec" style={{borderColor:"#b8cce4",background:"#eaf2fb"}}>
              <div className="cs-sec-ttl" style={{background:"#d0e8f8",color:"#0b1d3a",borderBottomColor:"#b8cce4",fontSize:"10px",padding:"8px 14px",letterSpacing:"0.1em"}}>
                Legal Framework &amp; Compliance Declaration
              </div>
              <div style={{padding:"12px 14px",fontSize:"11px",color:"#1e3a5f",lineHeight:1.8,fontWeight:500}}>
                This inspection has been performed by a{" "}
                <b style={{fontWeight:900,color:"#0b1d3a"}}>competent person</b>{" "}
                as defined under the{" "}
                <b style={{fontWeight:900,color:"#0b1d3a"}}>Mines, Quarries, Works and Machinery Act Cap 44:02</b>{" "}
                of the Laws of Botswana. The inspection, testing and certification of the above equipment
                has been carried out in full compliance with the requirements of the said Act and applicable regulations.
                {legalFmwk && legalFmwk !== "Mines, Quarries, Works and Machinery Act Cap 44:02" && (
                  <span>{" "}Additional standard applied: <b style={{fontWeight:900}}>{legalFmwk}</b>.</span>
                )}
              </div>
            </div>

            {remarks && (
              <div className="cs-sec">
                <div className="cs-sec-ttl">Remarks / Conditions</div>
                <div className="cs-remarks">{remarks}</div>
              </div>
            )}

          </div>

          {/* ── SIGNATURES — always present ── */}
          <div className="cs-sig-wrap">
            <div className="cs-sig-card">
              <div className="cs-sig-card-title">Signatures &amp; Authorisation</div>
              <div className="cs-sig-grid">

                <div>
                  <div className="cs-sig-label">Inspector Signature</div>
                  <div className="cs-sig-line">
                    <img
                      src={sigUrl || "/Signature.png"}
                      alt="Inspector Signature"
                      style={{ maxHeight:38, maxWidth:"100%", objectFit:"contain" }}
                    />
                  </div>
                  <div className="cs-sig-name">{inspName}</div>
                  <div className="cs-sig-id">Inspector ID: {inspId}</div>
                </div>

                <div>
                  <div className="cs-sig-label">Client / Witness Signature</div>
                  <div className="cs-sig-line" />
                  <div className="cs-sig-hint">Client representative sign here</div>
                </div>

                <div style={{ textAlign:"right" }}>
                  <div className="cs-sig-label" style={{ textAlign:"right" }}>Company Stamp</div>
                  <div className="cs-sig-line" style={{ justifyContent:"center" }}>
                    <div className="cs-stamp">Stamp</div>
                  </div>
                  {issueDate  && <div className="cs-sig-name"  style={{ textAlign:"right" }}>Issue: {issueDate}</div>}
                  {expiryDate && <div className="cs-sig-id"    style={{ textAlign:"right" }}>Expiry: {expiryDate}</div>}
                </div>

              </div>
            </div>
          </div>

          {/* ── LEGAL ── */}
          <div className="cs-legal">
            <div className="cs-legal-txt">
              This certificate is valid only for the equipment and conditions stated herein. Any alterations or unauthorised modifications render this certificate void.
              Monroy (Pty) Ltd accepts no liability for use of this equipment beyond the scope of this inspection.
            </div>
            <div className="cs-page-info">{index + 1} / {total}{c.folder_name ? ` · ${c.folder_name}` : ""}</div>
          </div>

          {/* ── RED SERVICES BANNER ── */}
          <div className="cs-services">
            <p>
              <b>Mobile Crane Hire</b> | <b>Rigging</b> | <b>NDT Test</b> | <b>Scaffolding</b> | <b>Painting</b> | <b>Inspection of Lifting Equipment and Machinery, Pressure Vessels &amp; Air Receiver</b> | Inspection of Lifting Equipment | <b>Steel Fabricating and Structural</b> | <b>Mechanical Engineering</b> | <b>Fencing</b> | <b>Maintenance</b>
            </p>
          </div>

          {/* ── FOOTER STRIP ── */}
          <div className="cs-footer">
            <span>Monroy (Pty) Ltd · Mophane Avenue, Maun, Botswana</span>
            <span>Quality · Safety · Excellence</span>
          </div>

        </div>
      </div>
    </>
  );
}
