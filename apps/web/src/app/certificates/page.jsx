"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import { expiryBucketFromDate } from "@/lib/equipmentDetection";

const C = {
  text: "#e2e8f0",
  muted: "rgba(226,232,240,0.65)",
  border: "rgba(255,255,255,0.10)",
  card: "rgba(255,255,255,0.04)",
  panel: "rgba(255,255,255,0.03)",
  inputBg: "#1b2330",
  green: "#00f5c4",
  pink: "#f472b6",
  yellow: "#fbbf24",
  blue: "#4fc3f7",
  white: "#ffffff",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: `1px solid ${C.border}`,
  background: C.inputBg,
  color: C.text,
  outline: "none",
  boxSizing: "border-box",
  minHeight: 48,
};

const selectStyle = {
  ...inputStyle,
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  paddingRight: 42,
  cursor: "pointer",
  backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 7.5L10 12.5L15 7.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `)}")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  backgroundSize: "18px",
};

const optionStyle = {
  backgroundColor: "#ffffff",
  color: "#111827",
};

function statusColor(status) {
  if (status === "PASS") return "#86efac";
  if (status === "FAIL") return "#f472b6";
  if (status === "REPAIR REQUIRED") return "#fbbf24";
  if (status === "OUT OF SERVICE") return "#c084fc";
  return "#cbd5e1";
}

function normalizeDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 10);
}

function sortGroupedMap(groupMap) {
  return new Map(
    [...groupMap.entries()].sort(([a], [b]) =>
      String(a).localeCompare(String(b), undefined, { sensitivity: "base" })
    )
  );
}

function getCertificateLink(row) {
  return `/certificates/${row.id}`;
}

function getCertificatePdfLink(row) {
  return `/certificates/${row.id}?download=pdf`;
}

export default function CertificatesRegisterPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("ALL");
  const [expiryFilter, setExpiryFilter] = useState("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState("ALL");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const { data, error } = await supabase
          .from("v_certificate_register")
          .select("*")
          .order("client_name", { ascending: true })
          .order("equipment_type", { ascending: true })
          .order("equipment_description", { ascending: true })
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (mounted) {
          setRows(data || []);
        }
      } catch (err) {
        if (mounted) {
          setError(err?.message || "Failed to load certificates.");
          setRows([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const clients = useMemo(() => {
    return [...new Set(rows.map((r) => r.client_name).filter(Boolean))].sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { sensitivity: "base" })
    );
  }, [rows]);

  const equipmentTypes = useMemo(() => {
    return [...new Set(rows.map((r) => r.equipment_type).filter(Boolean))].sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { sensitivity: "base" })
    );
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const haystack = [
        row.certificate_number,
        row.client_name,
        row.asset_tag,
        row.equipment_type,
        row.equipment_description,
        row.document_category,
        row.document_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const q = search.trim().toLowerCase();
      if (q && !haystack.includes(q)) return false;

      if (resultFilter !== "ALL" && row.equipment_status !== resultFilter) return false;

      const bucket =
        row.expiry_bucket || expiryBucketFromDate(row.expiry_date || row.next_inspection_date);

      if (expiryFilter !== "ALL" && bucket !== expiryFilter) return false;
      if (clientFilter !== "ALL" && row.client_name !== clientFilter) return false;
      if (equipmentTypeFilter !== "ALL" && row.equipment_type !== equipmentTypeFilter) return false;

      return true;
    });
  }, [rows, search, resultFilter, expiryFilter, clientFilter, equipmentTypeFilter]);

  const grouped = useMemo(() => {
    const map = new Map();

    for (const row of filtered) {
      const client = row.client_name || "Unknown Client";
      const type = row.equipment_type || "General Equipment";
      const desc = row.equipment_description || "Unnamed Equipment";

      if (!map.has(client)) map.set(client, new Map());
      if (!map.get(client).has(type)) map.get(client).set(type, new Map());
      if (!map.get(client).get(type).has(desc)) map.get(client).get(type).set(desc, []);

      map.get(client).get(type).get(desc).push(row);
    }

    const sortedClients = sortGroupedMap(map);

    for (const [client, typeMap] of sortedClients.entries()) {
      const sortedTypes = sortGroupedMap(typeMap);
      sortedClients.set(client, sortedTypes);

      for (const [type, descMap] of sortedTypes.entries()) {
        const sortedDescriptions = sortGroupedMap(descMap);
        sortedTypes.set(type, sortedDescriptions);

        for (const [desc, certs] of sortedDescriptions.entries()) {
          sortedDescriptions.set(
            desc,
            [...certs].sort((a, b) => {
              const aDate = new Date(a.created_at || a.issue_date || 0).getTime();
              const bDate = new Date(b.created_at || b.issue_date || 0).getTime();
              return bDate - aDate;
            })
          );
        }
      }
    }

    return sortedClients;
  }, [filtered]);

  const stats = useMemo(() => {
    const expiring = rows.filter((r) => {
      const bucket =
        r.expiry_bucket || expiryBucketFromDate(r.expiry_date || r.next_inspection_date);
      return bucket === "EXPIRING_30_DAYS";
    }).length;

    return {
      total: rows.length,
      pass: rows.filter((r) => r.equipment_status === "PASS").length,
      fail: rows.filter((r) => r.equipment_status === "FAIL").length,
      expiring,
    };
  }, [rows]);

  function handlePrint(row) {
    const url = getCertificateLink(row);

    const printWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (!printWindow) return;

    const tryPrint = () => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (_) {
        // no-op
      }
    };

    setTimeout(tryPrint, 1200);
  }

  return (
    <AppLayout title="Certificates Register">
      <div style={{ maxWidth: 1400 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div>
            <h1 style={{ color: "#fff", marginBottom: 8 }}>Certificates Register</h1>
            <p style={{ color: C.muted }}>
              ISO-style grouping by client, equipment type, and equipment description.
            </p>
          </div>

          <Link
            href="/certificates/create"
            style={{
              textDecoration: "none",
              alignSelf: "center",
              padding: "12px 16px",
              borderRadius: 10,
              background: "linear-gradient(135deg,#00f5c4,#4fc3f7)",
              color: "#05202e",
              fontWeight: 800,
            }}
          >
            + Create Certificate
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,minmax(180px,1fr))",
            gap: 14,
            marginBottom: 18,
          }}
        >
          {[
            ["Total", stats.total, C.blue],
            ["Passed", stats.pass, C.green],
            ["Failed", stats.fail, C.pink],
            ["Expiring 30 Days", stats.expiring, C.yellow],
          ].map(([label, value, color]) => (
            <div
              key={label}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                padding: 18,
              }}
            >
              <div style={{ color: C.muted, fontSize: 12 }}>{label}</div>
              <div style={{ color, fontSize: 28, fontWeight: 800, marginTop: 8 }}>{value}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 18,
            padding: 18,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
              gap: 12,
            }}
          >
            <input
              style={inputStyle}
              placeholder="Search certificate, client, equipment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              style={selectStyle}
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
            >
              <option style={optionStyle} value="ALL">
                All Results
              </option>
              <option style={optionStyle} value="PASS">
                Passed
              </option>
              <option style={optionStyle} value="FAIL">
                Failed
              </option>
              <option style={optionStyle} value="REPAIR REQUIRED">
                Repair Required
              </option>
              <option style={optionStyle} value="OUT OF SERVICE">
                Out of Service
              </option>
            </select>

            <select
              style={selectStyle}
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value)}
            >
              <option style={optionStyle} value="ALL">
                All Expiry
              </option>
              <option style={optionStyle} value="EXPIRING_30_DAYS">
                Expiring in 30 Days
              </option>
              <option style={optionStyle} value="EXPIRED">
                Expired
              </option>
              <option style={optionStyle} value="ACTIVE">
                Active
              </option>
              <option style={optionStyle} value="NO_EXPIRY">
                No Expiry
              </option>
            </select>

            <select
              style={selectStyle}
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
            >
              <option style={optionStyle} value="ALL">
                All Clients
              </option>
              {clients.map((client) => (
                <option key={client} style={optionStyle} value={client}>
                  {client}
                </option>
              ))}
            </select>

            <select
              style={selectStyle}
              value={equipmentTypeFilter}
              onChange={(e) => setEquipmentTypeFilter(e.target.value)}
            >
              <option style={optionStyle} value="ALL">
                All Equipment Types
              </option>
              {equipmentTypes.map((type) => (
                <option key={type} style={optionStyle} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ color: C.text }}>Loading certificates...</div>
        ) : error ? (
          <div style={{ color: C.pink }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              color: C.text,
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 18,
              padding: 18,
            }}
          >
            No certificates found.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {[...grouped.entries()].map(([clientName, typesMap]) => (
              <div
                key={clientName}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 20,
                  padding: 18,
                }}
              >
                <h2 style={{ color: "#fff", marginTop: 0, marginBottom: 14 }}>{clientName}</h2>

                {[...typesMap.entries()].map(([equipmentType, descriptionsMap]) => (
                  <div key={equipmentType} style={{ marginBottom: 18 }}>
                    <div
                      style={{
                        color: C.blue,
                        fontWeight: 800,
                        marginBottom: 10,
                        fontSize: 18,
                        textTransform: "uppercase",
                      }}
                    >
                      {equipmentType}
                    </div>

                    {[...descriptionsMap.entries()].map(([description, certs]) => (
                      <div
                        key={description}
                        style={{
                          background: C.panel,
                          border: `1px solid ${C.border}`,
                          borderRadius: 14,
                          padding: 14,
                          marginBottom: 12,
                        }}
                      >
                        <div
                          style={{
                            color: "#fff",
                            fontWeight: 700,
                            marginBottom: 10,
                            fontSize: 16,
                          }}
                        >
                          {description}
                        </div>

                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}>
                            <thead>
                              <tr>
                                {[
                                  "Certificate No",
                                  "Asset Tag",
                                  "Category",
                                  "Result",
                                  "Issue Date",
                                  "Expiry Date",
                                  "Expiry Bucket",
                                  "Status",
                                  "Actions",
                                ].map((head) => (
                                  <th
                                    key={head}
                                    style={{
                                      textAlign: "left",
                                      color: C.muted,
                                      fontSize: 11,
                                      padding: "10px 8px",
                                      borderBottom: `1px solid ${C.border}`,
                                      textTransform: "uppercase",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {head}
                                  </th>
                                ))}
                              </tr>
                            </thead>

                            <tbody>
                              {certs.map((row) => {
                                const expiryBucket =
                                  row.expiry_bucket ||
                                  expiryBucketFromDate(row.expiry_date || row.next_inspection_date);

                                return (
                                  <tr key={row.id}>
                                    <td
                                      style={{
                                        padding: "12px 8px",
                                        color: "#fff",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {row.certificate_number || "-"}
                                    </td>

                                    <td
                                      style={{
                                        padding: "12px 8px",
                                        color: C.text,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {row.asset_tag || "-"}
                                    </td>

                                    <td style={{ padding: "12px 8px", color: C.text }}>
                                      {row.document_category || "-"}
                                    </td>

                                    <td
                                      style={{
                                        padding: "12px 8px",
                                        color: statusColor(row.equipment_status),
                                        fontWeight: 700,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {row.equipment_status || "-"}
                                    </td>

                                    <td
                                      style={{
                                        padding: "12px 8px",
                                        color: C.text,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {normalizeDate(row.issue_date)}
                                    </td>

                                    <td
                                      style={{
                                        padding: "12px 8px",
                                        color: C.text,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {normalizeDate(row.expiry_date || row.next_inspection_date)}
                                    </td>

                                    <td
                                      style={{
                                        padding: "12px 8px",
                                        color: C.text,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {expiryBucket}
                                    </td>

                                    <td
                                      style={{
                                        padding: "12px 8px",
                                        color: C.text,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {row.document_status || "-"}
                                    </td>

                                    <td
                                      style={{
                                        padding: "12px 8px",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          flexWrap: "wrap",
                                          gap: 8,
                                        }}
                                      >
                                        <Link
                                          href={getCertificateLink(row)}
                                          style={{
                                            textDecoration: "none",
                                            padding: "8px 10px",
                                            borderRadius: 10,
                                            border: `1px solid ${C.border}`,
                                            background: "rgba(79,195,247,0.12)",
                                            color: C.blue,
                                            fontWeight: 700,
                                            fontSize: 12,
                                          }}
                                        >
                                          View
                                        </Link>

                                        <a
                                          href={getCertificatePdfLink(row)}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{
                                            textDecoration: "none",
                                            padding: "8px 10px",
                                            borderRadius: 10,
                                            border: `1px solid ${C.border}`,
                                            background: "rgba(0,245,196,0.12)",
                                            color: C.green,
                                            fontWeight: 700,
                                            fontSize: 12,
                                          }}
                                        >
                                          Save PDF
                                        </a>

                                        <button
                                          type="button"
                                          onClick={() => handlePrint(row)}
                                          style={{
                                            padding: "8px 10px",
                                            borderRadius: 10,
                                            border: `1px solid ${C.border}`,
                                            background: "rgba(251,191,36,0.12)",
                                            color: C.yellow,
                                            fontWeight: 700,
                                            fontSize: 12,
                                            cursor: "pointer",
                                          }}
                                        >
                                          Print
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
