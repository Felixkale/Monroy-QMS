"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const C = {
  green: "#00f5c4",
  purple: "#7c5cfc",
  blue: "#4fc3f7",
  pink: "#f472b6",
  yellow: "#fbbf24",
};

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(124,92,252,0.25)",
  borderRadius: 10,
  color: "#e2e8f0",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 6,
  display: "block",
};

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export default function CreateInspectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("client");

  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    asset_id: "",
    inspection_number: "",
    inspection_date: todayDateString(),
    inspector_name: "",
    result: "pass",
    notes: "",
  });

  useEffect(() => {
    let ignore = false;

    async function loadAssets() {
      setLoadingAssets(true);
      setError("");

      try {
        let q = supabase
          .from("assets")
          .select(`
            id,
            asset_tag,
            asset_name,
            asset_type,
            client_id,
            clients (
              company_name
            )
          `)
          .order("asset_tag", { ascending: true });

        if (preselectedClientId) {
          q = q.eq("client_id", preselectedClientId);
        }

        const { data, error } = await q;
        if (error) throw error;

        if (!ignore) {
          setAssets(data || []);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Failed to load equipment.");
          setAssets([]);
        }
      } finally {
        if (!ignore) setLoadingAssets(false);
      }
    }

    loadAssets();

    return () => {
      ignore = true;
    };
  }, [preselectedClientId]);

  const selectedAsset = useMemo(() => {
    return assets.find((a) => a.id === formData.asset_id) || null;
  }, [assets, formData.asset_id]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!formData.asset_id) {
        throw new Error("Please select equipment.");
      }

      const payload = {
        asset_id: formData.asset_id,
        inspection_number: formData.inspection_number.trim() || null,
        inspection_date: formData.inspection_date || null,
        inspector_name: formData.inspector_name.trim() || null,
        result: formData.result,
        notes: formData.notes.trim() || null,
      };

      const { data, error } = await supabase
        .from("inspections")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;

      setSuccess("Inspection created successfully.");

      setTimeout(() => {
        router.push(`/inspections/${data.id}`);
      }, 500);
    } catch (err) {
      setError(err.message || "Failed to create inspection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Create Inspection">
      <div style={{ maxWidth: 760 }}>
        <div style={{ marginBottom: 28 }}>
          <a href="/inspections" style={{ color: "#64748b", fontSize: 13, textDecoration: "none", display: "inline-block", marginBottom: 10 }}>
            ← Back to Inspections
          </a>

          <h1
            style={{
              fontSize: "clamp(22px,4vw,32px)",
              fontWeight: 900,
              margin: 0,
              background: `linear-gradient(90deg,#fff 30%,${C.green})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Create Inspection
          </h1>

          <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>
            Record a new inspection for equipment
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(244,114,182,0.1)",
              border: "1px solid rgba(244,114,182,0.3)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              color: C.pink,
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

        <form
          onSubmit={handleSubmit}
          style={{
            background: "linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
            border: "1px solid rgba(124,92,252,0.2)",
            borderRadius: 18,
            padding: "28px",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 16, marginBottom: 24 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Equipment *</label>
              <select
                style={{ ...inputStyle, cursor: "pointer" }}
                name="asset_id"
                value={formData.asset_id}
                onChange={handleChange}
                disabled={loadingAssets}
                required
              >
                <option value="">
                  {loadingAssets ? "Loading equipment..." : "Select equipment"}
                </option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.asset_tag} · {asset.asset_name || asset.asset_type || "Equipment"} · {asset.clients?.company_name || "No Client"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Inspection Number</label>
              <input
                style={inputStyle}
                type="text"
                name="inspection_number"
                placeholder="e.g. INS-2026-001"
                value={formData.inspection_number}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={labelStyle}>Inspection Date *</label>
              <input
                style={inputStyle}
                type="date"
                name="inspection_date"
                value={formData.inspection_date}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Inspector Name *</label>
              <input
                style={inputStyle}
                type="text"
                name="inspector_name"
                placeholder="Full name"
                value={formData.inspector_name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Result *</label>
              <select
                style={{ ...inputStyle, cursor: "pointer" }}
                name="result"
                value={formData.result}
                onChange={handleChange}
              >
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
                <option value="conditional">Conditional</option>
              </select>
            </div>
          </div>

          {selectedAsset && (
            <div
              style={{
                marginBottom: 24,
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(79,195,247,0.08)",
                border: "1px solid rgba(79,195,247,0.2)",
                color: "#cbd5e1",
                fontSize: 12,
              }}
            >
              Selected equipment: <strong style={{ color: "#fff" }}>{selectedAsset.asset_tag}</strong>
              {" · "}
              {selectedAsset.asset_name || selectedAsset.asset_type || "Equipment"}
              {" · "}
              {selectedAsset.clients?.company_name || "No Client"}
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Notes & Observations</label>
            <textarea
              style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
              name="notes"
              placeholder="Any observations or notes..."
              value={formData.notes}
              onChange={handleChange}
            />
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => router.back()}
              style={{
                padding: "11px 24px",
                borderRadius: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 700,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#94a3b8",
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "11px 28px",
                borderRadius: 12,
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                fontWeight: 700,
                background: saving
                  ? "rgba(255,255,255,0.1)"
                  : `linear-gradient(135deg,${C.purple},${C.blue})`,
                border: "none",
                color: "#fff",
                opacity: saving ? 0.7 : 1,
                boxShadow: `0 0 20px rgba(124,92,252,0.4)`,
              }}
            >
              {saving ? "Creating..." : "Create Inspection"}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
