"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const C = {
  green: "#00f5c4",
  purple: "#7c5cfc",
  blue: "#4fc3f7",
  pink: "#f472b6",
};

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(124,92,252,0.25)",
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

const REPORT_TYPES = [
  {
    value: "certificates",
    label: "Certificate Report",
    desc: "All issued certificates with status, dates and inspector info",
  },
  {
    value: "equipment",
    label: "Equipment Report",
    desc: "Full equipment register with inspection dates and SWL/MAWP",
  },
  {
    value: "expiring",
    label: "Expiring Certificates",
    desc: "Certificates expiring within the selected date range",
  },
  {
    value: "failed",
    label: "Failed Inspections",
    desc: "All equipment with FAIL or CONDITIONAL status",
  },
  {
    value: "clients",
    label: "Client Summary",
    desc: "Per-client equipment and certificate summary",
  },
];

function toEndOfDay(date) {
  if (!date) return "";
  return `${date}T23:59:59.999`;
}

function escapeCsvValue(value) {
  const safe = value ?? "";
  return `"${String(safe).replace(/"/g, '""')}"`;
}

function flattenRow(row) {
  const out = { ...row };

  Object.keys(out).forEach((key) => {
    if (out[key] && typeof out[key] === "object" && !Array.isArray(out[key])) {
      Object.entries(out[key]).forEach(([nestedKey, nestedValue]) => {
        out[`${key}_${nestedKey}`] = nestedValue;
      });
      delete out[key];
    }
  });

  return out;
}

export default function ExportReportPage() {
  const router = useRouter();

  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    reportType: "certificates",
    startDate: "",
    endDate: "",
    clientId: "all",
    format: "CSV",
  });
  const [loadingClients, setLoadingClients] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadClients() {
      setLoadingClients(true);
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name, status")
        .order("company_name", { ascending: true });

      if (!ignore) {
        if (error) {
          setError(error.message || "Failed to load clients.");
          setClients([]);
        } else {
          setClients((data || []).filter((c) => c.status === "active"));
        }
        setLoadingClients(false);
      }
    }

    loadClients();

    return () => {
      ignore = true;
    };
  }, []);

  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === form.clientId) || null;
  }, [clients, form.clientId]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function downloadCsv(rows, filename) {
    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((h) => escapeCsvValue(row[h])).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadJson(rows, filename) {
    const blob = new Blob([JSON.stringify(rows, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function generateCertificatesReport(type) {
    let q = supabase.from("certificates").select(`
      id,
      client_id,
      certificate_number,
      certificate_type,
      company,
      equipment_description,
      equipment_location,
      equipment_id,
      swl,
      mawp,
      capacity,
      country_of_origin,
      year_built,
      manufacturer,
      model,
      equipment_status,
      issued_at,
      valid_to,
      inspector_name,
      inspector_id
    `);

    if (form.clientId !== "all") {
      q = q.eq("client_id", form.clientId);
    }

    if (type === "certificates") {
      if (form.startDate) q = q.gte("issued_at", form.startDate);
      if (form.endDate) q = q.lte("issued_at", toEndOfDay(form.endDate));
    }

    if (type === "expiring") {
      if (form.startDate) {
        q = q.gte("valid_to", form.startDate);
      }
      if (form.endDate) {
        q = q.lte("valid_to", toEndOfDay(form.endDate));
      }
    }

    if (type === "failed") {
      q = q.in("equipment_status", ["FAIL", "CONDITIONAL"]);
      if (form.startDate) q = q.gte("issued_at", form.startDate);
      if (form.endDate) q = q.lte("issued_at", toEndOfDay(form.endDate));
    }

    q = q.order(
      type === "expiring" ? "valid_to" : "issued_at",
      { ascending: false }
    );

    const { data, error } = await q;
    if (error) throw error;

    return (data || []).map(flattenRow);
  }

  async function generateEquipmentReport() {
    let q = supabase.from("assets").select(`
      id,
      client_id,
      asset_tag,
      asset_name,
      asset_type,
      serial_number,
      manufacturer,
      model,
      year_built,
      country_of_origin,
      capacity_volume,
      safe_working_load,
      working_pressure,
      location,
      last_inspection_date,
      next_inspection_date,
      license_status,
      clients (
        company_name
      )
    `);

    if (form.clientId !== "all") {
      q = q.eq("client_id", form.clientId);
    }

    if (form.startDate) {
      q = q.gte("last_inspection_date", form.startDate);
    }
    if (form.endDate) {
      q = q.lte("last_inspection_date", form.endDate);
    }

    q = q.order("asset_tag", { ascending: true });

    const { data, error } = await q;
    if (error) throw error;

    return (data || []).map((row) => {
      const flat = flattenRow(row);
      if (flat.clients_company_name) {
        flat.client = flat.clients_company_name;
        delete flat.clients_company_name;
      }
      return flat;
    });
  }

  async function generateClientSummaryReport() {
    let q = supabase
      .from("clients")
      .select("id, company_name, company_code, status, created_at")
      .order("company_name", { ascending: true });

    if (form.clientId !== "all") {
      q = q.eq("id", form.clientId);
    }

    const { data: clientRows, error: clientError } = await q;
    if (clientError) throw clientError;

    const rows = [];

    for (const client of clientRows || []) {
      let assetCountQuery = supabase
        .from("assets")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id);

      let certCountQuery = supabase
        .from("certificates")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id);

      let expiringCountQuery = supabase
        .from("certificates")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id);

      if (form.startDate) {
        certCountQuery = certCountQuery.gte("issued_at", form.startDate);
        expiringCountQuery = expiringCountQuery.gte("valid_to", form.startDate);
      }

      if (form.endDate) {
        certCountQuery = certCountQuery.lte("issued_at", toEndOfDay(form.endDate));
        expiringCountQuery = expiringCountQuery.lte("valid_to", toEndOfDay(form.endDate));
      }

      const [
        { count: equipment_count, error: assetErr },
        { count: certificate_count, error: certErr },
        { count: expiring_certificate_count, error: expErr },
      ] = await Promise.all([
        assetCountQuery,
        certCountQuery,
        expiringCountQuery,
      ]);

      if (assetErr) throw assetErr;
      if (certErr) throw certErr;
      if (expErr) throw expErr;

      rows.push({
        client_id: client.id,
        company_name: client.company_name,
        company_code: client.company_code,
        status: client.status,
        created_at: client.created_at,
        equipment_count: equipment_count || 0,
        certificate_count: certificate_count || 0,
        expiring_certificate_count: expiring_certificate_count || 0,
      });
    }

    return rows;
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setGenerating(true);
    setError("");
    setSuccess("");

    try {
      const selectedType = form.reportType;

      if (
        selectedType === "expiring" &&
        !form.startDate &&
        !form.endDate
      ) {
        throw new Error("Please choose a start date, end date, or both for expiring certificates.");
      }

      let rows = [];

      if (
        selectedType === "certificates" ||
        selectedType === "expiring" ||
        selectedType === "failed"
      ) {
        rows = await generateCertificatesReport(selectedType);
      } else if (selectedType === "equipment") {
        rows = await generateEquipmentReport();
      } else if (selectedType === "clients") {
        rows = await generateClientSummaryReport();
      }

      if (!rows.length) {
        throw new Error("No data found for the selected filters.");
      }

      const fileDate = new Date().toISOString().slice(0, 10);
      const fileBase = `monroy-${selectedType}-report-${fileDate}`;

      if (form.format === "CSV") {
        downloadCsv(rows, `${fileBase}.csv`);
        setSuccess(`✅ ${rows.length} records exported as CSV.`);
      } else if (form.format === "JSON") {
        downloadJson(rows, `${fileBase}.json`);
        setSuccess(`✅ ${rows.length} records exported as JSON.`);
      } else {
        const params = new URLSearchParams({
          type: form.reportType,
          client: form.clientId,
          start: form.startDate || "",
          end: form.endDate || "",
        });

        router.push(`/reports/print?${params.toString()}`);
      }
    } catch (err) {
      setError(err.message || "Failed to generate report.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <AppLayout title="Export Report">
      <div style={{ maxWidth: 680 }}>
        <button
          onClick={() => router.push("/reports")}
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
          ← Back to Reports
        </button>

        <h1 style={{ color: "#fff", margin: "0 0 6px", fontSize: 26, fontWeight: 900 }}>
          Export Report
        </h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 28 }}>
          Download live data from the QMS as CSV, JSON, or PDF
        </p>

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
            {success}
          </div>
        )}

        <form
          onSubmit={handleGenerate}
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(124,92,252,0.2)",
            borderRadius: 16,
            padding: 28,
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Report Type *</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
                gap: 10,
              }}
            >
              {REPORT_TYPES.map((rt) => (
                <div
                  key={rt.value}
                  onClick={() => setForm((p) => ({ ...p, reportType: rt.value }))}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    border:
                      form.reportType === rt.value
                        ? `1px solid ${C.purple}`
                        : "1px solid rgba(255,255,255,0.08)",
                    background:
                      form.reportType === rt.value
                        ? "rgba(124,92,252,0.12)"
                        : "rgba(255,255,255,0.03)",
                  }}
                >
                  <div
                    style={{
                      color: form.reportType === rt.value ? C.purple : "#e2e8f0",
                      fontWeight: 700,
                      fontSize: 13,
                      marginBottom: 4,
                    }}
                  >
                    {rt.label}
                  </div>
                  <div style={{ color: "#64748b", fontSize: 11, lineHeight: 1.4 }}>
                    {rt.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div>
              <label style={labelStyle}>Format *</label>
              <select
                name="format"
                value={form.format}
                onChange={handleChange}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="CSV">CSV (Excel-compatible)</option>
                <option value="JSON">JSON</option>
                <option value="PDF">PDF (Print view)</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Client</label>
              <select
                name="clientId"
                value={form.clientId}
                onChange={handleChange}
                style={{ ...inputStyle, cursor: "pointer" }}
                disabled={loadingClients}
              >
                <option value="all">All Clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Start Date</label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>End Date</label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
          </div>

          {form.clientId !== "all" && selectedClient && (
            <div
              style={{
                marginBottom: 20,
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(79,195,247,0.08)",
                border: "1px solid rgba(79,195,247,0.18)",
                color: "#cbd5e1",
                fontSize: 12,
              }}
            >
              Selected client: <strong style={{ color: "#fff" }}>{selectedClient.company_name}</strong>
            </div>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => router.push("/reports")}
              style={{
                padding: "11px 24px",
                borderRadius: 8,
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
              disabled={generating}
              style={{
                padding: "11px 28px",
                borderRadius: 8,
                cursor: generating ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                fontWeight: 700,
                background: generating
                  ? "rgba(255,255,255,0.1)"
                  : `linear-gradient(135deg,${C.purple},${C.blue})`,
                border: "none",
                color: "#fff",
                opacity: generating ? 0.7 : 1,
                boxShadow: "0 0 20px rgba(124,92,252,0.3)",
              }}
            >
              {generating ? "Generating…" : "📤 Generate & Download"}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
