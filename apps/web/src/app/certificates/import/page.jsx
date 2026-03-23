// apps/web/src/app/certificates/import/page.jsx
"use client";

import { useMemo, useState } from "react";
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
  purple: "#a78bfa",
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
      border: "1px solid rgba(0,245,196,0.25)",
    };
  }

  if (value === "FAIL") {
    return {
      color: C.red,
      background: "rgba(255,107,129,0.12)",
      border: "1px solid rgba(255,107,129,0.25)",
    };
  }

  if (value === "REPAIR_REQUIRED") {
    return {
      color: C.yellow,
      background: "rgba(251,191,36,0.12)",
      border: "1px solid rgba(251,191,36,0.25)",
    };
  }

  if (value === "OUT_OF_SERVICE") {
    return {
      color: C.purple,
      background: "rgba(167,139,250,0.12)",
      border: "1px solid rgba(167,139,250,0.25)",
    };
  }

  return {
    color: "#cbd5e1",
    background: "rgba(203,213,225,0.12)",
    border: "1px solid rgba(203,213,225,0.25)",
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

export default function CertificateImportPage() {
  const [files, setFiles] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  const stats = useMemo(() => {
    const total = results.length;
    const success = results.filter((x) => x.ok).length;
    const errors = results.filter((x) => !x.ok).length;
    const passed = results.filter((x) => x.ok && x.data?.result === "PASS").length;
    return { total, success, errors, passed };
  }, [results]);

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
  }

  async function extractAll() {
    if (!files.length) return;

    setExtracting(true);
    setResults([]);
    setProgress(8);

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

        const pct = Math.round(((i + 1) / files.length) * 22);
        setProgress(8 + pct);
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
              Certificates AI Import
            </h1>
            <p style={{ color: C.sub }}>
              Flexible multi-page extraction with review and save to certificates register.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/certificates" style={ghostLink}>
              Back to Register
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
          <StatCard label="Files Processed" value={stats.total} color={C.blue} />
          <StatCard label="Successful" value={stats.success} color={C.green} />
          <StatCard label="Errors" value={stats.errors} color={C.red} />
          <StatCard label="Passed" value={stats.passed} color={C.yellow} />
        </div>

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
            background: dragActive ? "#162338" : C.panel,
            border: `1px dashed ${dragActive ? C.cyan : "rgba(255,255,255,0.15)"}`,
            borderRadius: 22,
            padding: 28,
            marginBottom: 20,
            transition: "0.2s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
                Upload certificate files
              </div>
              <div style={{ color: C.sub }}>
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
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            Selected Files ({files.length}/{MAX_FILES})
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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

        {files.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            {files.map((item) => (
              <div
                key={item.id}
                style={{
                  background: C.panel2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 16,
                  overflow: "hidden",
                  position: "relative",
                  minHeight: 180,
                }}
              >
                <button
                  type="button"
                  onClick={() => removeFile(item.id)}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    border: "none",
                    background: C.red,
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  ×
                </button>

                <div
                  style={{
                    height: 120,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 42,
                  }}
                >
                  {item.file.type === "application/pdf" ? "📄" : "🖼️"}
                </div>

                <div
                  style={{
                    borderTop: `1px solid ${C.border}`,
                    padding: 12,
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div
                    title={item.name}
                    style={{
                      fontWeight: 800,
                      fontSize: 12,
                      lineHeight: 1.4,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      marginBottom: 4,
                    }}
                  >
                    {item.name}
                  </div>
                  <div style={{ color: C.sub, fontSize: 12 }}>{formatBytes(item.size)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {(extracting || progress > 0) && (
          <div
            style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 18,
              padding: 18,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div style={{ color: C.sub }}>
                {extracting ? "Extraction in progress..." : "Extraction complete ✓"}
              </div>
              <div style={{ color: C.sub }}>{progress}%</div>
            </div>

            <div
              style={{
                height: 8,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg,#22d3ee,#a78bfa)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800 }}>Extracted Certificate Data</div>

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
          <div style={emptyStyle}>No extraction results yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {results.map((item, index) => (
              <div
                key={`${item.fileName}-${index}`}
                style={{
                  background: C.panel,
                  border: `1px solid ${
                    item.ok ? "rgba(0,245,196,0.18)" : "rgba(255,107,129,0.24)"
                  }`,
                  borderRadius: 18,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                    marginBottom: 14,
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: item.ok
                          ? "rgba(0,245,196,0.15)"
                          : "rgba(255,107,129,0.15)",
                        color: item.ok ? C.green : C.red,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </div>

                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={item.fileName}
                    >
                      {item.fileName}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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
                        {item.saved ? "Saved" : item.saving ? "Saving..." : "Save to Register"}
                      </button>
                    ) : null}

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "6px 12px",
                        borderRadius: 999,
                        fontWeight: 700,
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
                  <div style={{ color: C.red, fontSize: 14, marginBottom: 10 }}>
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
                        marginBottom: 16,
                      }}
                    >
                      <DataMini label="Certificate No" value={item.data?.certificate_number} />
                      <DataMini label="Equipment Type" value={item.data?.equipment_type} />
                      <DataMini
                        label="Result"
                        value={
                          <span style={{ ...badgeBase, ...resultTone(item.data?.result) }}>
                            {item.data?.result || "UNKNOWN"}
                          </span>
                        }
                      />
                      <DataMini label="Inspection Date" value={item.data?.inspection_date} />
                    </div>

                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
                        <tbody>
                          <TableRow label="Equipment Description" value={item.data?.equipment_description} />
                          <TableRow label="Client Name" value={item.data?.client_name} />
                          <TableRow label="Asset Tag" value={item.data?.asset_tag} />
                          <TableRow label="Serial Number" value={item.data?.serial_number} />
                          <TableRow label="Manufacturer" value={item.data?.manufacturer} />
                          <TableRow label="Model" value={item.data?.model} />
                          <TableRow label="Year Built" value={item.data?.year_built} />
                          <TableRow label="Country of Origin" value={item.data?.country_of_origin} />
                          <TableRow label="Working Pressure" value={item.data?.working_pressure} />
                          <TableRow label="Design Pressure" value={item.data?.design_pressure} />
                          <TableRow label="Test Pressure" value={item.data?.test_pressure} />
                          <TableRow label="Pressure Unit" value={item.data?.pressure_unit} />
                          <TableRow label="Capacity / Volume" value={item.data?.capacity_volume} />
                          <TableRow label="SWL" value={item.data?.swl} />
                          <TableRow label="Proof Load" value={item.data?.proof_load} />
                          <TableRow label="Lift Height" value={item.data?.lift_height} />
                          <TableRow label="Sling Length" value={item.data?.sling_length} />
                          <TableRow label="Material" value={item.data?.material} />
                          <TableRow label="Standard Code" value={item.data?.standard_code} />
                          <TableRow label="Issue Date" value={item.data?.issue_date} />
                          <TableRow label="Expiry Date" value={item.data?.expiry_date} />
                          <TableRow label="Next Inspection Due" value={item.data?.next_inspection_due} />
                          <TableRow label="Inspection Number" value={item.data?.inspection_number} />
                          <TableRow label="Inspector Name" value={item.data?.inspector_name} />
                          <TableRow label="Inspection Body" value={item.data?.inspection_body} />
                          <TableRow label="Location" value={item.data?.location} />
                          <TableRow label="Status" value={item.data?.status} />
                          <TableRow label="Defects Found" value={item.data?.defects_found} />
                          <TableRow label="Recommendations" value={item.data?.recommendations} />
                          <TableRow label="Comments" value={item.data?.comments} />
                          <TableRow label="Nameplate Data" value={item.data?.nameplate_data} />
                          <TableRow label="Summary" value={item.data?.raw_text_summary} />
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
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

function DataMini({ label, value }) {
  return (
    <div
      style={{
        background: C.panel2,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div style={{ color: C.sub, fontSize: 12, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800 }}>{value || "-"}</div>
    </div>
  );
}

function TableRow({ label, value }) {
  return (
    <tr>
      <th
        style={{
          width: 240,
          textAlign: "left",
          padding: "12px 10px",
          fontSize: 13,
          color: "rgba(255,255,255,0.65)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          verticalAlign: "top",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </th>
      <td
        style={{
          padding: "12px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          color: "#ffffff",
          fontSize: 14,
          verticalAlign: "top",
        }}
      >
        {value || "-"}
      </td>
    </tr>
  );
}

const emptyStyle = {
  background: "#111827",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 18,
  padding: 24,
  color: "rgba(255,255,255,0.70)",
};

const primaryLink = {
  textDecoration: "none",
  padding: "12px 16px",
  borderRadius: 12,
  background: "linear-gradient(135deg,#00f5c4,#4fc3f7)",
  color: "#05202e",
  fontWeight: 800,
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

const primaryButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 16px",
  borderRadius: 12,
  background: "linear-gradient(135deg,#00f5c4,#4fc3f7)",
  color: "#05202e",
  fontWeight: 800,
  cursor: "pointer",
  border: "none",
};

const primaryButtonButton = {
  padding: "12px 16px",
  borderRadius: 12,
  background: "linear-gradient(135deg,#00f5c4,#4fc3f7)",
  color: "#05202e",
  fontWeight: 800,
  border: "none",
};

const secondaryButton = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#ffffff",
  fontWeight: 800,
  background: "#111827",
  cursor: "pointer",
};

const saveButton = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(0,245,196,0.25)",
  background: "rgba(0,245,196,0.12)",
  color: "#00f5c4",
  fontWeight: 800,
};

const savedLink = {
  textDecoration: "none",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(79,195,247,0.25)",
  background: "rgba(79,195,247,0.12)",
  color: "#4fc3f7",
  fontWeight: 800,
};

const badgeBase = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 13,
};
