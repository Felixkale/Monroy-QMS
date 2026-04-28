// src/components/certificates/CoverPage.jsx
"use client";

const COVER_CSS = `
  .cv-wrap{background:rgba(10,18,32,0.92);border:1px solid rgba(148,163,184,0.12);border-radius:16px;padding:20px;display:flex;justify-content:center;align-items:flex-start}
  .cv-page{background:#fff;width:210mm;min-height:297mm;height:297mm;display:flex;flex-direction:column;font-family:'IBM Plex Sans',sans-serif;color:#0f1923;box-shadow:0 8px 40px rgba(0,0,0,0.28);overflow:hidden;position:relative;box-sizing:border-box}
  .cv-page.pm{box-shadow:none!important;width:210mm!important;height:297mm!important}
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
  .cv-accent-fail{height:4px;background:linear-gradient(90deg,#ef4444 0%,#b91c1c 55%,#7f1d1d 100%);flex-shrink:0}

  .cv-body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 36px;position:relative;overflow:hidden}
  .cv-bg{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0}
  .cv-center{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;text-align:center;width:100%;gap:0}

  .cv-client-badge{background:#0b1d3a;border:1.5px solid #22d3ee;border-radius:6px;padding:8px 28px;display:inline-flex;flex-direction:column;align-items:center;margin-bottom:18px}
  .cv-client-badge-fail{background:#3b0a0a;border:1.5px solid #ef4444;border-radius:6px;padding:8px 28px;display:inline-flex;flex-direction:column;align-items:center;margin-bottom:18px}
  .cv-client-label{font-size:7px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#4fc3f7;margin-bottom:3px}
  .cv-client-label-fail{font-size:7px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#f87171;margin-bottom:3px}
  .cv-client-name{font-size:16px;font-weight:900;color:#fff;letter-spacing:.1em}

  .cv-year{width:88px;height:88px;border-radius:50%;background:#0b1d3a;display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 auto 18px;box-shadow:0 0 0 6px rgba(34,211,238,0.12),0 0 0 12px rgba(34,211,238,0.05)}
  .cv-year-fail{width:88px;height:88px;border-radius:50%;background:#3b0a0a;display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 auto 18px;box-shadow:0 0 0 6px rgba(239,68,68,0.15),0 0 0 12px rgba(239,68,68,0.06)}
  .cv-year-label{font-size:6.5px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#4fc3f7;margin-bottom:1px}
  .cv-year-label-fail{font-size:6.5px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#f87171;margin-bottom:1px}
  .cv-year-num{font-size:26px;font-weight:900;color:#fff;line-height:1;font-family:'IBM Plex Mono',monospace}

  .cv-title-sub{font-size:9px;font-weight:700;letter-spacing:.26em;text-transform:uppercase;color:#3b6ea5;margin-bottom:8px}
  .cv-title-sub-fail{font-size:9px;font-weight:700;letter-spacing:.26em;text-transform:uppercase;color:#b91c1c;margin-bottom:8px}
  .cv-title{font-size:34px;font-weight:900;letter-spacing:-0.03em;color:#0b1d3a;line-height:1.05;margin-bottom:10px}
  .cv-title-line{width:70px;height:4px;background:linear-gradient(90deg,#22d3ee,#3b82f6);border-radius:2px;margin:0 auto 18px}
  .cv-title-line-fail{width:70px;height:4px;background:linear-gradient(90deg,#ef4444,#b91c1c);border-radius:2px;margin:0 auto 18px}

  .cv-info-strip{display:flex;gap:0;border:1px solid #1e3a5f;border-radius:7px;overflow:hidden;width:100%;margin-bottom:12px}
  .cv-info-strip-fail{display:flex;gap:0;border:1px solid #fca5a5;border-radius:7px;overflow:hidden;width:100%;margin-bottom:12px}
  .cv-info-cell{flex:1;padding:9px 14px;border-right:1px solid #1e3a5f;background:#f4f8ff}
  .cv-info-cell:last-child{border-right:none}
  .cv-info-cell:nth-child(even){background:#eef4ff}
  .cv-info-cell-fail{flex:1;padding:9px 14px;border-right:1px solid #fca5a5;background:#fff5f5}
  .cv-info-cell-fail:last-child{border-right:none}
  .cv-info-cell-fail:nth-child(even){background:#fee2e2}
  .cv-info-label{font-size:7px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#3b6ea5;margin-bottom:3px}
  .cv-info-label-fail{font-size:7px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#b91c1c;margin-bottom:3px}
  .cv-info-value{font-size:10px;font-weight:700;color:#0b1d3a}
  .cv-info-value-fail{font-size:10px;font-weight:700;color:#7f1d1d}

  /* ── STATUS BOX ──────────────────────────────────────── */
  .cv-status-box-pass{
    width:100%;margin-bottom:12px;
    border:1px solid #86efac;border-left:5px solid #22c55e;
    border-radius:7px;background:#f0fdf4;
    padding:14px 20px;
    display:flex;align-items:center;gap:16px;
  }
  .cv-status-box-fail{
    width:100%;margin-bottom:12px;
    border:1px solid #fca5a5;border-left:5px solid #ef4444;
    border-radius:7px;background:#fff5f5;
    padding:14px 20px;
    display:flex;align-items:center;gap:16px;
  }
  .cv-sb-icon{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
  .cv-sb-icon-pass{background:#dcfce7;border:2px solid #86efac}
  .cv-sb-icon-fail{background:#fee2e2;border:2px solid #fca5a5}
  .cv-sb-label{font-size:7px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin-bottom:3px}
  .cv-status-box-pass .cv-sb-label{color:#15803d}
  .cv-status-box-fail .cv-sb-label{color:#b91c1c}
  .cv-sb-count{font-size:30px;font-weight:900;line-height:1;font-family:'IBM Plex Mono',monospace}
  .cv-status-box-pass .cv-sb-count{color:#15803d}
  .cv-status-box-fail .cv-sb-count{color:#b91c1c}
  .cv-sb-desc{font-size:8.5px;font-weight:600;margin-top:3px}
  .cv-status-box-pass .cv-sb-desc{color:#166534}
  .cv-status-box-fail .cv-sb-desc{color:#991b1b}
  .cv-sb-word{font-size:28px;font-weight:900;letter-spacing:.06em;font-family:'IBM Plex Mono',monospace;margin-left:auto;flex-shrink:0}
  .cv-status-box-pass .cv-sb-word{color:#15803d}
  .cv-status-box-fail .cv-sb-word{color:#b91c1c}

  /* ── BOTTOM ROW ──────────────────────────────────────── */
  .cv-bottom-row{border:1px solid #1e3a5f;border-radius:7px;background:#fff;width:100%;overflow:hidden}
  .cv-bottom-row-fail{border:1px solid #fca5a5;border-radius:7px;background:#fff;width:100%;overflow:hidden}
  .cv-comp-cell{padding:12px 18px;display:flex;align-items:center;justify-content:space-between;gap:10px;background:#fff}
  .cv-comp-label{font-size:7px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#3b6ea5;margin-bottom:2px}
  .cv-comp-label-fail{font-size:7px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#b91c1c;margin-bottom:2px}
  .cv-comp-name{font-size:11px;font-weight:900;color:#0b1d3a}
  .cv-comp-role{font-size:8px;color:#64748b;margin-top:1px}

  .cv-services{background:#c41e3a;padding:6px 24px;flex-shrink:0}
  .cv-services p{font-size:7.5px;color:#fff;margin:0;line-height:1.5;text-align:center;font-weight:600;letter-spacing:.02em}
  .cv-footer{background:#0b1d3a;border-top:2px solid #22d3ee;padding:6px 24px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
  .cv-footer-fail{background:#1a0505;border-top:2px solid #ef4444;padding:6px 24px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
  .cv-footer span{font-size:8px;color:rgba(255,255,255,0.35);font-weight:600;letter-spacing:.05em}
  .cv-footer-fail span{font-size:8px;color:rgba(255,200,200,0.35);font-weight:600;letter-spacing:.05em}

  @media print{
    .cv-wrap{background:none!important;padding:0!important;border:none!important;display:block!important}
    .cv-page{box-shadow:none!important;width:210mm!important;height:297mm!important;min-height:unset!important}
  }
`;

export default function CoverPage({
  client           = "UNITRANS",
  title            = "Statutory Inspection",
  year             = "2026",
  location         = "KHOEMACAU MINE",
  approvedBy       = "Moemedi Masupe",
  approvedRole     = "Competent Person · ID: 700117910",
  inspectionPeriod = "March 2026",
  totalCerts       = "",
  passedCount      = null,
  failedCount      = null,
  printMode        = false,
  logoUrl          = "/logo.png",
}) {
  const pm = printMode;

  const passed = passedCount !== null && passedCount !== "" ? parseInt(passedCount, 10) : null;
  const failed = failedCount !== null && failedCount !== "" ? parseInt(failedCount, 10) : null;
  const count  = totalCerts !== "" && totalCerts != null ? parseInt(totalCerts, 10)
    : ((passed ?? 0) + (failed ?? 0)) || null;

  // This cover's "mode" — if failed > 0 it's a FAIL cover, else PASS cover
  const isFail = (failed ?? 0) > 0;

  // Title words — fail cover appends "Discarded" in red
  const words = title.split(" ");

  return (
    <>
      <style>{COVER_CSS}</style>
      <div className={pm ? "" : "cv-wrap"}>
        <div className={`cv-page${pm ? " pm" : ""}`}>

          {/* ── HEADER ─────────────────────────────────────── */}
          <div className="cv-hdr">
            <svg className="cv-geo" viewBox="0 0 600 130" preserveAspectRatio="xMidYMid slice">
              <circle cx="540" cy="-20" r="140" fill={isFail ? "rgba(239,68,68,0.06)" : "rgba(34,211,238,0.06)"}/>
              <circle cx="500" cy="90"  r="80"  fill={isFail ? "rgba(185,28,28,0.05)" : "rgba(59,130,246,0.05)"}/>
              <circle cx="20"  cy="140" r="90"  fill="rgba(167,139,250,0.04)"/>
            </svg>
            <div className="cv-hdr-inner">
              <div className="cv-logo-box">
                <img src={logoUrl} alt="Monroy" onError={e => { e.target.style.display = "none"; }}/>
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
          {/* accent bar — cyan for pass, red for fail */}
          <div className={isFail ? "cv-accent-fail" : "cv-accent"}/>

          {/* ── BODY ───────────────────────────────────────── */}
          <div className="cv-body">
            <svg className="cv-bg" viewBox="0 0 595 750" preserveAspectRatio="xMidYMid slice">
              <circle cx="520" cy="660" r="290" fill="#0b1d3a" opacity="0.03"/>
              <circle cx="520" cy="660" r="190" fill="#0b1d3a" opacity="0.03"/>
              <circle cx="70"  cy="100" r="150" fill={isFail ? "#ef4444" : "#22d3ee"} opacity="0.025"/>
              <circle cx="70"  cy="100" r="80"  fill={isFail ? "#ef4444" : "#22d3ee"} opacity="0.03"/>
              <line x1="0" y1="185" x2="595" y2="185" stroke="#1e3a5f" strokeWidth="0.5" opacity="0.25"/>
              <line x1="0" y1="370" x2="595" y2="370" stroke="#1e3a5f" strokeWidth="0.5" opacity="0.25"/>
              <line x1="0" y1="555" x2="595" y2="555" stroke="#1e3a5f" strokeWidth="0.5" opacity="0.25"/>
              <line x1="48" y1="0" x2="48" y2="750" stroke={isFail ? "#ef4444" : "#22d3ee"} strokeWidth="3" opacity="0.06"/>
            </svg>

            <div className="cv-center">

              {/* Client badge */}
              <div className={isFail ? "cv-client-badge-fail" : "cv-client-badge"}>
                <div className={isFail ? "cv-client-label-fail" : "cv-client-label"}>Prepared for</div>
                <div className="cv-client-name">{client}</div>
              </div>

              {/* Year ring */}
              <div className={isFail ? "cv-year-fail" : "cv-year"}>
                <div className={isFail ? "cv-year-label-fail" : "cv-year-label"}>Year</div>
                <div className="cv-year-num">{year}</div>
              </div>

              {/* Title */}
              <div className={isFail ? "cv-title-sub-fail" : "cv-title-sub"}>Inspection Documentation</div>
              <div className="cv-title">
                {isFail ? (
                  <>
                    {words.map((w, i) => (
                      <span key={i} style={{ color: "#0b1d3a" }}>{w} </span>
                    ))}
                    <span style={{ color: "#ef4444" }}>Discarded</span>
                  </>
                ) : (
                  words.map((w, i) => (
                    <span key={i} style={{ color: i === words.length - 1 ? "#22d3ee" : "#0b1d3a" }}>
                      {w}{i < words.length - 1 ? " " : ""}
                    </span>
                  ))
                )}
              </div>
              <div className={isFail ? "cv-title-line-fail" : "cv-title-line"}/>

              {/* Info strip — styled by mode */}
              <div className={isFail ? "cv-info-strip-fail" : "cv-info-strip"}>
                {[
                  { label: "Client",             value: client },
                  { label: "Site Location",      value: location },
                  { label: "Inspection Period",  value: inspectionPeriod },
                  ...(count ? [{ label: "Total Certificates", value: String(count) }] : []),
                ].map((cell, i) => (
                  <div key={i} className={isFail ? "cv-info-cell-fail" : "cv-info-cell"}>
                    <div className={isFail ? "cv-info-label-fail" : "cv-info-label"}>{cell.label}</div>
                    <div className={isFail ? "cv-info-value-fail" : "cv-info-value"}>{cell.value}</div>
                  </div>
                ))}
              </div>

              {/* ── STATUS BOX — only shows this cover's own count ── */}
              {isFail ? (
                <div className="cv-status-box-fail">
                  <div className="cv-sb-icon cv-sb-icon-fail">✗</div>
                  <div style={{ flex: 1 }}>
                    <div className="cv-sb-label">Equipment Failed / Discarded</div>
                    <div className="cv-sb-count">{failed ?? 0}</div>
                    <div className="cv-sb-desc">
                      {(failed ?? 0) === 1
                        ? "1 unit requires attention — removed from service"
                        : `${failed ?? 0} units require attention — removed from service`}
                    </div>
                  </div>
                  <div className="cv-sb-word">FAIL</div>
                </div>
              ) : (
                <div className="cv-status-box-pass">
                  <div className="cv-sb-icon cv-sb-icon-pass">✓</div>
                  <div style={{ flex: 1 }}>
                    <div className="cv-sb-label">Equipment Passed Inspection</div>
                    <div className="cv-sb-count">{passed ?? 0}</div>
                    <div className="cv-sb-desc">
                      {(passed ?? 0) === 1
                        ? "1 unit cleared and certified for service"
                        : `${passed ?? 0} units cleared and certified for service`}
                    </div>
                  </div>
                  <div className="cv-sb-word">PASS</div>
                </div>
              )}

              {/* ── COMPETENT PERSON ──────────────────────────── */}
              <div className={isFail ? "cv-bottom-row-fail" : "cv-bottom-row"}>
                <div className="cv-comp-cell">
                  <div style={{ flex: 1 }}>
                    <div className={isFail ? "cv-comp-label-fail" : "cv-comp-label"}>Competent Person</div>
                    <div className="cv-comp-name">{approvedBy}</div>
                    <div className="cv-comp-role">{approvedRole}</div>
                  </div>
                  <div style={{
                    background: "#fff",
                    border: `1px solid ${isFail ? "#fca5a5" : "#1e3a5f"}`,
                    borderRadius: 5, minWidth: 96, height: 40,
                    display: "flex", alignItems: "flex-end", padding: "4px 8px",
                  }}>
                    <img src="/Signature" alt="sig"
                      style={{ maxHeight: 32, maxWidth: 88, objectFit: "contain" }}
                      onError={e => { e.target.style.display = "none"; }}/>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ── PAGE FOOTER ────────────────────────────────── */}
          <div className="cv-services">
            <p><b>Mobile Crane Hire</b> | <b>Rigging</b> | <b>NDT Test</b> | <b>Scaffolding</b> | <b>Painting</b> | <b>Inspection of Lifting Equipment and Machinery, Pressure Vessels &amp; Air Receiver</b> | <b>Steel Fabricating and Structural</b> | <b>Mechanical Engineering</b> | <b>Fencing</b> | <b>Maintenance</b></p>
          </div>
          <div className={isFail ? "cv-footer-fail" : "cv-footer"}>
            <span>Monroy (Pty) Ltd · Mophane Avenue, Maun, Botswana</span>
            <span>Confidential · Quality · Safety · Excellence</span>
          </div>

        </div>
      </div>
    </>
  );
}
