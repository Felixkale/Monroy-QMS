"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  color: "rgba(255,255,255,0.5)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 6,
  display: "block",
};

export default function ImportCertificatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState("");

  const handleImport = async () => {
    try {
      setLoading(true);
      setError("");

      const parsed = JSON.parse(jsonText);

      if (!Array.isArray(parsed)) {
        throw new Error("JSON must be an array of certificates.");
      }

      const payload = parsed.map((item) => ({
        certificate_type: item.certificate_type || "Certificate of Statutory Inspection",
        asset_id: item.asset_id || null,
        company: item.company || null,
        equipment_description: item.equipment_description || null,
        equipment_location: item.equipment_location || null,
        equipment_id: item.equipment_id || null,
        swl: item.swl || null,
        mawp: item.mawp || null,
        equipment_status: item.equipment_status || "PASS",
        issued_at: item.issued_at || new Date().toISOString(),
        valid_to: item.valid_to || null,
        status: item.status || "issued",
        legal_framework: "Mines, Quarries, Works and Machinery Act Cap 44:02",
        inspector_name: item.inspector_name || null,
        inspector_id: item.inspector_id || null,
        signature_url: item.signature_url || null,
        logo_url: item.logo_url || "/monroy-logo.png",
        pdf_url: item.pdf_url || null,
      }));

      const { error } = await supabase.from("certificates").insert(payload);

      if (error) throw error;

      router.push("/certificates");
    } catch (err) {
      setError(err?.message || "Failed to import certificates.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Import Certificates">
      <div style={{ maxWidth: 1000 }}>
        <h1 style={{ color: "#fff", marginBottom: 16 }}>Import Certificates</h1>

        {error && (
          <div style={{ background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, color: "#f472b6", fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Paste JSON Array</label>
          <textarea
            style={{ ...inputStyle, minHeight: 400, resize: "vertical" }}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='[{"asset_id":"...","company":"...","inspector_name":"..."}]'
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            onClick={() => router.push("/certificates")}
            style={{ padding: "11px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 700, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleImport}
            disabled={loading}
            style={{ padding: "11px 28px", borderRadius: 8, cursor: loading ? "wait" : "pointer", fontWeight: 700, background: "linear-gradient(135deg,#667eea,#764ba2)", border: "none", color: "#fff", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Importing..." : "Import Certificates"}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
