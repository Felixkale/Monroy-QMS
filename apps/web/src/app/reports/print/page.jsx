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

const rgba = {
  green: "0,245,196",
  blue: "79,195,247",
  purple: "124,92,252",
  pink: "244,114,182",
  yellow: "251,191,36",
};

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toEndOfDay(date) {
  if (!date) return "";
  return `${date}T23:59:59.999`;
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

export default function ReportPrintPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const meta = useMemo(() => {
    return {
      type: searchParams.get("type") || "certificates",
      start: searchParams.get("start") || "",
      end: searchParams.get("end") || "",
      client: searchParams.get("client") || "all",
    };
  }, [searchParams]);

  useEffect(() => {
    loadAll();
  }, [meta.type, meta.start, meta.end, meta.client]);

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const { data: clientRows, error: clientErr } = await supabase
        .from("clients")
        .select("id, company_name")
        .order("company_name", { ascending: true });

      if (clientErr) throw clientErr;
      setClients(clientRows || []);

      let data = [];

      if (
        meta.type === "certificates" ||
        meta.type === "expiring" ||
        meta.type === "failed"
      ) {
        let q = supabase.from("certificates").select(`
          id,
          client_id,
          certificate_number,
          company,
          equipment_description,
          equipment_status,
          issued_at,
          valid_to,
          inspector_name,
          certificate_type
        `);

        if (meta.client !== "all") {
          q = q.eq("client_id", meta.client);
        }

        if (meta.type === "certificates") {
          if (meta.start) q = q.gte("issued_at", meta.start);
          if (meta.end) q = q.lte("issued_at", toEndOfDay(meta.end));
        }

        if (meta.type === "expiring") {
          if (meta.start) q = q.gte("valid_to", meta.start);
          if (meta.end) q = q.lte("valid_to", toEndOfDay(meta.end));
        }

        if (meta.type === "failed") {
          q = q.in("equipment_status", ["FAIL", "CONDITIONAL"]);
          if (meta.start) q = q.gte("issued_at", meta.start);
          if (meta.end) q = q.lte("issued_at", toEndOfDay(meta.end));
        }

        q = q.order(meta.type === "expiring" ? "valid_to" : "issued_at", {
          ascending: false,
        });

        const { data: certRows, error: certErr } = await q.limit(500);
        if (certErr) throw certErr;
        data = (certRows || []).map(flattenRow);
      } else if (meta.type === "equipment") {
        let q = supabase.from("assets").select(`
          id,
          client_id,
          asset_tag,
          asset_name,
          asset_type,
          serial_number,
          next_inspection_date,
          license_status,
          clients(company_name)
        `);

        if (meta.client !== "all") {
          q = q.eq("client_id", meta.client);
        }

        if (meta.start) q = q.gte("next_inspection_date", meta.start);
        if (meta.end) q = q.lte("next_inspection_date", meta.end);

        q = q.order("asset_tag", { ascending: true });

        const { data: assetRows, error: assetErr } = await q.limit(500);
        if (assetErr) throw assetErr;

        data = (assetRows || []).map((row) => {
          const flat = flattenRow(row);
          if (flat.clients_company_name) {
            flat.client = flat.clients_company_name;
            delete flat.clients_company_name;
          }
          return flat;
        });
      } else if (meta.type === "clients") {
        let q = supabase
          .from("clients")
          .select("id, company_name, company_code, status, created_at")
          .order("company_name", { ascending: true });

        if (meta.client !== "all") {
          q = q.eq("id", meta.client);
        }

        const { data: clientSummaryRows, error: summaryErr } = await q;
        if (summaryErr) throw summaryErr;

        const result = [];

        for (const client of clientSummaryRows || []) {
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

          if (meta.start) {
            certCountQuery = certCountQuery.gte("issued_at", meta.start);
            expiringCountQuery = expiringCountQuery.gte("valid_to", meta.start);
          }

          if (meta.end) {
            certCountQuery = certCountQuery.lte("issued_at", toEndOfDay(meta.end));
            expiringCountQuery = expiringCountQuery.lte("valid_to", toEndOfDay(meta.end));
          }

          const [
            { count: equipment_count, error: assetCountErr },
            { count: certificate_count, error: certCountErr },
            { count: expiring_certificate_count, error: expCountErr },
          ] = await Promise.all([assetCountQuery, certCountQuery, expiringCountQuery]);

          if (assetCountErr) throw assetCountErr;
          if (certCountErr) throw certCountErr;
          if (expCountErr) throw expCountErr;

          result.push({
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

        data = result;
      }

      setRows(data);
    } catch (err) {
      setError(err.message || "Failed to load report.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const selectedClientName =
    meta.client === "all"
      ? "All Clients"
      : clients.find((c) => c.id === meta.client)?.company_name || "Selected Client";

  const typeLabel =
    {
      certificates: "Certificate Report",
      expiring: "Expiring Certificates",
      failed: "Failed Inspections",
      equipment: "Equipment Report",
      clients: "Client Summary",
    }[meta.type] || "Report";

  const pass = rows.filter((d) => (d.equipment_status || "").toUpperCase() === "PASS").length;
  const fail = rows.filter((d) =>
    ["FAIL", "CONDITIONAL"].includes((d.equipment_status || "").toUpperCase())
  ).length;

  return (
    <AppLayout title={typeLabel}>
      <div style={{ maxWidth: 1100 }}>
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

        <h1 style={{ color: "#fff", margin: "0 0 4px", fontSize: 24, fontWeight: 900 }}>
          {typeLabel}
        </h1>

        <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 8px" }}>
          Client: {selectedClientName}
        </p>

        <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 24px" }}>
          {meta.start || meta.end
            ? `${meta.start ? formatDate(meta.start) : "Any start"} — ${
                meta.end ? formatDate(meta.end) : "Any end"
              }`
            : "All time"}
          {" · "}
          {rows.length} records
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

        {!loading &&
          rows.length > 0 &&
          (meta.type === "certificates" || meta.type === "expiring" || meta.type === "failed") && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                gap: 12,
                marginBottom: 24,
              }}
            >
              {[
                { label: "Total", value: rows.length, color: C.blue, r: rgba.blue },
                { label: "Passed", value: pass, color: C.green, r: rgba.green },
                { label: "Failed", value: fail, color: C.pink, r: rgba.pink },
                {
                  label: "Pass Rate",
                  value: rows.length > 0 ? `${Math.round((pass / rows.length) * 100)}%` : "—",
                  color: C.green,
                  r: rgba.green,
                },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: `rgba(${s.r},0.07)`,
                    border: `1px solid rgba(${s.r},0.25)`,
                    borderRadius: 12,
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: 6,
                    }}
                  >
                    {s.label}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            🖨️ Print
          </button>

          <button
            onClick={() => router.push("/reports/export")}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              background: `linear-gradient(135deg,${C.purple},${C.blue})`,
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            📤 Back to Export
          </button>
        </div>

        {loading ? (
          <div style={{ color: "#64748b", padding: "40px 0", textAlign: "center" }}>
            Loading report data…
          </div>
        ) : rows.length === 0 ? (
          <div style={{ color: "#64748b", padding: "40px 0", textAlign: "center" }}>
            No data found for this report.
          </div>
        ) : (
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  {(meta.type === "equipment"
                    ? ["Asset Tag", "Name", "Type", "Client", "Next Inspection", "Status"]
                    : meta.type === "clients"
                    ? ["Company", "Code", "Status", "Equipment", "Certificates", "Expiring"]
                    : ["Cert No.", "Company", "Equipment", "Inspector", "Issued", "Expiry", "Status"]
                  ).map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: 11,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row, i) => {
                  if (meta.type === "equipment") {
                    return (
                      <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "12px 16px", color: C.blue, fontWeight: 700 }}>
                          {row.asset_tag}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#e2e8f0" }}>
                          {row.asset_name || "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#94a3b8" }}>
                          {row.asset_type || "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#64748b" }}>
                          {row.client || "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#64748b" }}>
                          {formatDate(row.next_inspection_date)}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              padding: "3px 10px",
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 700,
                              background:
                                row.license_status === "expired"
                                  ? "rgba(244,114,182,0.1)"
                                  : "rgba(0,245,196,0.1)",
                              color: row.license_status === "expired" ? C.pink : C.green,
                            }}
                          >
                            {row.license_status || "valid"}
                          </span>
                        </td>
                      </tr>
                    );
                  }

                  if (meta.type === "clients") {
                    return (
                      <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "12px 16px", color: "#e2e8f0" }}>
                          {row.company_name || "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: C.purple, fontWeight: 700 }}>
                          {row.company_code || "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#94a3b8" }}>
                          {row.status || "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: C.blue, fontWeight: 700 }}>
                          {row.equipment_count || 0}
                        </td>
                        <td style={{ padding: "12px 16px", color: C.green, fontWeight: 700 }}>
                          {row.certificate_count || 0}
                        </td>
                        <td style={{ padding: "12px 16px", color: C.yellow, fontWeight: 700 }}>
                          {row.expiring_certificate_count || 0}
                        </td>
                      </tr>
                    );
                  }

                  const status = (row.equipment_status || "").toUpperCase();
                  const isPass = status === "PASS";

                  return (
                    <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "12px 16px", color: C.purple, fontWeight: 700 }}>
                        {row.certificate_number || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#e2e8f0" }}>{row.company || "—"}</td>
                      <td style={{ padding: "12px 16px", color: "#94a3b8" }}>
                        {row.equipment_description || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>
                        {row.inspector_name || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748b", whiteSpace: "nowrap" }}>
                        {formatDate(row.issued_at)}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748b", whiteSpace: "nowrap" }}>
                        {formatDate(row.valid_to)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                            background: isPass
                              ? "rgba(0,245,196,0.1)"
                              : "rgba(244,114,182,0.1)",
                            color: isPass ? C.green : C.pink,
                          }}
                        >
                          {status || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
