// apps/web/src/app/certificates/import/page.jsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const C = {
  bg: "#08101d",
  bg2: "#0c1628",
  panel: "rgba(15,23,42,0.92)",
  panel2: "rgba(22,33,49,0.96)",
  panel3: "rgba(11,18,32,0.88)",
  border: "rgba(148,163,184,0.16)",
  borderStrong: "rgba(34,211,238,0.22)",
  text: "#f8fafc",
  sub: "rgba(226,232,240,0.72)",
  dim: "rgba(148,163,184,0.72)",
  cyan: "#22d3ee",
  green: "#00f5c4",
  red: "#ff6b81",
  yellow: "#fbbf24",
  blue: "#60a5fa",
  purple: "#a78bfa",
  white: "#ffffff",
};

const MAX_FILES = 20;
const MAX_FILE_MB = 10;

function normalizeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const v = String(value).trim();
  return v || fallback;
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resultTone(result) {
  const value = normalizeText(result, "UNKNOWN").toUpperCase();

  if (value === "PASS") {
    return {
      color: C.green,
      background: "rgba(0,245,196,0.12)",
      border: "1px solid rgba(0,245,196,0.28)",
    };
  }

  if (value === "FAIL") {
    return {
      color: C.red,
      background: "rgba(255,107,129,0.12)",
      border: "1px solid rgba(255,107,129,0.28)",
    };
  }

  if (value === "REPAIR_REQUIRED") {
    return {
      color: C.yellow,
      background: "rgba(251,191,36,0.12)",
      border: "1px solid rgba(251,191,36,0.28)",
    };
  }

  if (value === "OUT_OF_SERVICE") {
    return {
      color: C.purple,
      background: "rgba(167,139,250,0.12)",
      border: "1px solid rgba(167,139,250,0.28)",
    };
  }

  return {
    color: "#cbd5e1",
    background: "rgba(203,213,225,0.10)",
    border: "1px solid rgba(203,213,225,0.22)",
  };
}

function toCertificateInsertPayload(data = {}, fileName = "") {
  return {
    certificate_number: data.certificate_number || null,
    inspection_number: data.inspection_number || null,
    result: data.result || "UNKNOWN",
    issue_date: data.issue_date || null,
    expiry_date: data.expiry_date || null,
    equipment_description: data.equipment_description || null,
    equipment_type: data.equipment_type || null,
    asset_tag: data.asset_tag || null,
    asset_name: data.equipment_description || fileName || null,
    asset_type: data.equipment_type || null,
    client_name: data.client_name || null,
    status: data.status || "Active",
    manufacturer: data.manufacturer || null,
    model: data.model || null,
    serial_number: data.serial_number || null,
    year_built: data.year_built || null,
    country_of_origin: data.country_of_origin || null,
    capacity_volume: data.capacity_volume || null,
    swl: data.swl || null,
    proof_load: data.proof_load || null,
    lift_height: data.lift_height || null,
    sling_length: data.sling_length || null,
    working_pressure: data.working_pressure || null,
    design_pressure: data.design_pressure || null,
    test_pressure: data.test_pressure || null,
    pressure_unit: data.pressure_unit || null,
    temperature_range: data.temperature_range || null,
    material: data.material || null,
    standard_code: data.standard_code || null,
    location: data.location || null,
    inspection_date: data.inspection_date || null,
    next_inspection_due: data.next_inspection_due || null,
    inspector_name: data.inspector_name || null,
    inspection_body: data.inspection_body || null,
    defects_found: data.defects_found || null,
    recommendations: data.recommendations || null,
    comments: data.comments || null,
    nameplate_data: data.nameplate_data || null,
    raw_text_summary: data.raw_text_summary || null,
  };
}

function prettyLabel(label) {
  return label.replace(/_/g, " ");
}

function nonEmptyCount(data = {}) {
  return Object.values(data).filter((v) => v !== null && v !== undefined && String(v).trim() !== "").length;
}

export default function CertificateImportPage() {
  const [files, setFiles] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [expandedMap, setExpandedMap] = useState({});

  const stats = useMemo(() => {
    const total = results.length;
    const success = results.filter((x) => x.ok).length;
    const errors = results.filter((x) => !x.ok).length;
    const passed = results.filter((x) => x.ok && x.data?.result === "PASS").length;
    return { total, success, errors, passed };
  }, [results]);

  function toggleExpanded(index) {
    setExpandedMap((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  function pushFiles(list) {
    const incoming = Array.from(list || []);
    if (!incoming.length) return;

    const allowed = incoming.filter((file) => {
      const isPdf = file.type === "application/pdf";
      const isImage =
        file.type === "image/png" ||
        file.type === "image/jpeg" ||
        file.type === "image/jpg" ||
        file.type === "image/webp";

      const underSize = file.size <= MAX_FILE_MB * 1024 * 1024;
      return (isPdf || isImage) && underSize;
    });

    setFiles((prev) => {
      const merged = [...prev];
      for (const f of allowed) {
        const exists = merged.some(
          (x) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified
        );
        if (!exists && merged.length < MAX_FILES) {
          merged.push({
            id:
              typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `${f.name}-${f.size}-${f.lastModified}-${Math.random()}`,
            file: f,
            name: f.name,
            size: f.size,
            status: "ready",
          });
        }
      }
      return merged;
    });
  }

  function onInputChange(e) {
    pushFiles(e.target.files);
    e.target.value = "";
  }

  function removeFile(id) {
    setFiles((prev) => prev.filter((x) => x.id !== id));
  }

  function clearAll() {
    setFiles([]);
    setResults([]);
    setProgress(0);
    setExpandedMap({});
  }

  async function extractAll() {
    if (!files.length) return;

    setExtracting(true);
    setResults([]);
    setExpandedMap({});
    setProgress(6);

    try {
      const payloadFiles = [];

      for (let i = 0; i < files.length; i += 1) {
        const item = files[i];
        const base64Data = await fileToBase64(item.file);

        payloadFiles.push({
          fileName: item.name,
          mimeType: item.file.type || "application/pdf",
          base64Data,
        });

        const pct = Math.round(((i + 1) / files.length) * 24);
        setProgress(6 + pct);
      }

      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: payloadFiles,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Extraction failed.");
      }

      const mapped = Array.isArray(json?.results)
        ? json.results.map((item) => ({
            ...item,
            saved: false,
            saving: false,
            saveError: null,
            savedId: null,
          }))
        : [];

      setProgress(92);
      setResults(mapped);
      setProgress(100);
    } catch (error) {
      setResults([
        {
          fileName: "Extraction request",
          ok: false,
          error: error?.message || "Unexpected extraction error.",
          saved: false,
          saving: false,
          saveError: null,
          savedId: null,
        },
      ]);
      setProgress(100);
    } finally {
      setExtracting(false);
    }
  }

  async function saveOne(index) {
    const row = results[index];
    if (!row?.ok || !row?.data) return;
    if (row.saved || row.saving) return;

    setResults((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, saving: true, saveError: null } : item
      )
    );

    try {
      const payload = toCertificateInsertPayload(row.data, row.fileName);

      const { data, error } = await supabase
        .from("certificates")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;

      setResults((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                saving: false,
                saved: true,
                savedId: data?.id || null,
                saveError: null,
              }
            : item
        )
      );
    } catch (error) {
      setResults((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                saving: false,
                saved: false,
                saveError: error?.message || "Failed to save certificate.",
              }
            : item
        )
      );
    }
  }

  async function saveAllSuccessful() {
    const pendingIndexes = results
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.ok && item.data && !item.saved && !item.saving)
      .map(({ index }) => index);

    if (!pendingIndexes.length) return;

    setSavingAll(true);
    try {
      for (const index of pendingIndexes) {
        await saveOne(index);
      }
    } finally {
      setSavingAll(false);
    }
  }

  function exportCsv() {
    if (!results.length) return;

    const successRows = results
      .filter((x) => x.ok && x.data)
      .map((x) => ({
        file_name: x.fileName,
        ...x.data,
      }));

    const errorRows = results
      .filter((x) => !x.ok)
      .map((x) => ({
        file_name: x.fileName,
        error: x.error,
      }));

    const rows = successRows.length ? successRows : errorRows;
    if (!rows.length) return;

    const headers = Array.from(
      rows.reduce((set, row) => {
        Object.keys(row).forEach((k) => set.add(k));
        return set;
      }, new Set())
    );

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = row[header] ?? "";
            const str = String(value).replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "certificate-extraction-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout>
      <div
        style={{
          minHeight: "100vh",
          padding: 24,
          background:
            "radial-gradient(circle at top right, rgba(34,211,238,0.12), transparent 22%), radial-gradient(circle at top left, rgba(96,165,250,0.10), transparent 18%), linear-gradient(180deg,#08101d 0%,#09111f 100%)",
          color: C.text,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 0.9fr",
            gap: 18,
            marginBottom: 20,
          }}
        >
          <div style={heroCard}>
            <div style={heroGlow} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={eyebrow}>AI CERTIFICATE IMPORT</div>
              <h1 style={{ margin: "8px 0 10px", fontSize: 42, lineHeight: 1.05, fontWeight: 900 }}>
                Faster review.
                <br />
                Cleaner import.
              </h1>
              <p style={{ color: C.sub, maxWidth: 760, fontSize: 15, lineHeight: 1.7 }}>
                Upload inspection PDFs or photos, extract structured certificate data, review the important fields first, then save accepted results into your register.
              </p>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
                <Link href="/certificates" style={ghostLink}>
                  Back to Register
                </Link>
                <Link href="/certificates/create" style={primaryLink}>
                  + Create Manually
                </Link>
              </div>
            </div>
          </div>

          <div style={panelCard}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <StatCard label="Processed" value={stats.total} color={C.blue} />
              <StatCard label="Success" value={stats.success} color={C.green} />
              <StatCard label="Errors" value={stats.errors} color={C.red} />
              <StatCard label="Passed" value={stats.passed} color={C.yellow} />
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "0.95fr 1.35fr",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 18 }}>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragActive(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                pushFiles(e.dataTransfer.files);
              }}
              style={{
                ...panelCard,
                padding: 22,
                border: dragActive
                  ? `1px solid ${C.cyan}`
                  : `1px solid ${C.border}`,
                boxShadow: dragActive
                  ? "0 0 0 1px rgba(34,211,238,0.18), 0 12px 34px rgba(34,211,238,0.10)"
                  : "0 12px 30px rgba(2,8,23,0.22)",
              }}
            >
              <div style={sectionHeader}>
                <div>
                  <div style={sectionTitle}>Drop zone</div>
                  <div style={sectionSub}>
                    PDF, PNG, JPG, WEBP · Max {MAX_FILES} files · Max {MAX_FILE_MB} MB each
                  </div>
                </div>
                <label style={primaryButton}>
                  Select Files
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                    multiple
                    onChange={onInputChange}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              <div style={dropArea}>
                <div style={dropIcon}>⬆</div>
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>
                  Drag & drop files here
                </div>
                <div style={{ color: C.sub, fontSize: 14 }}>
                  Use this for multi-page certificates, photos, and nameplate captures
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                <button type="button" onClick={clearAll} style={secondaryButton}>
                  Clear All
                </button>

                <button
                  type="button"
                  onClick={extractAll}
                  disabled={!files.length || extracting}
                  style={{
                    ...primaryButtonButton,
                    opacity: !files.length || extracting ? 0.6 : 1,
                    cursor: !files.length || extracting ? "not-allowed" : "pointer",
                  }}
                >
                  {extracting ? "Extracting..." : "✦ Extract with AI"}
                </button>
              </div>
            </div>

            <div style={panelCard}>
              <div style={sectionHeader}>
                <div>
                  <div style={sectionTitle}>Queued files</div>
                  <div style={sectionSub}>
                    {files.length}/{MAX_FILES} selected
                  </div>
                </div>
              </div>

              {files.length === 0 ? (
                <div style={emptyBlock}>No files added yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {files.map((item) => (
                    <div key={item.id} style={queueRow}>
                      <div style={queueIcon}>
                        {item.file.type === "application/pdf" ? "PDF" : "IMG"}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          title={item.name}
                          style={{
                            fontWeight: 800,
                            fontSize: 14,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            marginBottom: 4,
                          }}
                        >
                          {item.name}
                        </div>
                        <div style={{ color: C.dim, fontSize: 12 }}>
                          {formatBytes(item.size)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFile(item.id)}
                        style={removeButton}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(extracting || progress > 0) && (
              <div style={panelCard}>
                <div style={sectionHeader}>
                  <div>
                    <div style={sectionTitle}>
                      {extracting ? "Extraction in progress" : "Extraction complete"}
                    </div>
                    <div style={sectionSub}>
                      {extracting
                        ? "Processing uploaded files and building structured results"
                        : "Results are ready for review"}
                    </div>
                  </div>
                  <div style={{ color: C.white, fontWeight: 800 }}>{progress}%</div>
                </div>

                <div style={progressTrack}>
                  <div
                    style={{
                      ...progressBar,
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            <div style={panelCard}>
              <div style={sectionHeader}>
                <div>
                  <div style={sectionTitle}>Extracted results</div>
                  <div style={sectionSub}>
                    Review the top fields first, then expand details only when needed
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={exportCsv} style={secondaryButton}>
                    ↓ Export CSV
                  </button>

                  <button
                    type="button"
                    onClick={saveAllSuccessful}
                    disabled={savingAll || !results.some((x) => x.ok && !x.saved)}
                    style={{
                      ...primaryButtonButton,
                      opacity: savingAll || !results.some((x) => x.ok && !x.saved) ? 0.6 : 1,
                      cursor:
                        savingAll || !results.some((x) => x.ok && !x.saved)
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {savingAll ? "Saving..." : "Save All Successful"}
                  </button>
                </div>
              </div>

              {results.length === 0 ? (
                <div style={emptyBlock}>No extraction results yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  {results.map((item, index) => {
                    const expanded = !!expandedMap[index];
                    const data = item.data || {};
                    const filled = item.ok ? nonEmptyCount(data) : 0;

                    return (
                      <div
                        key={`${item.fileName}-${index}`}
                        style={{
                          background: "linear-gradient(180deg, rgba(13,20,36,0.92), rgba(10,16,30,0.92))",
                          border: `1px solid ${
                            item.ok ? "rgba(34,211,238,0.14)" : "rgba(255,107,129,0.24)"
                          }`,
                          borderRadius: 20,
                          overflow: "hidden",
                        }}
                      >
                        <div style={{ padding: 18 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              alignItems: "flex-start",
                              flexWrap: "wrap",
                              marginBottom: 14,
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                                <div style={indexBadge}>{index + 1}</div>
                                <div
                                  title={item.fileName}
                                  style={{
                                    fontSize: 20,
                                    fontWeight: 900,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {item.fileName}
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <span style={metaPill}>{item.ok ? `${filled} fields captured` : "Extraction failed"}</span>
                                {item.ok && data.equipment_type ? (
                                  <span style={metaPill}>{data.equipment_type}</span>
                                ) : null}
                                {item.ok && data.certificate_number ? (
                                  <span style={metaPill}>{data.certificate_number}</span>
                                ) : null}
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                              {item.saved && item.savedId ? (
                                <Link href={`/certificates/${item.savedId}`} style={savedLink}>
                                  Open Saved
                                </Link>
                              ) : null}

                              {item.ok ? (
                                <button
                                  type="button"
                                  onClick={() => saveOne(index)}
                                  disabled={item.saved || item.saving}
                                  style={{
                                    ...saveButton,
                                    opacity: item.saved || item.saving ? 0.6 : 1,
                                    cursor: item.saved || item.saving ? "not-allowed" : "pointer",
                                  }}
                                >
                                  {item.saved ? "Saved" : item.saving ? "Saving..." : "Save"}
                                </button>
                              ) : null}

                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "7px 12px",
                                  borderRadius: 999,
                                  fontWeight: 800,
                                  fontSize: 12,
                                  color: item.ok ? C.green : C.red,
                                  background: item.ok
                                    ? "rgba(0,245,196,0.12)"
                                    : "rgba(255,107,129,0.12)",
                                  border: item.ok
                                    ? "1px solid rgba(0,245,196,0.25)"
                                    : "1px solid rgba(255,107,129,0.25)",
                                }}
                              >
                                {item.ok ? "Success" : "Error"}
                              </span>
                            </div>
                          </div>

                          {item.saveError ? (
                            <div style={{ color: C.red, fontSize: 14, marginBottom: 12 }}>
                              {item.saveError}
                            </div>
                          ) : null}

                          {!item.ok ? (
                            <div style={{ color: C.red, fontSize: 14 }}>
                              {item.error || "Extraction error."}
                            </div>
                          ) : (
                            <>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                                  gap: 12,
                                  marginBottom: 14,
                                }}
                              >
                                <MiniInfo label="Certificate No" value={data.certificate_number} />
                                <MiniInfo label="Equipment Type" value={data.equipment_type} />
                                <MiniInfo
                                  label="Result"
                                  value={
                                    <span style={{ ...badgeBase, ...resultTone(data.result) }}>
                                      {data.result || "UNKNOWN"}
                                    </span>
                                  }
                                />
                                <MiniInfo label="Inspection Date" value={data.inspection_date} />
                              </div>

                              <div style={summaryPanel}>
                                <KeyStat label="Equipment" value={data.equipment_description} />
                                <KeyStat label="Client" value={data.client_name} />
                                <KeyStat label="Serial" value={data.serial_number} />
                                <KeyStat label="Location" value={data.location} />
                              </div>

                              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
                                <div style={{ color: C.sub, fontSize: 13 }}>
                                  {data.raw_text_summary || "No summary captured."}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => toggleExpanded(index)}
                                  style={expandButton}
                                >
                                  {expanded ? "Hide Details" : "Show Details"}
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {item.ok && expanded ? (
                          <div style={detailDrawer}>
                            <div style={detailGrid}>
                              {Object.entries(item.data || {}).map(([key, value]) => (
                                <div key={key} style={detailField}>
                                  <div style={detailLabel}>{prettyLabel(key)}</div>
                                  <div style={detailValue}>{value || "-"}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(14,23,39,0.98), rgba(10,16,29,0.98))",
        border: "1px solid rgba(148,163,184,0.12)",
        borderRadius: 18,
        padding: 16,
      }}
    >
      <div style={{ color: "rgba(226,232,240,0.70)", marginBottom: 8, fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color }}>{value}</div>
    </div>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div
      style={{
        background: "rgba(15,23,42,0.72)",
        border: "1px solid rgba(148,163,184,0.10)",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div style={{ color: C.sub, fontSize: 12, marginBottom: 7 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, minHeight: 22 }}>{value || "-"}</div>
    </div>
  );
}

function KeyStat({ label, value }) {
  return (
    <div>
      <div style={{ color: C.dim, fontSize: 12, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800 }}>{value || "-"}</div>
    </div>
  );
}

const heroCard = {
  position: "relative",
  overflow: "hidden",
  background:
    "linear-gradient(135deg, rgba(10,18,32,0.95), rgba(14,23,39,0.96) 55%, rgba(9,16,29,0.98))",
  border: "1px solid rgba(148,163,184,0.12)",
  borderRadius: 24,
  padding: 24,
  minHeight: 210,
};

const heroGlow = {
  position: "absolute",
  top: -80,
  right: -40,
  width: 260,
  height: 260,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(34,211,238,0.18) 0%, rgba(34,211,238,0.02) 58%, transparent 72%)",
  pointerEvents: "none",
};

const panelCard = {
  background: "linear-gradient(180deg, rgba(10,16,29,0.96), rgba(10,16,29,0.92))",
  border: "1px solid rgba(148,163,184,0.12)",
  borderRadius: 24,
  padding: 20,
  boxShadow: "0 12px 30px rgba(2,8,23,0.18)",
};

const eyebrow = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(34,211,238,0.12)",
  border: "1px solid rgba(34,211,238,0.18)",
  color: C.cyan,
  fontWeight: 800,
  fontSize: 11,
  letterSpacing: 1,
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: 16,
};

const sectionTitle = {
  fontSize: 18,
  fontWeight: 900,
  marginBottom: 4,
};

const sectionSub = {
  color: C.sub,
  fontSize: 13,
};

const dropArea = {
  borderRadius: 18,
  border: "1px dashed rgba(34,211,238,0.18)",
  background:
    "linear-gradient(180deg, rgba(8,16,29,0.85), rgba(11,18,32,0.78))",
  minHeight: 180,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: 22,
};

const dropIcon = {
  width: 58,
  height: 58,
  borderRadius: 18,
  display: "grid",
  placeItems: "center",
  background: "rgba(34,211,238,0.10)",
  border: "1px solid rgba(34,211,238,0.18)",
  color: C.cyan,
  fontWeight: 900,
  fontSize: 24,
  marginBottom: 12,
};

const queueRow = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 12,
  borderRadius: 16,
  background: "rgba(15,23,42,0.72)",
  border: "1px solid rgba(148,163,184,0.10)",
};

const queueIcon = {
  minWidth: 48,
  height: 48,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(135deg, rgba(34,211,238,0.14), rgba(96,165,250,0.14))",
  border: "1px solid rgba(34,211,238,0.18)",
  fontWeight: 900,
  fontSize: 12,
  color: C.cyan,
};

const removeButton = {
  border: "1px solid rgba(255,107,129,0.18)",
  background: "rgba(255,107,129,0.10)",
  color: C.red,
  fontWeight: 800,
  padding: "9px 12px",
  borderRadius: 10,
  cursor: "pointer",
};

const progressTrack = {
  height: 10,
  borderRadius: 999,
  overflow: "hidden",
  background: "rgba(255,255,255,0.07)",
};

const progressBar = {
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg,#22d3ee,#60a5fa,#a78bfa)",
  transition: "width 0.3s ease",
};

const indexBadge = {
  width: 32,
  height: 32,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  background: "rgba(34,211,238,0.10)",
  border: "1px solid rgba(34,211,238,0.18)",
  color: C.cyan,
  fontWeight: 900,
  flexShrink: 0,
};

const metaPill = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(148,163,184,0.10)",
  border: "1px solid rgba(148,163,184,0.14)",
  color: C.sub,
  fontSize: 12,
  fontWeight: 700,
};

const summaryPanel = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 12,
  padding: 14,
  borderRadius: 16,
  background: "rgba(8,15,27,0.55)",
  border: "1px solid rgba(148,163,184,0.08)",
};

const expandButton = {
  border: "1px solid rgba(96,165,250,0.16)",
  background: "rgba(96,165,250,0.10)",
  color: C.blue,
  fontWeight: 800,
  padding: "10px 14px",
  borderRadius: 12,
  cursor: "pointer",
};

const detailDrawer = {
  borderTop: "1px solid rgba(148,163,184,0.10)",
  background: "rgba(7,12,22,0.86)",
  padding: 18,
};

const detailGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
};

const detailField = {
  background: "rgba(15,23,42,0.68)",
  border: "1px solid rgba(148,163,184,0.10)",
  borderRadius: 14,
  padding: 12,
  minHeight: 78,
};

const detailLabel = {
  color: C.sub,
  fontSize: 12,
  marginBottom: 8,
  textTransform: "capitalize",
};

const detailValue = {
  color: C.white,
  fontSize: 14,
  fontWeight: 800,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const emptyBlock = {
  borderRadius: 16,
  padding: 20,
  background: "rgba(15,23,42,0.52)",
  border: "1px solid rgba(148,163,184,0.10)",
  color: C.sub,
};

const primaryLink = {
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: 12,
  background: "linear-gradient(135deg,#00f5c4,#4fc3f7)",
  color: "#05202e",
  fontWeight: 900,
};

const ghostLink = {
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.16)",
  color: "#ffffff",
  fontWeight: 800,
  background: "rgba(15,23,42,0.65)",
};

const primaryButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 16px",
  borderRadius: 12,
  background: "linear-gradient(135deg,#00f5c4,#4fc3f7)",
  color: "#05202e",
  fontWeight: 900,
  cursor: "pointer",
  border: "none",
};

const primaryButtonButton = {
  padding: "12px 16px",
  borderRadius: 12,
  background: "linear-gradient(135deg,#00f5c4,#4fc3f7)",
  color: "#05202e",
  fontWeight: 900,
  border: "none",
};

const secondaryButton = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.16)",
  color: "#ffffff",
  fontWeight: 800,
  background: "rgba(15,23,42,0.65)",
  cursor: "pointer",
};

const saveButton = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(0,245,196,0.22)",
  background: "rgba(0,245,196,0.12)",
  color: "#00f5c4",
  fontWeight: 900,
};

const savedLink = {
  textDecoration: "none",
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid rgba(79,195,247,0.22)",
  background: "rgba(79,195,247,0.12)",
  color: "#4fc3f7",
  fontWeight: 900,
};

const badgeBase = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 13,
};
