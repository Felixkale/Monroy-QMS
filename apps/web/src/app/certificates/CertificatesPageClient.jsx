"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const T = {
  bg: "#0a111b",
  surface: "rgba(15, 23, 42, 0.72)",
  panel: "rgba(15, 23, 42, 0.88)",
  panel2: "rgba(30, 41, 59, 0.72)",
  border: "rgba(148, 163, 184, 0.18)",
  borderMid: "rgba(148, 163, 184, 0.28)",
  text: "#f8fafc",
  textMid: "rgba(248,250,252,0.78)",
  textDim: "rgba(248,250,252,0.48)",
  accent: "#22d3ee",
  accentDim: "rgba(34,211,238,0.14)",
  accentBrd: "rgba(34,211,238,0.28)",
  green: "#22c55e",
  greenDim: "rgba(34,197,94,0.14)",
  greenBrd: "rgba(34,197,94,0.28)",
  red: "#ef4444",
  redDim: "rgba(239,68,68,0.14)",
  redBrd: "rgba(239,68,68,0.28)",
  amber: "#f59e0b",
  amberDim: "rgba(245,158,11,0.14)",
  amberBrd: "rgba(245,158,11,0.28)",
  purple: "#a78bfa",
  purpleDim: "rgba(167,139,250,0.14)",
  purpleBrd: "rgba(167,139,250,0.28)",
  slate: "rgba(248,250,252,0.10)",
  slateBrd: "rgba(248,250,252,0.18)",
};

function nz(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s || fallback;
}

function normalizeResult(value) {
  const v = nz(value).toUpperCase().replace(/\s+/g, "_");
  if (!v) return "UNKNOWN";
  if (v === "CONDITIONAL") return "REPAIR_REQUIRED";
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
  EXPIRED: { color: T.red, bg: T.redDim },
  EXPIRING_SOON: { color: T.amber, bg: T.amberDim },
  EXPIRING_90: { color: T.accent, bg: T.accentDim },
  VALID: { color: T.green, bg: T.greenDim },
  NO_EXPIRY: { color: T.textDim, bg: T.slate },
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
  const [fLinked, setFLinked] = useState("ALL");
  const [view, setView] = useState("grouped");
  const [expandedClients, setExpandedClients] = useState({});
  const [expandedTypes, setExpandedTypes] = useState({});
  const [linkSource, setLinkSource] = useState(null);
  const [linkName, setLinkName] = useState("");
  const [busyId, setBusyId] = useState("");

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

      const normalized = normalizeResult(row.result || extracted.result);

      return {
        ...row,
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
        row.folder_name,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!q || haystack.includes(q)) &&
        (fResult === "ALL" || row.result === fResult) &&
        (fExpiry === "ALL" || row.expiry_bucket === fExpiry) &&
        (fClient === "ALL" || row.client_name === fClient) &&
        (fType === "ALL" || row.equipment_type === fType) &&
        (fLinked === "ALL" ||
          (fLinked === "YES" && !!row.folder_id) ||
          (fLinked === "NO" && !row.folder_id))
      );
    });
  }, [certs, search, fResult, fExpiry, fClient, fType, fLinked]);

  const grouped = useMemo(() => groupCertificates(filtered), [filtered]);

  const stats = useMemo(
    () => ({
      total: certs.length,
      pass: certs.filter((x) => x.result === "PASS").length,
      fail: certs.filter((x) => x.result === "FAIL").length,
      linked: certs.filter((x) => !!x.folder_id).length,
      needNcr: certs.filter((x) => needsNcr(x)).length,
    }),
    [certs]
  );

  function clearFilters() {
    setSearch("");
    setFResult("ALL");
    setFExpiry("ALL");
    setFClient("ALL");
    setFType("ALL");
    setFLinked("ALL");
  }

  function toggleClient(client) {
    setExpandedClients((prev) => ({ ...prev, [client]: !prev[client] }));
  }

  function toggleType(key) {
    setExpandedTypes((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function beginLink(cert) {
    setLinkSource(cert);
    setLinkName(cert.folder_name || `${cert.asset_tag || cert.certificate_number} Linked Folder`);
  }

  async function handleLink(target) {
    if (!linkSource || linkSource.id === target.id) return;

    const groupId =
      linkSource.folder_id ||
      target.folder_id ||
      `LINK-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const groupName =
      nz(linkName) ||
      linkSource.folder_name ||
      target.folder_name ||
      `${linkSource.asset_tag || linkSource.certificate_number} Linked Folder`;

    try {
      setBusyId(target.id);

      const { error: e1 } = await supabase
        .from("certificates")
        .update({
          folder_id: groupId,
          folder_name: groupName,
          folder_position: 1,
        })
        .eq("id", linkSource.id);

      if (e1) throw e1;

      const { error: e2 } = await supabase
        .from("certificates")
        .update({
          folder_id: groupId,
          folder_name: groupName,
          folder_position: 2,
        })
        .eq("id", target.id);

      if (e2) throw e2;

      setLinkSource(null);
      setLinkName("");
      await loadCertificates();
    } catch (err) {
      setErrorText(err.message || "Failed to link certificates.");
    } finally {
      setBusyId("");
    }
  }

  async function handleUnlink(cert) {
    if (!cert.folder_id) return;
    const ok = window.confirm("Unlink all certificates in this folder?");
    if (!ok) return;

    try {
      setBusyId(cert.id);

      const { error } = await supabase
        .from("certificates")
        .update({
          folder_id: null,
          folder_name: null,
          folder_position: null,
        })
        .eq("folder_id", cert.folder_id);

      if (error) throw error;
      await loadCertificates();
    } catch (err) {
      setErrorText(err.message || "Failed to unlink certificates.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <AppLayout title="Certificates Register">
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left, rgba(34,211,238,0.08), transparent 30%), radial-gradient(circle at bottom right, rgba(167,139,250,0.08), transparent 28%), #0a111b",
          color: T.text,
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      >
        <div style={{ padding: "24px 28px", display: "grid", gap: 18 }}>
          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 22,
              background: T.surface,
              backdropFilter: "blur(16px)",
              padding: 20,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
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
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: T.accent,
                    marginBottom: 8,
                  }}
                >
                  Certificates Workspace
                </div>
                <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900 }}>
                  Certificates Register
                </h1>
                <p style={{ margin: "6px 0 0", color: T.textDim, fontSize: 14 }}>
                  Better UI, working edit route, working print route, and working certificate linking
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link href="/certificates/import" style={btnGhost}>
                  AI Import
                </Link>
                <Link href="/certificates/create" style={btnAccent}>
                  + New Certificate
                </Link>
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <StatCard label="Total" value={stats.total} color={T.accent} />
              <StatCard label="Passed" value={stats.pass} color={T.green} />
              <StatCard label="Failed" value={stats.fail} color={T.red} />
              <StatCard label="Linked" value={stats.linked} color={T.purple} />
              <StatCard label="Need NCR" value={stats.needNcr} color={T.amber} />
            </div>
          </div>

          {linkSource ? (
            <div
              style={{
                border: `1px solid ${T.purpleBrd}`,
                borderRadius: 16,
                background: T.purpleDim,
                padding: 16,
                display: "grid",
                gap: 12,
              }}
            >
              <div style={{ fontWeight: 800, color: T.purple }}>
                Link mode active
              </div>
              <div style={{ fontSize: 14, color: T.textMid }}>
                Source: <strong>{linkSource.certificate_number || "—"}</strong> ·{" "}
                {linkSource.equipment_description || "—"}
              </div>
              <input
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="Folder / link name"
                style={inputStyle}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => {
                    setLinkSource(null);
                    setLinkName("");
                  }}
                  style={btnPlain}
                >
                  Cancel Link Mode
                </button>
              </div>
            </div>
          ) : null}

          <div
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 18,
              background: T.surface,
              backdropFilter: "blur(16px)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 16px",
                borderBottom: `1px solid ${T.border}`,
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
                gap: 0,
              }}
            >
              <div style={{ padding: "0 10px" }}>
                <div style={filterLabel}>Search</div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Certificate no, client, equipment"
                  style={inputStyle}
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
                  { v: "EXPIRING_SOON", l: "≤30 days" },
                  { v: "EXPIRING_90", l: "≤90 days" },
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
                label="Linked"
                value={fLinked}
                onChange={setFLinked}
                options={[
                  { v: "ALL", l: "All" },
                  { v: "YES", l: "Linked" },
                  { v: "NO", l: "Unlinked" },
                ]}
              />
            </div>

            <div
              style={{
                padding: "12px 16px",
                borderBottom: `1px solid ${T.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 12, color: T.textDim }}>
                {filtered.length} record{filtered.length === 1 ? "" : "s"}
              </span>

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
                      padding: "8px 14px",
                      fontSize: 12,
                      fontWeight: 800,
                      background: view === v ? T.accentDim : "transparent",
                      color: view === v ? T.accent : T.textDim,
                    }}
                  >
                    {v === "grouped" ? "Grouped" : "Flat"}
                  </button>
                ))}
              </div>
            </div>

            {errorText ? (
              <div
                style={{
                  margin: 16,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: `1px solid ${T.redBrd}`,
                  background: T.redDim,
                  color: T.red,
                  fontSize: 13,
                }}
              >
                {errorText}
              </div>
            ) : null}

            <div style={{ padding: 16 }}>
              {loading ? (
                <LoadingState />
              ) : filtered.length === 0 ? (
                <EmptyState onClear={clearFilters} />
              ) : view === "flat" ? (
                <FlatView
                  certs={filtered}
                  linkSource={linkSource}
                  beginLink={beginLink}
                  handleLink={handleLink}
                  handleUnlink={handleUnlink}
                  busyId={busyId}
                />
              ) : (
                <GroupedView
                  grouped={grouped}
                  expandedClients={expandedClients}
                  expandedTypes={expandedTypes}
                  toggleClient={toggleClient}
                  toggleType={toggleType}
                  linkSource={linkSource}
                  beginLink={beginLink}
                  handleLink={handleLink}
                  handleUnlink={handleUnlink}
                  busyId={busyId}
                />
              )}
            </div>
          </div>
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
  linkSource,
  beginLink,
  handleLink,
  handleUnlink,
  busyId,
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
              background: T.panel,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => toggleClient(clientGroup.client)}
              style={groupHeaderBtn}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>{clientGroup.client}</div>
                <div style={{ fontSize: 12, color: T.textDim }}>
                  {certCount} certificate{certCount === 1 ? "" : "s"}
                </div>
              </div>
              <Chevron open={open} />
            </button>

            {open ? (
              <div style={{ borderTop: `1px solid ${T.border}`, padding: 14, display: "grid", gap: 12 }}>
                {clientGroup.types.map((typeGroup) => {
                  const typeKey = `${clientGroup.client}-${typeGroup.type}`;
                  const typeOpen = expandedTypes[typeKey] !== false;

                  return (
                    <div
                      key={typeKey}
                      style={{
                        background: T.panel2,
                        border: `1px solid ${T.border}`,
                        borderRadius: 14,
                        overflow: "hidden",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleType(typeKey)}
                        style={typeHeaderBtn}
                      >
                        <div style={{ fontWeight: 800 }}>{typeGroup.type}</div>
                        <Chevron open={typeOpen} />
                      </button>

                      {typeOpen ? (
                        <div style={{ padding: 12, display: "grid", gap: 12 }}>
                          {typeGroup.items.map((item) => (
                            <div
                              key={item.desc}
                              style={{
                                background: "rgba(255,255,255,0.02)",
                                border: `1px solid ${T.border}`,
                                borderRadius: 12,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  padding: "10px 12px",
                                  borderBottom: `1px solid ${T.border}`,
                                  fontWeight: 700,
                                  color: T.text,
                                }}
                              >
                                {item.desc}
                              </div>

                              <div style={{ overflowX: "auto" }}>
                                <table style={tableStyle}>
                                  <thead>
                                    <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                                      {[
                                        "Certificate No.",
                                        "Result",
                                        "Issue",
                                        "Expiry",
                                        "Linked",
                                        "Actions",
                                      ].map((heading) => (
                                        <td key={heading} style={headCell}>
                                          {heading}
                                        </td>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.certs.map((cert) => (
                                      <CertRow
                                        key={cert.id}
                                        cert={cert}
                                        compact
                                        linkSource={linkSource}
                                        beginLink={beginLink}
                                        handleLink={handleLink}
                                        handleUnlink={handleUnlink}
                                        busyId={busyId}
                                      />
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

function FlatView({
  certs,
  linkSource,
  beginLink,
  handleLink,
  handleUnlink,
  busyId,
}) {
  return (
    <div
      style={{
        background: T.panel,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1280 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.02)" }}>
              {[
                "Certificate No.",
                "Client",
                "Equipment",
                "Type",
                "Result",
                "Issue",
                "Expiry",
                "Days",
                "Linked",
                "Actions",
              ].map((heading) => (
                <td key={heading} style={headCell}>
                  {heading}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {certs.map((cert) => (
              <CertRow
                key={cert.id}
                cert={cert}
                linkSource={linkSource}
                beginLink={beginLink}
                handleLink={handleLink}
                handleUnlink={handleUnlink}
                busyId={busyId}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CertRow({
  cert,
  compact = false,
  linkSource,
  beginLink,
  handleLink,
  handleUnlink,
  busyId,
}) {
  const result = resultCfg(cert.result);
  const expiry = expiryCfg(cert.expiry_bucket);
  const days = daysUntil(cert.expiry_date);
  const id = safeId(cert.id);
  const isLinkSource = linkSource?.id === cert.id;
  const canLinkHere = !!linkSource && linkSource.id !== cert.id;

  const linkBadge = cert.folder_id ? (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 10,
        fontWeight: 800,
        padding: "4px 8px",
        borderRadius: 999,
        background: T.purpleDim,
        color: T.purple,
        border: `1px solid ${T.purpleBrd}`,
      }}
    >
      {cert.folder_name || "Linked Folder"}
      {cert.folder_position ? ` · #${cert.folder_position}` : ""}
    </span>
  ) : (
    <span style={{ color: T.textDim }}>No</span>
  );

  const actions = (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <Link href={`/certificates/${id}`} prefetch={false} style={actionBtn(T.accent, T.accentDim, T.accentBrd)}>
        View
      </Link>

      <Link href={`/certificates/${id}/edit`} prefetch={false} style={actionBtn(T.amber, T.amberDim, T.amberBrd)}>
        Edit
      </Link>

      <Link href={`/certificates/print/${id}`} prefetch={false} style={actionBtn(T.green, T.greenDim, T.greenBrd)}>
        Print
      </Link>

      {needsNcr(cert) ? (
        <Link href={buildNcrHref(cert)} prefetch={false} style={actionBtn(T.red, T.redDim, T.redBrd)}>
          Create NCR
        </Link>
      ) : null}

      {isLinkSource ? (
        <button type="button" style={plainActionBtn(T.purple, T.purpleDim, T.purpleBrd)}>
          Selected
        </button>
      ) : canLinkHere ? (
        <button
          type="button"
          onClick={() => handleLink(cert)}
          disabled={busyId === cert.id}
          style={plainActionBtn(T.purple, T.purpleDim, T.purpleBrd)}
        >
          {busyId === cert.id ? "Linking..." : "Link Here"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => beginLink(cert)}
          style={plainActionBtn(T.purple, T.purpleDim, T.purpleBrd)}
        >
          Link
        </button>
      )}

      {cert.folder_id ? (
        <button
          type="button"
          onClick={() => handleUnlink(cert)}
          disabled={busyId === cert.id}
          style={plainActionBtn(T.textMid, T.slate, T.slateBrd)}
        >
          {busyId === cert.id ? "Removing..." : "Unlink"}
        </button>
      ) : null}
    </div>
  );

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
        <td style={tdStyle}>{linkBadge}</td>
        <td style={tdStyle}>{actions}</td>
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
        <div style={{ maxWidth: 240, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
      <td style={tdStyle}>{linkBadge}</td>
      <td style={tdStyle}>{actions}</td>
    </tr>
  );
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

function FilterCell({ label, value, onChange, options }) {
  return (
    <div style={{ padding: "0 10px" }}>
      <div style={filterLabel}>{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
        {options.map((opt) => (
          <option key={opt.v} value={opt.v} style={{ background: "#0f172a" }}>
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
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${T.border}`,
        borderRadius: 14,
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
      <div style={{ fontSize: 28, fontWeight: 900, color }}>{value}</div>
    </div>
  );
}

function Badge({ label, color, bg, brd }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 8px",
        borderRadius: 999,
        background: bg,
        color,
        border: `1px solid ${brd}`,
        fontSize: 10,
        fontWeight: 800,
      }}
    >
      {label}
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
    <div style={{ padding: 24, color: T.textDim, textAlign: "center" }}>
      Loading certificates...
    </div>
  );
}

function EmptyState({ onClear }) {
  return (
    <div
      style={{
        background: T.panel,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>No certificates found</div>
      <div style={{ fontSize: 13, color: T.textDim, marginBottom: 18 }}>
        Try changing your filters.
      </div>
      <button type="button" onClick={onClear} style={btnAccent}>
        Clear filters
      </button>
    </div>
  );
}

const groupHeaderBtn = {
  width: "100%",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  color: T.text,
  textAlign: "left",
};

const typeHeaderBtn = {
  width: "100%",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  padding: "12px 14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  color: T.text,
  textAlign: "left",
};

const filterLabel = {
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: 6,
  color: T.textDim,
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${T.border}`,
  background: "rgba(255,255,255,0.03)",
  color: T.text,
  fontSize: 13,
  outline: "none",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 1080,
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

function actionBtn(color, bg, brd) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 10px",
    borderRadius: 8,
    background: bg,
    border: `1px solid ${brd}`,
    color,
    fontSize: 11,
    fontWeight: 700,
    textDecoration: "none",
  };
}

function plainActionBtn(color, bg, brd) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 10px",
    borderRadius: 8,
    background: bg,
    border: `1px solid ${brd}`,
    color,
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  };
}

const btnGhost = {
  display: "inline-flex",
  alignItems: "center",
  padding: "10px 14px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.03)",
  color: T.textMid,
  fontSize: 12,
  fontWeight: 700,
  textDecoration: "none",
  border: `1px solid ${T.border}`,
};

const btnAccent = {
  display: "inline-flex",
  alignItems: "center",
  padding: "10px 14px",
  borderRadius: 10,
  background: T.accent,
  color: "#001018",
  fontSize: 12,
  fontWeight: 800,
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
};
