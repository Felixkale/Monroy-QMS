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
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
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

function withUnit(value, unit) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;
  if (str.toLowerCase().includes(unit.toLowerCase())) return str;
  return `${str} ${unit}`;
}

function renderFieldList(fields) {
  return fields
    .filter(Boolean)
    .map((item) => (
      <li
        key={item.label}
        style={{
          display: "flex",
          gap: 8,
          padding: "5px 0",
          borderBottom: "1px solid #d8d8d8",
          fontSize: 12,
          lineHeight: 1.5,
          color: "#111",
        }}
      >
        <span style={{ minWidth: 145, fontWeight: 700, color: "#333" }}>
          {item.label}
        </span>
        <span style={{ fontWeight: 700, color: "#111" }}>{item.value}</span>
      </li>
    ));
}

export default function PrintCertificatePage() {
  const params = useParams();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [certificate, setCertificate] = useState(null);
  const [asset, setAsset] = useState(null);
  const [nameplate, setNameplate] = useState(null);

  const [inspectorNameInput, setInspectorNameInput] = useState("");
  const [signatureUrlInput, setSignatureUrlInput] = useState("");

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
        setInspectorNameInput(cert?.inspector_name || "");
        setSignatureUrlInput(cert?.signature_url || "");

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
        console.error(err);
        setCertificate(null);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  async function saveCertificateMeta(nextInspectorName, nextSignatureUrl) {
    if (!certificate?.id) return;

    try {
      setSavingMeta(true);

      const payload = {
        inspector_name: nextInspectorName || null,
        signature_url: nextSignatureUrl || null,
      };

      const { data, error } = await supabase
        .from("certificates")
        .update(payload)
        .eq("id", certificate.id)
        .select("*")
        .single();

      if (error) throw error;

      setCertificate(data);
      setInspectorNameInput(data?.inspector_name || "");
      setSignatureUrlInput(data?.signature_url || "");
    } catch (err) {
      alert(err?.message || "Failed to save certificate details.");
    } finally {
      setSavingMeta(false);
    }
  }

  async function handleSignatureUpload(e) {
    try {
      const file = e.target.files?.[0];
      if (!file || !certificate?.id) return;

      setUploadingSignature(true);

      const ext = file.name.split(".").pop() || "png";
      const fileName = `${certificate.id}-${Date.now()}.${ext}`;
      const filePath = `certificate-signatures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) throw new Error("Failed to get uploaded signature URL.");

      setSignatureUrlInput(publicUrl);
      await saveCertificateMeta(inspectorNameInput, publicUrl);
    } catch (err) {
      alert(err?.message || "Failed to upload signature.");
    } finally {
      setUploadingSignature(false);
    }
  }

  const equipmentType = asset?.asset_type || certificate?.equipment_description || "";
  const isPressure = PRESSURE_TYPES.includes(equipmentType);
  const isLifting = LIFTING_TYPES.includes(equipmentType);

  const qrText = useMemo(() => {
    const certNo = certificate?.certificate_number || "";
    const equipTag = asset?.asset_tag || certificate?.equipment_id || "";
    return `Certificate: ${certNo}
Equipment: ${equipTag}
Inspector: ${certificate?.inspector_name || ""}
Compliance: Mines, Quarries, Works and Machinery Act Cap 44:02`;
  }, [certificate, asset]);

  const equipmentFields = [
    cleanField("Equipment Tag No:", asset?.asset_tag || certificate?.equipment_id),
    cleanField("Equipment Type:", equipmentType),
    cleanField("Location:", asset?.location || certificate?.equipment_location),
    cleanField("Manufacturer:", asset?.manufacturer),
    cleanField("Model:", asset?.model),
    cleanField("Serial Number:", asset?.serial_number),
    cleanField("Year Built:", asset?.year_built),
  ].filter(Boolean);

  const nameplateFields = [
    cleanField("Design Code:", nameplate?.design_code || asset?.design_standard),
    isPressure
      ? cleanField("Design Pressure:", withUnit(asset?.design_pressure, "kPa"))
      : null,
    isPressure
      ? cleanField("MAWP:", withUnit(certificate?.mawp || asset?.working_pressure, "kPa"))
      : null,
    isPressure
      ? cleanField("Test Pressure:", withUnit(asset?.test_pressure, "kPa"))
      : null,
    isPressure
      ? cleanField("Design Temperature:", asset?.design_temperature)
      : null,
    isPressure
      ? cleanField("Capacity / Volume:", asset?.capacity_volume)
      : null,
    isPressure
      ? cleanField("Material:", nameplate?.material || asset?.shell_material)
      : null,
    isPressure ? cleanField("Fluid Type:", asset?.fluid_type) : null,

    isLifting
      ? cleanField(
          "Safe Working Load:",
          withUnit(certificate?.swl || asset?.safe_working_load, "Tons")
        )
      : null,
    isLifting
      ? cleanField("Proof Load:", withUnit(asset?.proof_load, "Tons"))
      : null,
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
          .cert-sheet {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
          }
        }
      `}</style>

      <div
        className="print-toolbar"
        style={{
          padding: 16,
          display: "grid",
          gap: 12,
          justifyContent: "center",
          background: "#e5e7eb",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: "10px 18px",
              border: "none",
              borderRadius: 8,
              background: "#0ea5e9",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Print / Save PDF
          </button>

          <button
            onClick={() => saveCertificateMeta(inspectorNameInput, signatureUrlInput)}
            disabled={savingMeta || uploadingSignature}
            style={{
              padding: "10px 18px",
              border: "none",
              borderRadius: 8,
              background: "#0284c7",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              opacity: savingMeta || uploadingSignature ? 0.7 : 1,
            }}
          >
            {savingMeta ? "Saving..." : "Save Inspector & Signature"}
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
            gap: 12,
            maxWidth: 900,
            margin: "0 auto",
            width: "100%",
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
              Inspector Name
            </div>
            <input
              value={inspectorNameInput}
              onChange={(e) => setInspectorNameInput(e.target.value)}
              placeholder="Type inspector name"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 13,
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
              Upload Signature
            </div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleSignatureUpload}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#fff",
                fontSize: 13,
              }}
            />
          </div>
        </div>
      </div>

      <div className="cert-wrap" style={{ padding: 24, display: "flex", justifyContent: "center" }}>
        <div
          className="cert-sheet"
          style={{
            width: 740,
            background: "#fff",
            boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
            border: "1px solid #bbb",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 22px 12px",
              borderBottom: "3px solid #0ea5e9",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 21,
                  fontWeight: 900,
                  color: "#111",
                  lineHeight: 1.1,
                }}
              >
                MONROY (PTY) LTD
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#444",
                  fontStyle: "italic",
                  marginBottom: 7,
                }}
              >
                Process Control Solutions
              </div>
              <div style={{ fontSize: 11, color: "#222", marginBottom: 2 }}>
                📞 +267 7790646 / 71450610
              </div>
              <div style={{ fontSize: 11, color: "#222", marginBottom: 2 }}>
                ✉ info@monroy.co.bw
              </div>
              <div style={{ fontSize: 11, color: "#222" }}>
                📍 Mophane Avenue, Plot No 5180, Mathiba Street
              </div>
            </div>

            <img
              src={certificate.logo_url || "/logo.png"}
              alt="Monroy Logo"
              style={{ height: 90, width: "auto", objectFit: "contain" }}
            />
          </div>

          <div
            style={{
              background:
                "linear-gradient(180deg, #38bdf8 0%, #7dd3fc 50%, #0ea5e9 100%)",
              textAlign: "center",
              padding: "10px 0",
              borderTop: "1px solid #7dd3fc",
              borderBottom: "1px solid #0284c7",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 900,
                color: "#fff",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              {certificate.certificate_type || "Certificate of Statutory Inspection"}
            </h1>
          </div>

          <div style={{ padding: "12px 18px 16px" }}>
            <div style={{ border: "1px solid #bbb", marginBottom: 10 }}>
              <div
                style={{
                  background:
                    "linear-gradient(180deg, #38bdf8 0%, #7dd3fc 50%, #0ea5e9 100%)",
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 900,
                  color: "#fff",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  borderBottom: "1px solid #0284c7",
                }}
              >
                Certificate Details
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "6px 18px",
                  padding: "12px 12px",
                  color: "#111",
                }}
              >
                <div style={{ fontSize: 12, color: "#111" }}>
                  <strong>Certificate Number:</strong>{" "}
                  {certificate.certificate_number || "-"}
                </div>
                <div style={{ fontSize: 12, color: "#111" }}>
                  <strong>Client / Company:</strong>{" "}
                  {certificate.company || asset?.clients?.company_name || "-"}
                </div>
                <div style={{ fontSize: 12, color: "#111" }}>
                  <strong>Equipment Category:</strong> {equipmentType || "-"}
                </div>
                <div style={{ fontSize: 12, color: "#111" }}>
                  <strong>Inspection Authority:</strong> Monroy (PTY) LTD
                </div>
                <div style={{ fontSize: 12, color: "#111" }}>
                  <strong>Issue Date:</strong> {formatDate(certificate.issued_at) || "-"}
                </div>
                <div style={{ fontSize: 12, color: "#111" }}>
                  <strong>Expiry Date:</strong> {formatDate(certificate.valid_to) || "-"}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div style={{ border: "1px solid #bbb" }}>
                <div
                  style={{
                    background:
                      "linear-gradient(180deg, #38bdf8 0%, #7dd3fc 50%, #0ea5e9 100%)",
                    padding: "6px 10px",
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    borderBottom: "1px solid #0284c7",
                    color: "#fff",
                  }}
                >
                  Equipment Identification
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {renderFieldList(equipmentFields)}
                  </ul>
                </div>
              </div>

              <div style={{ border: "1px solid #bbb" }}>
                <div
                  style={{
                    background:
                      "linear-gradient(180deg, #38bdf8 0%, #7dd3fc 50%, #0ea5e9 100%)",
                    padding: "6px 10px",
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    borderBottom: "1px solid #0284c7",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    color: "#fff",
                  }}
                >
                  Nameplate Data
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 3,
                      background: isPressure ? "#075985" : "#0369a1",
                      color: "#fff",
                    }}
                  >
                    {equipmentType || "Equipment"}
                  </span>
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {renderFieldList(nameplateFields)}
                  </ul>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div style={{ border: "1px solid #bbb" }}>
                <div
                  style={{
                    background:
                      "linear-gradient(180deg, #38bdf8 0%, #7dd3fc 50%, #0ea5e9 100%)",
                    padding: "6px 10px",
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    borderBottom: "1px solid #0284c7",
                    color: "#fff",
                  }}
                >
                  Compliance
                </div>
                <div
                  style={{
                    padding: "10px 12px",
                    fontSize: 12,
                    lineHeight: 1.7,
                    color: "#111",
                  }}
                >
                  <p style={{ marginTop: 0 }}>{complianceText}</p>
                  <p style={{ marginBottom: 0 }}>
                    Legal Compliance:{" "}
                    <strong>
                      {certificate.legal_framework ||
                        "Mines, Quarries, Works and Machinery Act Cap 44:02"}
                    </strong>
                  </p>
                </div>
              </div>

              <div style={{ border: "1px solid #bbb" }}>
                <div
                  style={{
                    background:
                      "linear-gradient(180deg, #38bdf8 0%, #7dd3fc 50%, #0ea5e9 100%)",
                    padding: "6px 10px",
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    borderBottom: "1px solid #0284c7",
                    color: "#fff",
                  }}
                >
                  Inspection Record
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#111",
                      lineHeight: 1.6,
                      marginBottom: 8,
                    }}
                  >
                    {inspectionMethod}
                  </div>
                  <div style={{ fontSize: 12, marginBottom: 10, color: "#111" }}>
                    Inspection Date: <strong>{formatDate(certificate.issued_at)}</strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
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

                    <div style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>
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
              <div
                style={{
                  border: "2px solid #b06000",
                  marginBottom: 10,
                  background: "#fffaf2",
                }}
              >
                <div
                  style={{
                    background:
                      "linear-gradient(180deg, #b06000 0%, #d07820 50%, #b06000 100%)",
                    padding: "6px 10px",
                    fontSize: 11,
                    fontWeight: 900,
                    color: "#fff",
                    textTransform: "uppercase",
                  }}
                >
                  Conditional Approval - Waiver Notice
                </div>
                <div style={{ padding: "10px 12px", fontSize: 12, lineHeight: 1.6, color: "#111" }}>
                  <div>
                    <strong>Temporary Waiver:</strong> This equipment is conditionally
                    approved subject to rectification and re-inspection.
                  </div>
                </div>
              </div>
            )}

            <div style={{ border: "1px solid #bbb" }}>
              <div
                style={{
                  background:
                    "linear-gradient(180deg, #38bdf8 0%, #7dd3fc 50%, #0ea5e9 100%)",
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  borderBottom: "1px solid #0284c7",
                  color: "#fff",
                }}
              >
                Authorized Inspection Body
              </div>

              <div style={{ padding: "10px 12px" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "#111" }}>
                      MONROY (PTY) LTD
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#444",
                        fontStyle: "italic",
                        marginBottom: 10,
                      }}
                    >
                      Process Control Solutions
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        fontSize: 12,
                        color: "#111",
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ minWidth: 95 }}>Inspector Name:</span>
                      <span
                        style={{
                          borderBottom: "1px solid #333",
                          minWidth: 180,
                          display: "inline-block",
                          fontWeight: 700,
                        }}
                      >
                        {certificate.inspector_name || "N/A"}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-end",
                        fontSize: 12,
                        color: "#111",
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ minWidth: 95 }}>Signature:</span>
                      <div
                        style={{
                          width: 220,
                          height: 70,
                          border: "1px solid #aaa",
                          background: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {certificate.signature_url ? (
                          <img
                            src={certificate.signature_url}
                            alt="Signature"
                            style={{
                              maxWidth: "95%",
                              maxHeight: "90%",
                              objectFit: "contain",
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: 12, color: "#666", fontWeight: 700 }}>
                            No uploaded signature
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: "#111", marginTop: 4 }}>
                      Date Issued: <strong>{formatDate(certificate.issued_at)}</strong>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <img
                      src={makeQrUrl(qrText)}
                      alt="QR Code"
                      style={{ width: 86, height: 86, objectFit: "contain" }}
                    />
                    <div
                      style={{
                        fontSize: 8,
                        color: "#555",
                        textAlign: "center",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Scan to Verify
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#f0f9ff",
              borderTop: "2px solid #7dd3fc",
              padding: "8px 20px",
              textAlign: "center",
              fontSize: 9.5,
              color: "#475569",
              lineHeight: 1.6,
            }}
          >
            This certificate was generated electronically by the Monroy QMS Inspection System.
            <br />
            Verification can be performed using the certificate number or QR code.
          </div>
        </div>
      </div>
    </>
  );
}
