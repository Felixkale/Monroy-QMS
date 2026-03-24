"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

// ─── Palette ──────────────────────────────────────────────────────────────────
const T = {
  bg:        "#080d14",
  surface:   "#0d1420",
  panel:     "#111b2a",
  panelHov:  "#162030",
  border:    "rgba(255,255,255,0.07)",
  borderMid: "rgba(255,255,255,0.12)",
  borderHi:  "rgba(255,255,255,0.20)",
  text:      "#f0f4f8",
  textMid:   "rgba(240,244,248,0.65)",
  textDim:   "rgba(240,244,248,0.35)",
  accent:    "#0ea5e9",
  accentDim: "rgba(14,165,233,0.15)",
  accentBrd: "rgba(14,165,233,0.30)",
  green:     "#10b981",
  greenDim:  "rgba(16,185,129,0.14)",
  greenBrd:  "rgba(16,185,129,0.28)",
  red:       "#ef4444",
  redDim:    "rgba(239,68,68,0.14)",
  redBrd:    "rgba(239,68,68,0.28)",
  amber:     "#f59e0b",
  amberDim:  "rgba(245,158,11,0.14)",
  amberBrd:  "rgba(245,158,11,0.28)",
  purple:    "#a78bfa",
  purpleDim: "rgba(167,139,250,0.14)",
  purpleBrd: "rgba(167,139,250,0.28)",
  slate:     "rgba(240,244,248,0.12)",
  slateBrd:  "rgba(240,244,248,0.18)",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function nz(v, fb = "") {
  if (v === null || v === undefined) return fb;
  const s = String(v).trim();
  return s || fb;
}

function normalizeResult(r) {
  const v = nz(r).toUpperCase().replace(/\s+/g, "_");
  if (!v) return "UNKNOWN";
  return v;
}

function getExpiryBucket(d) {
  if (!d) return "NO_EXPIRY";
  const diff = Math.ceil((new Date(d) - new Date()) / 86400000);
  if (diff < 0)   return "EXPIRED";
  if (diff <= 30)  return "EXPIRING_SOON";
  if (diff <= 90)  return "EXPIRING_90";
  return "VALID";
}

function fmt(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d)) return v;
  return d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(v) {
  if (!v) return null;
  return Math.ceil((new Date(v) - new Date()) / 86400000);
}

// ─── Result config ────────────────────────────────────────────────────────────
const RESULT_CFG = {
  PASS:             { label: "Pass",           color: T.green,  bg: T.greenDim,  brd: T.greenBrd  },
  FAIL:             { label: "Fail",           color: T.red,    bg: T.redDim,    brd: T.redBrd    },
  REPAIR_REQUIRED:  { label: "Repair Req.",    color: T.amber,  bg: T.amberDim,  brd: T.amberBrd  },
  OUT_OF_SERVICE:   { label: "Out of Service", color: T.purple, bg: T.purpleDim, brd: T.purpleBrd },
  UNKNOWN:          { label: "Unknown",        color: T.textDim,bg: T.slate,     brd: T.slateBrd  },
};

const EXPIRY_CFG = {
  EXPIRED:      { label: "Expired",       color: T.red,    bg: T.redDim    },
  EXPIRING_SOON:{ label: "Expiring ≤30d", color: T.amber,  bg: T.amberDim  },
  EXPIRING_90:  { label: "Expiring ≤90d", color: T.accent, bg: T.accentDim },
  VALID:        { label: "Valid",         color: T.green,  bg: T.greenDim  },
  NO_EXPIRY:    { label: "No expiry",     color: T.textDim,bg: T.slate     },
};

function resultCfg(r) { return RESULT_CFG[r] || RESULT_CFG.UNKNOWN; }
function expiryCfg(b) { return EXPIRY_CFG[b] || EXPIRY_CFG.NO_EXPIRY; }

// ─── Grouping ─────────────────────────────────────────────────────────────────
function groupBy(rows) {
  const g = {};
  for (const row of rows) {
    const client = nz(row.client_name, "UNASSIGNED CLIENT");
    const type   = nz(row.equipment_type || row.asset_type, "UNCATEGORIZED");
    const desc   = nz(row.equipment_description || row.asset_name || row.asset_tag, "UNNAMED EQUIPMENT");
    if (!g[client]) g[client] = {};
    if (!g[client][type]) g[client][type] = {};
    if (!g[client][type][desc]) g[client][type][desc] = [];
    g[client][type][desc].push(row);
  }
  return Object.keys(g).sort().map(client => ({
    client,
    types: Object.keys(g[client]).sort().map(type => ({
      type,
      items: Object.keys(g[client][type]).sort().map(desc => ({
        desc,
        certs: [...g[client][type][desc]].sort((a, b) =>
          new Date(b.issue_date || b.created_at || 0) - new Date(a.issue_date || a.created_at || 0)
        ),
      })),
    })),
  }));
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CertificatesPage() {
  const [certs, setCerts]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [fResult, setFResult]       = useState("ALL");
  const [fExpiry, setFExpiry]       = useState("ALL");
  const [fClient, setFClient]       = useState("ALL");
  const [fType, setFType]           = useState("ALL");
  const [fStatus, setFStatus]       = useState("ALL");
  const [expandedClients, setExpandedClients] = useState({});
  const [expandedTypes, setExpandedTypes]     = useState({});
  const [view, setView]             = useState("grouped"); // grouped | flat

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("certificates")
      .select(`
        id, certificate_number, result, issue_date, issued_at,
        expiry_date, valid_to, created_at, inspection_number,
        asset_tag, asset_name, equipment_description, equipment_type,
        asset_type, client_name, status
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message || "Failed to load certificates.");
      setLoading(false);
      return;
    }

    const cleaned = (data || []).map(row => {
      const issueDate  = row.issue_date  || row.issued_at  || null;
      const expiryDate = row.expiry_date || row.valid_to   || null;
      return {
        ...row,
        issue_date:   issueDate,
        expiry_date:  expiryDate,
        result:       normalizeResult(row.result),
        expiry_bucket: getExpiryBucket(expiryDate),
      };
    });

    setCerts(cleaned);
    // Auto-expand all clients on first load
    const expanded = {};
    cleaned.forEach(c => {
      const k = nz(c.client_name, "UNASSIGNED CLIENT");
      expanded[k] = true;
    });
    setExpandedClients(expanded);
    setLoading(false);
  }

  const clientOptions = useMemo(() =>
    [...new Set(certs.map(x => nz(x.client_name, "UNASSIGNED CLIENT")))].sort(), [certs]);
  const typeOptions = useMemo(() =>
    [...new Set(certs.map(x => nz(x.equipment_type || x.asset_type, "UNCATEGORIZED")))].sort(), [certs]);
  const statusOptions = useMemo(() =>
    [...new Set(certs.map(x => nz(x.status, "active")))].sort(), [certs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return certs.filter(row => {
      const hay = [row.certificate_number, row.client_name, row.asset_tag,
        row.equipment_description, row.equipment_type, row.inspection_number].join(" ").toLowerCase();
      return (
        (!q || hay.includes(q)) &&
        (fResult === "ALL" || row.result === fResult) &&
        (fExpiry === "ALL" || row.expiry_bucket === fExpiry) &&
        (fClient === "ALL" || nz(row.client_name, "UNASSIGNED CLIENT") === fClient) &&
        (fType   === "ALL" || nz(row.equipment_type || row.asset_type, "UNCATEGORIZED") === fType) &&
        (fStatus === "ALL" || nz(row.status, "active") === fStatus)
      );
    });
  }, [certs, search, fResult, fExpiry, fClient, fType, fStatus]);

  const grouped = useMemo(() => groupBy(filtered), [filtered]);

  const stats = useMemo(() => ({
    total:    certs.length,
    pass:     certs.filter(x => x.result === "PASS").length,
    fail:     certs.filter(x => x.result === "FAIL").length,
    expiring: certs.filter(x => x.expiry_bucket === "EXPIRING_SOON").length,
    expired:  certs.filter(x => x.expiry_bucket === "EXPIRED").length,
  }), [certs]);

  const hasFilters = fResult !== "ALL" || fExpiry !== "ALL" || fClient !== "ALL" || fType !== "ALL" || fStatus !== "ALL" || !!search;

  function clearFilters() {
    setSearch(""); setFResult("ALL"); setFExpiry("ALL");
    setFClient("ALL"); setFType("ALL"); setFStatus("ALL");
  }

  function toggleClient(c) {
    setExpandedClients(p => ({ ...p, [c]: !p[c] }));
  }
  function toggleType(key) {
    setExpandedTypes(p => ({ ...p, [key]: !p[key] }));
  }

  return (
    <AppLayout>
      <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: "'IBM Plex Mono', 'Fira Code', monospace" }}>

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div style={{ borderBottom: `1px solid ${T.border}`, background: T.surface, padding: "0 28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 3, height: 18, background: T.accent, borderRadius: 2 }} />
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: T.textMid, textTransform: "uppercase" }}>
                  ISO 9001 · Document Register
                </span>
              </div>
              <div style={{ width: 1, height: 18, background: T.border }} />
              <span style={{ fontSize: 11, color: T.textDim, letterSpacing: "0.06em" }}>
                {filtered.length} of {certs.length} records
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
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

          {/* ── Page heading ──────────────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: T.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                Certificates Register
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textDim, letterSpacing: "0.02em" }}>
                Grouped by client · equipment type · asset
              </p>
            </div>

            {/* View toggle */}
            <div style={{ display: "flex", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
              {["grouped", "flat"].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: "7px 16px", border: "none", cursor: "pointer", fontSize: 11,
                  fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
                  fontFamily: "inherit",
                  background: view === v ? T.accent : "transparent",
                  color: view === v ? "#fff" : T.textMid,
                  transition: "all .15s",
                }}>
                  {v === "grouped" ? "⊞ Grouped" : "≡ Flat"}
                </button>
              ))}
            </div>
          </div>

          {/* ── Stat bar ──────────────────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 10 }}>
            {[
              { label: "Total",          value: stats.total,    color: T.accent,  indicator: T.accent  },
              { label: "Passed",         value: stats.pass,     color: T.green,   indicator: T.green   },
              { label: "Failed",         value: stats.fail,     color: T.red,     indicator: T.red     },
              { label: "Expiring ≤30d",  value: stats.expiring, color: T.amber,   indicator: T.amber   },
              { label: "Expired",        value: stats.expired,  color: T.red,     indicator: T.red     },
            ].map(s => (
              <div key={s.label} style={{
                background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
                padding: "14px 16px", position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2,
                  background: s.indicator, opacity: 0.7,
                }} />
                <div style={{ fontSize: 11, color: T.textDim, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: s.color, letterSpacing: "-0.04em", fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* ── Filters ───────────────────────────────────────────────────── */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>

            {/* Filter header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M1 3h12M3 7h8M5 11h4" stroke={T.textDim} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: T.textDim, textTransform: "uppercase" }}>
                  Filters
                </span>
                {hasFilters && (
                  <span style={{ fontSize: 10, background: T.accentDim, color: T.accent, border: `1px solid ${T.accentBrd}`, borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>
                    Active
                  </span>
                )}
              </div>
              {hasFilters && (
                <button onClick={clearFilters} style={{ background: "none", border: "none", color: T.textDim, fontSize: 11, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em" }}>
                  Clear all ×
                </button>
              )}
            </div>

            {/* Filter controls */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 0 }}>

              {/* Search */}
              <div style={{ padding: "10px 14px", borderRight: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 10, color: T.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Search</div>
                <div style={{ position: "relative" }}>
                  <svg style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)" }} width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <circle cx="6" cy="6" r="4.5" stroke={T.textDim} strokeWidth="1.3"/>
                    <path d="M10 10l2.5 2.5" stroke={T.textDim} strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Certificate no., client, asset tag..."
                    style={{ ...inputBase, paddingLeft: 20, width: "100%", background: "transparent", border: "none", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {/* Result */}
              <FilterCell label="Result" value={fResult} onChange={setFResult}
                options={[
                  { v: "ALL",            l: "All results"     },
                  { v: "PASS",           l: "Pass"            },
                  { v: "FAIL",           l: "Fail"            },
                  { v: "REPAIR_REQUIRED",l: "Repair required" },
                  { v: "OUT_OF_SERVICE", l: "Out of service"  },
                  { v: "UNKNOWN",        l: "Unknown"         },
                ]}
              />

              {/* Expiry */}
              <FilterCell label="Expiry" value={fExpiry} onChange={setFExpiry}
                options={[
                  { v: "ALL",           l: "All expiry"     },
                  { v: "EXPIRED",       l: "Expired"        },
                  { v: "EXPIRING_SOON", l: "Expiring ≤30d"  },
                  { v: "EXPIRING_90",   l: "Expiring ≤90d"  },
                  { v: "VALID",         l: "Valid"          },
                  { v: "NO_EXPIRY",     l: "No expiry"      },
                ]}
              />

              {/* Client */}
              <FilterCell label="Client" value={fClient} onChange={setFClient}
                options={[{ v: "ALL", l: "All clients" }, ...clientOptions.map(c => ({ v: c, l: c }))]}
              />

              {/* Equipment type */}
              <FilterCell label="Equipment type" value={fType} onChange={setFType}
                options={[{ v: "ALL", l: "All types" }, ...typeOptions.map(t => ({ v: t, l: t }))]}
                last
              />
            </div>
          </div>

          {/* ── Error ─────────────────────────────────────────────────────── */}
          {error && (
            <div style={{ background: T.redDim, border: `1px solid ${T.redBrd}`, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: T.red }}>
              {error}
            </div>
          )}

          {/* ── Content ───────────────────────────────────────────────────── */}
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

// ─── Filter Cell ──────────────────────────────────────────────────────────────
function FilterCell({ label, value, onChange, options, last }) {
  const active = value !== "ALL";
  return (
    <div style={{ padding: "10px 14px", borderRight: last ? "none" : `1px solid ${T.border}` }}>
      <div style={{ fontSize: 10, color: active ? T.accent : T.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, fontWeight: active ? 700 : 400 }}>
        {label}
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputBase, background: "transparent", border: "none", outline: "none", width: "100%", cursor: "pointer", color: active ? T.text : T.textMid }}
      >
        {options.map(o => <option key={o.v} value={o.v} style={{ background: "#111b2a" }}>{o.l}</option>)}
      </select>
    </div>
  );
}

// ─── Grouped View ─────────────────────────────────────────────────────────────
function GroupedView({ grouped, expandedClients, expandedTypes, toggleClient, toggleType }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {grouped.map(clientGroup => {
        const open = !!expandedClients[clientGroup.client];
        const certCount = clientGroup.types.reduce((a, t) => a + t.items.reduce((b, i) => b + i.certs.length, 0), 0);
        const passCount = clientGroup.types.reduce((a, t) => a + t.items.reduce((b, i) => b + i.certs.filter(c => c.result === "PASS").length, 0), 0);
        const failCount = certCount - passCount;

        return (
          <div key={clientGroup.client} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>

            {/* Client header */}
            <button
              onClick={() => toggleClient(clientGroup.client)}
              style={{
                width: "100%", background: "none", border: "none", cursor: "pointer",
                padding: "14px 20px", display: "flex", alignItems: "center", gap: 14,
                textAlign: "left", fontFamily: "inherit",
              }}
            >
              {/* Chevron */}
              <svg style={{ flexShrink: 0, transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .2s", color: T.textDim }} width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>

              {/* Client initial badge */}
              <div style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                background: T.accentDim, border: `1px solid ${T.accentBrd}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: T.accent,
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}>
                {clientGroup.client.charAt(0)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: "-0.01em", fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  {clientGroup.client}
                </div>
                <div style={{ fontSize: 11, color: T.textDim, marginTop: 2, letterSpacing: "0.04em" }}>
                  {clientGroup.types.length} equipment type{clientGroup.types.length !== 1 ? "s" : ""} · {certCount} certificate{certCount !== 1 ? "s" : ""}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <MiniPill value={passCount} color={T.green} bg={T.greenDim} label="pass" />
                {failCount > 0 && <MiniPill value={failCount} color={T.red} bg={T.redDim} label="fail" />}
              </div>
            </button>

            {/* Equipment types */}
            {open && (
              <div style={{ borderTop: `1px solid ${T.border}` }}>
                {clientGroup.types.map((typeGroup, ti) => {
                  const typeKey = `${clientGroup.client}::${typeGroup.type}`;
                  const typeOpen = expandedTypes[typeKey] !== false; // default open
                  const typeCertCount = typeGroup.items.reduce((a, i) => a + i.certs.length, 0);

                  return (
                    <div key={typeGroup.type} style={{ borderTop: ti > 0 ? `1px solid ${T.border}` : "none" }}>

                      {/* Type sub-header */}
                      <button
                        onClick={() => toggleType(typeKey)}
                        style={{
                          width: "100%", background: "none", border: "none", cursor: "pointer",
                          padding: "10px 20px 10px 56px", display: "flex", alignItems: "center",
                          gap: 10, textAlign: "left", fontFamily: "inherit",
                        }}
                      >
                        <div style={{
                          padding: "3px 10px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                          letterSpacing: "0.1em", textTransform: "uppercase",
                          background: T.panel, border: `1px solid ${T.borderMid}`, color: T.textMid,
                        }}>
                          {typeGroup.type}
                        </div>
                        <span style={{ fontSize: 11, color: T.textDim }}>
                          {typeGroup.items.length} asset{typeGroup.items.length !== 1 ? "s" : ""} · {typeCertCount} cert{typeCertCount !== 1 ? "s" : ""}
                        </span>
                        <svg style={{ marginLeft: "auto", transform: typeOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .2s", color: T.textDim }} width="12" height="12" viewBox="0 0 14 14" fill="none">
                          <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>

                      {/* Asset items */}
                      {typeOpen && (
                        <div style={{ padding: "0 20px 14px 20px", display: "grid", gap: 8 }}>
                          {typeGroup.items.map(item => (
                            <AssetBlock key={item.desc} item={item} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Asset Block ──────────────────────────────────────────────────────────────
function AssetBlock({ item }) {
  const [open, setOpen] = useState(true);
  const latestResult = item.certs[0]?.result || "UNKNOWN";
  const rc = resultCfg(latestResult);

  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>

      {/* Asset header */}
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "10px 14px", display: "flex", alignItems: "center", gap: 12,
          textAlign: "left", fontFamily: "inherit",
        }}
      >
        <svg style={{ flexShrink: 0, transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .2s", color: T.textDim }} width="11" height="11" viewBox="0 0 14 14" fill="none">
          <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>

        <div style={{ width: 6, height: 6, borderRadius: 999, background: rc.color, flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: T.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
            {item.desc}
          </span>
        </div>

        <span style={{ fontSize: 11, color: T.textDim, flexShrink: 0 }}>
          {item.certs.length} cert{item.certs.length !== 1 ? "s" : ""}
        </span>

        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
          background: rc.bg, color: rc.color, border: `1px solid ${rc.brd}`,
          letterSpacing: "0.06em", flexShrink: 0,
        }}>
          {rc.label}
        </span>
      </button>

      {/* Certs table */}
      {open && (
        <div style={{ borderTop: `1px solid ${T.border}`, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
            <thead>
              <tr style={{ background: T.bg }}>
                {["Certificate No.", "Insp. No.", "Result", "Issue Date", "Expiry Date", "Days Left", "Status", "Actions"].map(h => (
                  <td key={h} style={{ padding: "7px 12px", fontSize: 10, color: T.textDim, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap", borderBottom: `1px solid ${T.border}` }}>
                    {h}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {item.certs.map((cert, ci) => {
                const rc = resultCfg(cert.result);
                const ec = expiryCfg(cert.expiry_bucket);
                const days = daysUntil(cert.expiry_date);
                const isLatest = ci === 0;

                return (
                  <tr key={cert.id} style={{ background: isLatest ? "rgba(14,165,233,0.03)" : "transparent", borderLeft: isLatest ? `2px solid ${T.accent}` : "2px solid transparent" }}>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: T.accent }}>
                        {cert.certificate_number || "—"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.textMid }}>
                        {cert.inspection_number || "—"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
                        background: rc.bg, color: rc.color, border: `1px solid ${rc.brd}`,
                        letterSpacing: "0.06em",
                      }}>
                        {rc.label}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: T.textMid }}>{fmt(cert.issue_date)}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: cert.expiry_date ? T.textMid : T.textDim }}>
                        {fmt(cert.expiry_date)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {days !== null ? (
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
                          background: ec.bg, color: ec.color,
                        }}>
                          {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: T.textDim }}>—</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 11, color: T.textMid, textTransform: "capitalize" }}>
                        {nz(cert.status, "active")}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Link href={`/certificates/${cert.id}`} style={actionBtn(T.accent, T.accentDim, T.accentBrd)}>
                          View
                        </Link>
                        <a href={`/certificates/${cert.id}`} target="_blank" rel="noreferrer" style={actionBtn(T.green, T.greenDim, T.greenBrd)}>
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
      )}
    </div>
  );
}

// ─── Flat View ────────────────────────────────────────────────────────────────
function FlatView({ certs }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
          <thead>
            <tr style={{ background: T.bg }}>
              {["Certificate No.", "Client", "Equipment", "Type", "Result", "Issue", "Expiry", "Days Left", "Status", "Actions"].map(h => (
                <td key={h} style={{ padding: "10px 14px", fontSize: 10, color: T.textDim, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap", borderBottom: `1px solid ${T.border}` }}>
                  {h}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {certs.map(cert => {
              const rc = resultCfg(cert.result);
              const ec = expiryCfg(cert.expiry_bucket);
              const days = daysUntil(cert.expiry_date);
              return (
                <tr key={cert.id} style={{ borderBottom: `1px solid ${T.border}` }}
                  onMouseEnter={e => e.currentTarget.style.background = T.panelHov}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={tdStyle}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: T.accent }}>
                      {cert.certificate_number || "—"}
                    </span>
                  </td>
                  <td style={tdStyle}><span style={{ fontSize: 12, color: T.textMid }}>{nz(cert.client_name, "—")}</span></td>
                  <td style={tdStyle}><span style={{ fontSize: 12, color: T.textMid, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{nz(cert.equipment_description || cert.asset_name, "—")}</span></td>
                  <td style={tdStyle}><span style={{ fontSize: 11, color: T.textDim }}>{nz(cert.equipment_type, "—")}</span></td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: rc.bg, color: rc.color, border: `1px solid ${rc.brd}`, letterSpacing: "0.06em" }}>
                      {rc.label}
                    </span>
                  </td>
                  <td style={tdStyle}><span style={{ fontSize: 12, color: T.textMid }}>{fmt(cert.issue_date)}</span></td>
                  <td style={tdStyle}><span style={{ fontSize: 12, color: T.textMid }}>{fmt(cert.expiry_date)}</span></td>
                  <td style={tdStyle}>
                    {days !== null ? (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: ec.bg, color: ec.color }}>
                        {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                      </span>
                    ) : <span style={{ color: T.textDim, fontSize: 11 }}>—</span>}
                  </td>
                  <td style={tdStyle}><span style={{ fontSize: 11, color: T.textMid, textTransform: "capitalize" }}>{nz(cert.status, "active")}</span></td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Link href={`/certificates/${cert.id}`} style={actionBtn(T.accent, T.accentDim, T.accentBrd)}>View</Link>
                      <a href={`/certificates/${cert.id}`} target="_blank" rel="noreferrer" style={actionBtn(T.green, T.greenDim, T.greenBrd)}>PDF</a>
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

// ─── Loading ──────────────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", opacity: 1 - i * 0.15 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: T.panel }} />
            <div style={{ flex: 1 }}>
              <div style={{ width: 180, height: 13, borderRadius: 4, background: T.panel, marginBottom: 6 }} />
              <div style={{ width: 120, height: 10, borderRadius: 4, background: T.panel }} />
            </div>
          </div>
        </div>
      ))}
      <div style={{ textAlign: "center", fontSize: 11, color: T.textDim, letterSpacing: "0.1em", padding: "8px 0" }}>
        LOADING RECORDS...
      </div>
    </div>
  );
}

// ─── Empty ────────────────────────────────────────────────────────────────────
function EmptyState({ hasFilters, onClear }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 11, color: T.textDim, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
        No records found
      </div>
      <div style={{ fontSize: 13, color: T.textMid, marginBottom: hasFilters ? 20 : 0 }}>
        {hasFilters ? "No certificates match the active filters." : "No certificates have been added yet."}
      </div>
      {hasFilters && (
        <button onClick={onClear} style={{ ...btnGhost, cursor: "pointer", border: "none", fontFamily: "inherit" }}>
          Clear filters
        </button>
      )}
    </div>
  );
}

// ─── Mini components ──────────────────────────────────────────────────────────
function MiniPill({ value, color, bg, label }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: bg, color, letterSpacing: "0.04em" }}>
      {value} {label}
    </span>
  );
}

// ─── Style tokens ─────────────────────────────────────────────────────────────
const inputBase = {
  fontSize: 13,
  color: T.text,
  fontFamily: "'IBM Plex Mono', monospace",
  padding: "2px 0",
};

const tdStyle = {
  padding: "10px 12px",
  borderBottom: `1px solid ${T.border}`,
  verticalAlign: "middle",
};

function actionBtn(color, bg, brd) {
  return {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    padding: "5px 10px", borderRadius: 6,
    background: bg, border: `1px solid ${brd}`, color,
    fontSize: 11, fontWeight: 600, textDecoration: "none",
    letterSpacing: "0.04em", fontFamily: "'IBM Plex Mono', monospace",
    cursor: "pointer",
  };
}

const btnGhost = {
  display: "inline-flex", alignItems: "center",
  padding: "8px 14px", borderRadius: 8,
  border: `1px solid ${T.borderMid}`, background: "transparent",
  color: T.textMid, fontSize: 12, fontWeight: 500,
  textDecoration: "none", letterSpacing: "0.04em",
  fontFamily: "'IBM Plex Sans', sans-serif",
};

const btnAccent = {
  display: "inline-flex", alignItems: "center",
  padding: "8px 14px", borderRadius: 8,
  background: T.accent, border: "none",
  color: "#fff", fontSize: 12, fontWeight: 600,
  textDecoration: "none", letterSpacing: "0.04em",
  fontFamily: "'IBM Plex Sans', sans-serif",
};
