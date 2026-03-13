"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

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
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)",
  color: "#e2e8f0",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
  background: "#111827",
};

const EQUIPMENT_TYPES = [
  "Pressure Vessel",
  "Boiler",
  "Air Receiver",
  "Air Compressor",
  "Oil Separator",
  "Trestle Jack",
  "Lever Hoist",
  "Bottle Jack",
  "Safety Harness",
  "Jack Stand",
  "Chain Block",
  "Bow Shackle",
  "Mobile Crane",
  "Trolley Jack",
  "Step Ladders",
  "Tifor",
  "Crawl Beam",
  "Beam Crawl",
  "Beam Clamp",
  "Webbing Sling",
  "Nylon Sling",
  "Wire Sling",
  "Fall Arrest",
  "Man Cage",
  "Shutter Clamp",
  "Drum Clamp",
  "Manual Rod Handlers",
];

const PRESSURE_EQUIPMENT_TYPES = [
  "Pressure Vessel",
  "Boiler",
  "Air Receiver",
  "Air Compressor",
  "Oil Separator",
];

const LIFTING_EQUIPMENT_TYPES = [
  "Trestle Jack",
  "Lever Hoist",
  "Bottle Jack",
  "Safety Harness",
  "Jack Stand",
  "Chain Block",
  "Bow Shackle",
  "Mobile Crane",
  "Trolley Jack",
  "Step Ladders",
  "Tifor",
  "Crawl Beam",
  "Beam Crawl",
  "Beam Clamp",
  "Webbing Sling",
  "Nylon Sling",
  "Wire Sling",
  "Fall Arrest",
  "Man Cage",
  "Shutter Clamp",
  "Drum Clamp",
  "Manual Rod Handlers",
];

const LANYARD_EQUIPMENT_TYPES = ["Safety Harness", "Fall Arrest"];

function sanitizeText(val, maxLen = 300) {
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

export default function EditEquipmentPage() {
  const router = useRouter();
  const params = useParams();

  const [assetTag, setAssetTag] = useState(params?.tag || "");
  const [assetId, setAssetId] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const tag = params?.tag;
    if (!tag) return;

    async function fetchEquipment() {
      setLoading(true);
      setError("");

      const { data, error: err } = await supabase
        .from("assets")
        .select("*")
        .eq("asset_tag", tag)
        .maybeSingle();

      if (err || !data) {
        setError("Equipment not found.");
      } else {
        setAssetId(data.id);
        setAssetTag(data.asset_tag);
        setForm({
          asset_type: data.asset_type || "",
          serial_number: data.serial_number || "",
          equipment_id: data.equipment_id || "",
          identification_number: data.identification_number || "",
          inspection_no: data.inspection_no || "",
          manufacturer: data.manufacturer || "",
          model: data.model || "",
          year_built: data.year_built || "",
          country_of_origin: data.country_of_origin || "",
          capacity_volume: data.capacity_volume || "",
          location: data.location || "",
          department: data.department || "",
          design_standard: data.design_standard || "",
          fluid_type: data.fluid_type || "",
          design_pressure: data.design_pressure || "",
          working_pressure: data.working_pressure || "",
          test_pressure: data.test_pressure || "",
          design_temperature: data.design_temperature || "",
          safe_working_load: data.safe_working_load || "",
          proof_load: data.proof_load || "",
          lifting_height: data.lifting_height || "",
          sling_length: data.sling_length || "",
          chain_size: data.chain_size || "",
          rope_diameter: data.rope_diameter || "",
          lanyard_serial_no: data.lanyard_serial_no || "",
          last_inspection_date: formatDateInput(data.last_inspection_date),
          next_inspection_date: formatDateInput(data.next_inspection_date),
          inspector_name: data.inspector_name || "",
          inspector_id: data.inspector_id || "",
          cert_type: data.cert_type || "",
          license_status: data.license_status || "valid",
          license_expiry: formatDateInput(data.license_expiry),
          condition: data.condition || "",
          status: data.status || "active",
          notes: data.notes || "",
        });
      }

      setLoading(false);
    }

    fetchEquipment();
  }, [params?.tag]);

  function goBack() {
    const tag = assetTag || form.asset_tag;
    if (tag) router.push(`/equipment/${tag}`);
    else router.push("/equipment");
  }

  function handleChange(key, value) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "asset_type") {
        const pressure = PRESSURE_EQUIPMENT_TYPES.includes(value);
        const lifting = LIFTING_EQUIPMENT_TYPES.includes(value);
        const hasLanyard = LANYARD_EQUIPMENT_TYPES.includes(value);

        if (pressure) {
          next.safe_working_load = "";
          next.proof_load = "";
          next.lifting_height = "";
          next.sling_length = "";
          next.chain_size = "";
          next.rope_diameter = "";
          next.lanyard_serial_no = "";
        }

        if (lifting && !hasLanyard) {
          next.design_pressure = "";
          next.working_pressure = "";
          next.test_pressure = "";
          next.design_temperature = "";
          next.capacity_volume = pressure ? next.capacity_volume : next.capacity_volume;
          next.fluid_type = "";
          next.lanyard_serial_no = "";
        }
      }

      return next;
    });
  }

  async function syncLatestCertificate() {
    const { data: cert } = await supabase
      .from("certificates")
      .select("id")
      .eq("asset_id", assetId)
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cert?.id) return;

    await supabase
      .from("certificates")
      .update({
        certificate_type: sanitizeText(form.cert_type, 100) || null,
        equipment_description: sanitizeText(form.asset_type, 100) || null,
        equipment_location: sanitizeText(form.location, 150) || null,
        equipment_id:
          sanitizeText(form.identification_number, 80) ||
          sanitizeText(form.equipment_id, 80) ||
          sanitizeText(form.serial_number, 80) ||
          null,
        lanyard_serial_no: sanitizeText(form.lanyard_serial_no, 80) || null,
        swl: sanitizeText(form.safe_working_load, 50) || null,
        mawp: sanitizeText(form.working_pressure, 50) || null,
        capacity: sanitizeText(form.capacity_volume, 50) || null,
        country_of_origin: sanitizeText(form.country_of_origin, 80) || null,
        year_built: sanitizeText(form.year_built, 20) || null,
        manufacturer: sanitizeText(form.manufacturer, 100) || null,
        model: sanitizeText(form.model, 100) || null,
        valid_to: form.next_inspection_date || null,
        legal_framework: sanitizeText(form.design_standard, 150) || null,
        inspector_name: sanitizeText(form.inspector_name, 100) || null,
        inspector_id: sanitizeText(form.inspector_id, 80) || null,
      })
      .eq("id", cert.id);
  }

  async function handleSave() {
    if (!assetId) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!sanitizeText(form.asset_type, 100)) {
        throw new Error("Equipment type is required.");
      }

      if (!sanitizeText(form.serial_number, 80)) {
        throw new Error("Serial number is required.");
      }

      if (form.last_inspection_date && form.next_inspection_date) {
        if (new Date(form.next_inspection_date) <= new Date(form.last_inspection_date)) {
          throw new Error("Next inspection date must be after last inspection date.");
        }
      }

      const payload = {
        asset_type: sanitizeText(form.asset_type, 100) || null,
        serial_number: sanitizeText(form.serial_number, 80) || null,
        equipment_id: sanitizeText(form.equipment_id, 80) || null,
        identification_number: sanitizeText(form.identification_number, 80) || null,
        inspection_no: sanitizeText(form.inspection_no, 80) || null,
        manufacturer: sanitizeText(form.manufacturer, 100) || null,
        model: sanitizeText(form.model, 100) || null,
        year_built: sanitizeText(form.year_built, 20) || null,
        country_of_origin: sanitizeText(form.country_of_origin, 80) || null,
        capacity_volume: sanitizeText(form.capacity_volume, 50) || null,
        location: sanitizeText(form.location, 150) || null,
        department: sanitizeText(form.department, 100) || null,
        design_standard: sanitizeText(form.design_standard, 150) || null,
        fluid_type: sanitizeText(form.fluid_type, 80) || null,
        design_pressure: sanitizeText(form.design_pressure, 50) || null,
        working_pressure: sanitizeText(form.working_pressure, 50) || null,
        test_pressure: sanitizeText(form.test_pressure, 50) || null,
        design_temperature: sanitizeText(form.design_temperature, 50) || null,
        safe_working_load: sanitizeText(form.safe_working_load, 50) || null,
        proof_load: sanitizeText(form.proof_load, 50) || null,
        lifting_height: sanitizeText(form.lifting_height, 50) || null,
        sling_length: sanitizeText(form.sling_length, 50) || null,
        chain_size: sanitizeText(form.chain_size, 50) || null,
        rope_diameter: sanitizeText(form.rope_diameter, 50) || null,
        lanyard_serial_no: sanitizeText(form.lanyard_serial_no, 80) || null,
        last_inspection_date: form.last_inspection_date || null,
        next_inspection_date: form.next_inspection_date || null,
        inspector_name: sanitizeText(form.inspector_name, 100) || null,
        inspector_id: sanitizeText(form.inspector_id, 80) || null,
        cert_type: sanitizeText(form.cert_type, 100) || null,
        license_status: sanitizeText(form.license_status, 30) || "valid",
        license_expiry: form.license_expiry || null,
        condition: sanitizeText(form.condition, 50) || null,
        status: sanitizeText(form.status, 30) || "active",
        notes: sanitizeText(form.notes, 1000) || null,
      };

      const { error: err } = await supabase
        .from("assets")
        .update(payload)
        .eq("id", assetId);

      if (err) throw err;

      await syncLatestCertificate();

      setSuccess("Equipment updated successfully!");
      setTimeout(() => goBack(), 1200);
    } catch (err) {
      setError("Failed to save: " + (err?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  const isPressureEquipment = PRESSURE_EQUIPMENT_TYPES.includes(form.asset_type);
  const isLiftingEquipment = LIFTING_EQUIPMENT_TYPES.includes(form.asset_type);
  const hasLanyardField = LANYARD_EQUIPMENT_TYPES.includes(form.asset_type);

  return (
    <AppLayout title="Edit Equipment">
      <div style={{ maxWidth: 960 }}>
        <button
          onClick={goBack}
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

        <h1 style={{ color: "#fff", marginBottom: 6, marginTop: 0 }}>Edit Equipment</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 28 }}>
          {assetTag ? `Asset Tag: ${assetTag}` : "Loading…"}
        </p>

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

        {loading ? (
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
            Loading equipment data…
          </p>
        ) : (
          <>
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: 24,
                marginBottom: 20,
              }}
            >
              <h3 style={{ color: "#fff", margin: "0 0 20px 0", fontSize: 14, fontWeight: 700 }}>
                Equipment Info
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                <div>
                  <label style={labelStyle}>Equipment Type</label>
                  <select
                    value={form.asset_type || ""}
                    onChange={(e) => handleChange("asset_type", e.target.value)}
                    style={selectStyle}
                  >
                    {EQUIPMENT_TYPES.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Serial Number</label>
                  <input
                    value={form.serial_number || ""}
                    onChange={(e) => handleChange("serial_number", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Equipment ID</label>
                  <input
                    value={form.equipment_id || ""}
                    onChange={(e) => handleChange("equipment_id", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Identification Number</label>
                  <input
                    value={form.identification_number || ""}
                    onChange={(e) => handleChange("identification_number", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Inspection No.</label>
                  <input
                    value={form.inspection_no || ""}
                    onChange={(e) => handleChange("inspection_no", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {hasLanyardField && (
                  <div>
                    <label style={labelStyle}>Lanyard Serial No.</label>
                    <input
                      value={form.lanyard_serial_no || ""}
                      onChange={(e) => handleChange("lanyard_serial_no", e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                )}

                <div>
                  <label style={labelStyle}>Manufacturer</label>
                  <input
                    value={form.manufacturer || ""}
                    onChange={(e) => handleChange("manufacturer", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Model</label>
                  <input
                    value={form.model || ""}
                    onChange={(e) => handleChange("model", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Year Built</label>
                  <input
                    value={form.year_built || ""}
                    onChange={(e) => handleChange("year_built", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Country of Origin</label>
                  <input
                    value={form.country_of_origin || ""}
                    onChange={(e) => handleChange("country_of_origin", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Capacity</label>
                  <input
                    value={form.capacity_volume || ""}
                    onChange={(e) => handleChange("capacity_volume", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Location</label>
                  <input
                    value={form.location || ""}
                    onChange={(e) => handleChange("location", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Department</label>
                  <input
                    value={form.department || ""}
                    onChange={(e) => handleChange("department", e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: 24,
                marginBottom: 20,
              }}
            >
              <h3 style={{ color: "#fff", margin: "0 0 20px 0", fontSize: 14, fontWeight: 700 }}>
                Technical Details
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                <div>
                  <label style={labelStyle}>Certificate Type</label>
                  <input
                    value={form.cert_type || ""}
                    onChange={(e) => handleChange("cert_type", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Design Standard</label>
                  <input
                    value={form.design_standard || ""}
                    onChange={(e) => handleChange("design_standard", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {isPressureEquipment && (
                  <>
                    <div>
                      <label style={labelStyle}>Fluid Type</label>
                      <input
                        value={form.fluid_type || ""}
                        onChange={(e) => handleChange("fluid_type", e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Design Pressure</label>
                      <input
                        value={form.design_pressure || ""}
                        onChange={(e) => handleChange("design_pressure", e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Working Pressure</label>
                      <input
                        value={form.working_pressure || ""}
                        onChange={(e) => handleChange("working_pressure", e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Test Pressure</label>
                      <input
                        value={form.test_pressure || ""}
                        onChange={(e) => handleChange("test_pressure", e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Design Temperature</label>
                      <input
                        value={form.design_temperature || ""}
                        onChange={(e) => handleChange("design_temperature", e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  </>
                )}

                {isLiftingEquipment && (
                  <>
                    <div>
                      <label style={labelStyle}>Safe Working Load</label>
                      <input
                        value={form.safe_working_load || ""}
                        onChange={(e) => handleChange("safe_working_load", e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Proof Load</label>
                      <input
                        value={form.proof_load || ""}
                        onChange={(e) => handleChange("proof_load", e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Lift Height</label>
                      <input
                        value={form.lifting_height || ""}
                        onChange={(e) => handleChange("lifting_height", e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Sling Length</label>
                      <input
                        value={form.sling_length || ""}
                        onChange={(e) => handleChange("sling_length", e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Chain Size</label>
                      <input
                        value={form.chain_size || ""}
                        onChange={(e) => handleChange("chain_size", e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Rope / Wire Diameter</label>
                      <input
                        value={form.rope_diameter || ""}
                        onChange={(e) => handleChange("rope_diameter", e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: 24,
                marginBottom: 20,
              }}
            >
              <h3 style={{ color: "#fff", margin: "0 0 20px 0", fontSize: 14, fontWeight: 700 }}>
                Inspection Details
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                <div>
                  <label style={labelStyle}>Last Inspection Date</label>
                  <input
                    type="date"
                    value={form.last_inspection_date || ""}
                    onChange={(e) => handleChange("last_inspection_date", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Next Inspection Date</label>
                  <input
                    type="date"
                    value={form.next_inspection_date || ""}
                    onChange={(e) => handleChange("next_inspection_date", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Inspector Name</label>
                  <input
                    value={form.inspector_name || ""}
                    onChange={(e) => handleChange("inspector_name", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Inspector ID</label>
                  <input
                    value={form.inspector_id || ""}
                    onChange={(e) => handleChange("inspector_id", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>License Status</label>
                  <select
                    value={form.license_status || "valid"}
                    onChange={(e) => handleChange("license_status", e.target.value)}
                    style={selectStyle}
                  >
                    {["valid", "expired", "expiring", "pending", "suspended"].map((o) => (
                      <option key={o} value={o}>
                        {o.charAt(0).toUpperCase() + o.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>License Expiry</label>
                  <input
                    type="date"
                    value={form.license_expiry || ""}
                    onChange={(e) => handleChange("license_expiry", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Condition</label>
                  <input
                    value={form.condition || ""}
                    onChange={(e) => handleChange("condition", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Status</label>
                  <select
                    value={form.status || "active"}
                    onChange={(e) => handleChange("status", e.target.value)}
                    style={selectStyle}
                  >
                    {["active", "inactive", "suspended"].map((o) => (
                      <option key={o} value={o}>
                        {o.charAt(0).toUpperCase() + o.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: 24,
                marginBottom: 20,
              }}
            >
              <h3 style={{ color: "#fff", margin: "0 0 20px 0", fontSize: 14, fontWeight: 700 }}>
                Notes
              </h3>

              <div>
                <label style={labelStyle}>Notes</label>
                <textarea
                  value={form.notes || ""}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  rows={5}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "12px 28px",
                  borderRadius: 8,
                  border: "none",
                  background: saving
                    ? "rgba(255,255,255,0.1)"
                    : "linear-gradient(135deg,#667eea,#764ba2)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>

              <button
                onClick={goBack}
                disabled={saving}
                style={{
                  padding: "12px 28px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
