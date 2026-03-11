"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const C = {
  green: "#00f5c4",
  purple: "#7c5cfc",
  blue: "#4fc3f7",
  pink: "#f472b6",
  panel: "#11182d",
  border: "rgba(255,255,255,0.08)",
  text: "#eaf2ff",
  subtext: "#9fb0d0",
  danger: "#ff6b6b",
};

const initialForm = {
  asset_id: "",
  certificate_type: "Load Test Certificate",
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
  legal_framework: "Mines, Quarries, Works and Machinery Act Cap 44:02",
  inspector_name: "",
  inspector_id: "",
  signature_url: "",
  logo_url: "/monroy-logo.png",
  pdf_url: "",
};

function Field({
  label,
  name,
  value,
  onChange,
  placeholder = "",
  type = "text",
  required = false,
}) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ color: C.subtext, fontSize: 14 }}>{label}</span>
      <input
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
        required={required}
        style={styles.input}
      />
    </label>
  );
}

function SelectField({ label, name, value, onChange, options = [], required = false }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ color: C.subtext, fontSize: 14 }}>{label}</span>
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        style={styles.input}
      >
        {options.map((option) => {
          const opt = typeof option === "string" ? { value: option, label: option } : option;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export default function CreateCertificatePage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedAsset = useMemo(() => {
    return assets.find((item) => item.id === form.asset_id) || null;
  }, [assets, form.asset_id]);

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
            manufacturer,
            model,
            serial_number,
            year_built,
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
        setAssets([]);
        setError(err?.message || "Failed to load equipment.");
      } finally {
        setAssetsLoading(false);
      }
    }

    loadAssets();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "asset_id") {
        const asset = assets.find((item) => item.id === value);

        if (asset) {
          const isPressure = [
            "Pressure Vessel",
            "Boiler",
            "Air Receiver",
            "Air Compressor",
            "Oil Separator",
          ].includes(asset.asset_type);

          next.company = asset.clients?.company_name || "";
          next.equipment_description = asset.asset_type || asset.asset_name || "";
          next.equipment_location = asset.location || "";
          next.equipment_id = asset.asset_tag || "";
          next.swl = !isPressure ? asset.safe_working_load || "" : "";
          next.mawp = isPressure ? asset.working_pressure || "" : "";
          next.valid_to = asset.next_inspection_date || "";
          next.legal_framework =
            asset.design_standard || "Mines, Quarries, Works and Machinery Act Cap 44:02";
          next.certificate_type = isPressure
            ? "Pressure Test Certificate"
            : "Load Test Certificate";
        }
      }

      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      if (!supabase) {
        throw new Error("Supabase not configured");
      }

      if (!form.asset_id) {
        throw new Error("Please select equipment.");
      }

      if (!form.inspector_name.trim()) {
        throw new Error("Inspector name is required.");
      }

      const payload = {
        asset_id: form.asset_id || null,
        certificate_type: form.certificate_type || null,
        company: form.company.trim() || null,
        equipment_description: form.equipment_description.trim() || null,
        equipment_location: form.equipment_location.trim() || null,
        equipment_id: form.equipment_id.trim() || null,
        swl: form.swl.trim() || null,
        mawp: form.mawp.trim() || null,
        equipment_status: form.equipment_status || "PASS",
        issued_at: form.issued_at
          ? new Date(form.issued_at).toISOString()
          : new Date().toISOString(),
        valid_to: form.valid_to || null,
        status: form.status || "issued",
        legal_framework: form.legal_framework.trim() || null,
        inspector_name: form.inspector_name.trim() || null,
        inspector_id: form.inspector_id.trim() || null,
        signature_url: form.signature_url.trim() || null,
        logo_url: form.logo_url.trim() || "/monroy-logo.png",
        pdf_url: form.pdf_url.trim() || null,
      };

      const { error: insertError } = await supabase
        .from("certificates")
        .insert([payload]);

      if (insertError) {
        throw insertError;
      }

      setMessage("Certificate created successfully.");
      setForm(initialForm);

      setTimeout(() => {
        router.push("/certificates");
      }, 800);
    } catch (err) {
      setError(err?.message || "Failed to create certificate.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppLayout title="Create Certificate">
      <div style={styles.page}>
        <div style={styles.headerCard}>
          <div>
            <div style={styles.kicker}>Certificates</div>
            <h1 style={styles.title}>Create Certificate</h1>
            <p style={styles.subtitle}>
              Create a certificate using the real database fields from the certificates table.
            </p>
          </div>

          <div style={styles.previewBox}>
            <div style={{ color: C.subtext, fontSize: 13 }}>Selected Equipment</div>
            <div style={{ color: C.green, fontWeight: 800, fontSize: 18 }}>
              {selectedAsset?.asset_tag || "Not selected"}
            </div>
          </div>
        </div>

        {message ? <div style={styles.success}>{message}</div> : null}
        {error ? <div style={styles.error}>{error}</div> : null}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Certificate Setup</div>
            <div style={styles.grid3}>
              <SelectField
                label="Equipment"
                name="asset_id"
                value={form.asset_id}
                onChange={handleChange}
                required
                options={[
                  {
                    value: "",
                    label: assetsLoading ? "Loading equipment..." : "Select equipment",
                  },
                  ...assets.map((asset) => ({
                    value: asset.id,
                    label: `${asset.asset_tag || "NO-TAG"} - ${asset.asset_type || asset.asset_name || "Equipment"}`,
                  })),
                ]}
              />

              <Field
                label="Certificate Type"
                name="certificate_type"
                value={form.certificate_type}
                onChange={handleChange}
                required
              />

              <SelectField
                label="Equipment Status"
                name="equipment_status"
                value={form.equipment_status}
                onChange={handleChange}
                options={["PASS", "FAIL", "CONDITIONAL"]}
              />

              <Field
                label="Issue Date"
                name="issued_at"
                value={form.issued_at}
                onChange={handleChange}
                type="date"
                required
              />

              <Field
                label="Expiry Date"
                name="valid_to"
                value={form.valid_to}
                onChange={handleChange}
                type="date"
              />

              <SelectField
                label="Record Status"
                name="status"
                value={form.status}
                onChange={handleChange}
                options={["issued", "draft", "expired", "rejected"]}
              />
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Certificate Data</div>
            <div style={styles.grid3}>
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
                label="Equipment ID / Tag"
                name="equipment_id"
                value={form.equipment_id}
                onChange={handleChange}
              />
              <Field
                label="SWL"
                name="swl"
                value={form.swl}
                onChange={handleChange}
                placeholder="Manual text, e.g. 5 Tons"
              />
              <Field
                label="MAWP / Pressure"
                name="mawp"
                value={form.mawp}
                onChange={handleChange}
                placeholder="Manual text, e.g. 1600 kPa"
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
                required
              />
              <Field
                label="Inspector ID"
                name="inspector_id"
                value={form.inspector_id}
                onChange={handleChange}
              />
              <Field
                label="Signature URL"
                name="signature_url"
                value={form.signature_url}
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
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={() => router.push("/certificates")}
              style={styles.secondaryBtn}
            >
              Cancel
            </button>

            <button type="submit" disabled={submitting} style={styles.primaryBtn}>
              {submitting ? "Saving..." : "Create Certificate"}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

const styles = {
  page: {
    padding: 24,
    color: C.text,
    background: "transparent",
  },
  headerCard: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    flexWrap: "wrap",
    padding: 20,
    borderRadius: 20,
    background: "linear-gradient(135deg, rgba(124,92,252,0.16), rgba(79,195,247,0.10))",
    border: `1px solid ${C.border}`,
    marginBottom: 20,
  },
  kicker: {
    color: C.green,
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.1,
  },
  subtitle: {
    margin: "8px 0 0",
    color: C.subtext,
    maxWidth: 760,
  },
  previewBox: {
    minWidth: 240,
    padding: 16,
    borderRadius: 16,
    background: "rgba(11,16,32,0.7)",
    border: `1px solid ${C.border}`,
  },
  success: {
    marginBottom: 16,
    padding: "12px 14px",
    borderRadius: 12,
    background: "rgba(0,245,196,0.12)",
    border: "1px solid rgba(0,245,196,0.3)",
    color: C.green,
    fontWeight: 700,
  },
  error: {
    marginBottom: 16,
    padding: "12px 14px",
    borderRadius: 12,
    background: "rgba(255,107,107,0.12)",
    border: "1px solid rgba(255,107,107,0.28)",
    color: C.danger,
    fontWeight: 700,
  },
  form: {
    display: "grid",
    gap: 20,
  },
  section: {
    padding: 20,
    borderRadius: 18,
    background: C.panel,
    border: `1px solid ${C.border}`,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 800,
    marginBottom: 16,
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  input: {
    width: "100%",
    height: 46,
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    background: "#0f1730",
    color: C.text,
    padding: "0 14px",
    outline: "none",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 4,
  },
  secondaryBtn: {
    height: 46,
    padding: "0 18px",
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    background: "transparent",
    color: C.text,
    fontWeight: 700,
    cursor: "pointer",
  },
  primaryBtn: {
    height: 46,
    padding: "0 18px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #7c5cfc, #00f5c4)",
    color: "#08111f",
    fontWeight: 800,
    cursor: "pointer",
  },
};
