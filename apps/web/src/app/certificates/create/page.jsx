"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const C = {
  green: "#00f5c4",
  purple: "#7c5cfc",
  blue: "#4fc3f7",
  pink: "#f472b6",
  bg: "#0b1020",
  panel: "#11182d",
  border: "rgba(255,255,255,0.08)",
  text: "#eaf2ff",
  subtext: "#9fb0d0",
  danger: "#ff6b6b",
};

const initialForm = {
  certificate_no: "",
  certificate_type: "Load Test Certificate",
  client_name: "",
  site_name: "",
  asset_name: "",
  asset_tag: "",
  equipment_type: "",
  manufacturer: "",
  model: "",
  serial_number: "",
  year_built: "",
  swl: "",
  swl_unit: "Tons",
  proof_load: "",
  proof_load_unit: "Tons",
  lift_height: "",
  lift_height_unit: "m",
  sling_length: "",
  sling_length_unit: "m",
  pressure: "",
  pressure_unit: "kPa",
  inspection_date: "",
  expiry_date: "",
  inspector_name: "",
  inspector_position: "Inspector",
  status: "Valid",
  notes: "",
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

function SelectField({ label, name, value, onChange, options = [] }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ color: C.subtext, fontSize: 14 }}>{label}</span>
      <select
        name={name}
        value={value}
        onChange={onChange}
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
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const previewCertificateNo = useMemo(() => {
    if (form.certificate_no?.trim()) return form.certificate_no.trim();
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `CERT-${yyyy}${mm}${dd}-001`;
  }, [form.certificate_no]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function normalizePayload(values) {
    return {
      certificate_no: values.certificate_no?.trim() || previewCertificateNo,
      certificate_type: values.certificate_type?.trim() || null,
      client_name: values.client_name?.trim() || null,
      site_name: values.site_name?.trim() || null,
      asset_name: values.asset_name?.trim() || null,
      asset_tag: values.asset_tag?.trim() || null,
      equipment_type: values.equipment_type?.trim() || null,
      manufacturer: values.manufacturer?.trim() || null,
      model: values.model?.trim() || null,
      serial_number: values.serial_number?.trim() || null,
      year_built: values.year_built?.trim() || null,
      swl: values.swl?.trim() || null,
      swl_unit: values.swl_unit?.trim() || "Tons",
      proof_load: values.proof_load?.trim() || null,
      proof_load_unit: values.proof_load_unit?.trim() || "Tons",
      lift_height: values.lift_height?.trim() || null,
      lift_height_unit: values.lift_height_unit?.trim() || "m",
      sling_length: values.sling_length?.trim() || null,
      sling_length_unit: values.sling_length_unit?.trim() || "m",
      pressure: values.pressure?.trim() || null,
      pressure_unit: values.pressure_unit?.trim() || "kPa",
      inspection_date: values.inspection_date || null,
      expiry_date: values.expiry_date || null,
      inspector_name: values.inspector_name?.trim() || null,
      inspector_position: values.inspector_position?.trim() || null,
      status: values.status?.trim() || "Valid",
      notes: values.notes?.trim() || null,
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const payload = normalizePayload(form);

      if (!supabase) {
        throw new Error("Supabase not configured");
      }

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
              Enter the certificate details below. This version is fully closed and
              compile-safe, so it fixes the EOF build error.
            </p>
          </div>

          <div style={styles.previewBox}>
            <div style={{ color: C.subtext, fontSize: 13 }}>Preview Number</div>
            <div style={{ color: C.green, fontWeight: 800, fontSize: 20 }}>
              {previewCertificateNo}
            </div>
          </div>
        </div>

        {message ? <div style={styles.success}>{message}</div> : null}
        {error ? <div style={styles.error}>{error}</div> : null}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Certificate Details</div>
            <div style={styles.grid3}>
              <Field
                label="Certificate Number"
                name="certificate_no"
                value={form.certificate_no}
                onChange={handleChange}
                placeholder="Auto or manually type"
              />
              <SelectField
                label="Certificate Type"
                name="certificate_type"
                value={form.certificate_type}
                onChange={handleChange}
                options={[
                  "Load Test Certificate",
                  "Inspection Certificate",
                  "Pressure Vessel Certificate",
                  "Lifting Equipment Certificate",
                  "Calibration Certificate",
                ]}
              />
              <SelectField
                label="Status"
                name="status"
                value={form.status}
                onChange={handleChange}
                options={["Valid", "Expired", "Rejected", "Pending"]}
              />
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Client and Asset</div>
            <div style={styles.grid3}>
              <Field
                label="Client Name"
                name="client_name"
                value={form.client_name}
                onChange={handleChange}
                required
              />
              <Field
                label="Site Name"
                name="site_name"
                value={form.site_name}
                onChange={handleChange}
              />
              <Field
                label="Asset Name"
                name="asset_name"
                value={form.asset_name}
                onChange={handleChange}
                required
              />
              <Field
                label="Asset Tag"
                name="asset_tag"
                value={form.asset_tag}
                onChange={handleChange}
              />
              <Field
                label="Equipment Type"
                name="equipment_type"
                value={form.equipment_type}
                onChange={handleChange}
              />
              <Field
                label="Serial Number"
                name="serial_number"
                value={form.serial_number}
                onChange={handleChange}
              />
              <Field
                label="Manufacturer"
                name="manufacturer"
                value={form.manufacturer}
                onChange={handleChange}
              />
              <Field
                label="Model"
                name="model"
                value={form.model}
                onChange={handleChange}
              />
              <Field
                label="Year Built"
                name="year_built"
                value={form.year_built}
                onChange={handleChange}
                placeholder="Manually type"
              />
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Technical Data</div>
            <div style={styles.grid4}>
              <Field
                label="SWL"
                name="swl"
                value={form.swl}
                onChange={handleChange}
                placeholder="Manually type"
              />
              <SelectField
                label="SWL Unit"
                name="swl_unit"
                value={form.swl_unit}
                onChange={handleChange}
                options={["Tons"]}
              />
              <Field
                label="Proof Load"
                name="proof_load"
                value={form.proof_load}
                onChange={handleChange}
                placeholder="Manually type"
              />
              <SelectField
                label="Proof Load Unit"
                name="proof_load_unit"
                value={form.proof_load_unit}
                onChange={handleChange}
                options={["Tons"]}
              />
              <Field
                label="Lift Height"
                name="lift_height"
                value={form.lift_height}
                onChange={handleChange}
                placeholder="Manually type"
              />
              <SelectField
                label="Lift Height Unit"
                name="lift_height_unit"
                value={form.lift_height_unit}
                onChange={handleChange}
                options={["m", "mm"]}
              />
              <Field
                label="Sling Length"
                name="sling_length"
                value={form.sling_length}
                onChange={handleChange}
                placeholder="Manually type"
              />
              <SelectField
                label="Sling Length Unit"
                name="sling_length_unit"
                value={form.sling_length_unit}
                onChange={handleChange}
                options={["m", "mm"]}
              />
              <Field
                label="Pressure"
                name="pressure"
                value={form.pressure}
                onChange={handleChange}
                placeholder="Manually type"
              />
              <SelectField
                label="Pressure Unit"
                name="pressure_unit"
                value={form.pressure_unit}
                onChange={handleChange}
                options={["kPa"]}
              />
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Inspection Details</div>
            <div style={styles.grid3}>
              <Field
                label="Inspection Date"
                name="inspection_date"
                value={form.inspection_date}
                onChange={handleChange}
                type="date"
                required
              />
              <Field
                label="Expiry Date"
                name="expiry_date"
                value={form.expiry_date}
                onChange={handleChange}
                type="date"
              />
              <Field
                label="Inspector Name"
                name="inspector_name"
                value={form.inspector_name}
                onChange={handleChange}
                required
              />
              <Field
                label="Inspector Position"
                name="inspector_position"
                value={form.inspector_position}
                onChange={handleChange}
              />
            </div>

            <label style={{ display: "grid", gap: 8, marginTop: 18 }}>
              <span style={{ color: C.subtext, fontSize: 14 }}>Notes</span>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={5}
                placeholder="Extra certificate remarks"
                style={styles.textarea}
              />
            </label>
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
  grid4: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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
  textarea: {
    width: "100%",
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    background: "#0f1730",
    color: C.text,
    padding: 14,
    outline: "none",
    resize: "vertical",
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
