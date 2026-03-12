"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ── Defaults ────────────────────────────────────────────────────
const DEFAULT_INSPECTOR_NAME = "Moemedi Masupe";
const DEFAULT_INSPECTOR_ID   = "700117910";
const DEFAULT_LEGAL_FRAMEWORK =
  "Mines, Quarries, Works and Machinery Act Cap 44:02";
const CONTACT_DETAILS = "+267 77906461 / +267 71450610";

// ── Derive certificate title from type / asset_type ─────────────
function resolveCertTitle(certType = "", assetType = "") {
  const ct = String(certType).toLowerCase();
  const at = String(assetType).toLowerCase();
  const pressureWords = ["pressure", "boiler", "air receiver", "air compressor", "oil separator"];
  const isPressure = pressureWords.some((w) => ct.includes(w) || at.includes(w));
  if (isPressure) return "Pressure Test Certificate";
  return "Load Test Certificate – Lifting Equipment";
}

// ── Build certificate number ─────────────────────────────────────
// Format: CERT-<SERIAL_NUMBER>-<sequence padded to 2 digits>
// Uses cert.certificate_number if already stored in that format,
// otherwise constructs it from serial_number + a sequence counter.
function buildCertNumber(cert, asset) {
  if (cert.certificate_number) return cert.certificate_number;
  const serial = (asset?.serial_number || asset?.asset_tag || "XX").replace(/\s+/g, "-").toUpperCase();
  // sequence falls back to "01" when not stored
  const seq = cert.sequence_number
    ? String(cert.sequence_number).padStart(2, "0")
    : "01";
  return `CERT-${serial}-${seq}`;
}

export default function PrintCertificatePage() {
  const params = useParams();
  const id = params?.id;

  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from("certificates")
          .select(`
            *,
            assets (
              asset_tag, asset_name, asset_type, serial_number,
              manufacturer, model, year_built, location,
              safe_working_load, working_pressure, test_pressure,
              proof_load, lifting_height, sling_length, chain_size,
              rope_diameter, capacity_volume, design_pressure,
              design_temperature, shell_material, fluid_type,
              clients ( company_name, company_code )
            )
          `)
          .eq("id", id)
          .single();

        if (error || !data) throw new Error("Certificate not found.");
        setCert(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div style={{ padding: 40, fontFamily: "sans-serif" }}>Loading certificate...</div>;
  if (error)   return <div style={{ padding: 40, color: "red", fontFamily: "sans-serif" }}>{error}</div>;
  if (!cert)   return null;

  const asset  = cert.assets  || {};
  const client = asset.clients || {};

  // ── Only show fields that have values ──────────────────────────
  function val(v) {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s === "" || s === "Unknown" ? null : s;
  }

  // ── Resolved values ────────────────────────────────────────────
  const certTitle      = resolveCertTitle(cert.certificate_type, asset.asset_type);
  const certNumber     = buildCertNumber(cert, asset);
  const inspectorName  = val(cert.inspector_name)  || DEFAULT_INSPECTOR_NAME;
  const inspectorId    = val(cert.inspector_id)    || DEFAULT_INSPECTOR_ID;
  const legalFramework = val(cert.legal_framework) || DEFAULT_LEGAL_FRAMEWORK;

  const issueDate  = cert.issued_at ? new Date(cert.issued_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : null;
  const expiryDate = cert.valid_to  ? new Date(cert.valid_to ).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : null;

  const isPressure = certTitle.toLowerCase().includes("pressure");

  // ── Equipment data rows — only non-empty ───────────────────────
  const equipmentRows = [
    { label: "Company / Client",      value: val(cert.company)               || val(client.company_name) },
    { label: "Equipment Description", value: val(cert.equipment_description) || val(asset.asset_type) },
    { label: "Equipment Location",    value: val(cert.equipment_location)    || val(asset.location) },
    { label: "Serial Number / ID",    value: val(cert.equipment_id)          || val(asset.serial_number) },
    { label: "Manufacturer",          value: val(asset.manufacturer) },
    { label: "Model",                 value: val(asset.model) },
    { label: "Year Built",            value: val(asset.year_built) },
    isPressure ? { label: "MAWP",               value: val(cert.mawp)         || val(asset.working_pressure) } : null,
    isPressure ? { label: "Design Pressure",    value: val(asset.design_pressure) }    : null,
    isPressure ? { label: "Test Pressure",      value: val(asset.test_pressure) }      : null,
    isPressure ? { label: "Design Temperature", value: val(asset.design_temperature) } : null,
    isPressure ? { label: "Capacity / Volume",  value: val(asset.capacity_volume) }    : null,
    isPressure ? { label: "Shell Material",     value: val(asset.shell_material) }     : null,
    isPressure ? { label: "Fluid Type",         value: val(asset.fluid_type) }         : null,
    !isPressure ? { label: "Safe Working Load (SWL)", value: val(cert.swl)           || val(asset.safe_working_load) } : null,
    !isPressure ? { label: "Proof Load",              value: val(asset.proof_load) }   : null,
    !isPressure ? { label: "Lifting Height",          value: val(asset.lifting_height) } : null,
    !isPressure ? { label: "Sling Length",            value: val(asset.sling_length) }  : null,
    !isPressure ? { label: "Chain Size",              value: val(asset.chain_size) }    : null,
    !isPressure ? { label: "Rope Diameter",           value: val(asset.rope_diameter) } : null,
  ]
    .filter(Boolean)
    .filter((r) => r.value);

  const statusColor =
    cert.equipment_status === "PASS" ? "#16a34a" :
    cert.equipment_status === "FAIL" ? "#dc2626" : "#d97706";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #f0f4f8; }
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          .page { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; }
        }
      `}</style>

      {/* Print button */}
      <div className="no-print" style={{
        background: "#1e293b", padding: "12px 24px", display: "flex",
        justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ color: "#94a3b8", fontSize: 13 }}>Certificate Preview</span>
        <button
          onClick={() => window.print()}
          style={{
            padding: "9px 24px", borderRadius: 8, border: "none",
            background: "linear-gradient(135deg,#667eea,#764ba2)",
            color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13,
          }}
        >
          🖨 Print / Save PDF
        </button>
      </div>

      {/* Certificate page */}
      <div className="page" style={{
        width: 794, minHeight: 1123, margin: "24px auto",
        background: "#fff", borderRadius: 4, boxShadow: "0 4px 40px rgba(0,0,0,0.18)",
        overflow: "hidden", position: "relative",
      }}>

        {/* Top colour bar */}
        <div style={{ height: 8, background: "linear-gradient(90deg, #1e3a5f, #2563eb, #00b4d8)" }} />

        {/* Header */}
        <div style={{
          padding: "28px 48px 20px",
          background: "linear-gradient(135deg, #1e3a5f 0%, #1e40af 60%, #0ea5e9 100%)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            {val(cert.logo_url) && (
              <img src={cert.logo_url} alt="Logo"
                style={{ height: 52, marginBottom: 10, objectFit: "contain" }}
                onError={(e) => { e.target.style.display = "none"; }} />
            )}
            <div style={{ color: "#bfdbfe", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600 }}>
              Quality Management System
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{
              background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 8, padding: "10px 18px",
            }}>
              <div style={{ color: "#bfdbfe", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>Certificate No.</div>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 800, letterSpacing: "0.05em" }}>
                {certNumber}
              </div>
            </div>
          </div>
        </div>

        {/* Certificate title band */}
        <div style={{
          background: "#f8fafc", borderBottom: "2px solid #e2e8f0",
          padding: "20px 48px", textAlign: "center",
        }}>
          <div style={{
            fontSize: 22, fontWeight: 900, color: "#1e3a5f",
            letterSpacing: "0.04em", textTransform: "uppercase",
          }}>
            {certTitle}
          </div>
          <div style={{ marginTop: 6, display: "flex", justifyContent: "center", gap: 8 }}>
            <div style={{ height: 3, width: 60, background: "#2563eb", borderRadius: 2 }} />
            <div style={{ height: 3, width: 20, background: "#00b4d8", borderRadius: 2 }} />
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "28px 48px" }}>

          {/* Status badge */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: `${statusColor}18`, border: `1.5px solid ${statusColor}`,
              borderRadius: 20, padding: "5px 16px",
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor }} />
              <span style={{ color: statusColor, fontWeight: 800, fontSize: 12, letterSpacing: "0.1em" }}>
                {cert.equipment_status || "PASS"}
              </span>
            </div>
          </div>

          {/* Intro paragraph */}
          <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.7, marginBottom: 24 }}>
            This is to certify that the equipment described below has been inspected and tested in
            accordance with the applicable standards and regulations, and is hereby declared to be
            in a safe and serviceable condition.
          </p>

          {/* Equipment data table */}
          <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 10, overflow: "hidden", marginBottom: 24 }}>
            <div style={{
              background: "#1e3a5f", padding: "10px 18px",
              fontSize: 10, fontWeight: 800, color: "#bfdbfe",
              letterSpacing: "0.15em", textTransform: "uppercase",
            }}>
              Equipment Details
            </div>

            {equipmentRows.map((row, i) => (
              <div key={row.label} style={{
                display: "grid", gridTemplateColumns: "200px 1fr",
                background: i % 2 === 0 ? "#f8fafc" : "#fff",
                borderTop: i > 0 ? "1px solid #f1f5f9" : "none",
              }}>
                <div style={{
                  padding: "9px 18px", fontSize: 11, fontWeight: 700,
                  color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em",
                  borderRight: "1px solid #e2e8f0",
                }}>
                  {row.label}
                </div>
                <div style={{ padding: "9px 18px", fontSize: 12, color: "#1e293b", fontWeight: 500 }}>
                  {row.value}
                </div>
              </div>
            ))}
          </div>

          {/* Dates row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            {issueDate && (
              <div style={{ border: "1.5px solid #dbeafe", borderRadius: 10, padding: "14px 18px", background: "#eff6ff" }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: "#3b82f6", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>
                  Date of Issue
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e3a5f" }}>{issueDate}</div>
              </div>
            )}
            {expiryDate && (
              <div style={{ border: "1.5px solid #fecaca", borderRadius: 10, padding: "14px 18px", background: "#fef2f2" }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: "#ef4444", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>
                  Expiry Date
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#7f1d1d" }}>{expiryDate}</div>
              </div>
            )}
          </div>

          {/* Legal framework */}
          <div style={{
            background: "#f8fafc", border: "1px solid #e2e8f0",
            borderRadius: 8, padding: "12px 16px", marginBottom: 24,
          }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: "#64748b", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>
              Legal Framework
            </div>
            <div style={{ fontSize: 11, color: "#334155" }}>{legalFramework}</div>
          </div>

          {/* Signature section */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 8 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: "#64748b", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>
                Inspector
              </div>

              {/* Signature image */}
              <div style={{
                height: 70, borderBottom: "1.5px solid #334155",
                display: "flex", alignItems: "flex-end", paddingBottom: 4, marginBottom: 6,
              }}>
                {val(cert.signature_url) && (
                  <img
                    src={cert.signature_url}
                    alt="Signature"
                    style={{ maxHeight: 65, maxWidth: "80%", objectFit: "contain" }}
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                )}
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{inspectorName}</div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>ID: {inspectorId}</div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>Contact: {CONTACT_DETAILS}</div>
            </div>

            {/* Customer signature box */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: "#64748b", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>
                Customer Acknowledgement
              </div>
              <div style={{ height: 70, borderBottom: "1.5px solid #334155", marginBottom: 6 }} />
              <div style={{ fontSize: 10, color: "#94a3b8" }}>Signature &amp; Date</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 20 }}>
          {/* Validity strip */}
          <div style={{
            background: "linear-gradient(135deg,#1e3a5f,#1e40af)",
            padding: "10px 48px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ color: "#bfdbfe", fontSize: 9, letterSpacing: "0.1em" }}>
              This certificate is valid only for the equipment and period described above.
            </div>
            <div style={{ color: "#93c5fd", fontSize: 9, fontWeight: 700 }}>
              MONROY QMS PLATFORM
            </div>
          </div>

          {/* Services banner — blue matching certificate header */}
          <div style={{
            background: "linear-gradient(135deg, #1e3a5f 0%, #1e40af 60%, #0ea5e9 100%)",
            padding: "14px 48px 14px 80px",
            position: "relative", textAlign: "center",
          }}>
            {/* Decorative left triangles */}
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: 60,
              background: "#0ea5e9", clipPath: "polygon(0 0, 100% 0, 60% 100%, 0 100%)",
            }} />
            <div style={{
              position: "absolute", left: 40, top: 0, bottom: 0, width: 30,
              background: "rgba(255,255,255,0.15)", clipPath: "polygon(0 0, 100% 0, 60% 100%, 0 100%)",
            }} />
            <p style={{ color: "#fff", fontSize: 10, fontWeight: 600, lineHeight: 1.8, letterSpacing: "0.02em" }}>
              Mobile Crane Hire | <strong>Rigging</strong> | NDT Test | <strong>Scaffolding</strong> | Painting |{" "}
              <strong>Inspection of Lifting Equipment and Machinery, Pressure Vessels &amp; Air Receiver</strong>
              {" "}| Inspection of Lifting Equipment Steel Fabricating and Structural |{" "}
              <strong>Mechanical Engineering</strong> | Fencing | <strong>Maintenance</strong>
            </p>
          </div>
        </div>

        {/* Bottom colour bar */}
        <div style={{ height: 6, background: "linear-gradient(90deg,#00b4d8,#2563eb,#1e3a5f)" }} />

      </div>
    </>
  );
}
