"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const DEFAULT_INSPECTOR_NAME = "Moemedi Masupe";
const DEFAULT_INSPECTOR_ID = "700117910";
const DEFAULT_LEGAL_FRAMEWORK =
  "Mines, Quarries, Works and Machinery Act Cap 44:02";
const CONTACT_DETAILS = "+267 77906461 / +267 71450610";

function resolveCertTitle(certType = "", assetType = "") {
  const ct = String(certType || "").toLowerCase();
  const at = String(assetType || "").toLowerCase();
  const pressureWords = [
    "pressure",
    "boiler",
    "air receiver",
    "air compressor",
    "oil separator",
    "vessel",
  ];

  const isPressure = pressureWords.some((word) => ct.includes(word) || at.includes(word));

  return isPressure
    ? "Pressure Test Certificate"
    : "Load Test Certificate – Lifting Equipment";
}

function buildCertNumber(cert, asset) {
  if (cleanInlineValue(cert?.certificate_number)) return cert.certificate_number;

  const serial = String(asset?.serial_number || asset?.asset_tag || "XX")
    .replace(/\s+/g, "-")
    .toUpperCase();

  const seq = cert?.sequence_number
    ? String(cert.sequence_number).padStart(2, "0")
    : "01";

  return `CERT-${serial}-${seq}`;
}

function cleanInlineValue(value) {
  if (value === null || value === undefined) return null;

  if (typeof value === "object") {
    const text = stringifyComplexValue(value);
    return text || null;
  }

  const text = String(value)
    .replace(/[\t ]+/g, " ")
    .trim();

  if (!text) return null;

  const lowered = text.toLowerCase();
  if (["unknown", "null", "undefined", "n/a", "na", "-"].includes(lowered)) {
    return null;
  }

  return text;
}

function cleanBlockValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return stringifyComplexValue(value) || null;

  const text = String(value)
    .replace(/\r/g, "\n")
    .replace(/[\t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) return null;

  const lowered = text.toLowerCase();
  if (["unknown", "null", "undefined", "n/a", "na", "-"].includes(lowered)) {
    return null;
  }

  return text;
}

function stringifyComplexValue(value) {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    const items = value
      .map((item) => cleanInlineValue(item))
      .filter(Boolean);

    return items.length ? items.join(", ") : null;
  }

  if (typeof value === "object") {
    const parts = Object.entries(value)
      .map(([key, item]) => {
        const cleaned = cleanInlineValue(item);
        return cleaned ? `${toLabel(key)}: ${cleaned}` : null;
      })
      .filter(Boolean);

    return parts.length ? parts.join(" | ") : null;
  }

  return cleanInlineValue(value);
}

function pickInline(...values) {
  for (const value of values) {
    const cleaned = cleanInlineValue(value);
    if (cleaned) return cleaned;
  }
  return null;
}

function pickBlock(...values) {
  for (const value of values) {
    const cleaned = cleanBlockValue(value);
    if (cleaned) return cleaned;
  }
  return null;
}

function dateLabel(value) {
  const text = cleanInlineValue(value);
  if (!text) return null;

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toLabel(key = "") {
  return String(key)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function pushField(rows, label, ...values) {
  const value = pickInline(...values);
  if (!value) return;
  rows.push({ label, value });
}

function buildDynamicRows(extractedData, usedKeys = new Set()) {
  if (!extractedData || typeof extractedData !== "object") return [];

  const ignoredKeys = new Set([
    "manufacturer",
    "model",
    "serial_number",
    "identification_number",
    "inspection_number",
    "inspection_no",
    "asset_tag",
    "year_built",
    "country_of_origin",
    "capacity",
    "capacity_volume",
    "pressure",
    "working_pressure",
    "design_pressure",
    "test_pressure",
    "pressure_unit",
    "safe_working_load",
    "working_load_limit",
    "swl",
    "proof_load",
    "lift_height",
    "lifting_height",
    "sling_length",
    "chain_size",
    "rope_diameter",
    "equipment_type",
    "equipment_description",
    "certificate_number",
    "certificate_type",
    "client_name",
    "location",
    "inspection_date",
    "issue_date",
    "expiry_date",
    "next_inspection_due",
    "result",
    "status",
    "comments",
    "defects_found",
    "recommendations",
    "nameplate_data",
    "raw_text_summary",
    "plate_text",
    "other_visible_data",
  ]);

  const rows = [];
  const seenLabels = new Set();

  const appendRow = (key, value) => {
    if (ignoredKeys.has(key) || usedKeys.has(key)) return;
    const cleaned = cleanInlineValue(value);
    if (!cleaned) return;

    const label = toLabel(key);
    const labelKey = label.toLowerCase();
    if (seenLabels.has(labelKey)) return;

    seenLabels.add(labelKey);
    rows.push({ label, value: cleaned });
  };

  Object.entries(extractedData).forEach(([key, value]) => appendRow(key, value));

  if (
    extractedData.other_visible_data &&
    typeof extractedData.other_visible_data === "object"
  ) {
    Object.entries(extractedData.other_visible_data).forEach(([key, value]) => {
      appendRow(key, value);
    });
  }

  return rows;
}

function FieldGrid({ rows, columns = 2 }) {
  if (!rows.length) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 8,
      }}
    >
      {rows.map((row) => (
        <div
          key={`${row.label}-${row.value}`}
          style={{
            border: "1px solid #dbe3ee",
            borderRadius: 8,
            padding: "7px 9px",
            background: "#fff",
            minHeight: 48,
          }}
        >
          <div
            style={{
              fontSize: 8.4,
              fontWeight: 800,
              color: "#64748b",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {row.label}
          </div>
          <div
            style={{
              fontSize: 10.2,
              lineHeight: 1.35,
              color: "#0f172a",
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
            }}
          >
            {row.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }) {
  if (!children) return null;

  return (
    <div
      style={{
        border: "1px solid #d9e2ec",
        borderRadius: 10,
        overflow: "hidden",
        marginBottom: 10,
        pageBreakInside: "avoid",
      }}
    >
      <div
        style={{
          background: "#17365d",
          color: "#dbeafe",
          padding: "7px 12px",
          fontSize: 8.8,
          fontWeight: 800,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div style={{ padding: 10, background: "#f8fafc" }}>{children}</div>
    </div>
  );
}

function NoteBlock({ title, value, tone = "neutral" }) {
  if (!value) return null;

  const toneMap = {
    neutral: {
      background: "#f8fafc",
      border: "#dbe3ee",
      title: "#475569",
      text: "#0f172a",
    },
    blue: {
      background: "#eff6ff",
      border: "#bfdbfe",
      title: "#1d4ed8",
      text: "#1e3a8a",
    },
    red: {
      background: "#fef2f2",
      border: "#fecaca",
      title: "#dc2626",
      text: "#7f1d1d",
    },
    amber: {
      background: "#fffbeb",
      border: "#fde68a",
      title: "#b45309",
      text: "#78350f",
    },
    green: {
      background: "#ecfdf5",
      border: "#a7f3d0",
      title: "#047857",
      text: "#065f46",
    },
  };

  const palette = toneMap[tone] || toneMap.neutral;

  return (
    <div
      style={{
        border: `1px solid ${palette.border}`,
        borderRadius: 8,
        padding: "8px 10px",
        background: palette.background,
      }}
    >
      <div
        style={{
          fontSize: 8.2,
          fontWeight: 800,
          color: palette.title,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 10,
          lineHeight: 1.4,
          color: palette.text,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function PrintCertificatePage() {
  const params = useParams();
  const id = params?.id;

  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!id) {
        setError("No certificate ID provided.");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("certificates")
          .select(
            `
            *,
            extracted_data,
            source_nameplate_image_url,
            assets (
              asset_tag,
              asset_name,
              asset_type,
              serial_number,
              equipment_id,
              identification_number,
              inspection_no,
              lanyard_serial_no,
              manufacturer,
              model,
              year_built,
              location,
              department,
              country_of_origin,
              safe_working_load,
              working_pressure,
              design_pressure,
              test_pressure,
              proof_load,
              lifting_height,
              sling_length,
              chain_size,
              rope_diameter,
              capacity_volume,
              design_temperature,
              shell_material,
              fluid_type,
              inspector_name,
              inspector_id,
              clients (
                company_name,
                company_code
              )
            )
          `
          )
          .eq("id", id)
          .single();

        if (fetchError) throw new Error(fetchError.message || "Certificate not found.");
        if (!data) throw new Error("Certificate not found.");

        setCert(data);
      } catch (err) {
        setError(err.message || "Failed to load certificate.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  const model = useMemo(() => {
    if (!cert) return null;

    const asset = cert.assets || {};
    const client = asset.clients || {};
    const extracted = cert.extracted_data || {};

    const certTitle = resolveCertTitle(
      pickInline(cert.certificate_type, extracted.certificate_type),
      pickInline(cert.equipment_type, asset.asset_type, extracted.equipment_type)
    );

    const isPressure = certTitle.toLowerCase().includes("pressure");
    const certNumber = buildCertNumber(cert, asset);

    const inspectorName = pickInline(
      cert.inspector_name,
      extracted.inspector_name,
      asset.inspector_name,
      DEFAULT_INSPECTOR_NAME
    );

    const inspectorId = pickInline(cert.inspector_id, asset.inspector_id, DEFAULT_INSPECTOR_ID);

    const legalFramework = pickBlock(
      cert.legal_framework,
      extracted.legal_framework,
      DEFAULT_LEGAL_FRAMEWORK
    );

    const summaryRows = [];
    pushField(
      summaryRows,
      "Company / Client",
      cert.client_name,
      cert.company,
      client.company_name,
      client.company_code,
      extracted.client_name
    );
    pushField(summaryRows, "Certificate Number", certNumber);
    pushField(
      summaryRows,
      "Certificate Type",
      cert.certificate_type,
      extracted.certificate_type,
      certTitle
    );
    pushField(
      summaryRows,
      "Equipment Type",
      cert.equipment_type,
      cert.asset_type,
      extracted.equipment_type,
      asset.asset_type
    );
    pushField(
      summaryRows,
      "Equipment Description",
      cert.equipment_description,
      cert.asset_name,
      extracted.equipment_description,
      asset.asset_name,
      asset.asset_type
    );
    pushField(summaryRows, "Result", cert.result, cert.equipment_status, extracted.result);
    pushField(summaryRows, "Lifecycle Status", cert.status, extracted.status);
    pushField(
      summaryRows,
      "Inspection Body",
      cert.inspection_body,
      extracted.inspection_body,
      "Monroy (Pty) Ltd"
    );

    const identificationRows = [];
    pushField(identificationRows, "Asset Tag", cert.asset_tag, asset.asset_tag, extracted.asset_tag);
    pushField(
      identificationRows,
      "Equipment ID / Serial",
      cert.equipment_id,
      cert.serial_number,
      asset.equipment_id,
      asset.serial_number,
      extracted.serial_number
    );
    pushField(
      identificationRows,
      "Identification Number",
      cert.identification_number,
      asset.identification_number,
      extracted.identification_number
    );
    pushField(
      identificationRows,
      "Inspection No.",
      cert.inspection_number,
      cert.inspection_no,
      asset.inspection_no,
      extracted.inspection_number,
      extracted.inspection_no
    );
    pushField(
      identificationRows,
      "Lanyard Serial No.",
      cert.lanyard_serial_no,
      asset.lanyard_serial_no,
      extracted.lanyard_serial_no
    );
    pushField(
      identificationRows,
      "Manufacturer",
      cert.manufacturer,
      extracted.manufacturer,
      asset.manufacturer
    );
    pushField(identificationRows, "Model", cert.model, extracted.model, asset.model);
    pushField(
      identificationRows,
      "Year Built",
      cert.year_built,
      extracted.year_built,
      asset.year_built
    );
    pushField(
      identificationRows,
      "Country of Origin",
      cert.country_of_origin,
      extracted.country_of_origin,
      asset.country_of_origin
    );
    pushField(
      identificationRows,
      "Location",
      cert.location,
      cert.equipment_location,
      extracted.location,
      asset.location
    );
    pushField(identificationRows, "Department", cert.department, asset.department, extracted.department);

    const technicalRows = [];
    pushField(
      technicalRows,
      "Capacity / Volume",
      cert.capacity_volume,
      cert.capacity,
      extracted.capacity_volume,
      extracted.capacity,
      asset.capacity_volume
    );

    if (isPressure) {
      pushField(
        technicalRows,
        "MAWP / Working Pressure",
        cert.working_pressure,
        cert.mawp,
        extracted.working_pressure,
        extracted.mawp,
        extracted.pressure,
        asset.working_pressure
      );
      pushField(
        technicalRows,
        "Design Pressure",
        cert.design_pressure,
        extracted.design_pressure,
        asset.design_pressure
      );
      pushField(
        technicalRows,
        "Test Pressure",
        cert.test_pressure,
        extracted.test_pressure,
        asset.test_pressure
      );
      pushField(technicalRows, "Pressure Unit", cert.pressure_unit, extracted.pressure_unit);
      pushField(
        technicalRows,
        "Design Temperature",
        cert.design_temperature,
        extracted.design_temperature,
        asset.design_temperature
      );
      pushField(
        technicalRows,
        "Shell Material",
        cert.material,
        cert.shell_material,
        extracted.material,
        asset.shell_material
      );
      pushField(
        technicalRows,
        "Fluid Type",
        cert.fluid_type,
        extracted.fluid_type,
        asset.fluid_type
      );
    } else {
      pushField(
        technicalRows,
        "Safe Working Load (SWL)",
        cert.swl,
        extracted.swl,
        extracted.safe_working_load,
        extracted.working_load_limit,
        asset.safe_working_load
      );
      pushField(technicalRows, "Proof Load", cert.proof_load, extracted.proof_load, asset.proof_load);
      pushField(
        technicalRows,
        "Lift Height",
        cert.lift_height,
        cert.lifting_height,
        extracted.lift_height,
        extracted.lifting_height,
        asset.lifting_height
      );
      pushField(
        technicalRows,
        "Sling Length",
        cert.sling_length,
        extracted.sling_length,
        asset.sling_length
      );
      pushField(technicalRows, "Chain Size", cert.chain_size, extracted.chain_size, asset.chain_size);
      pushField(
        technicalRows,
        "Rope Diameter",
        cert.rope_diameter,
        extracted.rope_diameter,
        asset.rope_diameter
      );
    }

    pushField(technicalRows, "Standard / Code", cert.standard_code, extracted.standard_code);

    const dateRows = [];
    pushField(
      dateRows,
      "Date of Inspection",
      dateLabel(cert.inspection_date || extracted.inspection_date)
    );
    pushField(
      dateRows,
      "Date of Issue",
      dateLabel(cert.issue_date || cert.issued_at || extracted.issue_date)
    );
    pushField(
      dateRows,
      "Expiry Date",
      dateLabel(cert.expiry_date || cert.valid_to || extracted.expiry_date)
    );
    pushField(
      dateRows,
      "Next Inspection Due",
      dateLabel(cert.next_inspection_due || extracted.next_inspection_due)
    );

    const noteBlocks = [
      {
        title: "Comments",
        value: pickBlock(cert.comments, extracted.comments),
        tone: "blue",
      },
      {
        title: "Defects Found",
        value: pickBlock(cert.defects_found, extracted.defects_found),
        tone: "red",
      },
      {
        title: "Recommendations",
        value: pickBlock(cert.recommendations, extracted.recommendations),
        tone: "amber",
      },
      {
        title: "Nameplate Data",
        value: pickBlock(cert.nameplate_data, extracted.nameplate_data, extracted.plate_text),
        tone: "green",
      },
      {
        title: "Raw Text Summary",
        value: pickBlock(cert.raw_text_summary, extracted.raw_text_summary),
        tone: "neutral",
      },
    ].filter((item) => item.value);

    const usedExtractedKeys = new Set([
      "certificate_number",
      "certificate_type",
      "equipment_type",
      "equipment_description",
      "result",
      "status",
      "inspection_body",
      "asset_tag",
      "serial_number",
      "identification_number",
      "inspection_number",
      "inspection_no",
      "lanyard_serial_no",
      "manufacturer",
      "model",
      "year_built",
      "country_of_origin",
      "location",
      "department",
      "capacity",
      "capacity_volume",
      "working_pressure",
      "mawp",
      "design_pressure",
      "test_pressure",
      "pressure_unit",
      "design_temperature",
      "material",
      "fluid_type",
      "swl",
      "safe_working_load",
      "working_load_limit",
      "proof_load",
      "lift_height",
      "lifting_height",
      "sling_length",
      "chain_size",
      "rope_diameter",
      "standard_code",
      "inspection_date",
      "issue_date",
      "expiry_date",
      "next_inspection_due",
      "comments",
      "defects_found",
      "recommendations",
      "nameplate_data",
      "raw_text_summary",
      "plate_text",
      "client_name",
      "legal_framework",
      "inspector_name",
    ]);

    const additionalRows = buildDynamicRows(extracted, usedExtractedKeys);

    const resultValue =
      pickInline(cert.result, cert.equipment_status, extracted.result, "UNKNOWN") || "UNKNOWN";
    const resultKey = String(resultValue).toUpperCase();
    const resultPalette =
      resultKey === "PASS"
        ? { color: "#065f46", bg: "#ecfdf5", border: "#86efac" }
        : resultKey === "FAIL"
          ? { color: "#991b1b", bg: "#fef2f2", border: "#fca5a5" }
          : { color: "#92400e", bg: "#fffbeb", border: "#fcd34d" };

    return {
      cert,
      asset,
      client,
      extracted,
      certTitle,
      certNumber,
      inspectorName,
      inspectorId,
      legalFramework,
      summaryRows,
      identificationRows,
      technicalRows,
      dateRows,
      noteBlocks,
      additionalRows,
      resultValue,
      resultPalette,
    };
  }, [cert]);

  if (loading) {
    return (
      <div style={{ padding: 40, fontFamily: "Arial, sans-serif", color: "#334155" }}>
        Loading certificate...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, color: "#dc2626", fontFamily: "Arial, sans-serif" }}>
        {error}
      </div>
    );
  }

  if (!model) {
    return (
      <div style={{ padding: 40, color: "#64748b", fontFamily: "Arial, sans-serif" }}>
        Certificate not found.
      </div>
    );
  }

  const {
    cert: certRecord,
    certTitle,
    certNumber,
    inspectorName,
    inspectorId,
    legalFramework,
    summaryRows,
    identificationRows,
    technicalRows,
    dateRows,
    noteBlocks,
    additionalRows,
    resultValue,
    resultPalette,
  } = model;

  return (
    <>
      <style>{`
        html, body {
          margin: 0;
          padding: 0;
          font-family: Arial, Helvetica, sans-serif;
          background: #e2e8f0;
        }

        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html, body {
            background: #ffffff;
          }

          .no-print {
            display: none !important;
          }

          .page {
            margin: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      <div
        className="no-print"
        style={{
          background: "#0f172a",
          color: "#cbd5e1",
          padding: "12px 22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 13 }}>Certificate Preview</div>
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            border: "none",
            borderRadius: 8,
            padding: "9px 18px",
            background: "linear-gradient(135deg,#2563eb,#0ea5e9)",
            color: "#ffffff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Print / Save PDF
        </button>
      </div>

      <div
        className="page"
        style={{
          width: "210mm",
          minHeight: "297mm",
          margin: "14px auto",
          background: "#ffffff",
          boxShadow: "0 10px 40px rgba(15,23,42,0.18)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ height: 6, background: "linear-gradient(90deg,#17365d,#2563eb,#06b6d4)" }} />

        <div
          style={{
            padding: "10mm 12mm 7mm",
            background: "linear-gradient(135deg,#17365d 0%,#1d4ed8 70%,#0ea5e9 100%)",
            color: "#ffffff",
            display: "grid",
            gridTemplateColumns: "1.3fr 0.7fr",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div>
            {cleanInlineValue(certRecord.logo_url) && (
              <img
                src={certRecord.logo_url}
                alt="Monroy logo"
                style={{ height: 42, objectFit: "contain", marginBottom: 6 }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <div
              style={{
                fontSize: 8.5,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#dbeafe",
                fontWeight: 700,
              }}
            >
              Quality Management System
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, marginTop: 4 }}>
              {certTitle}
            </div>
            <div
              style={{
                fontSize: 10,
                lineHeight: 1.45,
                color: "#dbeafe",
                marginTop: 6,
                maxWidth: 430,
              }}
            >
              This is to certify that the equipment described below has been inspected and
              tested in accordance with the applicable standards and regulations.
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.24)",
                borderRadius: 8,
                padding: "8px 10px",
              }}
            >
              <div
                style={{
                  fontSize: 8,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#dbeafe",
                  marginBottom: 3,
                  fontWeight: 700,
                }}
              >
                Certificate No.
              </div>
              <div style={{ fontSize: 12.2, fontWeight: 800 }}>{certNumber}</div>
            </div>

            <div
              style={{
                background: resultPalette.bg,
                color: resultPalette.color,
                border: `1px solid ${resultPalette.border}`,
                borderRadius: 8,
                padding: "8px 10px",
              }}
            >
              <div
                style={{
                  fontSize: 8,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 3,
                  fontWeight: 700,
                }}
              >
                Result
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 800 }}>{resultValue}</div>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "7mm 12mm 8mm",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Section title="Certificate Summary">
            <FieldGrid rows={summaryRows} columns={2} />
          </Section>

          {!!dateRows.length && (
            <Section title="Inspection & Validity Dates">
              <FieldGrid rows={dateRows} columns={4} />
            </Section>
          )}

          <Section title="Equipment Identification">
            <FieldGrid rows={identificationRows} columns={2} />
          </Section>

          {!!technicalRows.length && (
            <Section title="Technical Details">
              <FieldGrid rows={technicalRows} columns={2} />
            </Section>
          )}

          {!!additionalRows.length && (
            <Section title="Additional Extracted Information">
              <FieldGrid rows={additionalRows} columns={2} />
            </Section>
          )}

          {!!noteBlocks.length && (
            <Section title="Comments, Findings & Remarks">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {noteBlocks.map((item) => (
                  <NoteBlock
                    key={item.title}
                    title={item.title}
                    value={item.value}
                    tone={item.tone}
                  />
                ))}
              </div>
            </Section>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 0.8fr",
              gap: 10,
              marginTop: "auto",
              pageBreakInside: "avoid",
            }}
          >
            <div
              style={{
                border: "1px solid #dbe3ee",
                borderRadius: 10,
                padding: "9px 10px",
                background: "#f8fafc",
              }}
            >
              <div
                style={{
                  fontSize: 8.2,
                  fontWeight: 800,
                  color: "#64748b",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Legal Framework
              </div>
              <div style={{ fontSize: 9.6, lineHeight: 1.45, color: "#0f172a", marginBottom: 8 }}>
                {legalFramework}
              </div>
              <div style={{ fontSize: 8.8, lineHeight: 1.45, color: "#475569" }}>
                This certificate is valid only for the equipment and period described above.
              </div>
            </div>

            <div
              style={{
                border: "1px solid #dbe3ee",
                borderRadius: 10,
                padding: "9px 10px",
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  fontSize: 8.2,
                  fontWeight: 800,
                  color: "#64748b",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 5,
                }}
              >
                Inspector Authorization
              </div>

              {cleanInlineValue(certRecord.signature_url) && (
                <img
                  src={certRecord.signature_url}
                  alt="Inspector signature"
                  style={{ height: 28, objectFit: "contain", marginBottom: 4 }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}

              <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a" }}>
                {inspectorName}
              </div>
              <div style={{ fontSize: 9.2, color: "#475569", marginTop: 2 }}>ID: {inspectorId}</div>
              <div style={{ fontSize: 9.2, color: "#475569", marginTop: 2 }}>
                Contact: {CONTACT_DETAILS}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#0f172a",
            color: "#cbd5e1",
            padding: "5mm 12mm",
            fontSize: 8,
            lineHeight: 1.45,
          }}
        >
          MONROY QMS PLATFORM • Mobile Crane Hire • Rigging • NDT Test • Scaffolding • Painting •
          Inspection of Lifting Equipment and Machinery • Pressure Vessels & Air Receivers •
          Mechanical Engineering • Maintenance
        </div>
      </div>
    </>
  );
}
