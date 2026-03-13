"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(102,126,234,0.25)",
  borderRadius: 8,
  color: "#e2e8f0",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: "rgba(255,255,255,0.6)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 6,
  display: "block",
};

const sectionHeadStyle = {
  fontSize: 11,
  fontWeight: 800,
  color: "#667eea",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  borderBottom: "1px solid rgba(102,126,234,0.2)",
  paddingBottom: 8,
  marginBottom: 20,
  marginTop: 28,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
  gap: 16,
  marginBottom: 16,
};

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select
        name={name}
        value={value ?? ""}
        onChange={onChange}
        style={{
          ...inputStyle,
          background: "#111827",
          color: "#e5e7eb",
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function normalizeText(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value).replace(/\s+/g, " ").trim() || fallback;
}

function sanitizeText(val, maxLen = 200) {
  if (val === undefined || val === null) return "";
  return String(val)
    .replace(/<[^>]*>/g, "")
    .replace(/[^\x20-\x7E\u00C0-\u024F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function formatDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function normalizeDateForDb(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function detectEquipmentType(assetType = "") {
  const t = String(assetType).toLowerCase();
  return ["pressure vessel", "boiler", "air receiver", "air compressor", "oil separator"].includes(t)
    ? "pv"
    : "lift";
}

function defaultCertificateType(assetType = "") {
  return detectEquipmentType(assetType) === "pv"
    ? "Pressure Test Certificate"
    : "Load Test Certificate";
}

const LANYARD_TYPES = ["Safety Harness", "Fall Arrest"];

export default function EditCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    asset_id: "",
    certificate_type: "",
    company: "",
    equipment_description: "",
    equipment_location: "",
    equipment_id: "",
    identification_number: "",
    inspection_no: "",
    lanyard_serial_no: "",
    swl: "",
    mawp: "",
    design_pressure: "",
    test_pressure: "",
    capacity: "",
    year_built: "",
    manufacturer: "",
    model: "",
    country_of_origin: "",
    equipment_status: "PASS",
    issued_at: "",
    valid_to: "",
    status: "issued",
    legal_framework: "Mines, Quarries, Works and Machinery Act Cap 44:02",
    inspector_name: "",
    inspector_id: "",
    signature_url: "",
    logo_url: "/logo.png",
    pdf_url: "",
  });

  useEffect(() => {
    supabase
      .from("assets")
      .select(`
        id,
        asset_name,
        asset_tag,
        asset_type,
        location,
        serial_number,
        equipment_id,
        identification_number,
        inspection_no,
        lanyard_serial_no,
        safe_working_load,
        working_pressure,
        design_pressure,
        test_pressure,
        next_inspection_date,
        design_standard,
        year_built,
        capacity_volume,
        manufacturer,
        model,
        country_of_origin,
        inspector_name,
        inspector_id,
        clients ( company_name )
      `)
      .order("created_at", { ascending: false })
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message || "Failed to load assets.");
          return;
        }
        setAssets(data || []);
      });
  }, []);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError("");

    supabase
      .from("certificates")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError(err?.message || "Certificate not found.");
          return;
        }

        setForm({
          asset_id: data.asset_id || "",
          certificate_type: data.certificate_type || "",
          company: data.company || "",
          equipment_description: data.equipment_description || "",
          equipment_location: data.equipment_location || "",
          equipment_id: data.equipment_id || "",
          identification_number: data.identification_number || "",
          inspection_no: data.inspection_no || "",
          lanyard_serial_no: data.lanyard_serial_no || "",
          swl: data.swl || "",
          mawp: data.mawp || "",
          design_pressure: data.design_pressure || "",
          test_pressure: data.test_pressure || "",
          capacity: data.capacity || "",
          year_built: data.year_built || "",
          manufacturer: data.manufacturer || "",
          model: data.model || "",
          country_of_origin: data.country_of_origin || "",
          equipment_status: data.equipment_status || "PASS",
          issued_at: formatDateInput(data.issued_at),
          valid_to: formatDateInput(data.valid_to),
          status: data.status || "issued",
          legal_framework:
            data.legal_framework ||
            "Mines, Quarries, Works and Machinery Act Cap 44:02",
          inspector_name: data.inspector_name || "",
          inspector_id: data.inspector_id || "",
          signature_url: data.signature_url || "",
          logo_url: data.logo_url || "/logo.png",
          pdf_url: data.pdf_url || "",
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const selectedAsset = useMemo(
    () => assets.find((a) => a.id === form.asset_id) || null,
    [assets, form.asset_id]
  );

  const showLanyard = LANYARD_TYPES.includes(
    selectedAsset?.asset_type || form.equipment_description || ""
  );

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleUseEquipmentData() {
    if (!selectedAsset) return;

    const type = detectEquipmentType(selectedAsset.asset_type);

    setForm((prev) => ({
      ...prev,
      certificate_type:
        prev.certificate_type || defaultCertificateType(selectedAsset.asset_type),
      company: selectedAsset.clients?.company_name || prev.company,
      equipment_description:
        selectedAsset.asset_type || selectedAsset.asset_name || prev.equipment_description,
      equipment_location: selectedAsset.location || prev.equipment_location,
      equipment_id:
        selectedAsset.equipment_id ||
        selectedAsset.serial_number ||
        selectedAsset.asset_tag ||
        prev.equipment_id,
      identification_number:
        selectedAsset.identification_number || prev.identification_number,
      inspection_no: selectedAsset.inspection_no || prev.inspection_no,
      lanyard_serial_no:
        selectedAsset.lanyard_serial_no || prev.lanyard_serial_no,
      swl: type === "lift" ? selectedAsset.safe_working_load || prev.swl : prev.swl,
      mawp: type === "pv" ? selectedAsset.working_pressure || prev.mawp : prev.mawp,
      design_pressure: selectedAsset.design_pressure || prev.design_pressure,
      test_pressure: selectedAsset.test_pressure || prev.test_pressure,
      capacity: selectedAsset.capacity_volume || prev.capacity,
      year_built: selectedAsset.year_built || prev.year_built,
      manufacturer: selectedAsset.manufacturer || prev.manufacturer,
      model: selectedAsset.model || prev.model,
      country_of_origin:
        selectedAsset.country_of_origin || prev.country_of_origin,
      inspector_name: selectedAsset.inspector_name || prev.inspector_name,
      inspector_id: selectedAsset.inspector_id || prev.inspector_id,
      valid_to: prev.valid_to || formatDateInput(selectedAsset.next_inspection_date),
      legal_framework:
        prev.legal_framework || selectedAsset.design_standard || "",
    }));
  }

  async function handleSignatureUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSignature(true);
    setError("");
    setSuccess("");

    try {
      const ext = file.name.split(".").pop() || "png";
      const filePath = `certificate-signatures/sig-${id}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { upsert: true });

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      let finalUrl = urlData?.publicUrl || null;

      if (!finalUrl) {
        const { data: signed, error: sErr } = await supabase.storage
          .from("documents")
          .createSignedUrl(filePath, 3600);

        if (sErr) throw sErr;
        finalUrl = signed?.signedUrl;
      }

      if (!finalUrl) throw new Error("Could not generate signature URL.");

      setForm((prev) => ({ ...prev, signature_url: finalUrl }));
      setSuccess("Signature uploaded successfully.");
    } catch (err) {
      setError(err?.message || "Failed to upload signature.");
    } finally {
      setUploadingSignature(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!form.company || form.company.trim().length < 2) {
        throw new Error("Company name is required.");
      }

      if (!form.equipment_description || form.equipment_description.trim().length < 2) {
        throw new Error("Equipment description is required.");
      }

      if (!form.equipment_id || form.equipment_id.trim().length < 1) {
        throw new Error("Equipment ID / serial number is required.");
      }

      if (form.issued_at && form.valid_to) {
        const issue = new Date(form.issued_at);
        const expiry = new Date(form.valid_to);
        if (!Number.isNaN(issue.getTime()) && !Number.isNaN(expiry.getTime())) {
          if (expiry <= issue) {
            throw new Error("Expiry date must be after issue date.");
          }
        }
      }

      const payload = {
        asset_id: form.asset_id || null,
        certificate_type: sanitizeText(form.certificate_type, 100) || null,
        company: sanitizeText(form.company, 100),
        equipment_description: sanitizeText(form.equipment_description, 150),
        equipment_location: sanitizeText(form.equipment_location, 150) || null,
        equipment_id: sanitizeText(form.equipment_id, 80),
        identification_number: sanitizeText(form.identification_number, 80) || null,
        inspection_no: sanitizeText(form.inspection_no, 80) || null,
        lanyard_serial_no: sanitizeText(form.lanyard_serial_no, 80) || null,
        swl: sanitizeText(form.swl, 50) || null,
        mawp: sanitizeText(form.mawp, 50) || null,
        design_pressure: sanitizeText(form.design_pressure, 50) || null,
        test_pressure: sanitizeText(form.test_pressure, 50) || null,
        capacity: sanitizeText(form.capacity, 50) || null,
        year_built: sanitizeText(form.year_built, 20) || null,
        manufacturer: sanitizeText(form.manufacturer, 100) || null,
        model: sanitizeText(form.model, 100) || null,
        country_of_origin: sanitizeText(form.country_of_origin, 80) || null,
        equipment_status: normalizeText(form.equipment_status, "PASS"),
        issued_at: normalizeDateForDb(form.issued_at),
        valid_to: form.valid_to || null,
        status: normalizeText(form.status, "issued"),
        legal_framework: sanitizeText(form.legal_framework, 200) || null,
        inspector_name: sanitizeText(form.inspector_name, 100) || null,
        inspector_id: sanitizeText(form.inspector_id, 80) || null,
        signature_url: sanitizeText(form.signature_url, 500) || null,
        logo_url: sanitizeText(form.logo_url, 500) || null,
        pdf_url: sanitizeText(form.pdf_url, 500) || null,
      };

      const { error: err } = await supabase
        .from("certificates")
        .update(payload)
        .eq("id", id);

      if (err) throw err;

      if (form.asset_id) {
        const assetUpdate = {
          location: sanitizeText(form.equipment_location, 150) || null,
          equipment_id: sanitizeText(form.equipment_id, 80) || null,
          identification_number: sanitizeText(form.identification_number, 80) || null,
          inspection_no: sanitizeText(form.inspection_no, 80) || null,
          lanyard_serial_no: sanitizeText(form.lanyard_serial_no, 80) || null,
          safe_working_load: sanitizeText(form.swl, 50) || null,
          working_pressure: sanitizeText(form.mawp, 50) || null,
          design_pressure: sanitizeText(form.design_pressure, 50) || null,
          test_pressure: sanitizeText(form.test_pressure, 50) || null,
          next_inspection_date: form.valid_to || null,
          year_built: sanitizeText(form.year_built, 20) || null,
          capacity_volume: sanitizeText(form.capacity, 50) || null,
          manufacturer: sanitizeText(form.manufacturer, 100) || null,
          model: sanitizeText(form.model, 100) || null,
          country_of_origin: sanitizeText(form.country_of_origin, 80) || null,
          inspector_name: sanitizeText(form.inspector_name, 100) || null,
          inspector_id: sanitizeText(form.inspector_id, 80) || null,
          cert_type: sanitizeText(form.certificate_type, 100) || null,
          design_standard: sanitizeText(form.legal_framework, 200) || null,
        };

        await supabase.from("assets").update(assetUpdate).eq("id", form.asset_id);
      }

      setSuccess("Certificate saved successfully!");
      setTimeout(() => router.push(`/certificates/${id}`), 1200);
    } catch (err) {
      setError(err?.message || "Failed to update certificate.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Edit Certificate">
        <div
          style={{
            color: "#64748b",
            padding: 40,
            textAlign: "center",
            fontSize: 14,
          }}
        >
          Loading certificate…
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Edit Certificate">
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

            <button
              onClick={() => router.push(`/certificates/${id}`)}
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
              View Certificate
            </button>

            <span style={{ color: "#334155" }}>›</span>
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Edit</span>
          </div>

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

        <h1 style={{ color: "#fff", margin: "0 0 4px" }}>Edit Certificate</h1>
        <div
          style={{
            width: 60,
            height: 3,
            borderRadius: 999,
            background: "linear-gradient(90deg,#667eea,#764ba2,#4fc3f7)",
            marginBottom: 28,
          }}
        />

        {error && (
          <div
            style={{
              background: "rgba(244,114,182,0.1)",
              border: "1px solid rgba(244,114,182,0.3)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              color: "#f472b6",
              fontSize: 13,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div
            style={{
              background: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.35)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              color: "#86efac",
              fontSize: 13,
            }}
          >
            ✅ {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={sectionHeadStyle}>Link to Equipment</div>
          <div style={{ ...gridStyle, gridTemplateColumns: "1fr auto" }}>
            <div>
              <label style={labelStyle}>Select Equipment (Asset)</label>
              <select
                name="asset_id"
                value={form.asset_id}
                onChange={handleChange}
                style={{
                  ...inputStyle,
                  background: "#111827",
                  color: "#e5e7eb",
                  cursor: "pointer",
                }}
              >
                <option value="">— Select equipment —</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.asset_tag} — {a.asset_name}{" "}
                    {a.serial_number ? `(S/N: ${a.serial_number})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                type="button"
                onClick={handleUseEquipmentData}
                disabled={!selectedAsset}
                style={{
                  padding: "11px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: selectedAsset
                    ? "linear-gradient(135deg,#667eea,#764ba2)"
                    : "rgba(255,255,255,0.08)",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: selectedAsset ? "pointer" : "not-allowed",
                  whiteSpace: "nowrap",
                }}
              >
                Auto-fill from Equipment
              </button>
            </div>
          </div>

          <div style={sectionHeadStyle}>Certificate Info</div>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>Certificate Type</label>
              <select
                name="certificate_type"
                value={form.certificate_type}
                onChange={handleChange}
                style={{
                  ...inputStyle,
                  background: "#111827",
                  color: "#e5e7eb",
                  cursor: "pointer",
                }}
              >
                <option value="">— Select type —</option>
                <option value="Load Test Certificate">Load Test Certificate</option>
                <option value="Pressure Test Certificate">Pressure Test Certificate</option>
                <option value="Certificate of Statutory Inspection">
                  Certificate of Statutory Inspection
                </option>
                <option value="Inspection Certificate">Inspection Certificate</option>
                <option value="Compliance Certificate">Compliance Certificate</option>
              </select>
            </div>

            <Field
              label="Issue Date"
              name="issued_at"
              type="date"
              value={form.issued_at}
              onChange={handleChange}
            />

            <Field
              label="Expiry Date"
              name="valid_to"
              type="date"
              value={form.valid_to}
              onChange={handleChange}
            />

            <SelectField
              label="Equipment Status"
              name="equipment_status"
              value={form.equipment_status}
              onChange={handleChange}
              options={["PASS", "FAIL", "CONDITIONAL"].map((v) => ({
                value: v,
                label: v,
              }))}
            />

            <SelectField
              label="Record Status"
              name="status"
              value={form.status}
              onChange={handleChange}
              options={["issued", "draft", "expired", "revoked"].map((v) => ({
                value: v,
                label: v,
              }))}
            />
          </div>

          <div style={sectionHeadStyle}>Certificate Data</div>
          <div style={gridStyle}>
            <Field
              label="Client / Company"
              name="company"
              value={form.company}
              onChange={handleChange}
            />

            <Field
              label="Equipment Description"
              name="equipment_description"
              value={form.equipment_description}
              onChange={handleChange}
            />

            <Field
              label="Equipment Location"
              name="equipment_location"
              value={form.equipment_location}
              onChange={handleChange}
            />

            <Field
              label="Equipment ID / Serial"
              name="equipment_id"
              value={form.equipment_id}
              onChange={handleChange}
            />

            <Field
              label="Identification Number"
              name="identification_number"
              value={form.identification_number}
              onChange={handleChange}
            />

            <Field
              label="Inspection No."
              name="inspection_no"
              value={form.inspection_no}
              onChange={handleChange}
            />

            {showLanyard && (
              <div>
                <label style={{ ...labelStyle, color: "#00f5c4" }}>
                  Lanyard Serial No.
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 9,
                      color: "#00f5c4",
                      background: "rgba(0,245,196,0.1)",
                      border: "1px solid rgba(0,245,196,0.3)",
                      borderRadius: 4,
                      padding: "1px 5px",
                      fontWeight: 700,
                    }}
                  >
                    on certificate
                  </span>
                </label>
                <input
                  name="lanyard_serial_no"
                  value={form.lanyard_serial_no}
                  onChange={handleChange}
                  placeholder="e.g. 0135"
                  style={{ ...inputStyle, borderColor: "rgba(0,245,196,0.35)" }}
                />
              </div>
            )}

            <Field
              label="SWL"
              name="swl"
              value={form.swl}
              onChange={handleChange}
              placeholder="e.g. STANDARD or 2.5 Tons"
            />

            <Field
              label="MAWP"
              name="mawp"
              value={form.mawp}
              onChange={handleChange}
              placeholder="e.g. 1600 kPa"
            />

            <Field
              label="Design Pressure"
              name="design_pressure"
              value={form.design_pressure}
              onChange={handleChange}
              placeholder="e.g. 1300 kPa"
            />

            <Field
              label="Test Pressure"
              name="test_pressure"
              value={form.test_pressure}
              onChange={handleChange}
              placeholder="e.g. 1950 kPa"
            />

            <Field
              label="Capacity"
              name="capacity"
              value={form.capacity}
              onChange={handleChange}
              placeholder="e.g. 200 L or 3.29 m³"
            />

            <Field
              label="Year Built"
              name="year_built"
              value={form.year_built}
              onChange={handleChange}
              placeholder="e.g. 2025"
            />

            <Field
              label="Manufacturer"
              name="manufacturer"
              value={form.manufacturer}
              onChange={handleChange}
              placeholder="e.g. VOLA South Africa"
            />

            <Field
              label="Model"
              name="model"
              value={form.model}
              onChange={handleChange}
              placeholder="e.g. TP2 Ø40"
            />

            <Field
              label="Country of Origin"
              name="country_of_origin"
              value={form.country_of_origin}
              onChange={handleChange}
              placeholder="e.g. South Africa"
            />

            <Field
              label="Legal Framework / Design Standard"
              name="legal_framework"
              value={form.legal_framework}
              onChange={handleChange}
            />

            <Field
              label="Inspector Name"
              name="inspector_name"
              value={form.inspector_name}
              onChange={handleChange}
            />

            <Field
              label="Inspector ID No."
              name="inspector_id"
              value={form.inspector_id}
              onChange={handleChange}
            />

            <Field
              label="Logo URL"
              name="logo_url"
              value={form.logo_url}
              onChange={handleChange}
            />

            <Field
              label="PDF URL"
              name="pdf_url"
              value={form.pdf_url}
              onChange={handleChange}
            />
          </div>

          <div style={sectionHeadStyle}>Signature Upload</div>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>Upload Signature Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleSignatureUpload}
                style={{ ...inputStyle, padding: 10 }}
              />
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 6 }}>
                {uploadingSignature
                  ? "⏳ Uploading…"
                  : "PNG / JPG / SVG, clear background recommended"}
              </p>
            </div>

            <div>
              <label style={labelStyle}>Signature URL</label>
              <input
                name="signature_url"
                value={form.signature_url}
                onChange={handleChange}
                placeholder="Auto-filled after upload"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Signature Preview</label>
              <div
                style={{
                  background: "#fff",
                  borderRadius: 8,
                  padding: 12,
                  minHeight: 90,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #e2e8f0",
                }}
              >
                {form.signature_url ? (
                  <>
                    <img
                      key={form.signature_url}
                      src={form.signature_url}
                      alt="Signature"
                      style={{ maxHeight: 80, maxWidth: "100%", objectFit: "contain" }}
                      onError={(e) => {
                        e.target.style.display = "none";
                        if (e.target.nextSibling) e.target.nextSibling.style.display = "block";
                      }}
                    />
                    <span style={{ color: "#9ca3af", fontSize: 12, display: "none" }}>
                      ⚠️ Image failed to load, check bucket permissions
                    </span>
                  </>
                ) : (
                  <span style={{ color: "#9ca3af", fontSize: 12 }}>
                    No signature uploaded
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 32,
              marginBottom: 40,
              flexWrap: "wrap",
            }}
          >
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "12px 32px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg,#667eea,#764ba2)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: saving ? "wait" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={() => router.push(`/certificates/${id}`)}
              style={{
                padding: "12px 32px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              ← Back to Certificate
            </button>

            <button
              type="button"
              onClick={() => router.push("/certificates")}
              style={{
                padding: "12px 32px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "transparent",
                color: "#64748b",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              All Certificates
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
