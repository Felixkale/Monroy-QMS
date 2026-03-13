"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const labelStyle = {
  fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)",
  textTransform: "uppercase", letterSpacing: "0.08em",
  marginBottom: 6, display: "block",
};

const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)",
  color: "#e2e8f0", fontSize: 13, outline: "none",
  boxSizing: "border-box",
};

const fieldGroups = [
  {
    title: "Equipment Info",
    fields: [
      { key: "asset_type",       label: "Equipment Type" },
      { key: "serial_number",    label: "Serial Number" },
      { key: "manufacturer",     label: "Manufacturer" },
      { key: "model",            label: "Model" },
      { key: "year_built",       label: "Year of Manufacture" },
      { key: "country_of_origin",label: "Country of Origin" },
      { key: "capacity_volume",  label: "Capacity" },
      { key: "location",         label: "Location" },
    ],
  },
  {
    title: "Inspection Details",
    fields: [
      { key: "safe_working_load",    label: "Safe Working Load (SWL)" },
      { key: "working_pressure",     label: "Working Pressure (MAWP)" },
      { key: "last_inspection_date", label: "Last Inspection Date", type: "date" },
      { key: "next_inspection_date", label: "Next Inspection Date", type: "date" },
      { key: "inspector_name",       label: "Inspector Name" },
      { key: "license_status",       label: "License Status", type: "select",
        options: ["valid", "expired", "expiring", "pending", "suspended"] },
    ],
  },
  {
    title: "Additional",
    fields: [
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
];

export default function EditEquipmentPage() {
  const router = useRouter();
  const params = useParams();

  const [assetTag, setAssetTag] = useState(params?.tag || "");
  const [assetId,  setAssetId]  = useState(null);
  const [form,     setForm]     = useState({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

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
          asset_type:            data.asset_type            || "",
          serial_number:         data.serial_number         || "",
          manufacturer:          data.manufacturer          || "",
          model:                 data.model                 || "",
          year_built:            data.year_built            || "",
          country_of_origin:     data.country_of_origin     || "",
          capacity_volume:       data.capacity_volume       || "",
          location:              data.location              || "",
          safe_working_load:     data.safe_working_load     || "",
          working_pressure:      data.working_pressure      || "",
          last_inspection_date:  data.last_inspection_date  || "",
          next_inspection_date:  data.next_inspection_date  || "",
          inspector_name:        data.inspector_name        || "",
          license_status:        data.license_status        || "valid",
          notes:                 data.notes                 || "",
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
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!assetId) return;
    setSaving(true);
    setError("");
    setSuccess("");

    const { error: err } = await supabase
      .from("assets")
      .update({
        asset_type:            form.asset_type            || null,
        serial_number:         form.serial_number         || null,
        manufacturer:          form.manufacturer          || null,
        model:                 form.model                 || null,
        year_built:            form.year_built            || null,
        country_of_origin:     form.country_of_origin     || null,
        capacity_volume:       form.capacity_volume       || null,
        location:              form.location              || null,
        safe_working_load:     form.safe_working_load     || null,
        working_pressure:      form.working_pressure      || null,
        last_inspection_date:  form.last_inspection_date  || null,
        next_inspection_date:  form.next_inspection_date  || null,
        inspector_name:        form.inspector_name        || null,
        license_status:        form.license_status        || "valid",
        notes:                 form.notes                 || null,
      })
      .eq("id", assetId);

    setSaving(false);
    if (err) {
      setError("Failed to save: " + err.message);
    } else {
      setSuccess("Equipment updated successfully!");
      setTimeout(() => goBack(), 1200);
    }
  }

  return (
    <AppLayout title="Edit Equipment">
      <div style={{ maxWidth: 760 }}>

        <button onClick={goBack} style={{
          marginBottom: 20, padding: "9px 18px", borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.05)",
          color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>
          ← Back to Equipment
        </button>

        <h1 style={{ color: "#fff", marginBottom: 6, marginTop: 0 }}>Edit Equipment</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 28 }}>
          {assetTag ? `Asset Tag: ${assetTag}` : "Loading…"}
        </p>

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

        {loading ? (
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Loading equipment data…</p>
        ) : (
          <>
            {fieldGroups.map((group) => (
              <div key={group.title} style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16, padding: 24, marginBottom: 20,
              }}>
                <h3 style={{ color: "#fff", margin: "0 0 20px 0", fontSize: 14, fontWeight: 700 }}>
                  {group.title}
                </h3>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 16,
                }}>
                  {group.fields.map(({ key, label, type, options }) => (
                    <div key={key} style={{ gridColumn: type === "textarea" ? "1 / -1" : undefined }}>
                      <label style={labelStyle}>{label}</label>

                      {type === "select" ? (
                        <select
                          value={form[key] || ""}
                          onChange={(e) => handleChange(key, e.target.value)}
                          style={{ ...inputStyle, cursor: "pointer" }}
                        >
                          {options.map((o) => (
                            <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                          ))}
                        </select>
                      ) : type === "textarea" ? (
                        <textarea
                          value={form[key] || ""}
                          onChange={(e) => handleChange(key, e.target.value)}
                          rows={4}
                          style={{ ...inputStyle, resize: "vertical" }}
                        />
                      ) : (
                        <input
                          type={type || "text"}
                          value={form[key] || ""}
                          onChange={(e) => handleChange(key, e.target.value)}
                          style={inputStyle}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={handleSave} disabled={saving} style={{
                padding: "12px 28px", borderRadius: 8, border: "none",
                background: saving ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg,#667eea,#764ba2)",
                color: "#fff", fontWeight: 700, fontSize: 14,
                cursor: saving ? "not-allowed" : "pointer",
              }}>
                {saving ? "Saving…" : "Save Changes"}
              </button>

              <button onClick={goBack} disabled={saving} style={{
                padding: "12px 28px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "#fff", fontWeight: 600, fontSize: 14,
                cursor: saving ? "not-allowed" : "pointer",
              }}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
