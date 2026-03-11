"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import { getEquipmentByTag } from "@/services/equipment";

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
  asset_name: "",
  asset_tag: "",
  asset_type: "",
  manufacturer: "",
  model: "",
  serial_number: "",
  year_built: "",
  location: "",
  department: "",
  cert_type: "",
  design_standard: "",
  inspection_freq: "",
  shell_material: "",
  fluid_type: "",
  design_pressure: "",
  working_pressure: "",
  test_pressure: "",
  design_temperature: "",
  capacity_volume: "",
  safe_working_load: "",
  proof_load: "",
  lifting_height: "",
  sling_length: "",
  chain_size: "",
  rope_diameter: "",
  last_inspection_date: "",
  next_inspection_date: "",
  license_status: "",
  license_expiry: "",
  condition: "",
  status: "",
  notes: "",
};

function Field({
  label,
  name,
  value,
  onChange,
  placeholder = "",
  type = "text",
}) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ color: C.subtext, fontSize: 14 }}>{label}</span>
      <input
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
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
        value={value || ""}
        onChange={onChange}
        style={styles.input}
      >
        <option value="">Select</option>
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

function formatDateInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export default function EditEquipmentPage() {
  const params = useParams();
  const router = useRouter();
  const tag = Array.isArray(params?.tag) ? params.tag[0] : params?.tag;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [equipmentId, setEquipmentId] = useState(null);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    async function loadEquipment() {
      try {
        setLoading(true);
        setError("");

        if (!tag) {
          throw new Error("Equipment tag not found in route.");
        }

        const { data, error } = await getEquipmentByTag(tag);

        if (error) throw error;
        if (!data) throw new Error("Equipment not found.");

        setEquipmentId(data.id);
        setForm({
          asset_name: data.asset_name || "",
          asset_tag: data.asset_tag || "",
          asset_type: data.asset_type || "",
          manufacturer: data.manufacturer || "",
          model: data.model || "",
          serial_number: data.serial_number || "",
          year_built: data.year_built || "",
          location: data.location || "",
          department: data.department || "",
          cert_type: data.cert_type || "",
          design_standard: data.design_standard || "",
          inspection_freq: data.inspection_freq || "",
          shell_material: data.shell_material || "",
          fluid_type: data.fluid_type || "",
          design_pressure: data.design_pressure || "",
          working_pressure: data.working_pressure || "",
          test_pressure: data.test_pressure || "",
          design_temperature: data.design_temperature || "",
          capacity_volume: data.capacity_volume || "",
          safe_working_load: data.safe_working_load || "",
          proof_load: data.proof_load || "",
          lifting_height: data.lifting_height || "",
          sling_length: data.sling_length || "",
          chain_size: data.chain_size || "",
          rope_diameter: data.rope_diameter || "",
          last_inspection_date: formatDateInput(data.last_inspection_date),
          next_inspection_date: formatDateInput(data.next_inspection_date),
          license_status: data.license_status || "",
          license_expiry: formatDateInput(data.license_expiry),
          condition: data.condition || "",
          status: data.status || "",
          notes: data.notes || "",
        });
      } catch (err) {
        setError(err?.message || "Failed to load equipment details.");
      } finally {
        setLoading(false);
      }
    }

    loadEquipment();
  }, [tag]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (!supabase) {
        throw new Error("Supabase not configured");
      }

      if (!equipmentId) {
        throw new Error("Equipment ID is missing.");
      }

      const payload = {
        asset_name: form.asset_name || null,
        asset_tag: form.asset_tag || null,
        asset_type: form.asset_type || null,
        manufacturer: form.manufacturer || null,
        model: form.model || null,
        serial_number: form.serial_number || null,
        year_built: form.year_built || null,
        location: form.location || null,
        department: form.department || null,
        cert_type: form.cert_type || null,
        design_standard: form.design_standard || null,
        inspection_freq: form.inspection_freq || null,
        shell_material: form.shell_material || null,
        fluid_type: form.fluid_type || null,
        design_pressure: form.design_pressure || null,
        working_pressure: form.working_pressure || null,
        test_pressure: form.test_pressure || null,
        design_temperature: form.design_temperature || null,
        capacity_volume: form.capacity_volume || null,
        safe_working_load: form.safe_working_load || null,
        proof_load: form.proof_load || null,
        lifting_height: form.lifting_height || null,
        sling_length: form.sling_length || null,
        chain_size: form.chain_size || null,
        rope_diameter: form.rope_diameter || null,
        last_inspection_date: form.last_inspection_date || null,
        next_inspection_date: form.next_inspection_date || null,
        license_status: form.license_status || null,
        license_expiry: form.license_expiry || null,
        condition: form.condition || null,
        status: form.status || null,
        notes: form.notes || null,
      };

      const { error: updateError } = await supabase
        .from("assets")
        .update(payload)
        .eq("id", equipmentId);

      if (updateError) throw updateError;

      router.push(`/equipment/${encodeURIComponent(form.asset_tag || tag)}`);
    } catch (err) {
      setError(err?.message || "Failed to update equipment.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Edit Equipment">
        <div style={{ color: "#fff", padding: "32px 0" }}>Loading equipment details...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Edit Equipment">
      <div style={styles.page}>
        <div style={styles.headerCard}>
          <div>
            <div style={styles.kicker}>Equipment</div>
            <h1 style={styles.title}>Edit Equipment</h1>
            <p style={styles.subtitle}>
              Update equipment details and save changes.
            </p>
          </div>
        </div>

        {error ? <div style={styles.error}>{error}</div> : null}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Basic Information</div>
            <div style={styles.grid3}>
              <Field label="Asset Name" name="asset_name" value={form.asset_name} onChange={handleChange} />
              <Field label="Asset Tag" name="asset_tag" value={form.asset_tag} onChange={handleChange} />
              <Field label="Equipment Type" name="asset_type" value={form.asset_type} onChange={handleChange} />
              <Field label="Manufacturer" name="manufacturer" value={form.manufacturer} onChange={handleChange} />
              <Field label="Model" name="model" value={form.model} onChange={handleChange} />
              <Field label="Serial Number" name="serial_number" value={form.serial_number} onChange={handleChange} />
              <Field label="Year Built" name="year_built" value={form.year_built} onChange={handleChange} />
              <Field label="Location" name="location" value={form.location} onChange={handleChange} />
              <Field label="Department" name="department" value={form.department} onChange={handleChange} />
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Inspection and Design Data</div>
            <div style={styles.grid3}>
              <Field label="Certificate Type" name="cert_type" value={form.cert_type} onChange={handleChange} />
              <Field label="Design Standard" name="design_standard" value={form.design_standard} onChange={handleChange} />
              <Field label="Inspection Frequency" name="inspection_freq" value={form.inspection_freq} onChange={handleChange} />
              <Field label="Shell Material" name="shell_material" value={form.shell_material} onChange={handleChange} />
              <Field label="Fluid Type" name="fluid_type" value={form.fluid_type} onChange={handleChange} />
              <Field label="Design Pressure" name="design_pressure" value={form.design_pressure} onChange={handleChange} />
              <Field label="Working Pressure" name="working_pressure" value={form.working_pressure} onChange={handleChange} />
              <Field label="Test Pressure" name="test_pressure" value={form.test_pressure} onChange={handleChange} />
              <Field label="Design Temperature" name="design_temperature" value={form.design_temperature} onChange={handleChange} />
              <Field label="Capacity / Volume" name="capacity_volume" value={form.capacity_volume} onChange={handleChange} />
              <Field label="SWL" name="safe_working_load" value={form.safe_working_load} onChange={handleChange} />
              <Field label="Proof Load" name="proof_load" value={form.proof_load} onChange={handleChange} />
              <Field label="Lift Height" name="lifting_height" value={form.lifting_height} onChange={handleChange} />
              <Field label="Sling Length" name="sling_length" value={form.sling_length} onChange={handleChange} />
              <Field label="Chain Size" name="chain_size" value={form.chain_size} onChange={handleChange} />
              <Field label="Rope Diameter" name="rope_diameter" value={form.rope_diameter} onChange={handleChange} />
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Status and Dates</div>
            <div style={styles.grid3}>
              <Field label="Last Inspection Date" name="last_inspection_date" type="date" value={form.last_inspection_date} onChange={handleChange} />
              <Field label="Next Inspection Date" name="next_inspection_date" type="date" value={form.next_inspection_date} onChange={handleChange} />
              <SelectField label="License Status" name="license_status" value={form.license_status} onChange={handleChange} options={["valid", "expiring", "expired"]} />
              <Field label="License Expiry" name="license_expiry" type="date" value={form.license_expiry} onChange={handleChange} />
              <Field label="Condition" name="condition" value={form.condition} onChange={handleChange} />
              <SelectField label="Status" name="status" value={form.status} onChange={handleChange} options={["active", "inactive", "under_maintenance"]} />
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Notes</div>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={5}
              style={styles.textarea}
              placeholder="Equipment notes"
            />
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={() => router.push(`/equipment/${encodeURIComponent(tag)}`)}
              style={styles.secondaryBtn}
            >
              Cancel
            </button>

            <button type="submit" disabled={saving} style={styles.primaryBtn}>
              {saving ? "Saving..." : "Save Changes"}
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
  error: {
    marginBottom: 16,
    padding: "12px 14px",
    borderRadius: 12,
    background: "rgba(255,107,107,0.12)",
    border: "1px solid rgba(255,107,107,0.28)",
    color: C.danger,
    fontWeight: 700,
  },
};
