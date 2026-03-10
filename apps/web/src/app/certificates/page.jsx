"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

function formatDate(value) {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB");
}

function statusColor(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("fail") || s.includes("expired")) {
    return {
      bg: "rgba(239,68,68,0.15)",
      border: "rgba(239,68,68,0.35)",
      text: "#fca5a5",
    };
  }
  if (s.includes("conditional") || s.includes("expiring")) {
    return {
      bg: "rgba(245,158,11,0.15)",
      border: "rgba(245,158,11,0.35)",
      text: "#fcd34d",
    };
  }
  return {
    bg: "rgba(34,197,94,0.15)",
    border: "rgba(34,197,94,0.35)",
    text: "#86efac",
  };
}

export default function CertificatesPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function loadCertificates() {
      setLoading(true);

      const { data } = await supabase
        .from("certificates")
        .select(`
          id,
          certificate_number,
          certificate_type,
          company,
          equipment_description,
          equipment_location,
          equipment_id,
          equipment_status,
          issued_at,
          valid_to,
          status,
          created_at,
          assets (
            id,
            asset_tag,
            asset_name,
            asset_type
          )
        `)
        .order("created_at", { ascending: false });

      setRows(data || []);
      setLoading(false);
    }

    loadCertificates();
  }, []);

  const filtered = useMemo(() => {
    let data = [...rows];

    if (filter !== "all") {
      data = data.filter((row) =>
        String(row.status || row.equipment_status || "")
          .toLowerCase()
          .includes(filter)
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((row) =>
        [
          row.certificate_number,
          row.certificate_type,
          row.company,
          row.equipment_description,
          row.equipment_location,
          row.equipment_id,
          row.assets?.asset_tag,
          row.assets?.asset_name,
          row.assets?.asset_type,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }

    return data;
  }, [rows, search, filter]);

  return (
    <AppLayout title="Certificates">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <h1 style={{ color: "#fff", margin: 0 }}>Certificates</h1>
            <p style={{ color: "#94a3b8", marginTop: 8 }}>
              View, create and manage equipment certificates.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href="/certificates/import"
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.06)",
                color: "#e5e7eb",
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.1)",
                fontWeight: 700,
              }}
            >
              Import
            </Link>

            <Link
              href="/certificates/create"
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                background: "#2563eb",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Create Certificate
            </Link>
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search certificate number, company, equipment, tag..."
              style={{
                flex: 1,
                minWidth: 260,
                padding: "11px 14px",
                borderRadius: 10,
                background: "#0f172a",
                color: "#e5e7eb",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            />

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: "11px 14px",
                borderRadius: 10,
                background: "#0f172a",
                color: "#e5e7eb",
                border: "1px solid rgba(255,255,255,0.12)",
                minWidth: 180,
              }}
            >
              <option value="all">All Status</option>
              <option value="issued">Issued</option>
              <option value="draft">Draft</option>
              <option value="expired">Expired</option>
              <option value="pass">PASS</option>
              <option value="fail">FAIL</option>
              <option value="conditional">CONDITIONAL</option>
            </select>
          </div>

          {loading ? (
            <div style={{ color: "#cbd5e1", padding: "30px 0" }}>Loading certificates...</div>
          ) : filtered.length === 0 ? (
            <div style={{ color: "#94a3b8", padding: "30px 0" }}>No certificates found.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 980,
                }}
              >
                <thead>
                  <tr style={{ textAlign: "left", color: "#94a3b8", fontSize: 12 }}>
                    <th style={{ padding: "12px 10px" }}>Certificate No</th>
                    <th style={{ padding: "12px 10px" }}>Type</th>
                    <th style={{ padding: "12px 10px" }}>Company</th>
                    <th style={{ padding: "12px 10px" }}>Equipment</th>
                    <th style={{ padding: "12px 10px" }}>Tag</th>
                    <th style={{ padding: "12px 10px" }}>Issued</th>
                    <th style={{ padding: "12px 10px" }}>Expiry</th>
                    <th style={{ padding: "12px 10px" }}>Status</th>
                    <th style={{ padding: "12px 10px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const color = statusColor(row.status || row.equipment_status);
                    return (
                      <tr
                        key={row.id}
                        style={{
                          borderTop: "1px solid rgba(255,255,255,0.08)",
                          color: "#e5e7eb",
                        }}
                      >
                        <td style={{ padding: "14px 10px", fontWeight: 700 }}>
                          {row.certificate_number || "Auto"}
                        </td>
                        <td style={{ padding: "14px 10px" }}>
                          {row.certificate_type || "N/A"}
                        </td>
                        <td style={{ padding: "14px 10px" }}>
                          {row.company || "N/A"}
                        </td>
                        <td style={{ padding: "14px 10px" }}>
                          {row.equipment_description || row.assets?.asset_type || "N/A"}
                        </td>
                        <td style={{ padding: "14px 10px" }}>
                          {row.equipment_id || row.assets?.asset_tag || "N/A"}
                        </td>
                        <td style={{ padding: "14px 10px" }}>
                          {formatDate(row.issued_at)}
                        </td>
                        <td style={{ padding: "14px 10px" }}>
                          {formatDate(row.valid_to)}
                        </td>
                        <td style={{ padding: "14px 10px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "6px 10px",
                              borderRadius: 999,
                              background: color.bg,
                              border: `1px solid ${color.border}`,
                              color: color.text,
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {row.equipment_status || row.status || "issued"}
                          </span>
                        </td>
                        <td style={{ padding: "14px 10px" }}>
                          <Link
                            href={`/certificates/${row.id}`}
                            style={{
                              color: "#60a5fa",
                              textDecoration: "none",
                              fontWeight: 700,
                            }}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
