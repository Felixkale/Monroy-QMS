// apps/web/src/app/certificates/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const T = {
  bg: "#080d14",
  surface: "#0d1420",
  panel: "#162132",
  panel2: "#1b2940",
  border: "rgba(255,255,255,0.14)",
  borderMid: "rgba(255,255,255,0.22)",
  text: "#f8fafc",
  textMid: "rgba(248,250,252,0.88)",
  textDim: "rgba(248,250,252,0.74)",
  accent: "#22d3ee",
  accentDim: "rgba(34,211,238,0.16)",
  accentBrd: "rgba(34,211,238,0.30)",
  green: "#22c55e",
  greenDim: "rgba(34,197,94,0.16)",
  greenBrd: "rgba(34,197,94,0.30)",
  red: "#ef4444",
  redDim: "rgba(239,68,68,0.16)",
  redBrd: "rgba(239,68,68,0.30)",
  amber: "#f59e0b",
  amberDim: "rgba(245,158,11,0.16)",
  amberBrd: "rgba(245,158,11,0.30)",
  purple: "#a78bfa",
  purpleDim: "rgba(167,139,250,0.16)",
  purpleBrd: "rgba(167,139,250,0.30)",
  slate: "rgba(248,250,252,0.12)",
  slateBrd: "rgba(248,250,252,0.22)",
};

const inputBase = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${T.border}`,
  background: T.panel,
  color: T.text,
  outline: "none",
  boxSizing: "border-box",
  fontSize: 13,
};

function nz(value, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function normalizeResult(value) {
  const v = String(value || "").toUpperCase().replace(/\s+/g, "_");
  if (["PASS", "FAIL", "REPAIR_REQUIRED", "OUT_OF_SERVICE"].includes(v)) return v;
  if (v === "CONDITIONAL") return "REPAIR_REQUIRED";
  return "UNKNOWN";
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dateDiffDays(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((end - start) / 86400000);
}

function getExpiryBucket(value) {
  const days = dateDiffDays(value);
  if (days === null) return "NO_EXPIRY";
  if (days < 0) return "EXPIRED";
  if (days <= 30) return "EXPIRING_SOON";
  if (days <= 90) return "EXPIRING_90";
  return "VALID";
}

const RESULT_CFG = {
  PASS: { label: "Pass", color: T.green, bg: T.greenDim, brd: T.greenBrd },
  FAIL: { label: "Fail", color: T.red, bg: T.redDim, brd: T.redBrd },
  REPAIR_REQUIRED: { label: "Repair required", color: T.amber, bg: T.amberDim, brd: T.amberBrd },
  OUT_OF_SERVICE: { label: "Out of service", color: T.purple, bg: T.purpleDim, brd: T.purpleBrd },
  UNKNOWN: { label: "Unknown", color: T.textMid, bg: T.slate, brd: T.slateBrd },
};

const EXPIRY_CFG = {
  EXPIRED: { color: T.red, bg: T.redDim },
  EXPIRING_SOON: { color: T.amber, bg: T.amberDim },
  EXPIRING_90: { color: T.purple, bg: T.purpleDim },
  VALID: { color: T.green, bg: T.greenDim },
  NO_EXPIRY: { color: T.textMid, bg: T.slate },
};

function resultCfg(value) {
  return RESULT_CFG[value] || RESULT_CFG.UNKNOWN;
}

function expiryCfg(value) {
  return EXPIRY_CFG[value] || EXPIRY_CFG.NO_EXPIRY;
}

function groupCertificates(rows) {
  const grouped = {};

  for (const row of rows) {
    const client = nz(row.client_name, "UNASSIGNED CLIENT");
    const type = nz(row.equipment_type || row.asset_type, "UNCATEGORIZED");
    const desc = nz(
      row.equipment_description || row.asset_name || row.asset_tag,
      "UNNAMED EQUIPMENT"
    );

    if (!grouped[client]) grouped[client] = {};
    if (!grouped[client][type]) grouped[client][type] = {};
    if (!grouped[client][type][desc]) grouped[client][type][desc] = [];
    grouped[client][type][desc].push(row);
  }

  return Object.keys(grouped)
    .sort()
    .map((client) => ({
      client,
      types: Object.keys(grouped[client])
        .sort()
        .map((type) => ({
          type,
          items: Object.keys(grouped[client][type])
            .sort()
            .map((desc) => ({
              desc,
              certs: [...grouped[client][type][desc]].sort(
                (a, b) =>
                  new Date(b.issue_date || b.created_at || 0) -
                  new Date(a.issue_date || a.created_at || 0)
              ),
            })),
        })),
    }));
}

export default function CertificatesPage() {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [search, setSearch] = useState("");
  const [fResult, setFResult] = useState("ALL");
  const [fExpiry, setFExpiry] = useState("ALL");
  const [fClient, setFClient] = useState("ALL");
  const [fType, setFType] = useState("ALL");
  const [fStatus, setFStatus] = useState("ALL");
  const [view, setView] = useState("grouped");
  const [expandedClients, setExpandedClients] = useState({});
  const [expandedTypes, setExpandedTypes] = useState({});

  useEffect(() => {
    loadCertificates();
  }, []);

  async function loadCertificates() {
    setLoading(true);
    setErrorText("");

    const { data, error } = await supabase
      .from("certificates")
      .select(`
        id,
        certificate_number,
        result,
        issue_date,
        issued_at,
        expiry_date,
        valid_to,
        created_at,
        inspection_number,
        inspection_no,
        asset_tag,
        asset_name,
        equipment_description,
        equipment_type,
        asset_type,
        client_name,
        company,
        status,
        folder_id,
        folder_name,
        folder_position,
        extracted_data
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load certificates:", error);
      setCerts([]);
      setErrorText(error.message || "Failed to load certificates.");
      setLoading(false);
      return;
    }

    const cleaned = (data || []).map((row) => {
      const extracted = row.extracted_data || {};
      const issueDate =
        row.issue_date || row.issued_at || extracted.issue_date || null;
      const expiryDate =
        row.expiry_date || row.valid_to || extracted.expiry_date || null;

      return {
        ...row,
        id: row.id,
        issue_date: issueDate,
        expiry_date: expiryDate,
        result: normalizeResult(row.result || extracted.result),
        client_name: nz(row.client_name || row.company || extracted.client_name, "UNASSIGNED CLIENT"),
        equipment_type: nz(
          row.equipment_type || row.asset_type || extracted.equipment_type,
          "UNCATEGORIZED"
        ),
        equipment_description: nz(
          row.equipment_description ||
            row.asset_name ||
            row.asset_tag ||
            extracted.equipment_description,
          "UNNAMED EQUIPMENT"
        ),
        status: nz(row.status, "active"),
        expiry_bucket: getExpiryBucket(expiryDate),
      };
    });

    const openClients = {};
    cleaned.forEach((row) => {
      openClients[row.client_name] = true;
    });

    setExpandedClients(openClients);
    setCerts(cleaned);
    setLoading(false);
  }

  const clientOptions = useMemo(
    () => [...new Set(certs.map((x) => x.client_name))].sort(),
    [certs]
  );

  const typeOptions = useMemo(
    () => [...new Set(certs.map((x) => x.equipment_type))].sort(),
    [certs]
  );

  const statusOptions = useMemo(
    () => [...new Set(certs.map((x) => nz(x.status, "active")))].sort(),
    [certs]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return certs.filter((row) => {
      const haystack = [
        row.certificate_number,
        row.client_name,
        row.asset_tag,
        row.asset_name,
        row.equipment_description,
        row.equipment_type,
        row.inspection_number,
        row.inspection_no,
        row.folder_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const passSearch = !q || haystack.includes(q);
      const passResult = fResult === "ALL" || row.result === fResult;
      const passExpiry = fExpiry === "ALL" || row.expiry_bucket === fExpiry;
      const passClient = fClient === "ALL" || row.client_name === fClient;
      const passType = fType === "ALL" || row.equipment_type === fType;
      const passStatus = fStatus === "ALL" || row.status === fStatus;

      return passSearch && passResult && passExpiry && passClient && passType && passStatus;
    });
  }, [certs, search, fResult, fExpiry, fClient, fType, fStatus]);

  const grouped = useMemo(() => groupCertificates(filtered), [filtered]);

  const hasFilters =
    search ||
    fResult !== "ALL" ||
    fExpiry !== "ALL" ||
    fClient !== "ALL" ||
    fType !== "ALL" ||
    fStatus !== "ALL";

  function clearFilters() {
    setSearch("");
    setFResult("ALL");
    setFExpiry("ALL");
    setFClient("ALL");
    setFType("ALL");
    setFStatus("ALL");
  }

  function toggleClient(client) {
    setExpandedClients((prev) => ({ ...prev, [client]: !prev[client] }));
  }

  function toggleType(key) {
    setExpandedTypes((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <AppLayout title="Certificates Register">
      <div
        style={{
          minHeight: "100vh",
          background: T.bg,
          color: T.text,
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      >
        <div
          style={{
            background: T.surface,
            borderBottom: `1px solid ${T.border}`,
            padding: "0 28px",
          }}
        >
          <div
            style={{
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 3,
                    height: 18,
                    borderRadius: 2,
                    background: T.accent,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: T.textMid,
                  }}
                >
                  ISO 9001 · Document Register
                </span>
              </div>

              <span style={{ fontSize: 11, color: T.textDim }}>
                {filtered.length} of {certs.length} records
              </span>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href="/certificates/import" style={btnGhost}>
                ↑ AI Import
              </Link>
              <Link href="/certificates/create" style={btnAccent}>
                + New Certificate
              </Link>
            </div>
          </div>
        </div>

        <div style={{ padding: "24px 28px", display: "grid", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 30,
                  fontWeight: 900,
                  color: T.text,
                }}
              >
                Certificates Register
              </h1>
              <p style={{ margin: "6px 0 0", fontSize: 14, color: T.textDim }}>
                Grouped by client · equipment type · asset
              </p>
            </div>

            <div
              style={{
                display: "flex",
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                overflow: "hidden",
                background: T.panel,
              }}
            >
              {["grouped", "flat"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  style={{
                    border: "none",
                    cursor: "pointer",
                    padding: "10px 14px",
                    fontSize: 12,
                    fontWeight: 800,
                    background: view === v ? T.accentDim : "transparent",
                    color: view === v ? T.accent : T.textDim,
                  }}
                >
                  {v === "grouped" ? "Grouped View" : "Flat View"}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              background: T.panel,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                borderBottom: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: T.textDim,
                }}
              >
                Filters
              </span>

              {hasFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  style={{
                    background: "none",
                    border: "none",
                    color: T.textDim,
                    fontSize: 11,
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Clear all ×
                </button>
              ) : null}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
              }}
            >
              <div style={{ padding: "10px 14px", borderRight: `1px solid ${T.border}` }}>
                <div style={filterLabel}>Search</div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Certificate no, client, equipment"
                  style={{
                    ...inputBase,
                    background: "transparent",
                    border: "none",
                    padding: 0,
                  }}
                />
              </div>

              <FilterCell
                label="Result"
                value={fResult}
                onChange={setFResult}
                options={[
                  { v: "ALL", l: "All results" },
                  { v: "PASS", l: "Pass" },
                  { v: "FAIL", l: "Fail" },
                  { v: "REPAIR_REQUIRED", l: "Repair required" },
                  { v: "OUT_OF_SERVICE", l: "Out of service" },
                  { v: "UNKNOWN", l: "Unknown" },
                ]}
              />

              <FilterCell
                label="Expiry"
                value={fExpiry}
                onChange={setFExpiry}
                options={[
                  { v: "ALL", l: "All expiry" },
                  { v: "EXPIRED", l: "Expired" },
                  { v: "EXPIRING_SOON", l: "Expiring ≤30d" },
                  { v: "EXPIRING_90", l: "Expiring ≤90d" },
                  { v: "VALID", l: "Valid" },
                  { v: "NO_EXPIRY", l: "No expiry" },
                ]}
              />

              <FilterCell
                label="Client"
                value={fClient}
                onChange={setFClient}
                options={[
                  { v: "ALL", l: "All clients" },
                  ...clientOptions.map((c) => ({ v: c, l: c })),
                ]}
              />

              <FilterCell
                label="Type"
                value={fType}
                onChange={setFType}
                options={[
                  { v: "ALL", l: "All types" },
                  ...typeOptions.map((t) => ({ v: t, l: t })),
                ]}
              />

              <FilterCell
                label="Status"
                value={fStatus}
                onChange={setFStatus}
                options={[
                  { v: "ALL", l: "All status" },
                  ...statusOptions.map((s) => ({ v: s, l: s })),
                ]}
                last
              />
            </div>
          </div>

          {errorText ? (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                border: `1px solid ${T.redBrd}`,
                background: T.redDim,
                color: T.red,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {errorText}
            </div>
          ) : null}

          {loading ? (
            <LoadingState />
          ) : filtered.length === 0 ? (
            <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
          ) : view === "flat" ? (
            <FlatView certs={filtered} />
          ) : (
            <GroupedView
              grouped={grouped}
              expandedClients={expandedClients}
              expandedTypes={expandedTypes}
              toggleClient={toggleClient}
              toggleType={toggleType}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function GroupedView({
  grouped,
  expandedClients,
  expandedTypes,
  toggleClient,
  toggleType,
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {grouped.map((clientGroup) => {
        const open = !!expandedClients[clientGroup.client];
        const certCount = clientGroup.types.reduce(
          (a, t) => a + t.items.reduce((b, i) => b + i.certs.length, 0),
          0
        );

        return (
          <div
            key={clientGroup.client}
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              overflow: "hidden",
              background: T.panel,
            }}
          >
            <button
              type="button"
              onClick={() => toggleClient(clientGroup.client)}
              style={{
                width: "100%",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                padding: "14px 16px",
                background: "transparent",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                color: T.text,
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>{clientGroup.client}</div>
                <div style={{ fontSize: 12, color: T.textDim, marginTop: 4 }}>
                  {certCount} certificate{certCount === 1 ? "" : "s"}
                </div>
              </div>

              <div style={{ fontSize: 18, fontWeight: 900, color: T.accent }}>
                {open ? "−" : "+"}
              </div>
            </button>

            {open ? (
              <div style={{ borderTop: `1px solid ${T.border}`, padding: 14, display: "grid", gap: 12 }}>
                {clientGroup.types.map((typeGroup) => {
                  const key = `${clientGroup.client}__${typeGroup.type}`;
                  const typeOpen = expandedTypes[key] ?? true;

                  return (
                    <div
                      key={key}
                      style={{
                        border: `1px solid ${T.border}`,
                        borderRadius: 12,
                        overflow: "hidden",
                        background: T.panel2,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleType(key)}
                        style={{
                          width: "100%",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          padding: "12px 14px",
                          background: "transparent",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                          color: T.text,
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 800 }}>{typeGroup.type}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: T.accent }}>
                          {typeOpen ? "−" : "+"}
                        </div>
                      </button>

                      {typeOpen ? (
                        <div style={{ padding: 14, borderTop: `1px solid ${T.border}`, display: "grid", gap: 12 }}>
                          {typeGroup.items.map((item) => (
                            <div
                              key={`${typeGroup.type}-${item.desc}`}
                              style={{
                                border: `1px solid ${T.border}`,
                                borderRadius: 12,
                                overflow: "hidden",
                                background: "rgba(255,255,255,0.02)",
                              }}
                            >
                              <div
                                style={{
                                  padding: "12px 14px",
                                  borderBottom: `1px solid ${T.border}`,
                                  fontSize: 14,
                                  fontWeight: 800,
                                  color: T.text,
                                }}
                              >
                                {item.desc}
                              </div>

                              <div style={{ overflowX: "auto" }}>
                                <table style={tableStyle}>
                                  <thead>
                                    <tr>
                                      {["Certificate No", "Result", "Issue", "Expiry", "Status", "Actions"].map((h) => (
                                        <th key={h} style={thStyle}>
                                          {h}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.certs.map((cert) => (
                                      <CertRow key={cert.id} cert={cert} compact />
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function FlatView({ certs }) {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        overflow: "hidden",
        background: T.panel,
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {[
                "Certificate No",
                "Client",
                "Equipment",
                "Type",
                "Result",
                "Issue",
                "Expiry",
                "Days",
                "Status",
                "Actions",
              ].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {certs.map((cert) => (
              <CertRow key={cert.id} cert={cert} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CertRow({ cert, compact = false }) {
  const result = resultCfg(cert.result);
  const expiry = expiryCfg(cert.expiry_bucket);
  const days = dateDiffDays(cert.expiry_date);
  const id = encodeURIComponent(String(cert.id ?? ""));

  if (compact) {
    return (
      <tr style={{ borderBottom: `1px solid ${T.border}` }}>
        <td style={tdStyle}>
          <span style={monoAccent}>{cert.certificate_number || "—"}</span>
        </td>
        <td style={tdStyle}>
          <Badge label={result.label} color={result.color} bg={result.bg} brd={result.brd} />
        </td>
        <td style={tdStyle}>{formatDate(cert.issue_date)}</td>
        <td style={tdStyle}>{formatDate(cert.expiry_date)}</td>
        <td style={tdStyle}>
          <span style={{ textTransform: "capitalize", color: T.textMid }}>
            {nz(cert.status, "active")}
          </span>
        </td>
        <td style={tdStyle}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <Link href={`/certificates/${id}`} prefetch={false} style={actionBtn(T.accent, T.accentDim, T.accentBrd)}>
              View
            </Link>
            <Link href={`/certificates/${id}/edit`} prefetch={false} style={actionBtn(T.amber, T.amberDim, T.amberBrd)}>
              Edit
            </Link>
            <Link href={`/certificates/print/${id}`} prefetch={false} style={actionBtn(T.green, T.greenDim, T.greenBrd)}>
              Print
            </Link>
            {cert.folder_id ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: T.purpleDim,
                  color: T.purple,
                  border: `1px solid ${T.purpleBrd}`,
                  whiteSpace: "nowrap",
                }}
              >
                {cert.folder_name || "Linked Folder"}
              </span>
            ) : null}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
      <td style={tdStyle}>
        <span style={monoAccent}>{cert.certificate_number || "—"}</span>
      </td>
      <td style={tdStyle}>{cert.client_name}</td>
      <td style={tdStyle}>
        <div
          style={{
            maxWidth: 220,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {cert.equipment_description}
        </div>
      </td>
      <td style={tdStyle}>{cert.equipment_type}</td>
      <td style={tdStyle}>
        <Badge label={result.label} color={result.color} bg={result.bg} brd={result.brd} />
      </td>
      <td style={tdStyle}>{formatDate(cert.issue_date)}</td>
      <td style={tdStyle}>{formatDate(cert.expiry_date)}</td>
      <td style={tdStyle}>
        {days !== null ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 4,
              background: expiry.bg,
              color: expiry.color,
            }}
          >
            {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
          </span>
        ) : (
          <span style={{ color: T.textDim }}>—</span>
        )}
      </td>
      <td style={tdStyle}>
        <span style={{ textTransform: "capitalize", color: T.textMid }}>
          {nz(cert.status, "active")}
        </span>
      </td>
      <td style={tdStyle}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <Link href={`/certificates/${id}`} prefetch={false} style={actionBtn(T.accent, T.accentDim, T.accentBrd)}>
            View
          </Link>

          <Link href={`/certificates/${id}/edit`} prefetch={false} style={actionBtn(T.amber, T.amberDim, T.amberBrd)}>
            Edit
          </Link>

          <Link href={`/certificates/print/${id}`} prefetch={false} style={actionBtn(T.green, T.greenDim, T.greenBrd)}>
            Print
          </Link>

          {cert.folder_id ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "6px 10px",
                borderRadius: 999,
                background: T.purpleDim,
                color: T.purple,
                border: `1px solid ${T.purpleBrd}`,
                whiteSpace: "nowrap",
              }}
            >
              {cert.folder_name || "Linked Folder"}
            </span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function FilterCell({ label, value, onChange, options, last = false }) {
  const active = value !== "ALL";

  return (
    <div
      style={{
        padding: "10px 14px",
        borderRight: last ? "none" : `1px solid ${T.border}`,
      }}
    >
      <div
        style={{
          ...filterLabel,
          color: active ? T.accent : T.textDim,
          fontWeight: active ? 800 : 700,
        }}
      >
        {label}
      </div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...inputBase,
          background: "transparent",
          border: "none",
          padding: 0,
          color: T.textMid,
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v} style={{ color: "#111827" }}>
            {o.l}
          </option>
        ))}
      </select>
    </div>
  );
}

function Badge({ label, color, bg, brd }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 8px",
        borderRadius: 999,
        border: `1px solid ${brd}`,
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function LoadingState() {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        background: T.panel,
        padding: 18,
        color: T.textMid,
        fontWeight: 700,
      }}
    >
      Loading certificates…
    </div>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        background: T.panel,
        padding: 24,
        color: T.textMid,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 900, color: T.text }}>No certificates found</div>
      <div style={{ fontSize: 14, color: T.textDim }}>
        {hasFilters ? "Try changing your filters." : "No certificate records are available yet."}
      </div>
      {hasFilters ? (
        <button type="button" onClick={onClear} style={btnAccent}>
          Clear Filters
        </button>
      ) : null}
    </div>
  );
}

const filterLabel = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: 8,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 900,
};

const thStyle = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 11,
  fontWeight: 800,
  color: T.textDim,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderBottom: `1px solid ${T.border}`,
};

const tdStyle = {
  padding: "12px 14px",
  fontSize: 13,
  color: T.textMid,
  verticalAlign: "top",
};

const monoAccent = {
  color: T.accent,
  fontWeight: 900,
  fontFamily: "'IBM Plex Mono', monospace",
};

function actionBtn(color, bg, border) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 10px",
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: bg,
    color,
    fontSize: 12,
    fontWeight: 800,
    textDecoration: "none",
    whiteSpace: "nowrap",
  };
}

const btnGhost = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "9px 12px",
  borderRadius: 9,
  border: `1px solid ${T.border}`,
  background: T.panel,
  color: T.text,
  fontSize: 12,
  fontWeight: 800,
  textDecoration: "none",
};

const btnAccent = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "9px 12px",
  borderRadius: 9,
  border: `1px solid ${T.accentBrd}`,
  background: T.accentDim,
  color: T.accent,
  fontSize: 12,
  fontWeight: 900,
  textDecoration: "none",
};
