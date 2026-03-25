"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const T = {
  bg: "#080d14",
  surface: "#0d1420",
  panel: "#111b2a",
  panel2: "#162030",
  border: "rgba(255,255,255,0.08)",
  borderMid: "rgba(255,255,255,0.14)",
  text: "#f0f4f8",
  textMid: "rgba(240,244,248,0.72)",
  textDim: "rgba(240,244,248,0.42)",
  accent: "#0ea5e9",
  accentDim: "rgba(14,165,233,0.15)",
  accentBrd: "rgba(14,165,233,0.30)",
  green: "#10b981",
  greenDim: "rgba(16,185,129,0.14)",
  greenBrd: "rgba(16,185,129,0.28)",
  red: "#ef4444",
  redDim: "rgba(239,68,68,0.14)",
  redBrd: "rgba(239,68,68,0.28)",
  amber: "#f59e0b",
  amberDim: "rgba(245,158,11,0.14)",
  amberBrd: "rgba(245,158,11,0.28)",
  purple: "#a78bfa",
  purpleDim: "rgba(167,139,250,0.14)",
  purpleBrd: "rgba(167,139,250,0.28)",
  slate: "rgba(240,244,248,0.12)",
  slateBrd: "rgba(240,244,248,0.18)",
};

function nz(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s || fallback;
}

function normalizeResult(value) {
  const v = nz(value).toUpperCase().replace(/\s+/g, "_");
  if (!v) return "UNKNOWN";
  return v;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getExpiryBucket(expiryDate) {
  if (!expiryDate) return "NO_EXPIRY";
  const diffDays = Math.ceil((new Date(expiryDate) - new Date()) / 86400000);
  if (diffDays < 0) return "EXPIRED";
  if (diffDays <= 30) return "EXPIRING_SOON";
  if (diffDays <= 90) return "EXPIRING_90";
  return "VALID";
}

function daysUntil(value) {
  if (!value) return null;
  return Math.ceil((new Date(value) - new Date()) / 86400000);
}

function safeId(id) {
  return encodeURIComponent(String(id ?? ""));
}

function needsNcr(cert) {
  const result = normalizeResult(cert?.result);
  return ["FAIL", "REPAIR_REQUIRED", "OUT_OF_SERVICE"].includes(result);
}

function buildNcrHref(cert) {
  const params = new URLSearchParams();

  params.set("source", "certificate");
  params.set("certificate_id", nz(cert?.id));
  params.set("certificate_number", nz(cert?.certificate_number));
  params.set("inspection_number", nz(cert?.inspection_number));
  params.set("asset_tag", nz(cert?.asset_tag));
  params.set("asset_name", nz(cert?.asset_name));
  params.set("equipment_description", nz(cert?.equipment_description));
  params.set("equipment_type", nz(cert?.equipment_type || cert?.asset_type));
  params.set("client_name", nz(cert?.client_name));
  params.set("result", normalizeResult(cert?.result));
  params.set("issue_date", nz(cert?.issue_date));
  params.set("expiry_date", nz(cert?.expiry_date));

  return `/ncr/new?${params.toString()}`;
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

const RESULT_CFG = {
  PASS: {
    label: "Pass",
    color: T.green,
    bg: T.greenDim,
    brd: T.greenBrd,
  },
  FAIL: {
    label: "Fail",
    color: T.red,
    bg: T.redDim,
    brd: T.redBrd,
  },
  REPAIR_REQUIRED: {
    label: "Repair Required",
    color: T.amber,
    bg: T.amberDim,
    brd: T.amberBrd,
  },
  OUT_OF_SERVICE: {
    label: "Out of Service",
    color: T.purple,
    bg: T.purpleDim,
    brd: T.purpleBrd,
  },
  UNKNOWN: {
    label: "Unknown",
    color: T.textDim,
    bg: T.slate,
    brd: T.slateBrd,
  },
};

const EXPIRY_CFG = {
  EXPIRED: {
    label: "Expired",
    color: T.red,
    bg: T.redDim,
  },
  EXPIRING_SOON: {
    label: "Expiring ≤30d",
    color: T.amber,
    bg: T.amberDim,
  },
  EXPIRING_90: {
    label: "Expiring ≤90d",
    color: T.accent,
    bg: T.accentDim,
  },
  VALID: {
    label: "Valid",
    color: T.green,
    bg: T.greenDim,
  },
  NO_EXPIRY: {
    label: "No Expiry",
    color: T.textDim,
    bg: T.slate,
  },
};

function resultCfg(value) {
  return RESULT_CFG[value] || RESULT_CFG.UNKNOWN;
}

function expiryCfg(value) {
  return EXPIRY_CFG[value] || EXPIRY_CFG.NO_EXPIRY;
}

export default function CertificatesPageClient() {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [search, setSearch] = useState("");
  const [fResult, setFResult] = useState("ALL");
  const [fExpiry, setFExpiry] = useState("ALL");
  const [fClient, setFClient] = useState("ALL");
  const [fType, setFType] = useState("ALL");
  const [fStatus, setFStatus] = useState("ALL");
  const [fNcr, setFNcr] = useState("ALL");
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
        asset_tag,
        asset_name,
        equipment_description,
        equipment_type,
        asset_type,
        client_name,
        status,
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

      const normalized = normalizeResult(row.result || extracted.result);

      return {
        ...row,
        id: row.id,
        issue_date: issueDate,
        expiry_date: expiryDate,
        result: normalized,
        client_name: nz(row.client_name || extracted.client_name, "UNASSIGNED CLIENT"),
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
        needs_ncr: ["FAIL", "REPAIR_REQUIRED", "OUT_OF_SERVICE"].includes(normalized),
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
        row.status,
        row.id,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!q || haystack.includes(q)) &&
        (fResult === "ALL" || row.result === fResult) &&
        (fExpiry === "ALL" || row.expiry_bucket === fExpiry) &&
        (fClient === "ALL" || row.client_name === fClient) &&
        (fType === "ALL" || row.equipment_type === fType) &&
        (fStatus === "ALL" || row.status === fStatus) &&
        (fNcr === "ALL" ||
          (fNcr === "YES" && row.needs_ncr) ||
          (fNcr === "NO" && !row.needs_ncr))
      );
    });
  }, [certs, search, fResult, fExpiry, fClient, fType, fStatus, fNcr]);

  const grouped = useMemo(() => groupCertificates(filtered), [filtered]);

  const stats = useMemo(
    () => ({
      total: certs.length,
      pass: certs.filter((x) => x.result === "PASS").length,
      fail: certs.filter((x) => x.result === "FAIL").length,
      expiring: certs.filter((x) => x.expiry_bucket === "EXPIRING_SOON").length,
      expired: certs.filter((x) => x.expiry_bucket === "EXPIRED").length,
      ncrCandidates: certs.filter((x) => x.needs_ncr).length,
    }),
    [certs]
  );

  const hasFilters =
    !!search ||
    fResult !== "ALL" ||
    fExpiry !== "ALL" ||
    fClient !== "ALL" ||
    fType !== "ALL" ||
    fStatus !== "ALL" ||
    fNcr !== "ALL";

  function clearFilters() {
    setSearch("");
    setFResult("ALL");
    setFExpiry("ALL");
    setFClient("ALL");
    setFType("ALL");
    setFStatus("ALL");
    setFNcr("ALL");
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
          fontFamily: "'IBM Plex Mono', monospace",
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
              minHeight: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              padding: "10px 0",
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
                    fontWeight: 700,
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
                  fontSize: 28,
                  fontWeight: 800,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                Certificates Register
              </h1>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: T.textDim }}>
                Grouped by client · equipment type · asset · instant NCR creation for failed certificates
              </p>
            </div>

            <div
              style={{
                display: "flex",
                border: `1px solid ${T.border}`,
                borderRadius: 8,
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
                    padding: "7px 16px",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontFamily: "inherit",
                    background: view === v ? T.accent : "transparent",
                    color: view === v ? "#fff" : T.textMid,
                  }}
                >
                  {v === "grouped" ? "⊞ Grouped" : "≡ Flat"}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <StatCard label="Total" value={stats.total} color={T.accent} />
            <StatCard label="Passed" value={stats.pass} color={T.green} />
            <StatCard label="Failed" value={stats.fail} color={T.red} />
            <StatCard label="Expiring ≤30d" value={stats.expiring} color={T.amber} />
            <StatCard label="Expired" value={stats.expired} color={T.red} />
            <StatCard label="Needs NCR" value={stats.ncrCandidates} color={T.purple} />
          </div>

          {stats.ncrCandidates > 0 ? (
            <div
              style={{
                borderRadius: 12,
                padding: "14px 16px",
                background: T.purpleDim,
                border: `1px solid ${T.purpleBrd}`,
                color: T.text,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: T.purple,
                    marginBottom: 4,
                  }}
                >
                  NCR candidates detected
                </div>
                <div style={{ fontSize: 13, color: T.textMid }}>
                  {stats.ncrCandidates} uploaded certificate
                  {stats.ncrCandidates !== 1 ? "s need" : " needs"} NCR action.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFNcr("YES")}
                style={{
                  ...btnGhost,
                  background: T.purpleDim,
                  border: `1px solid ${T.purpleBrd}`,
                  color: T.purple,
                  cursor: "pointer",
                }}
              >
                Show only NCR candidates
              </button>
            </div>
          ) : null}

          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "10px 16px",
                borderBottom: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: T.textDim,
                }}
              >
                Filters
              </span>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  style={{
                    background: "none",
                    border: "none",
                    color: T.textDim,
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Clear all ×
                </button>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr",
              }}
            >
              <div style={{ padding: "10px 14px", borderRight: `1px solid ${T.border}` }}>
                <div style={filterLabel}>Search</div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Certificate no., client, asset tag..."
                  style={{
                    ...inputBase,
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
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
              />

              <FilterCell
                label="Needs NCR"
                value={fNcr}
                onChange={setFNcr}
                options={[
                  { v: "ALL", l: "All" },
                  { v: "YES", l: "Yes" },
                  { v: "NO", l: "No" },
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
        const passCount = clientGroup.types.reduce(
          (a, t) =>
            a +
            t.items.reduce(
              (b, i) => b + i.certs.filter((c) => c.result === "PASS").length,
              0
            ),
          0
        );
        const failCount = clientGroup.types.reduce(
          (a, t) =>
            a +
            t.items.reduce(
              (b, i) => b + i.certs.filter((c) => needsNcr(c)).length,
              0
            ),
          0
        );

        return (
          <div
            key={clientGroup.client}
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => toggleClient(clientGroup.client)}
              style={{
                width: "100%",
                border: "none",
                background: "none",
                cursor: "pointer",
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              <Chevron open={open} />

              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: T.accentDim,
                  border: `1px solid ${T.accentBrd}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: T.accent,
                  fontWeight: 800,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                {clientGroup.client.charAt(0)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: "'IBM Plex Sans', sans-serif",
                  }}
                >
                  {clientGroup.client}
                </div>
                <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                  {clientGroup.types.length} equipment type
                  {clientGroup.types.length !== 1 ? "s" : ""} · {certCount} certificate
                  {certCount !== 1 ? "s" : ""}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <MiniPill value={passCount} color={T.green} bg={T.greenDim} label="pass" />
                {failCount > 0 ? (
                  <MiniPill value={failCount} color={T.purple} bg={T.purpleDim} label="need NCR" />
                ) : null}
              </div>
            </button>

            {open ? (
              <div style={{ borderTop: `1px solid ${T.border}` }}>
                {clientGroup.types.map((typeGroup, idx) => {
                  const typeKey = `${clientGroup.client}::${typeGroup.type}`;
                  const typeOpen = expandedTypes[typeKey] !== false;
                  const typeCertCount = typeGroup.items.reduce(
                    (a, i) => a + i.certs.length,
                    0
                  );

                  return (
                    <div
                      key={typeGroup.type}
                      style={{
                        borderTop: idx > 0 ? `1px solid ${T.border}` : "none",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleType(typeKey)}
                        style={{
                          width: "100%",
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          padding: "10px 20px 10px 56px",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          textAlign: "left",
                          fontFamily: "inherit",
                        }}
                      >
                        <div
                          style={{
                            padding: "3px 10px",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 800,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            background: T.panel,
                            border: `1px solid ${T.borderMid}`,
                            color: T.textMid,
                          }}
                        >
                          {typeGroup.type}
                        </div>

                        <span style={{ fontSize: 11, color: T.textDim }}>
                          {typeGroup.items.length} asset
                          {typeGroup.items.length !== 1 ? "s" : ""} · {typeCertCount} cert
                          {typeCertCount !== 1 ? "s" : ""}
                        </span>

                        <div style={{ marginLeft: "auto" }}>
                          <Chevron open={typeOpen} />
                        </div>
                      </button>

                      {typeOpen ? (
                        <div style={{ padding: "0 20px 14px 20px", display: "grid", gap: 8 }}>
                          {typeGroup.items.map((item) => (
                            <AssetBlock key={item.desc} item={item} />
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

function AssetBlock({ item }) {
  const [open, setOpen] = useState(true);
  const latestResult = item.certs[0]?.result || "UNKNOWN";
  const rc = resultCfg(latestResult);

  return (
    <div
      style={{
        background: T.panel,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%",
          border: "none",
          background: "none",
          cursor: "pointer",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <Chevron open={open} />

        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: rc.color,
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            {item.desc}
          </span>
        </div>

        <span style={{ fontSize: 11, color: T.textDim }}>
          {item.certs.length} cert{item.certs.length !== 1 ? "s" : ""}
        </span>

        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            padding: "2px 8px",
            borderRadius: 4,
            background: rc.bg,
            color: rc.color,
            border: `1px solid ${rc.brd}`,
            letterSpacing: "0.06em",
          }}
        >
          {rc.label}
        </span>
      </button>

      {open ? (
        <div style={{ borderTop: `1px solid ${T.border}`, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1120 }}>
            <thead>
              <tr style={{ background: T.bg }}>
                {[
                  "Certificate No.",
                  "Insp. No.",
                  "Result",
                  "Issue Date",
                  "Expiry Date",
                  "Days Left",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <td key={heading} style={headCell}>
                    {heading}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {item.certs.map((cert, index) => {
                const result = resultCfg(cert.result);
                const expiry = expiryCfg(cert.expiry_bucket);
                const days = daysUntil(cert.expiry_date);
                const latest = index === 0;
                const id = safeId(cert.id);

                return (
                  <tr
                    key={cert.id}
                    style={{
                      background: latest ? "rgba(14,165,233,0.03)" : "transparent",
                      borderLeft: latest ? `2px solid ${T.accent}` : "2px solid transparent",
                    }}
                  >
                    <td style={tdStyle}>
                      <span style={monoAccent}>{cert.certificate_number || "—"}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={monoDim}>{cert.inspection_number || "—"}</span>
                    </td>
                    <td style={tdStyle}>
                      <Badge
                        label={result.label}
                        color={result.color}
                        bg={result.bg}
                        brd={result.brd}
                      />
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
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <Link
                          href={`/certificates/${id}`}
                          prefetch={false}
                          style={actionBtn(T.accent, T.accentDim, T.accentBrd)}
                        >
                          View
                        </Link>

                        <Link
                          href={`/certificates/${id}/edit`}
                          prefetch={false}
                          style={actionBtn(T.amber, T.amberDim, T.amberBrd)}
                        >
                          Edit
                        </Link>

                        {needsNcr(cert) ? (
                          <Link
                            href={buildNcrHref(cert)}
                            prefetch={false}
                            style={actionBtn(T.purple, T.purpleDim, T.purpleBrd)}
                          >
                            Create NCR
                          </Link>
                        ) : null}

                        <a
                          href={`/certificates/${id}?download=1`}
                          target="_blank"
                          rel="noreferrer"
                          style={actionBtn(T.green, T.greenDim, T.greenBrd)}
                        >
                          PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function FlatView({ certs }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1280 }}>
          <thead>
            <tr style={{ background: T.bg }}>
              {[
                "Certificate No.",
                "Client",
                "Equipment",
                "Type",
                "Result",
                "Issue",
                "Expiry",
                "Days Left",
                "Needs NCR",
                "Status",
                "Actions",
              ].map((heading) => (
                <td key={heading} style={headCell}>
                  {heading}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {certs.map((cert) => {
              const result = resultCfg(cert.result);
              const expiry = expiryCfg(cert.expiry_bucket);
              const days = daysUntil(cert.expiry_date);
              const id = safeId(cert.id);

              return (
                <tr key={cert.id} style={{ borderBottom: `1px solid ${T.border}` }}>
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
                    <Badge
                      label={result.label}
                      color={result.color}
                      bg={result.bg}
                      brd={result.brd}
                    />
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
                    {needsNcr(cert) ? (
                      <Badge
                        label="Yes"
                        color={T.purple}
                        bg={T.purpleDim}
                        brd={T.purpleBrd}
                      />
                    ) : (
                      <span style={{ color: T.textDim }}>No</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ textTransform: "capitalize", color: T.textMid }}>
                      {nz(cert.status, "active")}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Link
                        href={`/certificates/${id}`}
                        prefetch={false}
                        style={actionBtn(T.accent, T.accentDim, T.accentBrd)}
                      >
                        View
                      </Link>

                      <Link
                        href={`/certificates/${id}/edit`}
                        prefetch={false}
                        style={actionBtn(T.amber, T.amberDim, T.amberBrd)}
                      >
                        Edit
                      </Link>

                      {needsNcr(cert) ? (
                        <Link
                          href={buildNcrHref(cert)}
                          prefetch={false}
                          style={actionBtn(T.purple, T.purpleDim, T.purpleBrd)}
                        >
                          Create NCR
                        </Link>
                      ) : null}

                      <a
                        href={`/certificates/${id}?download=1`}
                        target="_blank"
                        rel="noreferrer"
                        style={actionBtn(T.green, T.greenDim, T.greenBrd)}
                      >
                        PDF
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterCell({ label, value, onChange, options, last }) {
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
          width: "100%",
          background: "transparent",
          border: "none",
          outline: "none",
          cursor: "pointer",
          color: active ? T.text : T.textMid,
        }}
      >
        {options.map((opt) => (
          <option key={opt.v} value={opt.v} style={{ background: "#111b2a" }}>
            {opt.l}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: T.textDim,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          color,
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Badge({ label, color, bg, brd }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: 4,
        background: bg,
        color,
        border: `1px solid ${brd}`,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.06em",
      }}
    >
      {label}
    </span>
  );
}

function MiniPill({ value, color, bg, label }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 800,
        padding: "2px 8px",
        borderRadius: 4,
        background: bg,
        color,
      }}
    >
      {value} {label}
    </span>
  );
}

function Chevron({ open }) {
  return (
    <svg
      style={{
        flexShrink: 0,
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform .2s",
        color: T.textDim,
      }}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
    >
      <path
        d="M5 3l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LoadingState() {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            padding: "18px 20px",
            opacity: 1 - i * 0.15,
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: T.panel,
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  width: 180,
                  height: 13,
                  borderRadius: 4,
                  background: T.panel,
                  marginBottom: 6,
                }}
              />
              <div
                style={{
                  width: 120,
                  height: 10,
                  borderRadius: 4,
                  background: T.panel,
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: T.textDim,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        No records found
      </div>
      <div style={{ fontSize: 13, color: T.textMid, marginBottom: hasFilters ? 20 : 0 }}>
        {hasFilters
          ? "No certificates match the active filters."
          : "No certificates have been added yet."}
      </div>

      {hasFilters ? (
        <button
          type="button"
          onClick={onClear}
          style={{
            ...btnGhost,
            border: `1px solid ${T.borderMid}`,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}

const filterLabel = {
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const inputBase = {
  fontSize: 13,
  color: T.text,
  fontFamily: "'IBM Plex Mono', monospace",
  padding: "2px 0",
};

const headCell = {
  padding: "8px 12px",
  fontSize: 10,
  color: T.textDim,
  fontWeight: 800,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  borderBottom: `1px solid ${T.border}`,
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "10px 12px",
  borderBottom: `1px solid ${T.border}`,
  verticalAlign: "middle",
  fontSize: 12,
  color: T.textMid,
};

const monoAccent = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 12,
  color: T.accent,
};

const monoDim = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 11,
  color: T.textMid,
};

function actionBtn(color, bg, brd) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "5px 10px",
    borderRadius: 6,
    background: bg,
    border: `1px solid ${brd}`,
    color,
    fontSize: 11,
    fontWeight: 700,
    textDecoration: "none",
    letterSpacing: "0.04em",
    fontFamily: "'IBM Plex Mono', monospace",
  };
}

const btnGhost = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 14px",
  borderRadius: 8,
  background: "transparent",
  color: T.textMid,
  fontSize: 12,
  fontWeight: 700,
  textDecoration: "none",
  letterSpacing: "0.04em",
  fontFamily: "'IBM Plex Sans', sans-serif",
};

const btnAccent = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 14px",
  borderRadius: 8,
  background: T.accent,
  color: "#fff",
  fontSize: 12,
  fontWeight: 700,
  textDecoration: "none",
  letterSpacing: "0.04em",
  fontFamily: "'IBM Plex Sans', sans-serif",
};
