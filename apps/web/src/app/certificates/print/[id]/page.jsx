"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const PRESSURE_TYPES = [
  "Pressure Vessel",
  "Boiler",
  "Air Receiver",
  "Air Compressor",
  "Oil Separator",
];

const LIFTING_TYPES = [
  "Trestle Jack",
  "Lever Hoist",
  "Bottle Jack",
  "Safety Harness",
  "Jack Stand",
  "Chain Block",
  "Bow Shackle",
  "Mobile Crane",
  "Trolley Jack",
  "Step Ladders",
  "Tifor",
  "Crawl Beam",
  "Beam Crawl",
  "Beam Clamp",
  "Webbing Sling",
  "Nylon Sling",
  "Wire Sling",
  "Fall Arrest",
  "Man Cage",
  "Shutter Clamp",
  "Drum Clamp",
  "Overhead Crane",
];

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

function makeQrUrl(text) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(text)}`;
}

function cleanField(label, value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str || str.toUpperCase() === "N/A") return null;
  return { label, value: str };
}

function renderFieldList(fields) {
  return fields
    .filter(Boolean)
    .map((item) => (
      <li key={item.label} style={{ display: "flex", gap: 6, padding: "3px 0", borderBottom: "1px solid #f0f0f0", fontSize: 11.5, lineHeight: 1.5 }}>
        <span style={{ color: "#444", minWidth: 135, fontWeight: 500 }}>{item.label}</span>
        <span style={{ fontWeight: 700, color: "#1a1a1a" }}>{item.value}</span>
      </li>
    ));
}

export default function PrintCertificatePage() {
  const params = useParams();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState(null);
  const [asset, setAsset] = useState(null);
  const [nameplate, setNameplate] = useState(null);

  useEffect(() => {
    async function loadData() {
      if (!id) return;

      try {
        setLoading(true);

        const { data: cert, error: certError } = await supabase
          .from("certificates")
          .select("*")
          .eq("id", id)
          .single();

        if (certError) throw certError;
        setCertificate(cert);

        if (cert?.asset_id) {
          const [{ data: assetData }, { data: nameplateData }] = await Promise.all([
            supabase
              .from("assets")
              .select(`
                *,
                clients (
                  company_name
                )
              `)
              .eq("id", cert.asset_id)
              .single(),
            supabase
              .from("asset_nameplate")
              .select("*")
              .eq("asset_id", cert.asset_id)
              .maybeSingle(),
          ]);

          setAsset(assetData || null);
          setNameplate(nameplateData || null);
        }
      } catch (err) {
        setCertificate(null);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const equipmentType = asset?.asset_type || certificate?.equipment_description || "";
  const isPressure = PRESSURE_TYPES.includes(equipmentType);
  const isLifting = LIFTING_TYPES.includes(equipmentType);

  const qrText = useMemo(() => {
    const certNo = certificate?.certificate_number || "";
    const equipTag = asset?.asset_tag || certificate?.equipment_id || "";
    return `Certificate: ${certNo}\nEquipment: ${equipTag}\nInspector: ${certificate?.inspector_name || ""}\nCompliance: Mines, Quarries, Works and Machinery Act Cap 44:02`;
  }, [certificate, asset]);

  const equipmentFields = [
    cleanField("Equipment Tag No :", asset?.asset_tag || certificate?.equipment_id),
    cleanField("Equipment Type:", equipmentType),
    cleanField("Location:", asset?.location || certificate?.equipment_location),
    cleanField("Manufacturer:", asset?.manufacturer),
    cleanField("Model:", asset?.model),
    cleanField("Serial Number:", asset?.serial_number),
    cleanField("Year Built:", asset?.year_built),
  ].filter(Boolean);

  const nameplateFields = [
    cleanField("Design Code:", nameplate?.design_code || asset?.design_standard),
    isPressure ? cleanField("Design Pressure:", asset?.design_pressure ? `${asset.design_pressure} kPa` : null) : null,
    isPressure ? cleanField("Authorized Pressure:", certificate?.mawp || (asset?.working_pressure ? `${asset.working_pressure} kPa` : null)) : null,
    isPressure ? cleanField("Test Pressure:", asset?.test_pressure ? `${asset.test_pressure} kPa` : null) : null,
    isPressure ? cleanField("Design Temperature:", asset?.design_temperature) : null,
    isPressure ? cleanField("Capacity / Volume:", asset?.capacity_volume) : null,
    isPressure ? cleanField("Material:", nameplate?.material || asset?.shell_material) : null,
    isPressure ? cleanField("Fluid Type:", asset?.fluid_type) : null,
    isLifting ? cleanField("Safe Working Load:", certificate?.swl || (asset?.safe_working_load ? `${asset.safe_working_load} Tons` : null)) : null,
    isLifting ? cleanField("Proof Load:", asset?.proof_load ? `${asset.proof_load} Tons` : null) : null,
    isLifting ? cleanField("Lift Height:", asset?.lifting_height) : null,
    isLifting ? cleanField("Sling Length:", asset?.sling_length) : null,
    isLifting ? cleanField("Chain Size:", asset?.chain_size) : null,
    isLifting ? cleanField("Wire Rope Diameter:", asset?.rope_diameter) : null,
  ].filter(Boolean);

  const complianceText = isPressure
    ? "This certificate confirms that the pressure equipment has been examined and assessed for statutory compliance under the Mines, Quarries, Works and Machinery Act Cap 44:02. Operation must remain within the approved safe pressure limits shown on the equipment nameplate."
    : "This certificate confirms that the lifting equipment has been examined and assessed for statutory compliance under the Mines, Quarries, Works and Machinery Act Cap 44:02. Operation must not exceed the Safe Working Load shown on the equipment nameplate.";

  const inspectionMethod = isPressure
    ? "Inspection Method: Visual Examination / Ultrasonic Thickness Testing / Hydrostatic Pressure Test"
    : isLifting
    ? "Inspection Method: Visual Examination / Functional Test / Proof Load Test"
    : "Inspection Method: Visual Examination / Statutory Inspection";

  if (loading) {
    return <div style={{ padding: 40 }}>Loading certificate...</div>;
  }

  if (!certificate) {
    return <div style={{ padding: 40 }}>Certificate not found.</div>;
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: Arial, Helvetica, sans-serif;
          background: #c8c8c8;
        }
        @media print {
          .print-toolbar { display: none !important; }
          body { background: white; }
          .cert-wrap { padding: 0 !important; }
          .cert-sheet { box-shadow: none !important; border: none !important; width: 100% !important; }
        }
      `}</style>

      <div className="print-toolbar" style={{ padding: 16, display: "flex", gap: 12, justifyContent: "center", background: "#e5e7eb", position: "sticky", top: 0, zIndex: 10 }}>
        <button
          onClick={() => window.print()}
          style={{ padding: "10px 18px", border: "none", borderRadius: 8, background: "#8b1a1a", color: "#fff", fontWeight: 700, cursor: "pointer" }}
        >
          Print / Save PDF
        </button>
      </div>

      <div className="cert-wrap" style={{ padding: 24, display: "flex", justifyContent: "center" }}>
        <div className="cert-sheet" style={{ width: 740, background: "#fff", boxShadow: "0 8px 40px rgba(0,0,0,0.25)", border: "1px solid #bbb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px 12px", borderBottom: "3px solid #8b1a1a" }}>
            <div>
              <div style={{ fontSize: 21, fontWeight: 900, color: "#1a1a1a", lineHeight: 1.1 }}>MONROY (PTY) LTD</div>
              <div style={{ fontSize: 10, color: "#555", fontStyle: "italic", marginBottom: 7 }}>Process Control Solutions</div>
              <div style={{ fontSize: 10.5, color: "#333", marginBottom: 2 }}>📞 +267 7790646 / 71450610</div>
              <div style={{ fontSize: 10.5, color: "#333", marginBottom: 2 }}>✉ info@monroy.co.bw</div>
              <div style={{ fontSize: 10.5, color: "#333" }}>📍 Mophane Avenue, Plot No 5180, Mathiba Street</div>
            </div>

            <img
              src={certificate.logo_url || "/monroy-logo.png"}
              alt="Monroy Logo"
              style={{ height: 90, width: "auto", objectFit: "contain" }}
            />
          </div>

          <div style={{ background: "linear-gradient(180deg, #808080 0%, #b0b0b0 45%, #808080 100%)", textAlign: "center", padding: "9px 0", borderTop: "1px solid #aaa", borderBottom: "1px solid #555" }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "0.14em", textTransform: "uppercase" }}>
              {certificate.certificate_type || "Certificate of Statutory Inspection"}
            </h1>
          </div>

          <div style={{ padding: "12px 18px 16px" }}>
            <div style={{ border: "1px solid #bbb", marginBottom: 9 }}>
              <div style={{ background: "linear-gradient(180deg, #a8a8a8 0%, #c5c5c5 50%, #a8a8a8 100%)", padding: "5px 10px", fontSize: 11, fontWeight: 900, color: "#1a1a1a", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #999" }}>
                Certificate Details
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 16px", padding: "9px 12px" }}>
                {cleanField("Certificate Number:", certificate.certificate_number) && (
                  <div style={{ fontSize: 11.5 }}><strong>Certificate Number:</strong> {certificate.certificate_number}</div>
                )}
                {cleanField("Client / Company:", certificate.company || asset?.clients?.company_name) && (
                  <div style={{ fontSize: 11.5 }}><strong>Client / Company:</strong> {certificate.company || asset?.clients?.company_name}</div>
                )}
                {cleanField("Equipment Category:", equipmentType) && (
                  <div style={{ fontSize: 11.5 }}><strong>Equipment Category:</strong> {equipmentType}</div>
                )}
                <div style={{ fontSize: 11.5 }}><strong>Inspection Authority:</strong> Monroy (PTY) LTD</div>
                {cleanField("Issue Date:", formatDate(certificate.issued_at)) && (
                  <div style={{ fontSize: 11.5 }}><strong>Issue Date:</strong> {formatDate(certificate.issued_at)}</div>
                )}
                {cleanField("Expiry Date:", formatDate(certificate.valid_to)) && (
                  <div style={{ fontSize: 11.5 }}><strong>Expiry Date:</strong> {formatDate(certificate.valid_to)}</div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 9 }}>
              <div style={{ border: "1px solid #bbb" }}>
                <div style={{ background: "linear-gradient(180deg, #a8a8a8 0%, #c5c5c5 50%, #a8a8a8 100%)", padding: "5px 10px", fontSize: 11, fontWeight: 900, textTransform: "uppercase", borderBottom: "1px solid #999" }}>
                  Equipment Identification
                </div>
                <div style={{ padding: "9px 12px" }}>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {renderFieldList(equipmentFields)}
                  </ul>
                </div>
              </div>

              <div style={{ border: "1px solid #bbb" }}>
                <div style={{ background: "linear-gradient(180deg, #a8a8a8 0%, #c5c5c5 50%, #a8a8a8 100%)", padding: "5px 10px", fontSize: 11, fontWeight: 900, textTransform: "uppercase", borderBottom: "1px solid #999", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  Nameplate Data
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 3, background: isPressure ? "#1a56a8" : "#8b4a00", color: "#fff" }}>
                    {equipmentType || "Equipment"}
                  </span>
                </div>
                <div style={{ padding: "9px 12px" }}>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {renderFieldList(nameplateFields)}
                  </ul>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 9 }}>
              <div style={{ border: "1px solid #bbb" }}>
                <div style={{ background: "linear-gradient(180deg, #a8a8a8 0%, #c5c5c5 50%, #a8a8a8 100%)", padding: "5px 10px", fontSize: 11, fontWeight: 900, textTransform: "uppercase", borderBottom: "1px solid #999" }}>
                  Compliance
                </div>
                <div style={{ padding: "9px 12px", fontSize: 11, lineHeight: 1.65, color: "#333" }}>
                  <p style={{ marginTop: 0 }}>{complianceText}</p>
                  <p style={{ marginBottom: 0 }}>
                    Legal Compliance: <strong>{certificate.legal_framework || "Mines, Quarries, Works and Machinery Act Cap 44:02"}</strong>
                  </p>
                </div>
              </div>

              <div style={{ border: "1px solid #bbb" }}>
                <div style={{ background: "linear-gradient(180deg, #a8a8a8 0%, #c5c5c5 50%, #a8a8a8 100%)", padding: "5px 10px", fontSize: 11, fontWeight: 900, textTransform: "uppercase", borderBottom: "1px solid #999" }}>
                  Inspection Record
                </div>
                <div style={{ padding: "9px 12px" }}>
                  <div style={{ fontSize: 11, color: "#333", lineHeight: 1.6, marginBottom: 8 }}>
                    {inspectionMethod}
                  </div>
                  <div style={{ fontSize: 11.5, marginBottom: 10 }}>
                    Inspection Date: <strong>{formatDate(certificate.issued_at)}</strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
                    <div
                      style={{
                        fontSize: certificate.equipment_status === "CONDITIONAL" ? 12 : 15,
                        fontWeight: 900,
                        letterSpacing: "0.12em",
                        padding: "6px 18px",
                        minWidth: 120,
                        textAlign: "center",
                        background:
                          certificate.equipment_status === "FAIL"
                            ? "#8b1a1a"
                            : certificate.equipment_status === "CONDITIONAL"
                            ? "#b06000"
                            : "#2d7a3a",
                        color: "#fff",
                      }}
                    >
                      {certificate.equipment_status || "PASS"}
                    </div>

                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>
                      {certificate.equipment_status === "CONDITIONAL"
                        ? "Conditional Approval"
                        : certificate.equipment_status === "FAIL"
                        ? "Requires Re-inspection"
                        : formatDate(certificate.valid_to)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {certificate.equipment_status === "CONDITIONAL" && (
              <div style={{ border: "2px solid #b06000", marginBottom: 9, background: "#fffaf2" }}>
                <div style={{ background: "linear-gradient(180deg, #b06000 0%, #d07820 50%, #b06000 100%)", padding: "5px 10px", fontSize: 11, fontWeight: 900, color: "#fff", textTransform: "uppercase" }}>
                  Conditional Approval — Waiver Notice
                </div>
                <div style={{ padding: "10px 12px", fontSize: 11, lineHeight: 1.6 }}>
                  <div><strong>Temporary Waiver:</strong> This equipment is conditionally approved subject to rectification and re-inspection.</div>
                </div>
              </div>
            )}

            <div style={{ border: "1px solid #bbb" }}>
              <div style={{ background: "linear-gradient(180deg, #a8a8a8 0%, #c5c5c5 50%, #a8a8a8 100%)", padding: "5px 10px", fontSize: 11, fontWeight: 900, textTransform: "uppercase", borderBottom: "1px solid #999" }}>
                Authorized Inspection Body
              </div>

              <div style={{ padding: "9px 12px" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "#1a1a1a" }}>MONROY (PTY) LTD</div>
                    <div style={{ fontSize: 10, color: "#555", fontStyle: "italic", marginBottom: 8 }}>Process Control Solutions</div>

                    {cleanField("Inspector Name", certificate.inspector_name) && (
                      <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11, color: "#333", marginBottom: 6 }}>
                        <span style={{ minWidth: 90 }}>Inspector Name:</span>
                        <span style={{ borderBottom: "1px solid #333", minWidth: 180, display: "inline-block", fontWeight: 700 }}>
                          {certificate.inspector_name}
                        </span>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", fontSize: 11, color: "#333", marginBottom: 6 }}>
                      <span style={{ minWidth: 90 }}>Signature:</span>
                      <div style={{ width: 180, height: 52, borderBottom: "1px solid #333", display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
                        {certificate.signature_url ? (
                          <img src={certificate.signature_url} alt="Signature" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", objectPosition: "bottom left" }} />
                        ) : (
                          <span style={{ fontFamily: "'Brush Script MT', cursive", fontSize: 18, color: "#bbb" }}>No Signature</span>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: 11, color: "#333", marginTop: 4 }}>
                      Date Issued: <strong>{formatDate(certificate.issued_at)}</strong>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <img
                      src={makeQrUrl(qrText)}
                      alt="QR Code"
                      style={{ width: 86, height: 86, objectFit: "contain" }}
                    />
                    <div style={{ fontSize: 8, color: "#555", textAlign: "center", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Scan to Verify
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: "#f0f0f0", borderTop: "2px solid #bbb", padding: "8px 20px", textAlign: "center", fontSize: 9.5, color: "#555", lineHeight: 1.6 }}>
            This certificate was generated electronically by the Monroy QMS Inspection System.
            <br />
            Verification can be performed using the certificate number or QR code.
          </div>
        </div>
      </div>
    </>
  );
}
