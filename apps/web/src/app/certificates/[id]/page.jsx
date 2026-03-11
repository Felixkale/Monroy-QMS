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
  marginBottom: 16,
  marginTop: 8,
};

function SelectField({ children, ...props }) {
  return (
    <select
      {...props}
      style={{
        ...inputStyle,
        background: "#111827",
        color: "#e5e7eb",
        cursor: "pointer",
      }}
    >
      {children}
    </select>
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
  const pressureTypes = [
    "pressure vessel",
    "boiler",
    "air receiver",
    "air compressor",
    "oil separator",
  ];
  return pressureTypes.includes(type) ? "pv" : "lift";
}

function defaultCertificateType(assetType = "") {
  return detectEquipmentType(assetType) === "pv"
    ? "Pressure Test Certificate"
    : "Load Test Certificate";
}

function withUnit(value, unit) {
  if (value === null || value === undefined) return "";
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
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    asset_id: "",
    certificate_type: "",
    company: "",
    equipment_description: "",
    equipment_location: "",
    equipment_id: "",
    swl: "",
    mawp: "",
    equipment_status: "PASS",
    issued_at: "",
    valid_to: "",
    status: "issued",
    legal_framework: "",
    inspector_name: "",
    inspector_id: "",
    signature_url: "",
    logo_url: "",
    pdf_url: "",
  });

  useEffect(() => {
    async function loadAssets() {
      try {
        setAssetsLoading(true);

        const { data, error } = await supabase
          .from("assets")
          .select(`
            id,
            asset_name,
            asset_tag,
            asset_type,
            location,
            safe_working_load,
            working_pressure,
            next_inspection_date,
            design_standard,
            clients (
              company_name
            )
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setAssets(data || []);
      } catch (err) {
        setError(err?.message || "Failed to load equipment.");
      } finally {
        setAssetsLoading(false);
      }
    }

    loadAssets();
  }, []);

  useEffect(() => {
    async function loadCertificate() {
      if (!id) return;

      try {
        setLoading(true);
        setError("");

        const { data, error } = await supabase
          .from("certificates")
          .select(`
            id,
            asset_id,
            certificate_type,
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
            pdf_url
          `)
          .eq("id", id)
          .single();

        if (error || !data) {
          throw new Error(error?.message || "Certificate not found.");
        }

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
          legal_framework: data.legal_framework || "",
          inspector_name: data.inspector_name || "",
          inspector_id: data.inspector_id || "",
          signature_url: data.signature_url || "",
          logo_url: data.logo_url || "/monroy-logo.png",
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

  function handleUseEquipmentData() {
    if (!selectedAsset) return;

    const companyName = selectedAsset.clients?.company_name || "";
    const type = detectEquipmentType(selectedAsset.asset_type);

    setForm((prev) => ({
      ...prev,
      certificate_type:
        prev.certificate_type || defaultCertificateType(selectedAsset.asset_type),
      company: companyName,
      equipment_description: selectedAsset.asset_type || selectedAsset.asset_name || "",
      equipment_location: selectedAsset.location || "",
      equipment_id: selectedAsset.asset_tag || "",
      swl:
        type === "lift"
          ? withUnit(selectedAsset.safe_working_load, "Tons") || prev.swl
          : prev.swl,
      mawp:
        type === "pv"
          ? withUnit(selectedAsset.working_pressure, "kPa") || prev.mawp
          : prev.mawp,
      valid_to: prev.valid_to || formatDateInput(selectedAsset.next_inspection_date),
      legal_framework: prev.legal_framework || selectedAsset.design_standard || "",
    }));
  }

  async function handleSignatureUpload(e) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadingSignature(true);
      setError("");

      if (!id) throw new Error("Certificate ID is missing.");
      if (!supabase) throw new Error("Supabase not configured.");

      const ext = file.name.split(".").pop() || "png";
      const fileName = `${id}-${Date.now()}.${ext}`;
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

      setForm((prev) => ({
        ...prev,
        signature_url: publicUrl,
      }));
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

    try {
      if (!id) throw new Error("Certificate ID is missing.");
      if (!form.asset_id) throw new Error("Please select equipment.");
      if (!form.certificate_type) throw new Error("Certificate type is required.");

      const payload = {
        asset_id: form.asset_id,
        certificate_type: form.certificate_type || null,
        company: form.company || null,
        equipment_description: form.equipment_description || null,
        equipment_location: form.equipment_location || null,
        equipment_id: form.equipment_id || null,
        swl: withUnit(form.swl, "Tons") || null,
        mawp: withUnit(form.mawp, "kPa") || null,
        equipment_status: form.equipment_status || "PASS",
        issued_at: form.issued_at
          ? new Date(form.issued_at).toISOString()
          : new Date().toISOString(),
        valid_to: form.valid_to || null,
        status: form.status || "issued",
        legal_framework: form.legal_framework || null,
        inspector_name: form.inspector_name || null,
        inspector_id: form.inspector_id || null,
        signature_url: form.signature_url || null,
        logo_url: form.logo_url || null,
        pdf_url: form.pdf_url || null,
      };

      const { error } = await supabase
        .from("certificates")
        .update(payload)
        .eq("id", id);

      if (error) throw error;

      router.push(`/certificates/${id}`);
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
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <h1 style={{ color: "#fff", margin: 0 }}>Edit Certificate</h1>
            <p style={{ color: "#94a3b8", marginTop: 8 }}>
              Update certificate details and save changes.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => router.push(`/certificates/${id}`)}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.06)",
                color: "#e5e7eb",
                border: "1px solid rgba(255,255,255,0.1)",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              View Certificate
            </button>

            <button
              type="button"
              onClick={handleUseEquipmentData}
              disabled={!selectedAsset}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                background: "#0f766e",
                color: "#fff",
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                opacity: selectedAsset ? 1 : 0.6,
              }}
            >
              Auto Fill From Equipment
            </button>

            <button
              type="button"
              onClick={() => {
                const url = `/certificates/print/${id}`;
                window.open(
                  url,
                  "print_certificate",
                  "width=950,height=1200,scrollbars=yes,resizable=yes"
                );
              }}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                background: "linear-gradient(135deg,#00f5c4,#4fc3f7)",
                color: "#111827",
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Print Certificate
            </button>
          </div>
        </div>

        {error ? (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(244,63,94,0.35)",
              background: "rgba(244,63,94,0.08)",
              color: "#fda4af",
            }}
          >
            {error}
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 24,
          }}
        >
          <div style={sectionHeadStyle}>Certificate Setup</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div>
              <label style={labelStyle}>Equipment *</label>
              <SelectField
                name="asset_id"
                value={form.asset_id}
                onChange={handleChange}
                required
                disabled={assetsLoading}
              >
                <option value="">
                  {assetsLoading ? "Loading equipment..." : "Select equipment"}
                </option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.asset_tag || "NO-TAG"} - {asset.asset_type || asset.asset_name || "Equipment"}
                  </option>
                ))}
              </SelectField>
            </div>

            <div>
              <label style={labelStyle}>Certificate Type *</label>
              <input
                style={inputStyle}
                name="certificate_type"
                value={form.certificate_type}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Issue Date *</label>
              <input
                style={inputStyle}
                type="date"
                name="issued_at"
                value={form.issued_at}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Expiry Date</label>
              <input
                style={inputStyle}
                type="date"
                name="valid_to"
                value={form.valid_to}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={labelStyle}>Equipment Status</label>
              <SelectField
                name="equipment_status"
                value={form.equipment_status}
                onChange={handleChange}
              >
                <option value="PASS">PASS</option>
                <option value="FAIL">FAIL</option>
                <option value="CONDITIONAL">CONDITIONAL</option>
              </SelectField>
            </div>

            <div>
              <label style={labelStyle}>Record Status</label>
              <SelectField
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="issued">issued</option>
                <option value="draft">draft</option>
                <option value="expired">expired</option>
                <option value="rejected">rejected</option>
              </SelectField>
            </div>
          </div>

          <div style={sectionHeadStyle}>Certificate Data</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div>
              <label style={labelStyle}>Client / Company</label>
              <input style={inputStyle} name="company" value={form.company} onChange={handleChange} />
            </div>

            <div>
              <label style={labelStyle}>Equipment Description</label>
              <input
                style={inputStyle}
                name="equipment_description"
                value={form.equipment_description}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={labelStyle}>Equipment Location</label>
              <input
                style={inputStyle}
                name="equipment_location"
                value={form.equipment_location}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={labelStyle}>Equipment ID / Tag</label>
              <input
                style={inputStyle}
                name="equipment_id"
                value={form.equipment_id}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={labelStyle}>SWL</label>
              <input style={inputStyle} name="swl" value={form.swl} onChange={handleChange} placeholder="e.g. 12 Tons" />
            </div>

            <div>
              <label style={labelStyle}>MAWP</label>
              <input style={inputStyle} name="mawp" value={form.mawp} onChange={handleChange} placeholder="e.g. 1600 kPa" />
            </div>

            <div>
              <label style={labelStyle}>Legal Framework / Design Standard</label>
              <input
                style={inputStyle}
                name="legal_framework"
                value={form.legal_framework}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={labelStyle}>Inspector Name</label>
              <input
                style={inputStyle}
                name="inspector_name"
                value={form.inspector_name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={labelStyle}>Inspector ID</label>
              <input
                style={inputStyle}
                name="inspector_id"
                value={form.inspector_id}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={labelStyle}>Logo URL</label>
              <input
                style={inputStyle}
                name="logo_url"
                value={form.logo_url}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={labelStyle}>PDF URL</label>
              <input
                style={inputStyle}
                name="pdf_url"
                value={form.pdf_url}
                onChange={handleChange}
              />
            </div>
          </div>

          <div style={sectionHeadStyle}>Signature Upload</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
              gap: 16,
              marginBottom: 24,
              alignItems: "start",
            }}
          >
            <div>
              <label style={labelStyle}>Upload Signature Image</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleSignatureUpload}
                style={{
                  ...inputStyle,
                  padding: "10px",
                  height: "auto",
                }}
              />
              <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 8 }}>
                {uploadingSignature ? "Uploading signature..." : "Upload a clear signature image."}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Signature URL</label>
              <input
                style={inputStyle}
                name="signature_url"
                value={form.signature_url}
                onChange={handleChange}
                placeholder="Uploaded signature URL will appear here"
              />
            </div>

            <div>
              <label style={labelStyle}>Signature Preview</label>
              <div
                style={{
                  minHeight: 120,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  padding: 12,
                }}
              >
                {form.signature_url ? (
                  <img
                    src={form.signature_url}
                    alt="Signature Preview"
                    style={{
                      maxWidth: "100%",
                      maxHeight: 90,
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <span style={{ color: "#64748b", fontSize: 13 }}>
                    No signature uploaded
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => router.push("/certificates")}
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "transparent",
                color: "#cbd5e1",
                cursor: "pointer",
              }}
            >
              Back
            </button>

            <button
              type="submit"
              disabled={saving || uploadingSignature}
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                border: "none",
                background: "#2563eb",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
                opacity: saving || uploadingSignature ? 0.7 : 1,
              }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
