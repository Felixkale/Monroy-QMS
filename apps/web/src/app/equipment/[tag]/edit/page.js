"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import { updateEquipmentById } from "@/services/equipment";

const labelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: "rgba(255,255,255,0.5)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 6,
  display: "block",
};

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

const sectionStyle = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 24,
  marginBottom: 24,
};

const sectionTitle = {
  color: "#fff",
  fontSize: 15,
  fontWeight: 700,
  marginBottom: 20,
  marginTop: 0,
  paddingBottom: 12,
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 16,
};

function Field({ label, name, value, onChange, type = "text", readOnly = false }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        readOnly={readOnly}
        style={{
          ...inputStyle,
          ...(readOnly ? { opacity: 0.5, cursor: "not-allowed" } : {}),
        }}
      />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options = [], placeholder = "Select..." }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select
        name={name}
        value={value ?? ""}
        onChange={onChange}
        style={{
          ...inputStyle,
          cursor: "pointer",
          appearance: "auto",
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const EQUIPMENT_TYPES = [
  "Pressure Vessel", "Boiler", "Air Receiver", "Air Compressor", "Oil Separator",
  "Trestle Jack", "Trestle Stand", "Lever Hoist", "Bottle Jack", "Safety Harness",
  "Jack Stand", "Chain Block", "Bow Shackle", "Mobile Crane", "Overhead Crane",
  "Trolley Jack", "Step Ladders", "Tifor", "Crawl Beam", "Beam Crawl",
  "Beam Clamp", "Webbing Sling", "Nylon Sling", "Wire Sling", "Wire Rope",
  "Fall Arrest", "Man Cage", "Shutter Clamp", "Drum Clamp", "Scissor Lift",
  "Axile Jack", "Personnel Basket", "Load Cell", "Other",
];

const CERT_TYPES = [
  "Load Test Certificate",
  "Pressure Test Certificate",
  "Certificate of Statutory Inspection",
  "Inspection Certificate",
];

const STATUS_OPTIONS = ["active", "inactive", "decommissioned"];
const LICENSE_STATUS_OPTIONS = ["valid", "expired", "pending"];

export default function EditEquipmentPage() {
  const params = useParams();
  const router = useRouter();
  const assetTag = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [clients, setClients] = useState([]);
  const [assetId, setAssetId] = useState(null);

  const [form, setForm] = useState({
    client_id: "",
    asset_name: "",
    asset_tag: "",
    asset_type: "",
    manufacturer: "",
    model: "",
    serial_number: "",
    year_built: "",
    location: "",
    status: "active",
    license_status: "valid",
    license_expiry: "",
    cert_type: "",
    design_standard: "",
    // Lifting fields
    safe_working_load: "",
    proof_load: "",
    lifting_height: "",
    sling_length: "",
    chain_size: "",
    rope_diameter: "",
    // Pressure fields
    design_pressure: "",
    working_pressure: "",
    test_pressure: "",
    design_temperature: "",
    capacity_volume: "",
    shell_material: "",
    fluid_type: "",
    // Inspection fields
    last_inspection_date: "",
    next_inspection_date: "",
    inspector_name: "",
    inspection_freq: "",
    // Other
    department: "",
    condition: "",
    notes: "",
  });

  useEffect(() => {
    if (assetTag) {
      fetchEquipment();
      fetchClients();
    }
  }, [assetTag]);

  async function fetchEquipment() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("assets")
        .select("*, clients(id, company_name, company_code)")
        .eq("asset_tag", assetTag)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Equipment not found.");

      setAssetId(data.id);
      setForm({
        client_id: data.client_id ?? "",
        asset_name: data.asset_name ?? "",
        asset_tag: data.asset_tag ?? "",
        asset_type: data.asset_type ?? "",
        manufacturer: data.manufacturer ?? "",
        model: data.model ?? "",
        serial_number: data.serial_number ?? "",
        year_built: data.year_built ?? "",
        location: data.location ?? "",
        status: data.status ?? "active",
        license_status: data.license_status ?? "valid",
        license_expiry: data.license_expiry ?? "",
        cert_type: data.cert_type ?? "",
        design_standard: data.design_standard ?? "",
        safe_working_load: data.safe_working_load ?? "",
        proof_load: data.proof_load ?? "",
        lifting_height: data.lifting_height ?? "",
        sling_length: data.sling_length ?? "",
        chain_size: data.chain_size ?? "",
        rope_diameter: data.rope_diameter ?? "",
        design_pressure: data.design_pressure ?? "",
        working_pressure: data.working_pressure ?? "",
        test_pressure: data.test_pressure ?? "",
        design_temperature: data.design_temperature ?? "",
        capacity_volume: data.capacity_volume ?? "",
        shell_material: data.shell_material ?? "",
        fluid_type: data.fluid_type ?? "",
        last_inspection_date: data.last_inspection_date ?? "",
        next_inspection_date: data.next_inspection_date ?? "",
        inspector_name: data.inspector_name ?? "",
        inspection_freq: data.inspection_freq ?? "",
        department: data.department ?? "",
        condition: data.condition ?? "",
        notes: data.notes ?? "",
      });
    } catch (err) {
      setError(err.message || "Failed to load equipment.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchClients() {
    const { data } = await supabase
      .from("clients")
      .select("id, company_name, company_code")
      .eq("status", "active")
      .order("company_name", { ascending: true });

    if (data) {
      setClients(
        data.map((c) => ({
          value: c.id,
          label: `${c.company_name}${c.company_code ? ` (${c.company_code})` : ""}`,
        }))
      );
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!assetId) throw new Error("Asset ID not found.");
      if (!form.asset_type) throw new Error("Equipment type is required.");

      const { data, error } = await updateEquipmentById(assetId, {
        ...form,
        // ensure asset_name stays in sync if user cleared it
        asset_name:
          form.asset_name?.trim() ||
          `${form.asset_type}${form.serial_number ? " - " + form.serial_number : ""}`,
      });

      if (error) throw new Error(error.message || "Failed to save.");

      setSuccess("Equipment saved successfully!");
      setTimeout(() => {
        router.push(`/equipment/${form.asset_tag}`);
      }, 1200);
    } catch (err) {
      setError(err.message || "Failed to save equipment.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Edit Equipment">
        <div style={{ color: "#fff", padding: 40 }}>Loading equipment...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Edit Equipment">
      <div style={{ maxWidth: 1100 }}>
        <button
          onClick={() => router.push(`/equipment/${assetTag}`)}
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
          ← Back to Equipment
        </button>

        <h1 style={{ color: "#fff", marginBottom: 24, marginTop: 0 }}>
          Edit Equipment
        </h1>

        {error && (
          <div style={{
            background: "rgba(244,114,182,0.1)",
            border: "1px solid rgba(244,114,182,0.3)",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 20,
            color: "#f472b6",
            fontSize: 13,
          }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.35)",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 20,
            color: "#86efac",
            fontSize: 13,
          }}>
            ✅ {success}
          </div>
        )}

        {/* ── IDENTITY ── */}
        <div style={sectionStyle}>
          <h2 style={sectionTitle}>Identity</h2>
          <div style={gridStyle}>
            <SelectField
              label="Client / Company *"
              name="client_id"
              value={form.client_id}
              onChange={handleChange}
              options={clients}
              placeholder="Select a client..."
            />
            <Field
              label="Asset Tag (auto-generated)"
              name="asset_tag"
              value={form.asset_tag}
              onChange={handleChange}
              readOnly
            />
            <Field
              label="Asset Name"
              name="asset_name"
              value={form.asset_name}
              onChange={handleChange}
            />
            <SelectField
              label="Equipment Type *"
              name="asset_type"
              value={form.asset_type}
              onChange={handleChange}
              options={EQUIPMENT_TYPES.map((t) => ({ value: t, label: t }))}
              placeholder="Select equipment type..."
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
              label="Serial Number"
              name="serial_number"
              value={form.serial_number}
              onChange={handleChange}
            />
            <Field
              label="Year Built"
              name="year_built"
              value={form.year_built}
              onChange={handleChange}
            />
            <Field
              label="Location"
              name="location"
              value={form.location}
              onChange={handleChange}
            />
            <Field
              label="Department"
              name="department"
              value={form.department}
              onChange={handleChange}
            />
            <SelectField
              label="Status"
              name="status"
              value={form.status}
              onChange={handleChange}
              options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
            />
            <SelectField
              label="License Status"
              name="license_status"
              value={form.license_status}
              onChange={handleChange}
              options={LICENSE_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
            />
            <Field
              label="License Expiry Date"
              name="license_expiry"
              type="date"
              value={form.license_expiry}
              onChange={handleChange}
            />
            <SelectField
              label="Certificate Type"
              name="cert_type"
              value={form.cert_type}
              onChange={handleChange}
              options={CERT_TYPES.map((t) => ({ value: t, label: t }))}
              placeholder="Select certificate type..."
            />
            <Field
              label="Design Standard"
              name="design_standard"
              value={form.design_standard}
              onChange={handleChange}
            />
            <Field
              label="Condition"
              name="condition"
              value={form.condition}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* ── LIFTING ── */}
        <div style={sectionStyle}>
          <h2 style={sectionTitle}>Lifting & Load Data</h2>
          <div style={gridStyle}>
            <Field label="Safe Working Load (SWL)" name="safe_working_load" value={form.safe_working_load} onChange={handleChange} />
            <Field label="Proof Load" name="proof_load" value={form.proof_load} onChange={handleChange} />
            <Field label="Lifting Height" name="lifting_height" value={form.lifting_height} onChange={handleChange} />
            <Field label="Sling Length" name="sling_length" value={form.sling_length} onChange={handleChange} />
            <Field label="Chain Size" name="chain_size" value={form.chain_size} onChange={handleChange} />
            <Field label="Rope Diameter" name="rope_diameter" value={form.rope_diameter} onChange={handleChange} />
          </div>
        </div>

        {/* ── PRESSURE ── */}
        <div style={sectionStyle}>
          <h2 style={sectionTitle}>Pressure & Vessel Data</h2>
          <div style={gridStyle}>
            <Field label="Design Pressure" name="design_pressure" value={form.design_pressure} onChange={handleChange} />
            <Field label="Working Pressure" name="working_pressure" value={form.working_pressure} onChange={handleChange} />
            <Field label="Test Pressure" name="test_pressure" value={form.test_pressure} onChange={handleChange} />
            <Field label="Design Temperature" name="design_temperature" value={form.design_temperature} onChange={handleChange} />
            <Field label="Capacity / Volume" name="capacity_volume" value={form.capacity_volume} onChange={handleChange} />
            <Field label="Shell Material" name="shell_material" value={form.shell_material} onChange={handleChange} />
            <Field label="Fluid Type" name="fluid_type" value={form.fluid_type} onChange={handleChange} />
          </div>
        </div>

        {/* ── INSPECTION ── */}
        <div style={sectionStyle}>
          <h2 style={sectionTitle}>Inspection Details</h2>
          <div style={gridStyle}>
            <Field label="Inspector Name" name="inspector_name" value={form.inspector_name} onChange={handleChange} />
            <Field label="Last Inspection Date" name="last_inspection_date" type="date" value={form.last_inspection_date} onChange={handleChange} />
            <Field label="Next Inspection Date" name="next_inspection_date" type="date" value={form.next_inspection_date} onChange={handleChange} />
            <Field label="Inspection Frequency" name="inspection_freq" value={form.inspection_freq} onChange={handleChange} />
          </div>
        </div>

        {/* ── NOTES ── */}
        <div style={sectionStyle}>
          <h2 style={sectionTitle}>Notes</h2>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              name="notes"
              value={form.notes ?? ""}
              onChange={handleChange}
              rows={4}
              style={{ ...inputStyle, resize: "vertical", minHeight: 100 }}
            />
          </div>
        </div>

        {/* ── ACTIONS ── */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
          <button
            onClick={handleSave}
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
            {saving ? "Saving..." : "Save Equipment"}
          </button>

          <button
            onClick={() => router.push(`/equipment/${assetTag}`)}
            disabled={saving}
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
            Cancel
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
