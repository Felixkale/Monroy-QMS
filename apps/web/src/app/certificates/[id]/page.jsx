"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const cardStyle = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 24,
  marginBottom: 20,
};

const sectionTitleStyle = {
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
  margin: "0 0 18px 0",
};

const labelStyle = {
  fontSize: 10,
  fontWeight: 800,
  color: "rgba(255,255,255,0.45)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 4,
};

const valueStyle = {
  fontSize: 13,
  color: "#e2e8f0",
  fontWeight: 500,
  wordBreak: "break-word",
};

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function val(v) {
  if (v === undefined || v === null) return "";
  const s = String(v).trim();
  return s;
}

function StatusBadge({ value }) {
  const status = String(value || "").toUpperCase();
  const color =
    status === "PASS"
      ? "#16a34a"
      : status === "FAIL"
      ? "#dc2626"
      : status === "CONDITIONAL"
      ? "#d97706"
      : "#64748b";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 12px",
        borderRadius: 999,
        border: `1px solid ${color}`,
        background: `${color}15`,
        color,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.06em",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
        }}
      />
      {status || "N/A"}
    </span>
  );
}

function InfoGrid({ items }) {
  const filtered = items.filter((item) => val(item.value));
  if (!filtered.length) {
    return <div style={{ color: "#64748b", fontSize: 13 }}>No data available.</div>;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
        gap: 16,
      }}
    >
      {filtered.map((item) => (
        <div key={item.label}>
          <div style={labelStyle}>{item.label}</div>
          <div style={valueStyle}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function CertificateViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cert, setCert] = useState(null);

  useEffect(() => {
    async function loadCertificate() {
      if (!id) return;

      try {
        setLoading(true);
        setError("");

        const { data, error: err } = await supabase
          .from("certificates")
          .select(`
            *,
            assets (
              id,
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
              country_of_origin,
              capacity_volume,
              location,
              department,
              design_standard,
              fluid_type,
              design_pressure,
              working_pressure,
              test_pressure,
              design_temperature,
              safe_working_load,
              proof_load,
              lifting_height,
              sling_length,
              chain_size,
              rope_diameter,
              inspector_name,
              inspector_id,
              next_inspection_date,
              clients (
                company_name,
                company_code
              )
            )
          `)
          .eq("id", id)
          .single();

        if (err || !data) {
          throw new Error(err?.message || "Certificate not found.");
        }

        setCert(data);
      } catch (err) {
        setError(err?.message || "Failed to load certificate.");
      } finally {
        setLoading(false);
      }
    }

    loadCertificate();
  }, [id]);

  const asset = cert?.assets || {};
  const client = asset?.clients || {};

  const certificateData = useMemo(() => {
    if (!cert) return null;

    return {
      certificate_number: val(cert.certificate_number),
      certificate_type: val(cert.certificate_type),
      company: val(cert.company) || val(client.company_name),
      equipment_description: val(cert.equipment_description) || val(asset.asset_type) || val(asset.asset_name),
      equipment_location: val(cert.equipment_location) || val(asset.location),
      equipment_id: val(cert.equipment_id) || val(asset.equipment_id) || val(asset.serial_number) || val(asset.asset_tag),
      identification_number: val(cert.identification_number) || val(asset.identification_number),
      inspection_no: val(cert.inspection_no) || val(asset.inspection_no),
      lanyard_serial_no: val(cert.lanyard_serial_no) || val(asset.lanyard_serial_no),
      swl: val(cert.swl) || val(asset.safe_working_load),
      mawp: val(cert.mawp) || val(asset.working_pressure),
      design_pressure: val(cert.design_pressure) || val(asset.design_pressure),
      test_pressure: val(cert.test_pressure) || val(asset.test_pressure),
      capacity: val(cert.capacity) || val(asset.capacity_volume),
      year_built: val(cert.year_built) || val(asset.year_built),
      manufacturer: val(cert.manufacturer) || val(asset.manufacturer),
      model: val(cert.model) || val(asset.model),
      country_of_origin: val(cert.country_of_origin) || val(asset.country_of_origin),
      equipment_status: val(cert.equipment_status),
      issued_at: formatDate(cert.issued_at),
      valid_to: formatDate(cert.valid_to),
      status: val(cert.status),
      legal_framework: val(cert.legal_framework) || val(asset.design_standard),
      inspector_name: val(cert.inspector_name) || val(asset.inspector_name),
      inspector_id: val(cert.inspector_id) || val(asset.inspector_id),
      signature_url: val(cert.signature_url),
      logo_url: val(cert.logo_url),
      pdf_url: val(cert.pdf_url),
      asset_tag: val(asset.asset_tag),
      asset_type: val(asset.asset_type),
      department: val(asset.department),
      fluid_type: val(asset.fluid_type),
      design_temperature: val(asset.design_temperature),
      proof_load: val(asset.proof_load),
      lifting_height: val(asset.lifting_height),
      sling_length: val(asset.sling_length),
      chain_size: val(asset.chain_size),
      rope_diameter: val(asset.rope_diameter),
      company_code: val(client.company_code),
    };
  }, [cert, asset, client]);

  if (loading) {
    return (
      <AppLayout title="Certificate">
        <div style={{ color: "#64748b", padding: 40, textAlign: "center", fontSize: 14 }}>
          Loading certificate…
        </div>
      </AppLayout>
    );
  }

  if (error || !certificateData) {
    return (
      <AppLayout title="Certificate">
        <div style={{ maxWidth: 960 }}>
          <button
            onClick={() => router.push("/certificates")}
            style={{
              marginBottom: 20,
              padding: "9px 18px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ← Back to Certificates
          </button>

          <div
            style={{
              background: "rgba(244,114,182,0.1)",
              border: "1px solid rgba(244,114,182,0.3)",
              borderRadius: 12,
              padding: "12px 16px",
              color: "#f472b6",
              fontSize: 13,
            }}
          >
            ⚠️ {error || "Certificate not found."}
          </div>
        </div>
      </AppLayout>
    );
  }

  const isPressure = ["pressure vessel", "boiler", "air receiver", "air compressor", "oil separator"].includes(
    String(certificateData.equipment_description || certificateData.asset_type || "").toLowerCase()
  );

  return (
    <AppLayout title="Certificate">
      <div style={{ maxWidth: 1000 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => router.push("/certificates")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 8,
                cursor: "pointer",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#94a3b8",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              ← Certificates
            </button>
            <span style={{ color: "#334155" }}>›</span>
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>View</span>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => router.push(`/certificates/edit/${id}`)}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.1)",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              ✏️ Edit Certificate
            </button>

            <button
              onClick={() => window.open(`/certificates/print/${id}`, "_blank")}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                background: "linear-gradient(135deg,#00f5c4,#4fc3f7)",
                color: "#0d1117",
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              🖨 Print Certificate
            </button>
          </div>
        </div>

        <h1 style={{ color: "#fff", margin: "0 0 4px" }}>Certificate Details</h1>
        <div
          style={{
            width: 60,
            height: 3,
            borderRadius: 999,
            background: "linear-gradient(90deg,#667eea,#764ba2,#4fc3f7)",
            marginBottom: 28,
          }}
        />

        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 20,
            }}
          >
            <div>
              <div style={labelStyle}>Certificate Number</div>
              <div style={{ ...valueStyle, fontSize: 18, fontWeight: 800 }}>
                {certificateData.certificate_number || "Auto Generated"}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>
                {certificateData.certificate_type || "Certificate"}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={labelStyle}>Equipment Status</div>
              <StatusBadge value={certificateData.equipment_status} />
            </div>
          </div>

          <InfoGrid
            items={[
              { label: "Client / Company", value: certificateData.company },
              { label: "Company Code", value: certificateData.company_code },
              { label: "Issued At", value: certificateData.issued_at },
              { label: "Expiry Date", value: certificateData.valid_to },
              { label: "Record Status", value: certificateData.status },
              { label: "Legal Framework", value: certificateData.legal_framework },
            ]}
          />
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Equipment Details</h3>
          <InfoGrid
            items={[
              { label: "Asset Tag", value: certificateData.asset_tag },
              { label: "Equipment Description", value: certificateData.equipment_description },
              { label: "Asset Type", value: certificateData.asset_type },
              { label: "Equipment Location", value: certificateData.equipment_location },
              { label: "Department", value: certificateData.department },
              { label: "Equipment ID / Serial", value: certificateData.equipment_id },
              { label: "Identification Number", value: certificateData.identification_number },
              { label: "Inspection No.", value: certificateData.inspection_no },
              { label: "Lanyard Serial No.", value: certificateData.lanyard_serial_no },
              { label: "Manufacturer", value: certificateData.manufacturer },
              { label: "Model", value: certificateData.model },
              { label: "Year Built", value: certificateData.year_built },
              { label: "Country of Origin", value: certificateData.country_of_origin },
              { label: "Capacity / Volume", value: certificateData.capacity },
            ]}
          />
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Technical Parameters</h3>
          <InfoGrid
            items={
              isPressure
                ? [
                    { label: "MAWP / Working Pressure", value: certificateData.mawp },
                    { label: "Design Pressure", value: certificateData.design_pressure },
                    { label: "Test Pressure", value: certificateData.test_pressure },
                    { label: "Design Temperature", value: certificateData.design_temperature },
                    { label: "Fluid Type", value: certificateData.fluid_type },
                  ]
                : [
                    { label: "SWL", value: certificateData.swl },
                    { label: "Proof Load", value: certificateData.proof_load },
                    { label: "Lifting Height", value: certificateData.lifting_height },
                    { label: "Sling Length", value: certificateData.sling_length },
                    { label: "Chain Size", value: certificateData.chain_size },
                    { label: "Rope Diameter", value: certificateData.rope_diameter },
                  ]
            }
          />
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Inspector Details</h3>
          <InfoGrid
            items={[
              { label: "Inspector Name", value: certificateData.inspector_name },
              { label: "Inspector ID", value: certificateData.inspector_id },
              { label: "Logo URL", value: certificateData.logo_url },
              { label: "PDF URL", value: certificateData.pdf_url },
            ]}
          />

          <div style={{ marginTop: 20 }}>
            <div style={labelStyle}>Signature Preview</div>
            <div
              style={{
                background: "#fff",
                borderRadius: 10,
                minHeight: 110,
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
              }}
            >
              {certificateData.signature_url ? (
                <img
                  src={certificateData.signature_url}
                  alt="Signature"
                  style={{ maxHeight: 80, maxWidth: "100%", objectFit: "contain" }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <span style={{ color: "#94a3b8", fontSize: 13 }}>No signature uploaded</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
