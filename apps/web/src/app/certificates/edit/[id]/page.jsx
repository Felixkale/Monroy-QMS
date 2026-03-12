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
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 16,
  marginBottom: 16,
};

function Field({ label, name, value, onChange, type = "text" }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
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
        style={{ ...inputStyle, background: "#111827", color: "#e5e7eb", cursor: "pointer" }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function formatDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function detectEquipmentType(assetType = "") {
  const type = String(assetType).toLowerCase();
  const pressureTypes = ["pressure vessel", "boiler", "air receiver", "air compressor", "oil separator"];
  return pressureTypes.includes(type) ? "pv" : "lift";
}

function defaultCertificateType(assetType = "") {
  return detectEquipmentType(assetType) === "pv"
    ? "Pressure Test Certificate"
    : "Load Test Certificate";
}

function withUnit(value, unit) {
  if (!value) return "";
  const text = String(value).trim();
  if (!text) return "";
  if (text.toLowerCase().includes(unit.toLowerCase())) return text;
  return `${text} ${unit}`;
}

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
    equipment_id: "",   // ✅ will be filled from serial_number
    swl: "",
    mawp: "",
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

  // ── Load assets ──────────────────────────────────────────
  useEffect(() => {
    async function loadAssets() {
      const { data } = await supabase
        .from("assets")
        .select(`
          id, asset_name, asset_tag, asset_type, location,
          serial_number, safe_working_load, working_pressure,
          next_inspection_date, design_standard,
          clients ( company_name )
        `)
        .order("created_at", { ascending: false });

      setAssets(data || []);
    }
    loadAssets();
  }, []);

  // ── Load certificate ──────────────────────────────────────
  useEffect(() => {
    async function loadCertificate() {
      if (!id) return;
      try {
        setLoading(true);
        setError("");

        const { data, error } = await supabase
          .from("certificates")
          .select("*")
          .eq("id", id)
          .single();

        if (error || !data) throw new Error(error?.message || "Certificate not found.");

        setForm({
          asset_id: data.asset_id || "",
          certificate_type: data.certificate_type || "",
          company: data.company || "",
          equipment_description: data.equipment_description || "",
          equipment_location: data.equipment_location || "",
          equipment_id: data.equipment_id || "",
          swl: data.swl || "",
          mawp: data.mawp || "",
          equipment_status: data.equipment_status || "PASS",
          issued_at: formatDateInput(data.issued_at),
          valid_to: formatDateInput(data.valid_to),
          status: data.status || "issued",
          legal_framework: data.legal_framework || "Mines, Quarries, Works and Machinery Act Cap 44:02",
          inspector_name: data.inspector_name || "",
          inspector_id: data.inspector_id || "",
          signature_url: data.signature_url || "",
          logo_url: data.logo_url || "/logo.png",
          pdf_url: data.pdf_url || "",
        });
      } catch (err) {
        setError(err?.message || "Certificate not found.");
      } finally {
        setLoading(false);
      }
    }
    loadCertificate();
  }, [id]);

  const selectedAsset = useMemo(
    () => assets.find((a) => a.id === form.asset_id) || null,
    [assets, form.asset_id]
  );

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // ✅ FIXED: equipment_id now uses serial_number first
  function handleUseEquipmentData() {
    if (!selectedAsset) return;
    const type = detectEquipmentType(selectedAsset.asset_type);

    setForm((prev) => ({
      ...prev,
      certificate_type: prev.certificate_type || defaultCertificateType(selectedAsset.asset_type),
      company: selectedAsset.clients?.company_name || prev.company,
      equipment_description: selectedAsset.asset_type || selectedAsset.asset_name || prev.equipment_description,
      equipment_location: selectedAsset.location || prev.equipment_location,
      // ✅ Use serial_number as equipment_id, fallback to asset_tag
      equipment_id: selectedAsset.serial_number || selectedAsset.asset_tag || prev.equipment_id,
      swl: type === "lift" ? withUnit(selectedAsset.safe_working_load, "Tons") || prev.swl : prev.swl,
      mawp: type === "pv" ? withUnit(selectedAsset.working_pressure, "kPa") || prev.mawp : prev.mawp,
      valid_to: prev.valid_to || formatDateInput(selectedAsset.next_inspection_date),
      legal_framework: prev.legal_framework || selectedAsset.design_standard || "",
    }));
  }

  // ✅ FIXED: signature upload with proper public URL and preview
  async function handleSignatureUpload(e) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadingSignature(true);
      setError("");

      const ext = file.name.split(".").pop() || "png";
      const fileName = `sig-${id}-${Date.now()}.${ext}`;
      const filePath = `certificate-signatures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error("Could not get public URL for signature.");

      setForm((prev) => ({ ...prev, signature_url: publicUrl }));
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
      const payload = {
        asset_id: form.asset_id || null,
        certificate_type: form.certificate_type,
        company: form.company,
        equipment_description: form.equipment_description,
        equipment_location: form.equipment_location,
        equipment_id: form.equipment_id,
        swl: form.swl ? withUnit(form.swl, "Tons") : null,
        mawp: form.mawp ? withUnit(form.mawp, "kPa") : null,
        equipment_status: form.equipment_status,
        issued_at: form.issued_at ? new Date(form.issued_at).toISOString() : null,
        valid_to: form.valid_to || null,
        status: form.status,
        legal_framework: form.legal_framework,
        inspector_name: form.inspector_name,
        inspector_id: form.inspector_id,
        signature_url: form.signature_url,
        logo_url: form.logo_url,
        pdf_url: form.pdf_url,
      };

      const { error } = await supabase
        .from("certificates")
        .update(payload)
        .eq("id", id);

      if (error) throw error;

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
        <div style={{ color: "#fff", padding: 24 }}>Loading certificate...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Edit Certificate">
      <div style={{ maxWidth: 1000 }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ color: "#fff", margin: 0 }}>Edit Certificate</h1>
          <button
            onClick={() => {
              window.open(`/certificates/print/${id}`, "print_cert", "width=950,height=1200,scrollbars=yes");
            }}
            style={{
              padding: "10px 20px", borderRadius: 8,
              background: "linear-gradient(135deg,#00f5c4,#4fc3f7)",
              color: "#111827", border: "none", fontWeight: 700, cursor: "pointer",
            }}
          >
            🖨 Print Certificate
          </button>
        </div>

        {error && (
          <div style={{ background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, color: "#f472b6", fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, color: "#86efac", fontSize: 13 }}>
            ✅ {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* ── EQUIPMENT LINK ─────────────────────────── */}
          <div style={sectionHeadStyle}>Link to Equipment</div>
          <div style={{ ...gridStyle, gridTemplateColumns: "1fr auto" }}>
            <div>
              <label style={labelStyle}>Select Equipment (Asset)</label>
              <select
                name="asset_id"
                value={form.asset_id}
                onChange={handleChange}
                style={{ ...inputStyle, background: "#111827", color: "#e5e7eb", cursor: "pointer" }}
              >
                <option value="">— Select equipment —</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.asset_tag} — {a.asset_name} {a.serial_number ? `(S/N: ${a.serial_number})` : ""}
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
                  padding: "11px 18px", borderRadius: 8, border: "none",
                  background: selectedAsset ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.1)",
                  color: "#fff", fontWeight: 700, cursor: selectedAsset ? "pointer" : "not-allowed", whiteSpace: "nowrap",
                }}
              >
                Auto-fill from Equipment
              </button>
            </div>
          </div>

          {/* ── CERTIFICATE INFO ────────────────────────── */}
          <div style={sectionHeadStyle}>Certificate Info</div>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>Certificate Type</label>
              <select
                name="certificate_type"
                value={form.certificate_type}
                onChange={handleChange}
                style={{ ...inputStyle, background: "#111827", color: "#e5e7eb", cursor: "pointer" }}
              >
                <option value="">— Select type —</option>
                <option>Load Test Certificate</option>
                <option>Pressure Test Certificate</option>
                <option>Certificate of Statutory Inspection</option>
                <option>Inspection Certificate</option>
              </select>
            </div>
            <Field label="Issue Date" name="issued_at" type="date" value={form.issued_at} onChange={handleChange} />
            <Field label="Expiry Date" name="valid_to" type="date" value={form.valid_to} onChange={handleChange} />
            <SelectField
              label="Equipment Status"
              name="equipment_status"
              value={form.equipment_status}
              onChange={handleChange}
              options={["PASS", "FAIL", "CONDITIONAL"].map((v) => ({ value: v, label: v }))}
            />
            <SelectField
              label="Record Status"
              name="status"
              value={form.status}
              onChange={handleChange}
              options={["issued", "draft", "expired", "revoked"].map((v) => ({ value: v, label: v }))}
            />
          </div>

          {/* ── CERTIFICATE DATA ────────────────────────── */}
          <div style={sectionHeadStyle}>Certificate Data</div>
          <div style={gridStyle}>
            <Field label="Client / Company" name="company" value={form.company} onChange={handleChange} />
            <Field label="Equipment Description" name="equipment_description" value={form.equipment_description} onChange={handleChange} />
            <Field label="Equipment Location" name="equipment_location" value={form.equipment_location} onChange={handleChange} />
            {/* ✅ FIXED: label updated to reflect serial number usage */}
            <Field label="Equipment Serial No / ID" name="equipment_id" value={form.equipment_id} onChange={handleChange} />
            <Field label="SWL (e.g. 2 Tons)" name="swl" value={form.swl} onChange={handleChange} />
            <Field label="MAWP (e.g. 1600 kPa)" name="mawp" value={form.mawp} onChange={handleChange} />
            <Field label="Legal Framework / Design Standard" name="legal_framework" value={form.legal_framework} onChange={handleChange} />
            <Field label="Inspector Name" name="inspector_name" value={form.inspector_name} onChange={handleChange} />
            <Field label="Inspector ID" name="inspector_id" value={form.inspector_id} onChange={handleChange} />
            <Field label="Logo URL" name="logo_url" value={form.logo_url} onChange={handleChange} />
            <Field label="PDF URL" name="pdf_url" value={form.pdf_url} onChange={handleChange} />
          </div>

          {/* ── SIGNATURE ───────────────────────────────── */}
          <div style={sectionHeadStyle}>Signature Upload</div>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>Upload Signature Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleSignatureUpload}
                style={{ ...inputStyle, padding: "10px" }}
              />
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 6 }}>
                {uploadingSignature ? "⏳ Uploading..." : "Upload a clear signature image."}
              </p>
            </div>

            <div>
              <label style={labelStyle}>Signature URL</label>
              <input
                name="signature_url"
                value={form.signature_url}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Auto-filled after upload"
              />
            </div>

            {/* ✅ FIXED: proper signature preview with fallback */}
            <div>
              <label style={labelStyle}>Signature Preview</label>
              <div style={{
                background: "#fff",
                borderRadius: 8,
                padding: 12,
                minHeight: 90,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {form.signature_url ? (
                  <img
                    src={form.signature_url}
                    alt="Signature Preview"
                    style={{ maxHeight: 80, maxWidth: "100%", objectFit: "contain" }}
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                ) : (
                  <span style={{ color: "#9ca3af", fontSize: 12 }}>No signature uploaded</span>
                )}
              </div>
            </div>
          </div>

          {/* ── ACTIONS ─────────────────────────────────── */}
          <div style={{ display: "flex", gap: 12, marginTop: 32, marginBottom: 40 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "12px 32px", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg,#667eea,#764ba2)",
                color: "#fff", fontWeight: 700, fontSize: 14,
                cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={() => router.push(`/certificates/${id}`)}
              style={{
                padding: "12px 32px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)",
                color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
            >
              Back
            </button>
          </div>

        </form>
      </div>
    </AppLayout>
  );
}
