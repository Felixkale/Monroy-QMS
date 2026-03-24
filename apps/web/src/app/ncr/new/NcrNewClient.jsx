"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const C = {
  green: "#00f5c4",
  purple: "#7c5cfc",
  blue: "#4fc3f7",
  pink: "#f472b6",
  yellow: "#fbbf24",
  red: "#ef4444",
  text: "#f8fafc",
  textSoft: "#cbd5e1",
  textDim: "#64748b",
  line: "rgba(255,255,255,0.12)",
};

const rgbaMap = {
  [C.green]: "0,245,196",
  [C.blue]: "79,195,247",
  [C.purple]: "124,92,252",
  [C.pink]: "244,114,182",
  [C.yellow]: "251,191,36",
  [C.red]: "239,68,68",
};

function nz(v, fallback = "") {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s || fallback;
}

function normalizeResult(v) {
  return nz(v).toUpperCase().replace(/\s+/g, "_");
}

function resultLabel(v) {
  const x = normalizeResult(v);
  if (x === "FAIL") return "Fail";
  if (x === "REPAIR_REQUIRED") return "Repair Required";
  if (x === "OUT_OF_SERVICE") return "Out of Service";
  if (x === "PASS") return "Pass";
  return x || "Unknown";
}

function defaultSeverityFromResult(result) {
  const r = normalizeResult(result);
  if (r === "OUT_OF_SERVICE") return "critical";
  if (r === "FAIL" || r === "REPAIR_REQUIRED") return "major";
  return "minor";
}

function defaultDueDate(severity) {
  const d = new Date();
  const days = severity === "critical" ? 7 : severity === "major" ? 14 : 30;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function generateNcrNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `NCR-${y}${m}${d}-${h}${min}${s}-${rand}`;
}

function buildDefaultDescription(source) {
  const result = resultLabel(source.result);
  const certNo = nz(source.certificate_number, "Unknown Certificate");
  const equip = nz(source.equipment_description || source.asset_name || source.asset_tag, "equipment");
  return `${result} detected from certificate ${certNo} for ${equip}.`;
}

function buildDefaultDetails(source) {
  const lines = [
    "NCR created from uploaded certificate.",
    `Certificate Number: ${nz(source.certificate_number, "—")}`,
    `Inspection Number: ${nz(source.inspection_number, "—")}`,
    `Client: ${nz(source.client_name, "—")}`,
    `Asset Tag: ${nz(source.asset_tag, "—")}`,
    `Asset Name: ${nz(source.asset_name, "—")}`,
    `Equipment Description: ${nz(source.equipment_description, "—")}`,
    `Equipment Type: ${nz(source.equipment_type, "—")}`,
    `Certificate Result: ${resultLabel(source.result)}`,
    `Issue Date: ${nz(source.issue_date, "—")}`,
    `Expiry Date: ${nz(source.expiry_date, "—")}`,
  ];
  return lines.join("\n");
}

async function fetchAssetsByPriority(source) {
  const selectText = `
    id,
    asset_tag,
    asset_name,
    asset_type,
    client_id,
    clients (
      id,
      company_name
    )
  `;

  const tries = [];

  if (nz(source.asset_tag)) {
    tries.push(
      supabase
        .from("assets")
        .select(selectText)
        .eq("asset_tag", source.asset_tag)
        .limit(20)
    );
  }

  if (nz(source.asset_name)) {
    tries.push(
      supabase
        .from("assets")
        .select(selectText)
        .ilike("asset_name", `%${source.asset_name}%`)
        .limit(20)
    );
  }

  if (nz(source.equipment_description)) {
    tries.push(
      supabase
        .from("assets")
        .select(selectText)
        .ilike("asset_name", `%${source.equipment_description}%`)
        .limit(20)
    );
  }

  tries.push(
    supabase
      .from("assets")
      .select(selectText)
      .order("created_at", { ascending: false })
      .limit(50)
  );

  for (const query of tries) {
    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      return data;
    }
  }

  return [];
}

export default function NcrNewClient({ searchParams = {} }) {
  const router = useRouter();

  const source = useMemo(
    () => ({
      source: nz(searchParams?.source),
      certificate_id: nz(searchParams?.certificate_id),
      certificate_number: nz(searchParams?.certificate_number),
      inspection_number: nz(searchParams?.inspection_number),
      asset_tag: nz(searchParams?.asset_tag),
      asset_name: nz(searchParams?.asset_name),
      equipment_description: nz(searchParams?.equipment_description),
      equipment_type: nz(searchParams?.equipment_type),
      client_name: nz(searchParams?.client_name),
      result: nz(searchParams?.result),
      issue_date: nz(searchParams?.issue_date),
      expiry_date: nz(searchParams?.expiry_date),
    }),
    [searchParams]
  );

  const initialSeverity = defaultSeverityFromResult(source.result);

  const [ncrNumber, setNcrNumber] = useState(generateNcrNumber());
  const [assetId, setAssetId] = useState("");
  const [severity, setSeverity] = useState(initialSeverity);
  const [status, setStatus] = useState("open");
  const [description, setDescription] = useState(buildDefaultDescription(source));
  const [details, setDetails] = useState(buildDefaultDetails(source));
  const [dueDate, setDueDate] = useState(defaultDueDate(initialSeverity));

  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [assetError, setAssetError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadAssets() {
      setLoadingAssets(true);
      setAssetError("");

      try {
        const rows = await fetchAssetsByPriority(source);
        if (!ignore) {
          setAssets(rows || []);
          if (rows?.length) {
            setAssetId((prev) => prev || rows[0].id);
          }
        }
      } catch (err) {
        if (!ignore) {
          setAssetError(err?.message || "Failed to load equipment.");
          setAssets([]);
        }
      } finally {
        if (!ignore) setLoadingAssets(false);
      }
    }

    loadAssets();

    return () => {
      ignore = true;
    };
  }, [source]);

  useEffect(() => {
    const nextSeverity = defaultSeverityFromResult(source.result);
    setSeverity(nextSeverity);
    setDueDate(defaultDueDate(nextSeverity));
    setDescription(buildDefaultDescription(source));
    setDetails(buildDefaultDetails(source));
  }, [source]);

  const selectedAsset = useMemo(
    () => assets.find((a) => String(a.id) === String(assetId)) || null,
    [assets, assetId]
  );

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!assetId) {
        setError("Select equipment first.");
        setSaving(false);
        return;
      }

      if (!description.trim()) {
        setError("Description is required.");
        setSaving(false);
        return;
      }

      const payload = {
        ncr_number: ncrNumber.trim() || generateNcrNumber(),
        asset_id: assetId,
        severity,
        status,
        description: description.trim(),
        details: details.trim(),
        due_date: dueDate || null,
      };

      const { data, error: insertError } = await supabase
        .from("ncrs")
        .insert(payload)
        .select("id")
        .single();

      if (insertError) throw insertError;

      router.push(`/ncr/${data.id}`);
    } catch (err) {
      setError(err?.message || "Failed to create NCR.");
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Create NCR">
      <div style={{ maxWidth: 1200 }}>
        <div style={{ marginBottom: 24 }}>
          <Link
            href="/ncr"
            style={{
              color: C.textDim,
              fontSize: 13,
              textDecoration: "none",
              display: "inline-block",
              marginBottom: 12,
            }}
          >
            ← Back to NCRs
          </Link>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(24px,4vw,34px)",
              fontWeight: 900,
              color: "#fff",
            }}
          >
            Create NCR
          </h1>

          <p style={{ margin: "8px 0 0", color: C.textDim, fontSize: 13 }}>
            Auto-filled from certificate data where available
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: 18,
            alignItems: "start",
          }}
        >
          <form onSubmit={handleCreate} style={{ display: "grid", gap: 18 }}>
            <div style={card}>
              <div style={cardTitle}>NCR Information</div>

              <div style={grid2}>
                <Field label="NCR Number">
                  <input
                    value={ncrNumber}
                    onChange={(e) => setNcrNumber(e.target.value)}
                    style={input}
                    placeholder="NCR Number"
                  />
                </Field>

                <Field label="Severity">
                  <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={input}>
                    <option value="critical">Critical</option>
                    <option value="major">Major</option>
                    <option value="minor">Minor</option>
                  </select>
                </Field>

                <Field label="Status">
                  <select value={status} onChange={(e) => setStatus(e.target.value)} style={input}>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="closed">Closed</option>
                  </select>
                </Field>

                <Field label="Due Date">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    style={input}
                  />
                </Field>
              </div>

              <Field label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  style={textarea}
                  placeholder="Write NCR description"
                />
              </Field>

              <Field label="Details">
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={10}
                  style={textarea}
                  placeholder="Write NCR details"
                />
              </Field>
            </div>

            <div style={card}>
              <div style={cardTitle}>Equipment Link</div>

              {loadingAssets ? (
                <div style={{ color: C.textDim, fontSize: 13 }}>Loading equipment…</div>
              ) : assetError ? (
                <div style={errorBox}>{assetError}</div>
              ) : (
                <>
                  <Field label="Select Equipment">
                    <select
                      value={assetId}
                      onChange={(e) => setAssetId(e.target.value)}
                      style={input}
                    >
                      <option value="">Select equipment</option>
                      {assets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {nz(asset.asset_tag, "NO-TAG")} · {nz(asset.asset_name, "Unnamed")} ·{" "}
                          {nz(asset.clients?.company_name, "No Client")}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {selectedAsset ? (
                    <div style={assetInfoBox}>
                      <div style={assetInfoRow}>
                        <span style={assetInfoLabel}>Asset Tag</span>
                        <span style={assetInfoValue}>{selectedAsset.asset_tag || "—"}</span>
                      </div>
                      <div style={assetInfoRow}>
                        <span style={assetInfoLabel}>Asset Name</span>
                        <span style={assetInfoValue}>{selectedAsset.asset_name || "—"}</span>
                      </div>
                      <div style={assetInfoRow}>
                        <span style={assetInfoLabel}>Asset Type</span>
                        <span style={assetInfoValue}>{selectedAsset.asset_type || "—"}</span>
                      </div>
                      <div style={assetInfoRow}>
                        <span style={assetInfoLabel}>Client</span>
                        <span style={assetInfoValue}>
                          {selectedAsset.clients?.company_name || "—"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={warnBox}>
                      No matching equipment auto-selected. Pick the correct equipment before saving.
                    </div>
                  )}
                </>
              )}
            </div>

            {error ? <div style={errorBox}>{error}</div> : null}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit" disabled={saving} style={primaryBtn}>
                {saving ? "Creating NCR..." : "Create NCR"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/ncr")}
                disabled={saving}
                style={secondaryBtn}
              >
                Cancel
              </button>
            </div>
          </form>

          <div style={{ display: "grid", gap: 18 }}>
            <div style={card}>
              <div style={cardTitle}>Certificate Source</div>

              <div style={assetInfoBox}>
                <div style={assetInfoRow}>
                  <span style={assetInfoLabel}>Certificate No.</span>
                  <span style={assetInfoValue}>{source.certificate_number || "—"}</span>
                </div>
                <div style={assetInfoRow}>
                  <span style={assetInfoLabel}>Inspection No.</span>
                  <span style={assetInfoValue}>{source.inspection_number || "—"}</span>
                </div>
                <div style={assetInfoRow}>
                  <span style={assetInfoLabel}>Result</span>
                  <span style={assetInfoValue}>{resultLabel(source.result)}</span>
                </div>
                <div style={assetInfoRow}>
                  <span style={assetInfoLabel}>Client</span>
                  <span style={assetInfoValue}>{source.client_name || "—"}</span>
                </div>
                <div style={assetInfoRow}>
                  <span style={assetInfoLabel}>Asset Tag</span>
                  <span style={assetInfoValue}>{source.asset_tag || "—"}</span>
                </div>
                <div style={assetInfoRow}>
                  <span style={assetInfoLabel}>Asset Name</span>
                  <span style={assetInfoValue}>{source.asset_name || "—"}</span>
                </div>
                <div style={assetInfoRow}>
                  <span style={assetInfoLabel}>Equipment</span>
                  <span style={assetInfoValue}>{source.equipment_description || "—"}</span>
                </div>
                <div style={assetInfoRow}>
                  <span style={assetInfoLabel}>Type</span>
                  <span style={assetInfoValue}>{source.equipment_type || "—"}</span>
                </div>
                <div style={assetInfoRow}>
                  <span style={assetInfoLabel}>Issue Date</span>
                  <span style={assetInfoValue}>{source.issue_date || "—"}</span>
                </div>
                <div style={assetInfoRow}>
                  <span style={assetInfoLabel}>Expiry Date</span>
                  <span style={assetInfoValue}>{source.expiry_date || "—"}</span>
                </div>
              </div>

              {source.certificate_id ? (
                <Link
                  href={`/certificates/${encodeURIComponent(source.certificate_id)}`}
                  style={{
                    ...secondaryLink,
                    marginTop: 14,
                    display: "inline-flex",
                  }}
                >
                  Open Source Certificate
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

const card = {
  background: "linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))",
  border: `1px solid ${C.line}`,
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 10px 30px rgba(0,0,0,0.10)",
};

const cardTitle = {
  fontSize: 14,
  fontWeight: 800,
  color: "#fff",
  marginBottom: 16,
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0,1fr))",
  gap: 14,
  marginBottom: 14,
};

const input = {
  width: "100%",
  height: 44,
  borderRadius: 12,
  border: `1px solid ${C.line}`,
  background: "rgba(255,255,255,0.04)",
  color: C.text,
  padding: "0 14px",
  fontFamily: "inherit",
  fontSize: 14,
  outline: "none",
};

const textarea = {
  width: "100%",
  borderRadius: 12,
  border: `1px solid ${C.line}`,
  background: "rgba(255,255,255,0.04)",
  color: C.text,
  padding: "12px 14px",
  fontFamily: "inherit",
  fontSize: 14,
  outline: "none",
  resize: "vertical",
};

const primaryBtn = {
  height: 46,
  padding: "0 18px",
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  background: `linear-gradient(135deg, ${C.purple}, ${C.blue})`,
  color: "#fff",
  fontWeight: 800,
  fontFamily: "inherit",
};

const secondaryBtn = {
  height: 46,
  padding: "0 18px",
  borderRadius: 12,
  border: `1px solid ${C.line}`,
  cursor: "pointer",
  background: "rgba(255,255,255,0.04)",
  color: C.text,
  fontWeight: 700,
  fontFamily: "inherit",
};

const secondaryLink = {
  padding: "10px 14px",
  borderRadius: 12,
  border: `1px solid ${C.line}`,
  background: "rgba(255,255,255,0.04)",
  color: C.text,
  textDecoration: "none",
  fontWeight: 700,
  fontSize: 13,
};

const errorBox = {
  borderRadius: 14,
  padding: "12px 14px",
  background: `rgba(${rgbaMap[C.red]},0.10)`,
  border: `1px solid rgba(${rgbaMap[C.red]},0.25)`,
  color: "#fff",
  fontSize: 13,
};

const warnBox = {
  borderRadius: 14,
  padding: "12px 14px",
  background: `rgba(${rgbaMap[C.yellow]},0.10)`,
  border: `1px solid rgba(${rgbaMap[C.yellow]},0.25)`,
  color: "#fff",
  fontSize: 13,
};

const assetInfoBox = {
  display: "grid",
  gap: 10,
  padding: 14,
  borderRadius: 14,
  background: "rgba(255,255,255,0.03)",
  border: `1px solid ${C.line}`,
};

const assetInfoRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  paddingBottom: 8,
};

const assetInfoLabel = {
  fontSize: 12,
  color: C.textDim,
  minWidth: 110,
};

const assetInfoValue = {
  fontSize: 13,
  color: C.textSoft,
  textAlign: "right",
  wordBreak: "break-word",
};
