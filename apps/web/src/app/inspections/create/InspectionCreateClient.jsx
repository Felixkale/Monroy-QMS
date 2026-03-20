"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInspectionWithCertificate } from "@/services/inspections";

const DEFAULT_FORM = {
  asset_id: "",
  inspection_date: "",
  inspection_type: "",
  status: "PASS",
  equipment_status: "PASS",
  result: "",
  company: "",
  equipment_description: "",
  equipment_location: "",
  equipment_id: "",
  identification_number: "",
  inspection_no: "",
  lanyard_serial_no: "",
  manufacturer: "",
  model: "",
  year_built: "",
  country_of_origin: "",
  capacity: "",
  mawp: "",
  design_pressure: "",
  test_pressure: "",
  swl: "",
  proof_load: "",
  lifting_height: "",
  sling_length: "",
  chain_size: "",
  rope_diameter: "",
  legal_framework: "",
  inspector_name: "",
  inspector_id: "",
  logo_url: "",
  signature_url: "",
  issued_at: "",
  valid_to: "",
};

export default function InspectionCreateClient() {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  function updateField(name, value) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setSaving(true);

      const { certificate } = await createInspectionWithCertificate(form);

      alert("Inspection and certificate saved successfully.");
      router.push(`/certificates/${certificate.id}`);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save inspection and certificate.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 20 }}>Create Inspection</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, maxWidth: 900 }}>
        <input
          value={form.asset_id}
          onChange={(e) => updateField("asset_id", e.target.value)}
          placeholder="Asset ID"
          required
        />

        <input
          type="date"
          value={form.inspection_date}
          onChange={(e) => updateField("inspection_date", e.target.value)}
        />

        <input
          value={form.inspection_type}
          onChange={(e) => updateField("inspection_type", e.target.value)}
          placeholder="Inspection Type"
        />

        <select
          value={form.status}
          onChange={(e) => {
            updateField("status", e.target.value);
            updateField("equipment_status", e.target.value);
          }}
        >
          <option value="PASS">PASS</option>
          <option value="FAIL">FAIL</option>
          <option value="CONDITIONAL PASS">CONDITIONAL PASS</option>
          <option value="REPAIR">REPAIR</option>
        </select>

        <input
          value={form.company}
          onChange={(e) => updateField("company", e.target.value)}
          placeholder="Company"
        />

        <input
          value={form.equipment_description}
          onChange={(e) => updateField("equipment_description", e.target.value)}
          placeholder="Equipment Description"
        />

        <input
          value={form.equipment_location}
          onChange={(e) => updateField("equipment_location", e.target.value)}
          placeholder="Equipment Location"
        />

        <input
          value={form.equipment_id}
          onChange={(e) => updateField("equipment_id", e.target.value)}
          placeholder="Equipment ID"
        />

        <input
          value={form.identification_number}
          onChange={(e) => updateField("identification_number", e.target.value)}
          placeholder="Identification Number"
        />

        <input
          value={form.inspection_no}
          onChange={(e) => updateField("inspection_no", e.target.value)}
          placeholder="Inspection Number"
        />

        <input
          value={form.lanyard_serial_no}
          onChange={(e) => updateField("lanyard_serial_no", e.target.value)}
          placeholder="Lanyard Serial Number"
        />

        <input
          value={form.manufacturer}
          onChange={(e) => updateField("manufacturer", e.target.value)}
          placeholder="Manufacturer"
        />

        <input
          value={form.model}
          onChange={(e) => updateField("model", e.target.value)}
          placeholder="Model"
        />

        <input
          value={form.year_built}
          onChange={(e) => updateField("year_built", e.target.value)}
          placeholder="Year Built"
        />

        <input
          value={form.country_of_origin}
          onChange={(e) => updateField("country_of_origin", e.target.value)}
          placeholder="Country of Origin"
        />

        <input
          value={form.capacity}
          onChange={(e) => updateField("capacity", e.target.value)}
          placeholder="Capacity / Volume"
        />

        <input
          value={form.mawp}
          onChange={(e) => updateField("mawp", e.target.value)}
          placeholder="MAWP"
        />

        <input
          value={form.design_pressure}
          onChange={(e) => updateField("design_pressure", e.target.value)}
          placeholder="Design Pressure"
        />

        <input
          value={form.test_pressure}
          onChange={(e) => updateField("test_pressure", e.target.value)}
          placeholder="Test Pressure"
        />

        <input
          value={form.swl}
          onChange={(e) => updateField("swl", e.target.value)}
          placeholder="Safe Working Load"
        />

        <input
          value={form.proof_load}
          onChange={(e) => updateField("proof_load", e.target.value)}
          placeholder="Proof Load"
        />

        <input
          value={form.lifting_height}
          onChange={(e) => updateField("lifting_height", e.target.value)}
          placeholder="Lifting Height"
        />

        <input
          value={form.sling_length}
          onChange={(e) => updateField("sling_length", e.target.value)}
          placeholder="Sling Length"
        />

        <input
          value={form.chain_size}
          onChange={(e) => updateField("chain_size", e.target.value)}
          placeholder="Chain Size"
        />

        <input
          value={form.rope_diameter}
          onChange={(e) => updateField("rope_diameter", e.target.value)}
          placeholder="Rope Diameter"
        />

        <input
          value={form.legal_framework}
          onChange={(e) => updateField("legal_framework", e.target.value)}
          placeholder="Legal Framework"
        />

        <input
          value={form.inspector_name}
          onChange={(e) => updateField("inspector_name", e.target.value)}
          placeholder="Inspector Name"
        />

        <input
          value={form.inspector_id}
          onChange={(e) => updateField("inspector_id", e.target.value)}
          placeholder="Inspector ID"
        />

        <input
          value={form.logo_url}
          onChange={(e) => updateField("logo_url", e.target.value)}
          placeholder="Logo URL"
        />

        <input
          value={form.signature_url}
          onChange={(e) => updateField("signature_url", e.target.value)}
          placeholder="Signature URL"
        />

        <input
          type="date"
          value={form.issued_at}
          onChange={(e) => updateField("issued_at", e.target.value)}
        />

        <input
          type="date"
          value={form.valid_to}
          onChange={(e) => updateField("valid_to", e.target.value)}
        />

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Inspection"}
        </button>
      </form>
    </div>
  );
}
