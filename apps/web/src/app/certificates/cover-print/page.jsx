// src/components/certificates/CoverPage.jsx
"use client";

const COVER_CSS = `
  .cv-wrap{background:rgba(10,18,32,0.92);border:1px solid rgba(148,163,184,0.12);border-radius:16px;padding:20px;display:flex;justify-content:center;align-items:center}
  .cv-page{background:#fff;width:210mm;height:297mm;max-height:297mm;display:flex;flex-direction:column;font-family:'IBM Plex Sans',sans-serif;color:#0f1923;box-shadow:0 8px 40px rgba(0,0,0,0.28);overflow:hidden;position:relative}
  .cv-page.pm{box-shadow:none;width:100%;height:297mm}
  .cv-hdr{background:#0b1d3a;position:relative;overflow:hidden;flex-shrink:0}
  .cv-geo{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none}
  .cv-hdr-inner{position:relative;z-index:2;display:flex;align-items:stretch;min-height:100px}
  .cv-logo-box{background:#fff;width:120px;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:12px;position:relative}
  .cv-logo-box::after{content:'';position:absolute;right:-22px;top:0;width:0;height:0;border-top:50px solid #fff;border-bottom:50px solid #fff;border-right:22px solid transparent}
  .cv-logo-box img{width:90px;height:90px;object-fit:contain}
  .cv-hdr-text{flex:1;padding:16px 16px 16px 40px;display:flex;flex-direction:column;justify-content:center}
  .cv-brand{font-size:8px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#4fc3f7;margin-bottom:4px}
  .cv-company{font-size:10px;font-weight:500;color:rgba(255,255,255,0.6);letter-spacing:.04em}
  .cv-hdr-contact{padding:14px 18px;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:4px;flex-shrink:0}
  .cv-cr{font-size:7.5px;color:rgba(255,255,255,0.65)}
  .cv-accent{height:4px;background:linear-gradient(90deg,#22d3ee 0%,#3b82f6 55%,#a78bfa 100%);flex-shrink:0}
  .cv-body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 36px;position:relative;overflow:hidden}
  .cv-bg{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0}
  .cv-center{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;text-align:center;width:100%}
  .cv-client-badge{background:#0b1d3a;border:1.5px solid #22d3ee;border-radius:6px;padding:8px 28px;display:inline-flex;flex-direction:column;align-items:center;margin-bottom:20px}
  .cv-client-label{font-size:7px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#4fc3f7;margin-bottom:3px}
  .cv-client-name{font-size:16px;font-weight:900;color:#fff;letter-spacing:.1em}
  .cv-year{width:96px;height:96px;border-radius:50%;background:#0b1d3a;display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 0 0 6px rgba(34,211,238,0.12),0 0 0 12px rgba(34,211,238,0.05)}
  .cv-year-label{font-size:6.5px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#4fc3f7;margin-bottom:1px}
  .cv-year-num{font-size:28px;font-weight:900;color:#fff;line-height:1;font-family:'IBM Plex Mono',monospace}
  .cv-title-sub{font-size:9px;font-weight:700;letter-spacing:.26em;text-transform:uppercase;color:#3b6ea5;margin-bottom:8px}
  .cv-title{font-size:36px;font-weight:900;letter-spacing:-0.03em;color:#0b1d3a;line-height:1.05;margin-bottom:10px}
  .cv-title-line{width:70px;height:4px;background:linear-gradient(90deg,#22d3ee,#3b82f6);border-radius:2px;margin:0 auto 20px}
  .cv-info-strip{display:flex;gap:0;border:1px solid #1e3a5f;border-radius:7px;overflow:hidden;width:100%;margin-bottom:12px}
  .cv-info-cell{flex:1;padding:10px 14px;border-right:1px solid #1e3a5f;background:#f4f8ff}
  .cv-info-cell:last-child{border-right:none}
  .cv-info-cell:nth-child(even){background:#eef4ff}
  .cv-info-label{font-size:7px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#3b6ea5;margin-bottom:3px}
  .cv-info-value{font-size:10.5px;font-weight:700;color:#0b1d3a}
  .cv-prepared{border:1px solid #1e3a5f;border-radius:7px;background:#0b1d3a;display:grid;grid-template-columns:1fr 1px 1fr;width:100%;overflow:hidden}
  .cv-prep-cell{padding:11px 18px;display:flex;align-items:center;justify-content:space-between;gap:10px}
  .cv-prep-divider{background:rgba(34,211,238,0.25)}
  .cv-prep-label{font-size:7px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#4fc3f7;margin-bottom:2px}
  .cv-prep-name{font-size:12px;font-weight:900;color:#fff}
  .cv-prep-role{font-size:8.5px;color:rgba(255,255,255,0.5);margin-top:1px}
  .cv-prep-sig{height:34px;display:flex;align-items:center}
  .cv-prep-sig img{max-height:34px;max-width:88px;object-fit:contain;filter:brightness(10)}
  .cv-services{background:#c41e3a;padding:6px 24px;flex-shrink:0}
  .cv-services p{font-size:7.5px;color:#fff;margin:0;line-height:1.5;text-align:center;font-weight:600;letter-spacing:.02em}
  .cv-footer{background:#0b1d3a;border-top:2px solid #22d3ee;padding:6px 24px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
  .cv-footer span{font-size:8px;color:rgba(255,255,255,0.35);font-weight:600;letter-spacing:.05em}
  @media print{
    .cv-wrap{background:none!important;padding:0!important;border:none!important}
    .cv-page{box-shadow:none!important;width:100%!important;height:297mm!important}
  }
`;

export default function CoverPage({
  client           = "UNITRANS",
  title            = "Statutory Inspection",
  year             = "2026",
  location         = "KHOEMACAU MINE",
  preparedBy       = "Andrew Kale",
  preparedRole     = "Inspector",
  approvedBy       = "Moemedi Masupe",
  approvedRole     = "Competent Person · ID: 700117910",
  inspectionPeriod = "March 2026",
  totalCerts       = "",
  printMode        = false,
  logoUrl          = "/logo.png",
}) {
  const pm = printMode;
  const words = title.split(" ");

  return (
    <>
      <style>{COVER_CSS}</style>
      <div className={pm ? "" : "cv-wrap"}>
        <div className={`cv-page${pm ? " pm" : ""}`}>

          {/* HEADER */}
          <div className="cv-hdr">
            <svg className="cv-geo" viewBox="0 0 600 130" preserveAspectRatio="xMidYMid slice">
              <circle cx="540" cy="-20" r="140" fill="rgba(34,211,238,0.06)"/>
              <circle cx="500" cy="90"  r="80"  fill="rgba(59,130,246,0.05)"/>
              <circle cx="20"  cy="140" r="90"  fill="rgba(167,139,250,0.04)"/>
            </svg>
            <div className="cv-hdr-inner">
              <div className="cv-logo-box">
                <img src={logoUrl} alt="Monroy" onError={e => { e.target.style.display="none"; }}/>
              </div>
              <div className="cv-hdr-text">
                <div className="cv-brand">Monroy (Pty) Ltd · Process Control &amp; Cranes</div>
                <div className="cv-company">Inspection Report Package</div>
              </div>
              <div className="cv-hdr-contact">
                <div className="cv-cr">&#128222; (+267) 71 450 610 / 77 906 461</div>
                <div className="cv-cr">&#9993; monroybw@gmail.com</div>
                <div className="cv-cr">&#128205; Phase 2, Letlhakane, Botswana</div>
              </div>
            </div>
          </div>
          <div className="cv-accent"/>

          {/* BODY */}
          <div className="cv-body">

            {/* Background decoration */}
            <svg className="cv-bg" viewBox="0 0 595 750" preserveAspectRatio="xMidYMid slice">
              <circle cx="520" cy="660" r="290" fill="#0b1d3a" opacity="0.03"/>
              <circle cx="520" cy="660" r="190" fill="#0b1d3a" opacity="0.03"/>
              <circle cx="70"  cy="100" r="150" fill="#22d3ee" opacity="0.025"/>
              <circle cx="70"  cy="100" r="80"  fill="#22d3ee" opacity="0.03"/>
              <line x1="0" y1="185" x2="595" y2="185" stroke="#1e3a5f" strokeWidth="0.5" opacity="0.25"/>
              <line x1="0" y1="370" x2="595" y2="370" stroke="#1e3a5f" strokeWidth="0.5" opacity="0.25"/>
              <line x1="0" y1="555" x2="595" y2="555" stroke="#1e3a5f" strokeWidth="0.5" opacity="0.25"/>
              <line x1="48" y1="0" x2="48" y2="750" stroke="#22d3ee" strokeWidth="3" opacity="0.06"/>
            </svg>

            <div className="cv-center">

              {/* Client badge */}
              <div className="cv-client-badge">
                <div className="cv-client-label">Prepared for</div>
                <div className="cv-client-name">{client}</div>
              </div>

              {/* Year ring */}
              <div className="cv-year">
                <div className="cv-year-label">Year</div>
                <div className="cv-year-num">{year}</div>
              </div>

              {/* Main title */}
              <div className="cv-title-sub">Inspection Documentation</div>
              <div className="cv-title">
                {words.map((word, i) => (
                  <span key={i} style={{ color: i === words.length - 1 ? "#22d3ee" : "#0b1d3a" }}>
                    {word}{i < words.length - 1 ? " " : ""}
                  </span>
                ))}
              </div>
              <div className="cv-title-line"/>

              {/* Info strip */}
              <div className="cv-info-strip">
                <div className="cv-info-cell">
                  <div className="cv-info-label">Client</div>
                  <div className="cv-info-value">{client}</div>
                </div>
                <div className="cv-info-cell">
                  <div className="cv-info-label">Site Location</div>
                  <div className="cv-info-value">{location}</div>
                </div>
                <div className="cv-info-cell">
                  <div className="cv-info-label">Inspection Period</div>
                  <div className="cv-info-value">{inspectionPeriod}</div>
                </div>
                {totalCerts && (
                  <div className="cv-info-cell">
                    <div className="cv-info-label">Total Certificates</div>
                    <div className="cv-info-value">{totalCerts}</div>
                  </div>
                )}
              </div>

              {/* Prepared by / Approved by */}
              <div className="cv-prepared">
                <div className="cv-prep-cell">
                  <div>
                    <div className="cv-prep-label">Prepared by</div>
                    <div className="cv-prep-name">{preparedBy}</div>
                    <div className="cv-prep-role">{preparedRole}</div>
                  </div>
                  <div className="cv-prep-sig">
                    <div style={{borderBottom:"1px solid rgba(255,255,255,0.25)",minWidth:90,height:38}}/>
                  </div>
                </div>
                <div className="cv-prep-divider"/>
                <div className="cv-prep-cell">
                  <div>
                    <div className="cv-prep-label">Approved by</div>
                    <div className="cv-prep-name">{approvedBy}</div>
                    <div className="cv-prep-role">{approvedRole}</div>
                  </div>
                  <div className="cv-prep-sig">
                    <img src="/Signature" alt="sig" onError={e => { e.target.style.display="none"; }}/>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* FOOTER */}
          <div className="cv-services">
            <p><b>Mobile Crane Hire</b> | <b>Rigging</b> | <b>NDT Test</b> | <b>Scaffolding</b> | <b>Painting</b> | <b>Inspection of Lifting Equipment and Machinery, Pressure Vessels &amp; Air Receiver</b> | <b>Steel Fabricating and Structural</b> | <b>Mechanical Engineering</b> | <b>Fencing</b> | <b>Maintenance</b></p>
          </div>
          <div className="cv-footer">
            <span>Monroy (Pty) Ltd · Mophane Avenue, Maun, Botswana</span>
            <span>Confidential · Quality · Safety · Excellence</span>
          </div>

        </div>
      </div>
    </>
  );
}
