// FILE: /apps/web/src/app/certificates/page.jsx

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
  green: "#00f5c4",
  pink: "#f472b6",
  yellow: "#fbbf24",
  blue: "#4fc3f7",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: "rgba(255,255,255,0.04)",
  color: C.text,
  outline: "none",
  boxSizing: "border-box",
};

function statusColor(status) {
  if (status === "PASS") return "#86efac";
  if (status === "FAIL") return "#f472b6";
  return "#fbbf24";
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
        const { data, error } = await supabase
          .from("v_certificate_register")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (mounted) setRows(data || []);
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load certificates.");
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
    return [...new Set(rows.map((r) => r.client_name).filter(Boolean))].sort();
  }, [rows]);

  const equipmentTypes = useMemo(() => {
    return [...new Set(rows.map((r) => r.equipment_type).filter(Boolean))].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const haystack = [
        row.certificate_number,
        row.client_name,
        row.asset_tag,
        row.equipment_type,
        row.equipment_description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const q = search.trim().toLowerCase();
      if (q && !haystack.includes(q)) return false;

      if (resultFilter !== "ALL" && row.equipment_status !== resultFilter) return false;

      const bucket = row.expiry_bucket || expiryBucketFromDate(row.expiry_date || row.next_inspection_date);
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

    return map;
  }, [filtered]);

  const stats = useMemo(() => {
    const expiring = rows.filter((r) => (r.expiry_bucket || expiryBucketFromDate(r.expiry_date || r.next_inspection_date)) === "EXPIRING_30_DAYS").length;
    return {
      total: rows.length,
      pass: rows.filter((r) => r.equipment_status === "PASS").length,
      fail: rows.filter((r) => r.equipment_status === "FAIL").length,
      expiring,
    };
  }, [rows]);

  return (
    <AppLayout title="Certificates Register">
      <div style={{ maxWidth: 1400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(180px,1fr))", gap: 14, marginBottom: 18 }}>
          {[
            ["Total", stats.total, C.blue],
            ["Passed", stats.pass, C.green],
            ["Failed", stats.fail, C.pink],
            ["Expiring 30 Days", stats.expiring, C.yellow],
          ].map(([label, value, color]) => (
            <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
              <div style={{ color: C.muted, fontSize: 12 }}>{label}</div>
              <div style={{ color, fontSize: 28, fontWeight: 800, marginTop: 8 }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 12 }}>
            <input
              style={inputStyle}
              placeholder="Search certificate, client, equipment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select style={inputStyle} value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}>
              <option value="ALL">All Results</option>
              <option value="PASS">Passed</option>
              <option value="FAIL">Failed</option>
              <option value="REPAIR REQUIRED">Repair Required</option>
              <option value="OUT OF SERVICE">Out of Service</option>
            </select>

            <select style={inputStyle} value={expiryFilter} onChange={(e) => setExpiryFilter(e.target.value)}>
              <option value="ALL">All Expiry</option>
              <option value="EXPIRING_30_DAYS">Expiring in 30 Days</option>
              <option value="EXPIRED">Expired</option>
              <option value="ACTIVE">Active</option>
              <option value="NO_EXPIRY">No Expiry</option>
            </select>

            <select style={inputStyle} value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
              <option value="ALL">All Clients</option>
              {clients.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>

            <select style={inputStyle} value={equipmentTypeFilter} onChange={(e) => setEquipmentTypeFilter(e.target.value)}>
              <option value="ALL">All Equipment Types</option>
              {equipmentTypes.map((type) => (
                <option key={type} value={type}>
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
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {[...grouped.entries()].map(([clientName, typesMap]) => (
              <div key={clientName} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 18 }}>
                <h2 style={{ color: "#fff", marginTop: 0 }}>{clientName}</h2>

                {[...typesMap.entries()].map(([equipmentType, descriptionsMap]) => (
                  <div key={equipmentType} style={{ marginBottom: 18 }}>
                    <div style={{ color: C.blue, fontWeight: 800, marginBottom: 10 }}>
                      {equipmentType}
                    </div>

                    {[...descriptionsMap.entries()].map(([description, certs]) => (
                      <div
                        key={description}
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: `1px solid ${C.border}`,
                          borderRadius: 14,
                          padding: 14,
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ color: "#fff", fontWeight: 700, marginBottom: 10 }}>
                          {description}
                        </div>

                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
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
                                    }}
                                  >
                                    {head}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {certs.map((row) => (
                                <tr key={row.id}>
                                  <td style={{ padding: "12px 8px", color: "#fff" }}>{row.certificate_number}</td>
                                  <td style={{ padding: "12px 8px", color: C.text }}>{row.asset_tag || "-"}</td>
                                  <td style={{ padding: "12px 8px", color: C.text }}>{row.document_category || "-"}</td>
                                  <td style={{ padding: "12px 8px", color: statusColor(row.equipment_status), fontWeight: 700 }}>
                                    {row.equipment_status || "-"}
                                  </td>
                                  <td style={{ padding: "12px 8px", color: C.text }}>{row.issue_date || "-"}</td>
                                  <td style={{ padding: "12px 8px", color: C.text }}>{row.expiry_date || row.next_inspection_date || "-"}</td>
                                  <td style={{ padding: "12px 8px", color: C.text }}>
                                    {row.expiry_bucket || expiryBucketFromDate(row.expiry_date || row.next_inspection_date)}
                                  </td>
                                  <td style={{ padding: "12px 8px", color: C.text }}>{row.document_status || "-"}</td>
                                </tr>
                              ))}
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
