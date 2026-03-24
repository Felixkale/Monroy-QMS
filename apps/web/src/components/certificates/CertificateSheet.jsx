// apps/web/src/components/certificates/CertificateSheet.jsx
"use client";

const C = {
  bg: "#0b1220",
  panel: "#111827",
  panel2: "#172033",
  border: "rgba(255,255,255,0.12)",
  text: "#f8fafc",
  textSoft: "#cbd5e1",
  textDim: "#94a3b8",
  cyan: "#22d3ee",
  green: "#22c55e",
  red: "#ef4444",
  amber: "#f59e0b",
  purple: "#8b5cf6",
};

function show(value, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s || fallback;
}

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return show(value);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function resultMeta(value) {
  const v = String(value || "").toUpperCase().replace(/\s+/g, "_");
  if (v === "PASS") return { label: "PASS", color: C.green, bg: "rgba(34,197,94,0.16)" };
  if (v === "FAIL") return { label: "FAIL", color: C.red, bg: "rgba(239,68,68,0.16)" };
  if (v === "REPAIR_REQUIRED") return { label: "REPAIR REQUIRED", color: C.amber, bg: "rgba(245,158,11,0.16)" };
  if (v === "OUT_OF_SERVICE") return { label: "OUT OF SERVICE", color: C.purple, bg: "rgba(139,92,246,0.16)" };
  return { label: "UNKNOWN", color: C.textSoft, bg: "rgba(148,163,184,0.14)" };
}

function gridTitle(label) {
  return {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: C.textDim,
    marginBottom: 6,
  };
}

function valueStyle() {
  return {
    fontSize: 14,
    lineHeight: 1.5,
    color: C.text,
    fontWeight: 600,
    wordBreak: "break-word",
  };
}

function Block({ label, value }) {
  return (
    <div>
      <div style={gridTitle(label)}>{label}</div>
      <div style={valueStyle()}>{show(value)}</div>
    </div>
  );
}

export default function CertificateSheet({
  certificate,
  index = 0,
  total = 1,
  printMode = false,
}) {
  const extracted = certificate?.extracted_data || {};
  const result = resultMeta(
    certificate?.result ||
      certificate?.equipment_status ||
      extracted?.result ||
      extracted?.equipment_status
  );

  const company =
    certificate?.company ||
    certificate?.client_name ||
    extracted?.company ||
    extracted?.client_name;

  const certificateNumber =
    certificate?.certificate_number || extracted?.certificate_number;

  const inspectionNumber =
    certificate?.inspection_number ||
    certificate?.inspection_no ||
    extracted?.inspection_number ||
    extracted?.inspection_no;

  const equipmentDescription =
    certificate?.equipment_description ||
    extracted?.equipment_description ||
    certificate?.asset_name;

  const equipmentType =
    certificate?.equipment_type ||
    certificate?.asset_type ||
    extracted?.equipment_type ||
    certificate?.certificate_type;

  const issueDate =
    certificate?.issue_date ||
    certificate?.issued_at ||
    extracted?.issue_date ||
    extracted?.issued_at;

  const expiryDate =
    certificate?.expiry_date ||
    certificate?.valid_to ||
    extracted?.expiry_date ||
    extracted?.valid_to;

  const sheetStyle = {
    background: printMode ? "#ffffff" : C.bg,
    color: printMode ? "#111827" : C.text,
    border: printMode ? "1px solid #d1d5db" : `1px solid ${C.border}`,
    borderRadius: printMode ? 0 : 20,
    boxShadow: printMode ? "none" : "0 20px 50px rgba(0,0,0,0.30)",
    overflow: "hidden",
  };

  const cardStyle = {
    background: printMode ? "#ffffff" : C.panel,
    border: printMode ? "1px solid #e5e7eb" : `1px solid ${C.border}`,
    borderRadius: 14,
    padding: 16,
  };

  return (
    <div style={sheetStyle}>
      <div
        style={{
          padding: 24,
          borderBottom: printMode ? "1px solid #e5e7eb" : `1px solid ${C.border}`,
          background: printMode
            ? "#f8fafc"
            : "linear-gradient(135deg, rgba(34,211,238,0.12), rgba(99,102,241,0.10))",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: printMode ? "#475569" : C.cyan,
                marginBottom: 8,
              }}
            >
              Monroy Pty Ltd
            </div>

            <div
              style={{
                fontSize: 30,
                fontWeight: 900,
                lineHeight: 1.1,
                marginBottom: 8,
              }}
            >
              Certificate of Compliance
            </div>

            <div
              style={{
                fontSize: 14,
                color: printMode ? "#475569" : C.textSoft,
                fontWeight: 600,
              }}
            >
              Page {index + 1} of {total}
            </div>
          </div>

          <div
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              background: result.bg,
              color: result.color,
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              border: printMode ? `1px solid ${result.color}` : "none",
            }}
          >
            {result.label}
          </div>
        </div>
      </div>

      <div style={{ padding: 24, display: "grid", gap: 18 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <div style={cardStyle}>
            <Block label="Certificate Number" value={certificateNumber} />
          </div>
          <div style={cardStyle}>
            <Block label="Inspection Number" value={inspectionNumber} />
          </div>
          <div style={cardStyle}>
            <Block label="Issue Date" value={fmtDate(issueDate)} />
          </div>
          <div style={cardStyle}>
            <Block label="Expiry Date" value={fmtDate(expiryDate)} />
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ ...gridTitle("Client"), marginBottom: 10 }}>Client</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{show(company)}</div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <div style={cardStyle}>
            <Block label="Equipment Description" value={equipmentDescription} />
          </div>
          <div style={cardStyle}>
            <Block label="Equipment Type" value={equipmentType} />
          </div>
          <div style={cardStyle}>
            <Block
              label="Equipment ID"
              value={
                certificate?.equipment_id ||
                extracted?.equipment_id ||
                certificate?.serial_number
              }
            />
          </div>
          <div style={cardStyle}>
            <Block
              label="Identification Number"
              value={
                certificate?.identification_number ||
                extracted?.identification_number
              }
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <div style={cardStyle}>
            <Block label="Equipment Location" value={certificate?.equipment_location || extracted?.equipment_location} />
          </div>
          <div style={cardStyle}>
            <Block label="SWL" value={certificate?.swl || extracted?.swl} />
          </div>
          <div style={cardStyle}>
            <Block label="MAWP" value={certificate?.mawp || extracted?.mawp || certificate?.working_pressure} />
          </div>
          <div style={cardStyle}>
            <Block label="Design Pressure" value={certificate?.design_pressure || extracted?.design_pressure} />
          </div>
          <div style={cardStyle}>
            <Block label="Test Pressure" value={certificate?.test_pressure || extracted?.test_pressure} />
          </div>
          <div style={cardStyle}>
            <Block label="Capacity" value={certificate?.capacity || extracted?.capacity} />
          </div>
          <div style={cardStyle}>
            <Block label="Manufacturer" value={certificate?.manufacturer || extracted?.manufacturer} />
          </div>
          <div style={cardStyle}>
            <Block label="Model" value={certificate?.model || extracted?.model} />
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ ...gridTitle("Legal Framework"), marginBottom: 10 }}>
            Legal Framework
          </div>
          <div style={{ ...valueStyle(), fontSize: 15 }}>
            {show(
              certificate?.legal_framework ||
                extracted?.legal_framework ||
                "Mines, Quarries, Works and Machinery Act Cap 44:02"
            )}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <div style={cardStyle}>
            <Block label="Inspector Name" value={certificate?.inspector_name || extracted?.inspector_name} />
          </div>
          <div style={cardStyle}>
            <Block label="Inspector ID" value={certificate?.inspector_id || extracted?.inspector_id} />
          </div>
          <div style={cardStyle}>
            <Block label="Linked Folder" value={certificate?.folder_name} />
          </div>
          <div style={cardStyle}>
            <Block label="Folder Position" value={certificate?.folder_position} />
          </div>
        </div>
      </div>
    </div>
  );
}
