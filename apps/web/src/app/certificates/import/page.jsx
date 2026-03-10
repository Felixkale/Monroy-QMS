"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const boxStyle = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 24,
};

export default function ImportCertificatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleImport() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!text.trim()) {
        throw new Error("Paste JSON data first.");
      }

      let rows;
      try {
        rows = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON format.");
      }

      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error("JSON must be a non-empty array.");
      }

      const payload = rows.map((row) => ({
        certificate_number: row.certificate_number || null,
        certificate_type: row.certificate_type || null,
        asset_id: row.asset_id || null,
        company: row.company || null,
        equipment_description: row.equipment_description || null,
        equipment_location: row.equipment_location || null,
        equipment_id: row.equipment_id || null,
        swl: row.swl || null,
        mawp: row.mawp || null,
        equipment_status: row.equipment_status || "PASS",
        issued_at: row.issued_at || new Date().toISOString(),
        valid_to: row.valid_to || null,
        status: row.status || "issued",
        legal_framework: row.legal_framework || null,
        inspector_name: row.inspector_name || null,
        inspector_id: row.inspector_id || null,
        signature_url: row.signature_url || null,
        logo_url: row.logo_url || null,
        pdf_url: row.pdf_url || null,
      }));

      const { error } = await supabase.from("certificates").insert(payload);

      if (error) throw error;

      setSuccess(`${payload.length} certificate(s) imported successfully.`);
      setText("");
    } catch (err) {
      setError(err?.message || "Import failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout title="Import Certificates">
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h1 style={{ color: "#fff", marginBottom: 20 }}>Import Certificates</h1>

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

        {success ? (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(34,197,94,0.35)",
              background: "rgba(34,197,94,0.08)",
              color: "#86efac",
            }}
          >
            {success}
          </div>
        ) : null}

        <div style={boxStyle}>
          <p style={{ color: "#cbd5e1", marginTop: 0 }}>
            Paste JSON array of certificate records here.
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`[
  {
    "asset_id": "uuid-here",
    "certificate_type": "Pressure Test Certificate",
    "company": "Acme Industrial Corp",
    "equipment_description": "Pressure Vessel",
    "equipment_location": "Plant Area A",
    "equipment_id": "CERT-00001",
    "mawp": "1000 kPa",
    "equipment_status": "PASS",
    "issued_at": "2026-03-10T10:00:00.000Z",
    "valid_to": "2027-03-10",
    "status": "issued"
  }
]`}
            style={{
              width: "100%",
              minHeight: 420,
              padding: 14,
              borderRadius: 12,
              background: "#0f172a",
              color: "#e5e7eb",
              border: "1px solid rgba(255,255,255,0.1)",
              fontFamily: "monospace",
              fontSize: 13,
              boxSizing: "border-box",
            }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
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
              type="button"
              onClick={handleImport}
              disabled={loading}
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                border: "none",
                background: "#2563eb",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Importing..." : "Import Certificates"}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
