"use client";

import { useState } from "react";
import PdfCertificateImporter from "@/components/PdfCertificateImporter";

export default function ImportPdfPage() {
  const [formData, setFormData] = useState({
    certificate_number: "",
    client_name: "",
    asset_name: "",
    asset_type: "",
    manufacturer: "",
    model: "",
    serial_number: "",
    year_built: "",
    working_pressure_kpa: "",
    test_pressure_kpa: "",
    swl_tons: "",
    wll_tons: "",
    proof_load_tons: "",
    lift_height_m: "",
    sling_length_m: "",
    installation_date: "",
    location: "",
    inspection_date: "",
    inspector_name: "",
  });

  function handleImport(extracted) {
    setFormData((prev) => ({
      ...prev,
      certificate_number: extracted.certificate_number || "",
      client_name: extracted.client_name || "",
      asset_name: extracted.asset_name || "",
      asset_type: extracted.asset_type || "",
      manufacturer: extracted.manufacturer || "",
      model: extracted.model || "",
      serial_number: extracted.serial_number || "",
      year_built: extracted.year_built || "",
      working_pressure_kpa: extracted.working_pressure_kpa || "",
      test_pressure_kpa: extracted.test_pressure_kpa || "",
      swl_tons: extracted.swl_tons || "",
      wll_tons: extracted.wll_tons || "",
      proof_load_tons: extracted.proof_load_tons || "",
      lift_height_m: extracted.lift_height_m || "",
      sling_length_m: extracted.sling_length_m || "",
      installation_date: extracted.installation_date || "",
      location: extracted.location || "",
      inspection_date: extracted.inspection_date || "",
      inspector_name: extracted.inspector_name || "",
    }));
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <main style={{ padding: 24, background: "#030712", minHeight: "100vh", color: "#fff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <PdfCertificateImporter onImport={handleImport} />

        <div style={{ marginTop: 24, padding: 20, border: "1px solid #1f2937", borderRadius: 16 }}>
          <h2>Equipment Form</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            {Object.entries(formData).map(([key, value]) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                  {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </label>
                <input
                  name={key}
                  value={value}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #374151",
                    background: "#111827",
                    color: "#fff",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
