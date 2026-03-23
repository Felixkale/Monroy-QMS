// apps/web/src/app/certificates/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const C = {
  bg: "#0b1220",
  panel: "#111827",
  panel2: "#172131",
  border: "rgba(255,255,255,0.10)",
  text: "#ffffff",
  sub: "rgba(255,255,255,0.70)",
  cyan: "#22d3ee",
  green: "#00f5c4",
  red: "#ff6b81",
  yellow: "#fbbf24",
  blue: "#60a5fa",
};

function normalizeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const v = String(value).trim();
  return v || fallback;
}

function normalizeResult(result) {
  const value = normalizeText(result).toUpperCase().replace(/\s+/g, "_");
  if (!value) return "UNKNOWN";
  return value;
}

function getExpiryBucket(expiryDate) {
  if (!expiryDate) return "NO_EXPIRY";

  const today = new Date();
  const exp = new Date(expiryDate);
  const diffMs = exp - today;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "EXPIRED";
  if (diffDays <= 30) return "EXPIRING_30_DAYS";
  if (diffDays <= 90) return "EXPIRING_90_DAYS";
  return "VALID";
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 10);
}

function groupCertificates(rows) {
  const grouped = {};

  for (const row of rows) {
    const company = normalizeText(
      row.client_name || row.company_name || row.company || row.client,
      "UNASSIGNED CLIENT"
    );

    const equipmentType = normalizeText(
      row.equipment_type || row.asset_type || row.category,
      "UNCATEGORIZED EQUIPMENT"
    );

    const equipmentDescription = normalizeText(
      row.equipment_description || row.asset_name || row.description || row.asset_tag,
      "UNNAMED EQUIPMENT"
    );

    if (!grouped[company]) grouped[company] = {};
    if (!grouped[company][equipmentType]) grouped[company][equipmentType] = {};
    if (!grouped[company][equipmentType][equipmentDescription]) {
      grouped[company][equipmentType][equipmentDescription] = [];
    }

    grouped[company][equipmentType][equipmentDescription].push(row);
  }

  const sortedCompanies = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  return sortedCompanies.map((company) => {
    const types = grouped[company];
    const sortedTypes = Object.keys(types).sort((a, b) => a.localeCompare(b));

    return {
      company,
      equipmentTypes: sortedTypes.map((equipmentType) => {
        const equipmentMap = types[equipmentType];
        const sortedEquipment = Object.keys(equipmentMap).sort((a, b) => a.localeCompare(b));

        return {
          equipmentType,
          equipmentItems: sortedEquipment.map((equipmentDescription) => ({
            equipmentDescription,
            certificates: [...equipmentMap[equipmentDescription]].sort((a, b) => {
              const aDate = new Date(a.issue_date || a.created_at || 0).getTime();
              const bDate = new Date(b.issue_date || b.created_at || 0).getTime();
              return bDate - aDate;
            }),
          })),
        };
      }),
    };
  });
}

function getCertificateViewLink(cert) {
  return `/certificates/${cert.id}`;
}

function getCertificatePdfLink(cert) {
  return `/certificates/${cert.id}`;
}

export default function CertificatesPage() {
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("ALL");
  const [expiryFilter, setExpiryFilter] = useState("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState("ALL");

  useEffect(() => {
    loadCertificates();
  }, []);

  async function loadCertificates() {
    setLoading(true);

    const { data, error } = await supabase
      .from("certificates")
      .select(`
        id,
        certificate_number,
        result,
        issue_date,
        expiry_date,
        created_at,
        inspection_number,
        asset_tag,
        asset_name,
        equipment_description,
        equipment_type,
        asset_type,
        category,
        client_name,
        company_name,
        company,
        client,
        status
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load certificates:", error);
      setCertificates([]);
      setLoading(false);
      return;
    }

    const cleaned = (data || []).map((row) => ({
      ...row,
      result: normalizeResult(row.result),
      expiry_bucket: getExpiryBucket(row.expiry_date),
      company_display: normalizeText(
        row.client_name || row.company_name || row.company || row.client,
        "UNASSIGNED CLIENT"
      ),
      equipment_type_display: normalizeText(
        row.equipment_type || row.asset_type || row.category,
        "UNCATEGORIZED EQUIPMENT"
      ),
      equipment_description_display: normalizeText(
        row.equipment_description || row.asset_name || row.asset_tag,
        "UNNAMED EQUIPMENT"
      ),
    }));

    setCertificates(cleaned);
    setLoading(false);
  }

  const clientOptions = useMemo(() => {
    return Array.from(new Set(certificates.map((x) => x.company_display))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [certificates]);

  const equipmentTypeOptions = useMemo(() => {
    return Array.from(new Set(certificates.map((x) => x.equipment_type_display))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [certificates]);

  const filteredCertificates = useMemo(() => {
    return certificates.filter((row) => {
      const haystack = [
        row.certificate_number,
        row.company_display,
        row.asset_tag,
        row.equipment_description_display,
        row.equipment_type_display,
        row.inspection_number,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search || haystack.includes(search.toLowerCase());
      const matchesResult = resultFilter === "ALL" || row.result === resultFilter;
      const matchesExpiry = expiryFilter === "ALL" || row.expiry_bucket === expiryFilter;
      const matchesClient = clientFilter === "ALL" || row.company_display === clientFilter;
      const matchesEquipmentType =
        equipmentTypeFilter === "ALL" || row.equipment_type_display === equipmentTypeFilter;

      return (
        matchesSearch &&
        matchesResult &&
        matchesExpiry &&
        matchesClient &&
        matchesEquipmentType
      );
    });
  }, [certificates, search, resultFilter, expiryFilter, clientFilter, equipmentTypeFilter]);

  const groupedData = useMemo(() => groupCertificates(filteredCertificates), [filteredCertificates]);

  const stats = useMemo(() => {
    const total = certificates.length;
    const passed = certificates.filter((x) => x.result === "PASS").length;
    const failed = certificates.filter((x) => x.result === "FAIL").length;
    const expiring30 = certificates.filter((x) => x.expiry_bucket === "EXPIRING_30_DAYS").length;

    return { total, passed, failed, expiring30 };
  }, [certificates]);

  function handlePrint(cert) {
    const url = getCertificateViewLink(cert);
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) return;

    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch (e) {
        console.error("Print failed", e);
      }
    }, 1000);
  }

  return (
    <AppLayout>
      <div style={{ padding: 24, background: C.bg, minHeight: "100vh", color: C.text }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div>
            <h1 style={{ fontSize: 48, fontWeight: 800, marginBottom: 10 }}>
              Certificates Register
            </h1>
            <p style={{ color: C.sub }}>
              ISO-style grouping by company, equipment type, and equipment description.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/certificates/import" style={ghostLink}>
              ✦ Extract with AI
            </Link>

            <Link href="/certificates/create" style={primaryLink}>
              + Create Certificate
            </Link>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 14,
            marginBottom: 20,
          }}
        >
          <StatCard label="Total" value={stats.total} color={C.blue} />
          <StatCard label="Passed" value={stats.passed} color={C.green} />
          <StatCard label="Failed" value={stats.failed} color={C.red} />
          <StatCard label="Expiring 30 Days" value={stats.expiring30} color={C.yellow} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
            gap: 12,
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 18,
            padding: 18,
            marginBottom: 20,
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search certificate, client, equipment..."
            style={inputStyle}
          />

          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="ALL">All Results</option>
            <option value="PASS">Passed</option>
            <option value="FAIL">Failed</option>
            <option value="REPAIR_REQUIRED">Repair Required</option>
            <option value="OUT_OF_SERVICE">Out of Service</option>
          </select>

          <select
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="ALL">All Expiry</option>
            <option value="NO_EXPIRY">No Expiry</option>
            <option value="EXPIRED">Expired</option>
            <option value="EXPIRING_30_DAYS">Expiring 30 Days</option>
            <option value="EXPIRING_90_DAYS">Expiring 90 Days</option>
            <option value="VALID">Valid</option>
          </select>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="ALL">All Clients</option>
            {clientOptions.map((client) => (
              <option key={client} value={client}>
                {client}
              </option>
            ))}
          </select>

          <select
            value={equipmentTypeFilter}
            onChange={(e) => setEquipmentTypeFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="ALL">All Equipment Types</option>
            {equipmentTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ color: C.sub }}>Loading certificates...</div>
        ) : groupedData.length === 0 ? (
          <div style={emptyStyle}>No certificates found.</div>
        ) : (
          groupedData.map((companyGroup) => (
            <div
              key={companyGroup.company}
              style={{
                background: C.panel,
                border: `1px solid ${C.border}`,
                borderRadius: 22,
                padding: 20,
                marginBottom: 22,
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
                {companyGroup.company}
              </div>

              {companyGroup.equipmentTypes.map((typeGroup) => (
                <div key={typeGroup.equipmentType} style={{ marginTop: 18 }}>
                  <div
                    style={{
                      color: C.cyan,
                      fontSize: 20,
                      fontWeight: 800,
                      marginBottom: 14,
                      textTransform: "uppercase",
                    }}
                  >
                    {typeGroup.equipmentType}
                  </div>

                  {typeGroup.equipmentItems.map((equipmentItem) => (
                    <div
                      key={equipmentItem.equipmentDescription}
                      style={{
                        background: C.panel2,
                        border: `1px solid ${C.border}`,
                        borderRadius: 18,
                        padding: 16,
                        marginBottom: 14,
                      }}
                    >
                      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>
                        {equipmentItem.equipmentDescription}
                      </div>

                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
                          <thead>
                            <tr>
                              <Th>CERTIFICATE NO</Th>
                              <Th>ASSET TAG</Th>
                              <Th>RESULT</Th>
                              <Th>ISSUE DATE</Th>
                              <Th>EXPIRY DATE</Th>
                              <Th>EXPIRY BUCKET</Th>
                              <Th>STATUS</Th>
                              <Th>ACTIONS</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {equipmentItem.certificates.map((cert) => (
                              <tr key={cert.id}>
                                <Td>{cert.certificate_number || "-"}</Td>
                                <Td>{cert.asset_tag || "-"}</Td>
                                <Td>
                                  <span style={resultBadge(cert.result)}>{cert.result}</span>
                                </Td>
                                <Td>{formatDate(cert.issue_date)}</Td>
                                <Td>{formatDate(cert.expiry_date)}</Td>
                                <Td>{cert.expiry_bucket}</Td>
                                <Td>{cert.status || "Active"}</Td>
                                <Td>
                                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    <Link href={getCertificateViewLink(cert)} style={actionLinkBlue}>
                                      View
                                    </Link>

                                    <a
                                      href={getCertificatePdfLink(cert)}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={actionLinkGreen}
                                    >
                                      Save
                                    </a>

                                    <button
                                      type="button"
                                      onClick={() => handlePrint(cert)}
                                      style={actionButtonYellow}
                                    >
                                      Print
                                    </button>
                                  </div>
                                </Td>
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
          ))
        )}
      </div>
    </AppLayout>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 18,
        padding: 18,
      }}
    >
      <div style={{ color: "rgba(255,255,255,0.70)", marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "12px 10px",
        fontSize: 12,
        color: "rgba(255,255,255,0.65)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }) {
  return (
    <td
      style={{
        padding: "14px 10px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        color: "#ffffff",
        fontSize: 15,
        verticalAlign: "middle",
      }}
    >
      {children}
    </td>
  );
}

const inputStyle = {
  width: "100%",
  height: 48,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "#1a2332",
  color: "#ffffff",
  padding: "0 14px",
  outline: "none",
};

const selectStyle = {
  width: "100%",
  height: 48,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "#1a2332",
  color: "#ffffff",
  padding: "0 14px",
  outline: "none",
};

const emptyStyle = {
  background: "#111827",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 18,
  padding: 24,
  color: "rgba(255,255,255,0.70)",
};

const ghostLink = {
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#ffffff",
  fontWeight: 800,
  background: "#111827",
};

const primaryLink = {
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: 12,
  background: "linear-gradient(135deg,#00f5c4,#4fc3f7)",
  color: "#05202e",
  fontWeight: 800,
};

const actionLinkBlue = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(79,195,247,0.25)",
  background: "rgba(79,195,247,0.12)",
  color: "#4fc3f7",
  fontWeight: 700,
  fontSize: 12,
  textDecoration: "none",
};

const actionLinkGreen = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(0,245,196,0.25)",
  background: "rgba(0,245,196,0.12)",
  color: "#00f5c4",
  fontWeight: 700,
  fontSize: 12,
  textDecoration: "none",
};

const actionButtonYellow = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(251,191,36,0.25)",
  background: "rgba(251,191,36,0.12)",
  color: "#fbbf24",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};

function resultBadge(result) {
  const map = {
    PASS: {
      color: "#00f5c4",
      background: "rgba(0,245,196,0.12)",
      border: "1px solid rgba(0,245,196,0.25)",
    },
    FAIL: {
      color: "#ff6b81",
      background: "rgba(255,107,129,0.12)",
      border: "1px solid rgba(255,107,129,0.25)",
    },
    REPAIR_REQUIRED: {
      color: "#fbbf24",
      background: "rgba(251,191,36,0.12)",
      border: "1px solid rgba(251,191,36,0.25)",
    },
    OUT_OF_SERVICE: {
      color: "#c084fc",
      background: "rgba(192,132,252,0.12)",
      border: "1px solid rgba(192,132,252,0.25)",
    },
    UNKNOWN: {
      color: "#cbd5e1",
      background: "rgba(203,213,225,0.12)",
      border: "1px solid rgba(203,213,225,0.25)",
    },
  };

  const style = map[result] || map.UNKNOWN;

  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 13,
    ...style,
  };
}
