"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

function formatDate(value) {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function toInputDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function detectEquipmentType(asset = {}) {
  const type = String(asset.asset_type || "").toLowerCase();

  const pressureTypes = [
    "pressure vessel",
    "boiler",
    "air receiver",
    "air compressor",
    "oil separator",
  ];

  const liftingTypes = [
    "trestle jack",
    "lever hoist",
    "bottle jack",
    "safety harness",
    "jack stand",
    "chain block",
    "bow shackle",
    "mobile crane",
    "trolley jack",
    "step ladders",
    "tifor",
    "crawl beam",
    "beam crawl",
    "beam clamp",
    "webbing sling",
    "nylon sling",
    "wire sling",
    "fall arrest",
    "man cage",
    "shutter clamp",
    "drum clamp",
    "overhead crane",
  ];

  if (pressureTypes.includes(type)) return "pv";
  if (liftingTypes.includes(type)) return "lift";

  if (asset.design_pressure || asset.working_pressure || asset.test_pressure) {
    return "pv";
  }

  return "lift";
}

function getCertificateTitle(equipType, certificateType) {
  if (certificateType) return certificateType;
  return equipType === "pv" ? "Pressure Test Certificate" : "Load Test Certificate";
}

function getStatusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("fail")) return "FAIL";
  if (s.includes("conditional")) return "CONDITIONAL";
  return "PASS";
}

function buildEquipmentIdFields(asset, equipType) {
  return [
    ["Equipment Tag No :", asset.asset_tag || "N/A"],
    ["Equipment Type:", asset.asset_type || (equipType === "pv" ? "Pressure Vessel" : "Lifting Equipment")],
    ["Location:", asset.location || "N/A"],
    ["Manufacturer:", asset.manufacturer || "N/A"],
    ["Serial Number:", asset.serial_number || "N/A"],
    ["Year Manufactured:", asset.year_built || "N/A"],
  ];
}

function buildNameplateFields(asset, equipType) {
  if (equipType === "pv") {
    return [
      ["Design Code:", asset.design_standard || "N/A"],
      ["Design Pressure:", asset.design_pressure ? `${asset.design_pressure} kPa` : "N/A"],
      ["Working Pressure:", asset.working_pressure ? `${asset.working_pressure} kPa` : "N/A"],
      ["Test Pressure:", asset.test_pressure ? `${asset.test_pressure} kPa` : "N/A"],
      ["Design Temperature:", asset.design_temperature || "N/A"],
      ["Capacity / Volume:", asset.capacity_volume || "N/A"],
      ["Shell / Body Material:", asset.shell_material || "N/A"],
      ["Fluid Type:", asset.fluid_type || "N/A"],
    ];
  }

  return [
    ["Design Code:", asset.design_standard || "N/A"],
    ["Safe Working Load:", asset.safe_working_load ? `${asset.safe_working_load} Tons` : "N/A"],
    ["Proof Load:", asset.proof_load ? `${asset.proof_load} Tons` : "N/A"],
    ["Lift Height:", asset.lifting_height || "N/A"],
    ["Sling Length:", asset.sling_length || "N/A"],
    ["Chain Size:", asset.chain_size || "N/A"],
    ["Wire / Rope Diameter:", asset.rope_diameter || "N/A"],
    ["Inspection Frequency:", asset.inspection_freq || "N/A"],
  ];
}

function getComplianceText(equipType) {
  if (equipType === "pv") {
    return [
      "This pressure vessel has been inspected by a competent inspection authority. The inspection status reflects the condition observed during examination including visual, dimensional and pressure testing.",
      "Operation must comply with the safe operating limits specified on the equipment nameplate. Maximum allowable working pressure must not be exceeded.",
    ];
  }

  return [
    "This lifting equipment has been inspected in accordance with applicable lifting machinery regulations. The inspection reflects the condition observed during visual, functional and load testing.",
    "Operation must not exceed the Safe Working Load shown on the equipment identification and nameplate data. Periodic re-inspection remains mandatory.",
  ];
}

function getInspectionMethod(equipType) {
  if (equipType === "pv") {
    return "Inspection Method: Visual Examination\nUltrasonic Thickness Testing / Hydrostatic Pressure Test";
  }

  return "Inspection Method: Visual Examination\nNon-Destructive Testing (NDT) / Proof Load Test";
}

function buildVerifyUrl(certificateNumber) {
  const number = encodeURIComponent(certificateNumber || "UNKNOWN");
  return `${typeof window !== "undefined" ? window.location.origin : ""}/verify?certificate=${number}`;
}

export default function CertificatePage() {
  const params = useParams();
  const router = useRouter();
  const printRef = useRef(null);
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [certificate, setCertificate] = useState(null);
  const [asset, setAsset] = useState(null);
  const [clientName, setClientName] = useState("N/A");
  const [equipType, setEquipType] = useState("pv");
  const [status, setStatus] = useState("PASS");

  const [sigPreview, setSigPreview] = useState("");
  const [waiverStart, setWaiverStart] = useState("");
  const [waiverEnd, setWaiverEnd] = useState("");
  const [waiverRef, setWaiverRef] = useState("");
  const [waiverConditions, setWaiverConditions] = useState("");
  const [waiverRestrictions, setWaiverRestrictions] = useState("");

  useEffect(() => {
    async function loadCertificate() {
      if (!id) return;

      setLoading(true);
      setError("");

      try {
        const { data, error } = await supabase
          .from("certificates")
          .select(`
            id,
            certificate_number,
            certificate_type,
            asset_id,
            company,
            equipment_description,
            equipment_location,
            equipment_id,
            swl,
            mawp,
            equipment_status,
            issued_at,
            valid_to,
            status,
            legal_framework,
            inspector_name,
            inspector_id,
            signature_url,
            logo_url,
            pdf_url,
            created_at,
            updated_at,
            assets (
              id,
              client_id,
              asset_name,
              asset_tag,
              asset_type,
              description,
              manufacturer,
              model,
              serial_number,
              location,
              year_built,
              cert_type,
              design_standard,
              inspection_freq,
              shell_material,
              fluid_type,
              design_pressure,
              working_pressure,
              test_pressure,
              design_temperature,
              capacity_volume,
              safe_working_load,
              proof_load,
              lifting_height,
              sling_length,
              chain_size,
              rope_diameter,
              license_status,
              license_expiry,
              last_inspection_date,
              next_inspection_date,
              notes
            )
          `)
          .eq("id", id)
          .single();

        if (error) throw error;

        const cert = data || null;
        const linkedAsset = cert?.assets || null;

        setCertificate(cert);
        setAsset(linkedAsset);

        const detectedType = detectEquipmentType(linkedAsset || {});
        setEquipType(detectedType);
        setStatus(getStatusLabel(cert?.status || cert?.equipment_status || "PASS"));

        if (cert?.signature_url) {
          setSigPreview(cert.signature_url);
        }

        if (cert?.company) {
          setClientName(cert.company);
        } else if (linkedAsset?.client_id) {
          const { data: clientData } = await supabase
            .from("clients")
            .select("company_name")
            .eq("id", linkedAsset.client_id)
            .maybeSingle();

          setClientName(clientData?.company_name || "N/A");
        }
      } catch (err) {
        setError(err?.message || "Failed to load certificate.");
      } finally {
        setLoading(false);
      }
    }

    loadCertificate();
  }, [id]);

  const equipmentIdFields = useMemo(() => buildEquipmentIdFields(asset || {}, equipType), [asset, equipType]);
  const nameplateFields = useMemo(() => buildNameplateFields(asset || {}, equipType), [asset, equipType]);
  const complianceText = useMemo(() => getComplianceText(equipType), [equipType]);
  const inspectionMethod = useMemo(() => getInspectionMethod(equipType), [equipType]);

  const certificateTitle = getCertificateTitle(equipType, certificate?.certificate_type || asset?.cert_type);
  const equipmentCategory = equipType === "pv" ? "Pressure Vessel" : "Lifting Equipment";
  const issueDate = formatDate(certificate?.issued_at || certificate?.created_at);
  const expiryDate = formatDate(certificate?.valid_to || asset?.next_inspection_date || asset?.license_expiry);
  const inspectionDate = formatDate(asset?.last_inspection_date || certificate?.issued_at || certificate?.created_at);
  const dateIssued = formatDate(certificate?.issued_at || certificate?.created_at);
  const verifyUrl = buildVerifyUrl(certificate?.certificate_number);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(verifyUrl)}`;

  function handlePrint() {
    window.print();
  }

  function handleSignatureUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setSigPreview(e.target?.result || "");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function clearSignature() {
    setSigPreview("");
  }

  function renderFieldList(fields) {
    return fields.map(([label, value]) => (
      <li key={`${label}-${value}`}>
        <span className="fl-label">{label}</span>
        <span className="fl-value">{value || "N/A"}</span>
      </li>
    ));
  }

  return (
    <AppLayout title={certificateTitle}>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            inset: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white;
          }
          .no-print {
            display: none !important;
          }
        }

        .cert-page-wrap {
          display: flex;
          flex-direction: column;
          gap: 20px;
          align-items: center;
          padding-bottom: 32px;
        }

        .cert-toolbar {
          width: 100%;
          max-width: 1100px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
        }

        .cert-toolbar button,
        .cert-toolbar label.btn-like {
          padding: 9px 18px;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
          font-size: 12px;
          border: none;
        }

        .btn-print {
          background: #8b1a1a;
          color: #fff;
        }

        .btn-back {
          background: #1f2937;
          color: #fff;
        }

        .btn-like {
          background: #f0f0f0;
          color: #222;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .control-group {
          display: flex;
          gap: 6px;
          align-items: center;
          background: #fff;
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid #ddd;
        }

        .control-group label {
          font-size: 11px;
          font-weight: 700;
          color: #555;
          margin-right: 4px;
          white-space: nowrap;
        }

        .toggle-btn {
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 700;
          font-size: 11px;
          border: 2px solid transparent;
          transition: all .15s;
        }

        .status-btn.pass {
          background: #e8f5ea;
          color: #2d7a3a;
          border-color: #2d7a3a;
        }

        .status-btn.fail {
          background: #fdecea;
          color: #8b1a1a;
          border-color: #8b1a1a;
        }

        .status-btn.cond {
          background: #fff8e6;
          color: #b06000;
          border-color: #b06000;
        }

        .status-btn.active.pass {
          background: #2d7a3a;
          color: #fff;
        }

        .status-btn.active.fail {
          background: #8b1a1a;
          color: #fff;
        }

        .status-btn.active.cond {
          background: #b06000;
          color: #fff;
        }

        .equip-btn.pv {
          background: #e8f0fe;
          color: #1a56a8;
          border-color: #1a56a8;
        }

        .equip-btn.lift {
          background: #fef3e8;
          color: #8b4a00;
          border-color: #8b4a00;
        }

        .equip-btn.active.pv {
          background: #1a56a8;
          color: #fff;
        }

        .equip-btn.active.lift {
          background: #8b4a00;
          color: #fff;
        }

        .cert {
          width: 740px;
          max-width: 100%;
          background: #fff;
          box-shadow: 0 8px 40px rgba(0,0,0,0.35);
          border: 1px solid #bbb;
          color: #1a1a1a;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
        }

        .top-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 22px 12px;
          border-bottom: 3px solid #8b1a1a;
          background: #fff;
        }

        .company-name {
          font-size: 21px;
          font-weight: 900;
          color: #1a1a1a;
          line-height: 1.1;
        }

        .company-tagline {
          font-size: 10px;
          color: #555;
          font-style: italic;
          margin-bottom: 7px;
        }

        .contact-row {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 10.5px;
          color: #333;
          margin-bottom: 1px;
        }

        .contact-icon {
          color: #8b1a1a;
          font-size: 10px;
          min-width: 14px;
        }

        .logo-right img {
          height: 90px;
          width: auto;
          object-fit: contain;
        }

        .title-banner {
          background: linear-gradient(180deg, #808080 0%, #b0b0b0 45%, #808080 100%);
          text-align: center;
          padding: 9px 0;
          border-top: 1px solid #aaa;
          border-bottom: 1px solid #555;
        }

        .title-banner h1 {
          font-size: 18px;
          font-weight: 900;
          color: #fff;
          letter-spacing: 0.14em;
          text-shadow: 0 1px 4px rgba(0,0,0,0.45);
          text-transform: uppercase;
        }

        .body {
          padding: 12px 18px 16px;
        }

        .section {
          border: 1px solid #bbb;
          margin-bottom: 9px;
        }

        .section-header {
          background: linear-gradient(180deg, #a8a8a8 0%, #c5c5c5 50%, #a8a8a8 100%);
          padding: 5px 10px;
          font-size: 11px;
          font-weight: 900;
          color: #1a1a1a;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          border-bottom: 1px solid #999;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .section-body {
          padding: 9px 12px;
        }

        .equip-type-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 3px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .equip-type-badge.pv {
          background: #1a56a8;
          color: #fff;
        }

        .equip-type-badge.lift {
          background: #8b4a00;
          color: #fff;
        }

        .cert-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3px 16px;
          padding: 9px 12px;
        }

        .detail-row {
          display: flex;
          gap: 3px;
          align-items: baseline;
          line-height: 1.75;
          font-size: 11.5px;
        }

        .detail-label {
          color: #333;
          white-space: nowrap;
        }

        .detail-value {
          font-weight: 700;
          color: #1a1a1a;
        }

        .side-by-side {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
          margin-bottom: 9px;
        }

        .side-by-side .section {
          margin-bottom: 0;
        }

        .field-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .field-list li {
          display: flex;
          gap: 5px;
          align-items: baseline;
          padding: 2.5px 0;
          border-bottom: 1px solid #f0f0f0;
          font-size: 11.5px;
          line-height: 1.5;
        }

        .field-list li:last-child {
          border-bottom: none;
        }

        .fl-label {
          color: #444;
          white-space: nowrap;
          min-width: 130px;
          flex-shrink: 0;
        }

        .fl-value {
          font-weight: 700;
          color: #1a1a1a;
        }

        .compliance-text {
          font-size: 11px;
          color: #333;
          line-height: 1.65;
        }

        .compliance-text p {
          margin-bottom: 7px;
        }

        .compliance-text p:last-child {
          margin-bottom: 0;
        }

        .insp-method {
          font-size: 11px;
          color: #333;
          line-height: 1.6;
          margin-bottom: 8px;
          white-space: pre-line;
        }

        .insp-date {
          font-size: 11.5px;
          margin-bottom: 10px;
        }

        .pass-row {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 4px;
          flex-wrap: wrap;
        }

        .status-badge {
          font-size: 15px;
          font-weight: 900;
          letter-spacing: 0.12em;
          padding: 6px 18px;
          min-width: 120px;
          text-align: center;
        }

        .status-badge.PASS {
          background: #2d7a3a;
          color: #fff;
        }

        .status-badge.FAIL {
          background: #8b1a1a;
          color: #fff;
        }

        .status-badge.CONDITIONAL {
          background: #b06000;
          color: #fff;
          font-size: 12px;
          letter-spacing: 0.06em;
        }

        .pass-expiry {
          font-size: 12px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .waiver-section {
          border: 2px solid #b06000;
          margin-bottom: 9px;
          background: #fffaf2;
        }

        .waiver-header {
          background: linear-gradient(180deg, #b06000 0%, #d07820 50%, #b06000 100%);
          padding: 5px 10px;
          font-size: 11px;
          font-weight: 900;
          color: #fff;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .waiver-tag {
          font-size: 9px;
          background: #fff;
          color: #b06000;
          padding: 2px 8px;
          border-radius: 3px;
          font-weight: 900;
          letter-spacing: 0.1em;
        }

        .waiver-body {
          padding: 10px 12px;
        }

        .waiver-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px 12px;
          margin-bottom: 10px;
        }

        .waiver-field label,
        .waiver-conditions label {
          display: block;
          font-size: 9px;
          font-weight: 700;
          color: #b06000;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 3px;
        }

        .waiver-field input,
        .waiver-conditions textarea {
          width: 100%;
          padding: 6px 8px;
          border: 1px solid #d0a060;
          border-radius: 3px;
          font-size: 11px;
          font-family: Arial, sans-serif;
          background: #fff;
          color: #1a1a1a;
          outline: none;
        }

        .waiver-conditions textarea {
          resize: vertical;
          min-height: 52px;
        }

        .waiver-notice {
          margin-top: 8px;
          padding: 6px 10px;
          background: #fff3e0;
          border-left: 3px solid #b06000;
          font-size: 10px;
          color: #7a4400;
          line-height: 1.5;
        }

        .auth-body {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }

        .auth-info {
          flex: 1;
        }

        .auth-company {
          font-size: 13px;
          font-weight: 900;
          color: #1a1a1a;
        }

        .auth-tagline {
          font-size: 10px;
          color: #555;
          font-style: italic;
          margin-bottom: 8px;
        }

        .auth-row {
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 11px;
          color: #333;
          margin-bottom: 6px;
        }

        .auth-row span:first-child {
          min-width: 90px;
          flex-shrink: 0;
        }

        .auth-date {
          font-size: 11px;
          color: #333;
          margin-top: 4px;
        }

        .sig-area {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .sig-preview {
          width: 140px;
          height: 44px;
          border-bottom: 1px solid #333;
          display: flex;
          align-items: flex-end;
          overflow: hidden;
        }

        .sig-preview img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          object-position: bottom left;
        }

        .sig-placeholder {
          font-family: "Brush Script MT", cursive;
          font-size: 18px;
          color: #bbb;
          padding-bottom: 2px;
        }

        .sig-clear-btn {
          background: none;
          border: none;
          color: #8b1a1a;
          font-size: 10px;
          cursor: pointer;
          font-weight: 700;
          padding: 0;
        }

        .qr-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .qr-label {
          font-size: 8px;
          color: #555;
          text-align: center;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .cert-footer {
          background: #f0f0f0;
          border-top: 2px solid #bbb;
          padding: 8px 20px;
          text-align: center;
          font-size: 9.5px;
          color: #555;
          line-height: 1.6;
        }

        .error-box {
          max-width: 900px;
          width: 100%;
          background: rgba(220, 38, 38, 0.1);
          border: 1px solid rgba(220, 38, 38, 0.3);
          color: #fecaca;
          padding: 14px 16px;
          border-radius: 10px;
        }

        .loading-box {
          color: white;
          padding: 40px 0;
          text-align: center;
          font-weight: 700;
        }

        @media screen and (max-width: 820px) {
          .side-by-side,
          .cert-details-grid,
          .waiver-grid {
            grid-template-columns: 1fr;
          }

          .auth-body,
          .top-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .cert {
            width: 100%;
          }
        }
      `}</style>

      <div className="cert-page-wrap">
        <div className="cert-toolbar no-print">
          <button className="btn-back" onClick={() => router.back()}>
            ← Back
          </button>

          <div className="control-group">
            <label>Equipment Type:</label>
            <button
              className={`toggle-btn equip-btn pv ${equipType === "pv" ? "active" : ""}`}
              onClick={() => setEquipType("pv")}
              type="button"
            >
              ⚙ Pressure Vessel
            </button>
            <button
              className={`toggle-btn equip-btn lift ${equipType === "lift" ? "active" : ""}`}
              onClick={() => setEquipType("lift")}
              type="button"
            >
              🏗 Lifting Equipment
            </button>
          </div>

          <div className="control-group">
            <label>Result:</label>
            <button
              className={`toggle-btn status-btn pass ${status === "PASS" ? "active" : ""}`}
              onClick={() => setStatus("PASS")}
              type="button"
            >
              ✔ PASS
            </button>
            <button
              className={`toggle-btn status-btn fail ${status === "FAIL" ? "active" : ""}`}
              onClick={() => setStatus("FAIL")}
              type="button"
            >
              ✘ FAIL
            </button>
            <button
              className={`toggle-btn status-btn cond ${status === "CONDITIONAL" ? "active" : ""}`}
              onClick={() => setStatus("CONDITIONAL")}
              type="button"
            >
              ⚠ CONDITIONAL
            </button>
          </div>

          <label className="btn-like">
            📎 Upload Signature
            <input type="file" accept="image/*" onChange={handleSignatureUpload} hidden />
          </label>

          {sigPreview ? (
            <button className="btn-like" onClick={clearSignature} type="button">
              ✕ Clear Signature
            </button>
          ) : null}

          <button className="btn-print" onClick={handlePrint} type="button">
            🖨 Print / Save PDF
          </button>
        </div>

        {loading ? (
          <div className="loading-box">Loading certificate...</div>
        ) : error ? (
          <div className="error-box">{error}</div>
        ) : (
          <div className="print-area" ref={printRef}>
            <div className="cert">
              <div className="top-header">
                <div>
                  <div className="company-name">MONROY (PTY) LTD</div>
                  <div className="company-tagline">Process Control Solutions</div>
                  <div className="contact-row">
                    <span className="contact-icon">📞</span>
                    <span>+267 7790646 / 71450610</span>
                  </div>
                  <div className="contact-row">
                    <span className="contact-icon">✉</span>
                    <span>info@monroy.com</span>
                  </div>
                  <div className="contact-row">
                    <span className="contact-icon">📍</span>
                    <span>Mophane Avenue, Plot No 5180, Mathiba Street</span>
                  </div>
                </div>

                <div className="logo-right">
                  <img
                    src={certificate?.logo_url || "/monroy-logo.png"}
                    alt="Monroy Logo"
                    onError={(e) => {
                      e.currentTarget.src = "/monroy-logo.png";
                    }}
                  />
                </div>
              </div>

              <div className="title-banner">
                <h1>{certificateTitle}</h1>
              </div>

              <div className="body">
                <div className="section">
                  <div className="section-header">Certificate Details</div>
                  <div className="cert-details-grid">
                    <div className="detail-row">
                      <span className="detail-label">Certificate Number:&nbsp;</span>
                      <span className="detail-value">{certificate?.certificate_number || "N/A"}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Client / Company:&nbsp;</span>
                      <span className="detail-value">{clientName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Equipment Category:&nbsp;</span>
                      <span className="detail-value">{equipmentCategory}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Inspection Authority:&nbsp;</span>
                      <span className="detail-value">Monroy (PTY) LTD</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Issue Date:&nbsp;</span>
                      <span className="detail-value">{issueDate}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Expiry Date:&nbsp;</span>
                      <span className="detail-value">{status === "CONDITIONAL" ? (waiverEnd ? formatDate(waiverEnd) : "Waiver - See Conditions Below") : expiryDate}</span>
                    </div>
                  </div>
                </div>

                <div className="side-by-side">
                  <div className="section">
                    <div className="section-header">Equipment Identification</div>
                    <div className="section-body">
                      <ul className="field-list">{renderFieldList(equipmentIdFields)}</ul>
                    </div>
                  </div>

                  <div className="section">
                    <div className="section-header">
                      Nameplate Data
                      <span className={`equip-type-badge ${equipType}`}>
                        {equipmentCategory}
                      </span>
                    </div>
                    <div className="section-body">
                      <ul className="field-list">{renderFieldList(nameplateFields)}</ul>
                    </div>
                  </div>
                </div>

                <div className="side-by-side">
                  <div className="section">
                    <div className="section-header">Compliance</div>
                    <div className="section-body">
                      <div className="compliance-text">
                        {complianceText.map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="section">
                    <div className="section-header">Inspection Record</div>
                    <div className="section-body">
                      <div className="insp-method">{inspectionMethod}</div>
                      <div className="insp-date">
                        Inspection Date: <strong>{inspectionDate}</strong>
                      </div>
                      <div className="pass-row">
                        <div className={`status-badge ${status}`}>{status}</div>
                        <div className="pass-expiry">
                          {status === "PASS" && expiryDate}
                          {status === "FAIL" && "Requires Re-inspection"}
                          {status === "CONDITIONAL" && (waiverEnd ? `Waiver Expires: ${formatDate(waiverEnd)}` : "Waiver - See Conditions Below")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {status === "CONDITIONAL" ? (
                  <div className="waiver-section">
                    <div className="waiver-header">
                      <span>⚠ Conditional Approval - Waiver Notice</span>
                      <span className="waiver-tag">TEMPORARY WAIVER</span>
                    </div>

                    <div className="waiver-body">
                      <div className="waiver-grid no-print">
                        <div className="waiver-field">
                          <label>Waiver Issue Date</label>
                          <input
                            type="date"
                            value={waiverStart}
                            onChange={(e) => setWaiverStart(e.target.value)}
                          />
                        </div>

                        <div className="waiver-field">
                          <label>Waiver Expiry Date</label>
                          <input
                            type="date"
                            value={waiverEnd}
                            onChange={(e) => setWaiverEnd(e.target.value)}
                          />
                        </div>

                        <div className="waiver-field">
                          <label>Waiver Reference No.</label>
                          <input
                            type="text"
                            placeholder="e.g. WAV-2026-001"
                            value={waiverRef}
                            onChange={(e) => setWaiverRef(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="waiver-grid" style={{ display: "none" }} />

                      <div className="waiver-conditions">
                        <label>Non-Conformance / Items Requiring Rectification</label>
                        <textarea
                          className="no-print"
                          placeholder="Describe the deficiency or non-conformance found during inspection, and specify what must be rectified before full compliance can be issued..."
                          value={waiverConditions}
                          onChange={(e) => setWaiverConditions(e.target.value)}
                        />
                        <div style={{ whiteSpace: "pre-line", fontSize: "11px", color: "#333" }}>
                          {waiverConditions || "N/A"}
                        </div>
                      </div>

                      <div className="waiver-conditions" style={{ marginTop: 8 }}>
                        <label>Operating Restrictions During Waiver Period</label>
                        <textarea
                          className="no-print"
                          placeholder="e.g. Reduce maximum working pressure to 800 kPa. Visual inspection to be performed every 30 days. Equipment must not be operated unattended..."
                          style={{ minHeight: 44 }}
                          value={waiverRestrictions}
                          onChange={(e) => setWaiverRestrictions(e.target.value)}
                        />
                        <div style={{ whiteSpace: "pre-line", fontSize: "11px", color: "#333" }}>
                          {waiverRestrictions || "N/A"}
                        </div>
                      </div>

                      <div style={{ marginTop: 10, fontSize: "11px", color: "#333", lineHeight: 1.6 }}>
                        <strong>Waiver Issue Date:</strong> {waiverStart ? formatDate(waiverStart) : "N/A"}<br />
                        <strong>Waiver Expiry Date:</strong> {waiverEnd ? formatDate(waiverEnd) : "N/A"}<br />
                        <strong>Waiver Reference No.:</strong> {waiverRef || "N/A"}
                      </div>

                      <div className="waiver-notice">
                        ⚠ This equipment is granted a <strong>temporary conditional approval</strong>. Full compliance must be achieved before the waiver expiry date.
                        Continued operation beyond this date without re-inspection and a new certificate is a statutory violation.
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="section">
                  <div className="section-header">Authorized Inspection Body</div>
                  <div className="section-body">
                    <div className="auth-body">
                      <div className="auth-info">
                        <div className="auth-company">MONROY (PTY) LTD</div>
                        <div className="auth-tagline">Process Control Solutions</div>

                        <div className="auth-row">
                          <span>Inspector Name:</span>
                          <span style={{ borderBottom: "1px solid #333", minWidth: 180, display: "inline-block" }}>
                            {certificate?.inspector_name || " "}
                          </span>
                        </div>

                        <div className="auth-row" style={{ alignItems: "flex-end" }}>
                          <span>Signature:</span>
                          <div className="sig-area">
                            <div className="sig-preview">
                              {sigPreview ? (
                                <img src={sigPreview} alt="Inspector Signature" />
                              ) : (
                                <span className="sig-placeholder">Sign here</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="auth-date">
                          Date Issued: <strong>{dateIssued}</strong>
                        </div>
                      </div>

                      <div className="qr-block">
                        <img
                          src={qrUrl}
                          alt="Scan to verify certificate"
                          width="80"
                          height="80"
                          style={{ border: "1px solid #ccc", padding: 4, background: "#fff" }}
                        />
                        <div className="qr-label">Scan to Verify</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="cert-footer">
                This certificate was generated electronically by the Monroy QMS Inspection System.<br />
                Verification can be performed using the certificate number or QR code.
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
