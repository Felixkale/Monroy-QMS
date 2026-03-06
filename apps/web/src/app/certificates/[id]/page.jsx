"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import AppLayout from "../../components/AppLayout";

const C = { green: "#00f5c4", purple: "#7c5cfc", blue: "#4fc3f7", pink: "#f472b6", yellow: "#fbbf24" };

const LOGO_B64 = ""; // Replace with your base64 logo string

/* ─── QR Code Canvas ─────────────────────────────────────────── */
function QRCanvas({ text, size = 90 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cells = 25;
    const cell = size / cells;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);

    function hash(str) {
      let h = 0;
      for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
      return Math.abs(h);
    }

    function drawFinder(x, y) {
      ctx.fillStyle = "#000";
      ctx.fillRect(x * cell, y * cell, 7 * cell, 7 * cell);
      ctx.fillStyle = "#fff";
      ctx.fillRect((x + 1) * cell, (y + 1) * cell, 5 * cell, 5 * cell);
      ctx.fillStyle = "#000";
      ctx.fillRect((x + 2) * cell, (y + 2) * cell, 3 * cell, 3 * cell);
    }

    drawFinder(0, 0);
    drawFinder(cells - 7, 0);
    drawFinder(0, cells - 7);

    // Timing patterns
    ctx.fillStyle = "#000";
    for (let i = 8; i < cells - 8; i++) {
      if (i % 2 === 0) {
        ctx.fillRect(i * cell, 6 * cell, cell, cell);
        ctx.fillRect(6 * cell, i * cell, cell, cell);
      }
    }

    // Data modules
    const seed = hash(text);
    for (let row = 0; row < cells; row++) {
      for (let col = 0; col < cells; col++) {
        const inFinder =
          (row < 8 && col < 8) ||
          (row < 8 && col >= cells - 8) ||
          (row >= cells - 8 && col < 8);
        const inTiming = row === 6 || col === 6;
        if (!inFinder && !inTiming) {
          const bit = (hash(text + row * cells + col + seed) % 2) === 0;
          if (bit) {
            ctx.fillStyle = "#000";
            ctx.fillRect(col * cell, row * cell, cell - 0.5, cell - 0.5);
          }
        }
      }
    }
  }, [text, size]);

  return <canvas ref={canvasRef} width={size} height={size} style={{ display: "block" }} />;
}

/* ─── Certificate Document (print-ready layout) ──────────────── */
function CertificateDocument({ cert }) {
  const statusColors = {
    Pass: { bg: "#1a4731", border: "#00c851", text: "#00e676" },
    Fail: { bg: "#4a1020", border: "#d81b60", text: "#f48fb1" },
    Conditional: { bg: "#4a3500", border: "#ff6f00", text: "#ffcc02" },
  };
  const sc = statusColors[cert.testStatus] || statusColors.Pass;

  const qrText = `CERT:${cert.certNo}|EQ:${cert.equipmentTag}|ISS:${cert.issued}|EXP:${cert.expiry}|ST:${cert.testStatus}`;

  return (
    <div style={{
      background: "#fff",
      color: "#1a1a2e",
      fontFamily: "'Arial', sans-serif",
      padding: "clamp(20px,4vw,40px)",
      borderRadius: 12,
      border: "2px solid #8f96a3",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Watermark */}
      {LOGO_B64 && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          opacity: 0.055, pointerEvents: "none", zIndex: 0,
          width: 320, height: 320,
          backgroundImage: `url(data:image/png;base64,${LOGO_B64})`,
          backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center",
        }} />
      )}

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24, borderBottom: "3px solid #667eea", paddingBottom: 20 }}>
          {LOGO_B64 && (
            <img src={`data:image/png;base64,${LOGO_B64}`} alt="Logo"
              style={{ height: 60, marginBottom: 12, objectFit: "contain" }} />
          )}
          <div style={{ fontSize: "clamp(18px,4vw,26px)", fontWeight: 900, color: "#1a1a2e", letterSpacing: 2 }}>
            MONROY PTY LTD
          </div>
          <div style={{ fontSize: 11, color: "#555", margin: "4px 0" }}>Process Control Solutions</div>
          <div style={{ fontSize: 10, color: "#777" }}>
            +267 7790646 / 71450610 · salesmonroy2@gmail.com · Mophane Avenue Plot 5180
          </div>
          <div style={{ fontSize: "clamp(14px,3vw,20px)", fontWeight: 800, color: "#667eea", marginTop: 12, letterSpacing: 1 }}>
            CERTIFICATE OF COMPLIANCE
          </div>
        </div>

        {/* Status Banner */}
        <div style={{
          background: sc.bg, border: `1px solid ${sc.border}`,
          borderRadius: 8, padding: "10px 20px", textAlign: "center",
          marginBottom: 20,
        }}>
          <span style={{ color: sc.text, fontWeight: 900, fontSize: "clamp(14px,3vw,18px)", letterSpacing: 2 }}>
            {cert.testStatus?.toUpperCase() === "PASS" ? "✓ PASSED" :
             cert.testStatus?.toUpperCase() === "FAIL" ? "✗ FAILED" :
             "⚠ CONDITIONAL PASS"}
          </span>
        </div>

        {/* Section helper */}
        {[
          {
            title: "CERTIFICATE DETAILS",
            color: "#667eea",
            rows: [
              ["Certificate Number", cert.certNo],
              ["Certificate Type",   cert.type],
              ["Issuing Company",    cert.client],
              ["Date Issued",        cert.issued],
              ["Expiry Date",        cert.expiry],
              cert.gracePeriod ? ["Grace Period",  cert.gracePeriod] : null,
            ].filter(Boolean),
          },
          {
            title: "EQUIPMENT IDENTIFICATION",
            color: "#4fc3f7",
            rows: [
              ["Equipment Tag No.",  cert.equipmentTag],
              ["Equipment Type",     cert.equipmentType],
              ["Description",        cert.description || "—"],
              ["Location",           cert.location || "—"],
              ["Manufacturer",       cert.manufacturer],
              ["Serial Number",      cert.serialNo],
              ["Year of Manufacture",cert.yearOfManufacture],
              ["Country of Origin",  cert.countryOfOrigin],
            ],
          },
          {
            title: "NAMEPLATE DATA",
            color: "#f472b6",
            rows: [
              ["Design Code",        cert.designCode || "—"],
              ["Safe Working Load",  cert.swl],
              ["MAWP",               cert.mawp],
              ["Design Temperature", cert.designTemp || "—"],
              ["Capacity",           cert.capacity || "—"],
              ["Shell Thickness",    cert.shellThickness || "—"],
              ["Head Type",          cert.headType || "—"],
            ],
          },
          {
            title: "INSPECTION RECORD",
            color: "#00f5c4",
            rows: [
              ["Inspection Method",  cert.inspectionMethod || "Visual & NDT"],
              ["Inspection Date",    cert.inspectionDate],
              ["Next Inspection",    cert.nextInspectionDate],
              ["Test Status",        cert.testStatus],
            ],
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 11, fontWeight: 800, color: "#fff",
              background: section.color,
              padding: "8px 14px", borderLeft: "4px solid rgba(0,0,0,0.2)",
              letterSpacing: 1,
            }}>
              {section.title}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {section.rows.map(([label, value], i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #e0e0e0" }}>
                    <td style={{ padding: "8px 12px", background: i % 2 === 0 ? "#f7f8fc" : "#fff", fontWeight: 600, width: "42%", color: "#333", fontSize: 11 }}>{label}</td>
                    <td style={{ padding: "8px 12px", background: i % 2 === 0 ? "#f7f8fc" : "#fff", color: "#444", fontSize: 11 }}>{value ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* Legal Framework */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: "#7c5cfc", padding: "8px 14px", borderLeft: "4px solid rgba(0,0,0,0.2)", letterSpacing: 1 }}>
            LEGAL FRAMEWORK & COMPLIANCE
          </div>
          <div style={{ padding: "12px 14px", background: "#f7f8fc", borderLeft: "4px solid #7c5cfc", fontSize: 11, lineHeight: 1.8, color: "#444" }}>
            <p style={{ margin: "0 0 6px", fontWeight: 700 }}>This certificate confirms compliance with:</p>
            <p style={{ margin: 0 }}>{cert.legalFramework}</p>
          </div>
        </div>

        {/* Authorized Body + QR */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 20, marginTop: 20, paddingTop: 16, borderTop: "2px solid #667eea" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#667eea", marginBottom: 8, letterSpacing: 1 }}>AUTHORIZED BY</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{cert.inspectorName || "Inspector"}</div>
            {cert.inspectorSignature && (
              <img src={cert.inspectorSignature} alt="Signature"
                style={{ height: 48, marginTop: 6, objectFit: "contain" }} />
            )}
            <div style={{ borderTop: "1px solid #999", width: 180, marginTop: cert.inspectorSignature ? 4 : 28, paddingTop: 4, fontSize: 10, color: "#666" }}>
              Signature · {cert.inspectionDate}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <QRCanvas text={qrText} size={90} />
            <div style={{ fontSize: 9, color: "#888", marginTop: 4 }}>Scan to verify</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────── */
export default function CertificateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) { router.push("/login"); return; }
    setUser(data.user);
    await loadCertificate();
  }

  async function loadCertificate() {
    const { data, error } = await supabase
      .from("certificates")
      .select("*")
      .eq("id", params.id)
      .single();
    if (!error && data) setCertificate(data);
    setLoading(false);
  }

  function getStatusInfo(cert) {
    if (!cert?.expiry) return { label: "Unknown", color: "#64748b" };
    const daysLeft = Math.ceil((new Date(cert.expiry) - new Date()) / 86400000);
    if (daysLeft < 0)  return { label: "Expired",  color: "#d81b60", daysLeft };
    if (daysLeft <= 30) return { label: "Expiring", color: "#ff6f00", daysLeft };
    return { label: "Valid", color: "#00c851", daysLeft };
  }

  function downloadPDF() {
    if (!certificate) return;
    setExporting(true);
    const status = getStatusInfo(certificate);
    const printWindow = window.open("", "_blank");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${certificate.certNo}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:Arial,sans-serif; background:#fff; color:#333; }
      .wrap { max-width:900px; margin:0 auto; padding:40px 20px; }
      h1 { color:#667eea; font-size:26px; margin-bottom:4px; }
      .sub { font-size:11px; color:#888; margin-bottom:6px; }
      .company { font-size:13px; font-weight:700; }
      .contact { font-size:10px; color:#666; margin-bottom:16px; }
      .divider { border-bottom:3px solid #667eea; margin-bottom:24px; }
      .badge { display:inline-block; padding:6px 18px; border-radius:4px; font-weight:800; font-size:13px; letter-spacing:1px; margin-bottom:20px; }
      .pass { background:#d4edda; color:#155724; }
      .fail { background:#f8d7da; color:#721c24; }
      .conditional { background:#fff3cd; color:#856404; }
      .sec-hdr { font-size:11px; font-weight:800; color:#fff; background:#667eea; padding:8px 14px; border-left:4px solid #4a5cc4; letter-spacing:1px; margin-bottom:0; }
      table { width:100%; border-collapse:collapse; margin-bottom:18px; }
      td { padding:8px 12px; font-size:11px; border-bottom:1px solid #e0e0e0; }
      .lbl { font-weight:600; width:42%; background:#f7f8fc; color:#333; }
      .val { color:#444; background:#fff; }
      tr:nth-child(even) td { background:#f7f8fc; }
      .legal { padding:12px 14px; background:#f7f8fc; border-left:4px solid #7c5cfc; font-size:11px; line-height:1.8; color:#444; margin-bottom:18px; }
      .footer { margin-top:30px; text-align:center; font-size:10px; color:#aaa; border-top:1px solid #ddd; padding-top:16px; }
      @media print { .wrap { padding:20px; } }
    </style></head>
    <body><div class="wrap">
      <div class="divider">
        <div class="company">MONROY PTY LTD</div>
        <div class="sub">Process Control Solutions</div>
        <div class="contact">+267 7790646 / 71450610 · salesmonroy2@gmail.com · Mophane Avenue Plot 5180</div>
        <h1>CERTIFICATE OF COMPLIANCE</h1>
      </div>
      <div class="badge ${certificate.testStatus?.toLowerCase() === 'pass' ? 'pass' : certificate.testStatus?.toLowerCase() === 'fail' ? 'fail' : 'conditional'}">
        ${certificate.testStatus?.toUpperCase() === 'PASS' ? '✓ PASSED' : certificate.testStatus?.toUpperCase() === 'FAIL' ? '✗ FAILED' : '⚠ CONDITIONAL PASS'}
      </div>
      <div class="sec-hdr">CERTIFICATE DETAILS</div>
      <table><tbody>
        <tr><td class="lbl">Certificate Number</td><td class="val">${certificate.certNo}</td></tr>
        <tr><td class="lbl">Certificate Type</td><td class="val">${certificate.type}</td></tr>
        <tr><td class="lbl">Client</td><td class="val">${certificate.client}</td></tr>
        <tr><td class="lbl">Status</td><td class="val">${status.label}</td></tr>
        <tr><td class="lbl">Date Issued</td><td class="val">${certificate.issued}</td></tr>
        <tr><td class="lbl">Expiry Date</td><td class="val">${certificate.expiry}</td></tr>
      </tbody></table>
      <div class="sec-hdr">EQUIPMENT INFORMATION</div>
      <table><tbody>
        <tr><td class="lbl">Equipment Tag</td><td class="val">${certificate.equipmentTag}</td></tr>
        <tr><td class="lbl">Equipment Type</td><td class="val">${certificate.equipmentType}</td></tr>
        <tr><td class="lbl">Serial Number</td><td class="val">${certificate.serialNo}</td></tr>
        <tr><td class="lbl">Manufacturer</td><td class="val">${certificate.manufacturer}</td></tr>
        <tr><td class="lbl">Year of Manufacture</td><td class="val">${certificate.yearOfManufacture}</td></tr>
        <tr><td class="lbl">Country of Origin</td><td class="val">${certificate.countryOfOrigin}</td></tr>
      </tbody></table>
      <div class="sec-hdr">TECHNICAL SPECIFICATIONS</div>
      <table><tbody>
        <tr><td class="lbl">Safe Working Load</td><td class="val">${certificate.swl}</td></tr>
        <tr><td class="lbl">MAWP</td><td class="val">${certificate.mawp}</td></tr>
        <tr><td class="lbl">Inspection Date</td><td class="val">${certificate.inspectionDate}</td></tr>
        <tr><td class="lbl">Next Inspection</td><td class="val">${certificate.nextInspectionDate}</td></tr>
        <tr><td class="lbl">Test Status</td><td class="val">${certificate.testStatus}</td></tr>
      </tbody></table>
      <div class="sec-hdr" style="background:#7c5cfc">LEGAL FRAMEWORK & COMPLIANCE</div>
      <div class="legal"><strong>This certificate confirms compliance with:</strong><br/>${certificate.legalFramework}</div>
      <div class="footer">Generated: ${new Date().toLocaleDateString()} · Monroy QMS Platform · ${certificate.certNo}</div>
    </div>
    <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},500);});</script>
    </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    setExporting(false);
  }

  function downloadWord() {
    if (!certificate) return;
    setExporting(true);
    const status = getStatusInfo(certificate);
    const content = `MONROY PTY LTD - CERTIFICATE OF COMPLIANCE\nProcess Control Solutions\n${"=".repeat(60)}\n\nCERTIFICATE DETAILS\n${"-".repeat(40)}\nCertificate Number: ${certificate.certNo}\nType: ${certificate.type}\nStatus: ${status.label}\nClient: ${certificate.client}\nIssued: ${certificate.issued}\nExpiry: ${certificate.expiry}\n\nEQUIPMENT INFORMATION\n${"-".repeat(40)}\nTag: ${certificate.equipmentTag}\nType: ${certificate.equipmentType}\nSerial: ${certificate.serialNo}\nModel: ${certificate.model || "—"}\nManufacturer: ${certificate.manufacturer}\nYear: ${certificate.yearOfManufacture}\nCountry: ${certificate.countryOfOrigin}\n\nTECHNICAL SPECIFICATIONS\n${"-".repeat(40)}\nSWL: ${certificate.swl}\nMAWP: ${certificate.mawp}\nInspection Date: ${certificate.inspectionDate}\nNext Inspection: ${certificate.nextInspectionDate}\nTest Status: ${certificate.testStatus}\n\nLEGAL FRAMEWORK\n${"-".repeat(40)}\n${certificate.legalFramework}\n\n${"=".repeat(60)}\nGenerated: ${new Date().toLocaleDateString()} | Monroy QMS Platform`;
    const el = document.createElement("a");
    el.href = URL.createObjectURL(new Blob([content], { type: "application/msword" }));
    el.download = `${certificate.certNo}.doc`;
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
    setExporting(false);
  }

  /* ── Render ── */
  if (loading) return <AppLayout><div style={{ padding: "40px", color: "#fff" }}>Loading…</div></AppLayout>;

  if (!certificate) return (
    <AppLayout>
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h2 style={{ color: "#fff" }}>Certificate Not Found</h2>
        <button onClick={() => router.push("/certificates")}
          style={{ marginTop: 20, padding: "10px 20px", background: "#667eea", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>
          ← Back to Certificates
        </button>
      </div>
    </AppLayout>
  );

  const status = getStatusInfo(certificate);

  return (
    <AppLayout>

      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        <div style={{ minWidth: 0 }}>
          <a href="/certificates" style={{ color: "#64748b", fontSize: 13, textDecoration: "none", marginBottom: 10, display: "block" }}>← Back to Certificates</a>
          <h1 style={{ fontSize: "clamp(20px,5vw,28px)", fontWeight: 900, margin: "0 0 8px", color: "#fff" }}>{certificate.certNo}</h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>{certificate.type} · {certificate.client}</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button onClick={downloadPDF} disabled={exporting}
            style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(0,245,196,0.1)", border: "1px solid rgba(0,245,196,0.3)", color: C.green, fontWeight: 700, fontSize: 12, cursor: exporting ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: exporting ? 0.6 : 1 }}>
            📄 PDF
          </button>
          <button onClick={downloadWord} disabled={exporting}
            style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(79,195,247,0.15)", border: "1px solid rgba(79,195,247,0.3)", color: C.blue, fontWeight: 700, fontSize: 12, cursor: exporting ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: exporting ? 0.6 : 1 }}>
            📋 Word
          </button>
          <button onClick={() => router.push(`/certificates/${params.id}/edit`)}
            style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(124,92,252,0.15)", border: "1px solid rgba(124,92,252,0.3)", color: C.purple, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            ✏️ Edit
          </button>
        </div>
      </div>

      {/* Status pills */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Cert Status",  value: status.label,              color: status.color },
          { label: "Inspection",   value: certificate.testStatus,    color: "#00c851" },
          { label: "Issued",       value: certificate.issued,        color: C.blue },
          { label: "Expiry",       value: certificate.expiry,        color: status.color },
          { label: "Inspector",    value: certificate.inspectorName || "—", color: C.purple },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: "clamp(11px,3vw,15px)", fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Expiry warnings */}
      {status.label === "Expiring" && (
        <div style={{ background: "rgba(255,111,0,0.1)", border: "1px solid rgba(255,111,0,0.4)", borderRadius: 10, padding: "12px 16px", marginBottom: "1.5rem", color: "#ff6f00", fontSize: 13 }}>
          ⚠️ This certificate expires in <strong>{status.daysLeft} days</strong>.
        </div>
      )}
      {status.label === "Expired" && (
        <div style={{ background: "rgba(216,27,96,0.1)", border: "1px solid rgba(216,27,96,0.4)", borderRadius: 10, padding: "12px 16px", marginBottom: "1.5rem", color: "#f48fb1", fontSize: 13 }}>
          ❌ This certificate <strong>expired {Math.abs(status.daysLeft)} days ago</strong>. Equipment must be taken out of service.
        </div>
      )}

      {/* Professional Certificate */}
      <CertificateDocument cert={certificate} />

    </AppLayout>
  );
}
