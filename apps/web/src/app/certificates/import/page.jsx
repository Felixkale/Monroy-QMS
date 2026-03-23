"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function nonEmptyCount(data = {}) {
  return Object.values(data).filter(
    (v) => v !== null && v !== undefined && String(v).trim() !== ""
  ).length;
}

function prettyKey(key) {
  return key.replace(/_/g, " ");
}

function toCertificatePayload(data = {}, fileName = "") {
  return {
    certificate_number:    data.certificate_number    || null,
    inspection_number:     data.inspection_number     || null,
    result:                data.result                || "UNKNOWN",
    issue_date:            data.issue_date            || null,
    expiry_date:           data.expiry_date           || null,
    equipment_description: data.equipment_description || null,
    equipment_type:        data.equipment_type        || null,
    asset_tag:             data.asset_tag             || null,
    asset_name:            data.equipment_description || fileName || null,
    asset_type:            data.equipment_type        || null,
    client_name:           data.client_name           || null,
    status:                data.status                || "active",
    manufacturer:          data.manufacturer          || null,
    model:                 data.model                 || null,
    serial_number:         data.serial_number         || null,
    year_built:            data.year_built            || null,
    country_of_origin:     data.country_of_origin     || null,
    capacity_volume:       data.capacity_volume       || null,
    swl:                   data.swl                   || null,
    proof_load:            data.proof_load            || null,
    lift_height:           data.lift_height           || null,
    sling_length:          data.sling_length          || null,
    working_pressure:      data.working_pressure      || null,
    design_pressure:       data.design_pressure       || null,
    test_pressure:         data.test_pressure         || null,
    pressure_unit:         data.pressure_unit         || null,
    temperature_range:     data.temperature_range     || null,
    material:              data.material              || null,
    standard_code:         data.standard_code         || null,
    location:              data.location              || null,
    inspection_date:       data.inspection_date       || null,
    next_inspection_due:   data.next_inspection_due   || null,
    inspector_name:        data.inspector_name        || null,
    inspection_body:       data.inspection_body       || null,
    defects_found:         data.defects_found         || null,
    recommendations:       data.recommendations       || null,
    comments:              data.comments              || null,
    nameplate_data:        data.nameplate_data        || null,
    raw_text_summary:      data.raw_text_summary      || null,
  };
}

const MAX_FILES = 20;
const MAX_FILE_MB = 10;

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  page: {
    minHeight: "100vh",
    padding: "28px 24px",
    background: "#0a0f1a",
    color: "#f1f5f9",
    fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
  },

  // top header strip
  header: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 16,
    flexWrap: "wrap",
  },
  headingGroup: { display: "flex", flexDirection: "column", gap: 4 },
  eyebrow: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.1em",
    color: "#64748b",
    textTransform: "uppercase",
  },
  heading: { fontSize: 26, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.2 },
  headerActions: { display: "flex", gap: 8 },

  // layout
  twoCol: {
    display: "grid",
    gridTemplateColumns: "380px minmax(0,1fr)",
    gap: 16,
    alignItems: "start",
  },
  leftCol: { display: "grid", gap: 14 },

  // stat row
  statRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    background: "#111827",
    border: "1px solid #1e293b",
    borderRadius: 14,
    padding: "14px 16px",
  },
  statLabel: { fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: 500 },
  statVal: { fontSize: 26, fontWeight: 700 },

  // panel card
  panel: {
    background: "#111827",
    border: "1px solid #1e293b",
    borderRadius: 16,
    padding: "18px 20px",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  panelTitle: { fontSize: 14, fontWeight: 600, color: "#f1f5f9", marginBottom: 2 },
  panelSub: { fontSize: 12, color: "#64748b" },

  // drop zone
  dropZone: {
    border: "1.5px dashed #1e293b",
    borderRadius: 14,
    padding: "28px 16px",
    textAlign: "center",
    background: "#0d1525",
    cursor: "pointer",
    marginBottom: 14,
    transition: "border-color .15s",
  },
  dropZoneActive: { borderColor: "#3b82f6" },
  dropIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "#1e293b",
    border: "1px solid #334155",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 12px",
  },
  dropTitle: { fontSize: 14, fontWeight: 600, marginBottom: 4, color: "#e2e8f0" },
  dropSub: { fontSize: 12, color: "#64748b" },

  // buttons
  btnRow: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  btn: {
    padding: "9px 15px",
    borderRadius: 10,
    border: "1px solid #1e293b",
    background: "#1e293b",
    color: "#cbd5e1",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1,
    transition: "background .15s, opacity .15s",
  },
  btnPrimary: {
    padding: "9px 16px",
    borderRadius: 10,
    border: "none",
    background: "#3b82f6",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1,
    transition: "opacity .15s",
  },
  btnSuccess: {
    padding: "7px 13px",
    borderRadius: 9,
    border: "1px solid #166534",
    background: "#14532d",
    color: "#86efac",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
  },
  btnDanger: {
    padding: "6px 11px",
    borderRadius: 8,
    border: "1px solid #7f1d1d",
    background: "#450a0a",
    color: "#fca5a5",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
  },
  btnGhost: {
    padding: "9px 13px",
    borderRadius: 10,
    border: "1px solid transparent",
    background: "transparent",
    color: "#64748b",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
  },
  linkBtn: {
    textDecoration: "none",
    padding: "9px 15px",
    borderRadius: 10,
    border: "1px solid #1e293b",
    background: "#1e293b",
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: 500,
    display: "inline-flex",
    alignItems: "center",
  },
  linkBtnPrimary: {
    textDecoration: "none",
    padding: "9px 16px",
    borderRadius: 10,
    background: "#3b82f6",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    border: "none",
  },

  // file queue row
  fileRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 11px",
    borderRadius: 10,
    border: "1px solid #1e293b",
    background: "#0d1525",
  },
  fileBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: "#1e3a5f",
    color: "#60a5fa",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 700,
    flexShrink: 0,
  },
  fileName: {
    fontSize: 13,
    fontWeight: 500,
    color: "#e2e8f0",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    flex: 1,
    minWidth: 0,
  },
  fileSize: { fontSize: 11, color: "#64748b" },

  // progress
  progTrack: {
    height: 5,
    borderRadius: 999,
    background: "#1e293b",
    overflow: "hidden",
    marginTop: 8,
  },
  progBar: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg,#3b82f6,#818cf8)",
    transition: "width .25s ease",
  },

  // result card
  resultCard: {
    border: "1px solid #1e293b",
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 10,
  },
  resultCardErr: { border: "1px solid #7f1d1d" },
  resultHead: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "11px 14px",
    background: "#0d1525",
    flexWrap: "wrap",
  },
  resultNum: {
    width: 26,
    height: 26,
    borderRadius: 999,
    background: "#1e3a5f",
    color: "#60a5fa",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },
  resultFname: {
    fontSize: 13,
    fontWeight: 600,
    color: "#e2e8f0",
    flex: 1,
    minWidth: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  resultBody: { padding: "14px 16px" },

  // mini info grid
  miniGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 8,
    marginBottom: 10,
  },
  miniCell: {
    background: "#0d1525",
    border: "1px solid #1e293b",
    borderRadius: 10,
    padding: "9px 11px",
  },
  miniLabel: { fontSize: 11, color: "#64748b", marginBottom: 4 },
  miniVal: { fontSize: 13, fontWeight: 600, color: "#e2e8f0" },

  // summary strip
  summaryStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 8,
    padding: "10px 12px",
    background: "#0d1525",
    borderRadius: 10,
    border: "1px solid #1e293b",
    marginBottom: 10,
  },
  sumLabel: { fontSize: 11, color: "#64748b", marginBottom: 3 },
  sumVal: { fontSize: 12, fontWeight: 600, color: "#e2e8f0" },

  // raw text
  rawText: { fontSize: 12, color: "#64748b", lineHeight: 1.6, marginBottom: 10 },

  // error box
  errBox: {
    background: "#450a0a",
    border: "1px solid #7f1d1d",
    borderRadius: 10,
    padding: "12px 14px",
  },
  errTitle: { fontSize: 13, fontWeight: 600, color: "#fca5a5", marginBottom: 6 },
  errDetail: { fontSize: 12, color: "#f87171", lineHeight: 1.6 },

  // pill badges
  pill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 9px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    flexShrink: 0,
  },

  // detail drawer
  drawer: {
    borderTop: "1px solid #1e293b",
    background: "#0a0f1a",
    padding: "14px 16px",
  },
  drawerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
    gap: 8,
  },
  drawerCell: {
    background: "#111827",
    border: "1px solid #1e293b",
    borderRadius: 10,
    padding: "9px 11px",
  },
  drawerKey: { fontSize: 11, color: "#64748b", marginBottom: 4, textTransform: "capitalize" },
  drawerVal: { fontSize: 12, fontWeight: 600, color: "#e2e8f0", wordBreak: "break-word", lineHeight: 1.5 },

  empty: {
    padding: "18px 0",
    fontSize: 13,
    color: "#64748b",
  },
  divider: { borderTop: "1px solid #1e293b", margin: "12px 0" },
};

function pill(color) {
  const map = {
    pass:    { background: "#14532d", color: "#86efac", border: "1px solid #166534" },
    fail:    { background: "#450a0a", color: "#fca5a5", border: "1px solid #7f1d1d" },
    warn:    { background: "#431407", color: "#fdba74", border: "1px solid #7c2d12" },
    info:    { background: "#1e3a5f", color: "#93c5fd", border: "1px solid #1e40af" },
    neutral: { background: "#1e293b", color: "#94a3b8", border: "1px solid #334155" },
    ok:      { background: "#14532d", color: "#86efac", border: "1px solid #166534" },
    err:     { background: "#450a0a", color: "#fca5a5", border: "1px solid #7f1d1d" },
  };
  return { ...s.pill, ...map[color] };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
  return (
    <div style={s.statCard}>
      <div style={s.statLabel}>{label}</div>
      <div style={{ ...s.statVal, color }}>{value}</div>
    </div>
  );
}

function ResultPill({ result }) {
  const r = String(result || "UNKNOWN").toUpperCase();
  const c = r === "PASS" ? "pass" : r === "FAIL" ? "fail" : "neutral";
  return <span style={pill(c)}>{r}</span>;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CertificateImportPage() {
  const [files, setFiles]           = useState([]);
  const [results, setResults]       = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [savingAll, setSavingAll]   = useState(false);
  const [progress, setProgress]     = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [expanded, setExpanded]     = useState({});

  const stats = useMemo(() => {
    const total   = results.length;
    const success = results.filter((x) => x.ok).length;
    const errors  = results.filter((x) => !x.ok).length;
    const passed  = results.filter((x) => x.ok && x.data?.result === "PASS").length;
    return { total, success, errors, passed };
  }, [results]);

  // ── File management ──────────────────────────────────────────────────────

  function pushFiles(list) {
    const incoming = Array.from(list || []);
    if (!incoming.length) return;

    const allowed = incoming.filter((f) => {
      const ok =
        f.type === "application/pdf" ||
        f.type.startsWith("image/");
      return ok && f.size <= MAX_FILE_MB * 1024 * 1024;
    });

    setFiles((prev) => {
      const merged = [...prev];
      for (const f of allowed) {
        const dup = merged.some(
          (x) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified
        );
        if (!dup && merged.length < MAX_FILES) {
          merged.push({
            id: crypto.randomUUID(),
            file: f,
            name: f.name,
            size: f.size,
          });
        }
      }
      return merged;
    });
  }

  function removeFile(id) {
    setFiles((prev) => prev.filter((x) => x.id !== id));
  }

  function clearAll() {
    setFiles([]);
    setResults([]);
    setProgress(0);
    setExpanded({});
  }

  // ── Extraction ───────────────────────────────────────────────────────────

  async function extractAll() {
    if (!files.length || extracting) return;

    setExtracting(true);
    setResults([]);
    setExpanded({});
    setProgress(5);

    try {
      const payloadFiles = [];

      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        const base64Data = await fileToBase64(item.file);
        payloadFiles.push({
          fileName:  item.name,
          mimeType:  item.file.type || "application/pdf",
          base64Data,
        });
        setProgress(5 + Math.round(((i + 1) / files.length) * 30));
      }

      setProgress(40);

      const res  = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: payloadFiles }),
      });

      setProgress(80);

      const json = await res.json();

      if (!res.ok) throw new Error(json?.error || "Extraction failed.");

      const mapped = Array.isArray(json?.results)
        ? json.results.map((item) => ({
            ...item,
            saved:     false,
            saving:    false,
            saveError: null,
            savedId:   null,
          }))
        : [];

      setResults(mapped);
      setProgress(100);
    } catch (err) {
      setResults([
        {
          fileName:  "Extraction request",
          ok:        false,
          error:     err?.message || "Unexpected error.",
          saved:     false,
          saving:    false,
          saveError: null,
          savedId:   null,
        },
      ]);
      setProgress(100);
    } finally {
      setExtracting(false);
    }
  }

  // ── Saving ───────────────────────────────────────────────────────────────

  async function saveOne(index) {
    const row = results[index];
    if (!row?.ok || !row?.data || row.saved || row.saving) return;

    setResults((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, saving: true, saveError: null } : item
      )
    );

    try {
      const payload = toCertificatePayload(row.data, row.fileName);
      const { data, error } = await supabase
        .from("certificates")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;

      setResults((prev) =>
        prev.map((item, i) =>
          i === index
            ? { ...item, saving: false, saved: true, savedId: data?.id || null, saveError: null }
            : item
        )
      );
    } catch (err) {
      setResults((prev) =>
        prev.map((item, i) =>
          i === index
            ? { ...item, saving: false, saved: false, saveError: err?.message || "Save failed." }
            : item
        )
      );
    }
  }

  async function saveAllSuccessful() {
    const pending = results
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.ok && item.data && !item.saved && !item.saving)
      .map(({ index }) => index);

    if (!pending.length) return;

    setSavingAll(true);
    try {
      for (const idx of pending) await saveOne(idx);
    } finally {
      setSavingAll(false);
    }
  }

  // ── CSV export ───────────────────────────────────────────────────────────

  function exportCsv() {
    const rows = results
      .filter((x) => x.ok && x.data)
      .map((x) => ({ file_name: x.fileName, ...x.data }));
    if (!rows.length) return;

    const headers = [...new Set(rows.flatMap(Object.keys))];
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = "certificate-extraction.csv";
    a.click();
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div style={s.page}>

        {/* Header */}
        <div style={s.header}>
          <div style={s.headingGroup}>
            <span style={s.eyebrow}>Monroy QMS · Certificates</span>
            <h1 style={s.heading}>Import certificates</h1>
          </div>
          <div style={s.headerActions}>
            <Link href="/certificates" style={s.linkBtn}>← Register</Link>
            <Link href="/certificates/create" style={s.linkBtnPrimary}>+ Create manually</Link>
          </div>
        </div>

        {/* Stats row */}
        <div style={s.statRow}>
          <StatCard label="Processed" value={stats.total}   color="#60a5fa" />
          <StatCard label="Successful" value={stats.success} color="#86efac" />
          <StatCard label="Errors"     value={stats.errors}  color="#f87171" />
          <StatCard label="Passed"     value={stats.passed}  color="#fbbf24" />
        </div>

        {/* Two-col body */}
        <div style={s.twoCol}>

          {/* LEFT — upload + queue */}
          <div style={s.leftCol}>

            {/* Upload panel */}
            <div style={s.panel}>
              <div style={s.panelHeader}>
                <div>
                  <div style={s.panelTitle}>Upload zone</div>
                  <div style={s.panelSub}>
                    PDF, PNG, JPG, WEBP · max {MAX_FILES} files · max {MAX_FILE_MB} MB each
                  </div>
                </div>
                <label style={{ ...s.btnPrimary, cursor: "pointer" }}>
                  Select files
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => { pushFiles(e.target.files); e.target.value = ""; }}
                  />
                </label>
              </div>

              {/* Drop zone */}
              <div
                style={{
                  ...s.dropZone,
                  ...(dragActive ? s.dropZoneActive : {}),
                }}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                onDrop={(e) => { e.preventDefault(); setDragActive(false); pushFiles(e.dataTransfer.files); }}
              >
                <div style={s.dropIconWrap}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 2.5v10M4.5 8l4.5-5.5L13.5 8M2 15h14" stroke="#3b82f6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={s.dropTitle}>Drag &amp; drop certificate files here</div>
                <div style={s.dropSub}>Multi-page PDFs, sticker photos, nameplates supported</div>
              </div>

              {/* Actions */}
              <div style={s.btnRow}>
                <button style={s.btnGhost} onClick={clearAll}>Clear all</button>
                <button
                  style={{
                    ...s.btnPrimary,
                    flex: 1,
                    opacity: !files.length || extracting ? 0.5 : 1,
                    cursor: !files.length || extracting ? "not-allowed" : "pointer",
                  }}
                  disabled={!files.length || extracting}
                  onClick={extractAll}
                >
                  {extracting ? "Extracting…" : "Extract with AI"}
                </button>
              </div>

              {/* Progress */}
              {progress > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                    <span>{extracting ? "Processing files…" : "Extraction complete"}</span>
                    <span style={{ fontWeight: 600, color: "#e2e8f0" }}>{progress}%</span>
                  </div>
                  <div style={s.progTrack}>
                    <div style={{ ...s.progBar, width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Queue panel */}
            <div style={s.panel}>
              <div style={s.panelHeader}>
                <div>
                  <div style={s.panelTitle}>Queue</div>
                  <div style={s.panelSub}>{files.length} / {MAX_FILES} selected</div>
                </div>
              </div>

              {files.length === 0 ? (
                <div style={s.empty}>No files added yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {files.map((item) => (
                    <div key={item.id} style={s.fileRow}>
                      <div style={s.fileBadge}>
                        {item.file.type === "application/pdf" ? "PDF" : "IMG"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={s.fileName} title={item.name}>{item.name}</div>
                        <div style={s.fileSize}>{formatBytes(item.size)}</div>
                      </div>
                      <button style={s.btnDanger} onClick={() => removeFile(item.id)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — results */}
          <div style={s.panel}>
            <div style={s.panelHeader}>
              <div>
                <div style={s.panelTitle}>Extracted results</div>
                <div style={s.panelSub}>Review core fields first, expand for full detail</div>
              </div>
              <div style={s.btnRow}>
                <button style={s.btn} onClick={exportCsv}>↓ CSV</button>
                <button
                  style={{
                    ...s.btnPrimary,
                    opacity: savingAll || !results.some((x) => x.ok && !x.saved) ? 0.5 : 1,
                    cursor: savingAll || !results.some((x) => x.ok && !x.saved) ? "not-allowed" : "pointer",
                  }}
                  disabled={savingAll || !results.some((x) => x.ok && !x.saved)}
                  onClick={saveAllSuccessful}
                >
                  {savingAll ? "Saving…" : "Save all successful"}
                </button>
              </div>
            </div>

            {results.length === 0 ? (
              <div style={s.empty}>No extraction results yet. Upload files and click Extract with AI.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {results.map((item, index) => {
                  const data      = item.data || {};
                  const filled    = item.ok ? nonEmptyCount(data) : 0;
                  const isExpanded = !!expanded[index];

                  return (
                    <div
                      key={`${item.fileName}-${index}`}
                      style={{
                        ...s.resultCard,
                        ...(item.ok ? {} : s.resultCardErr),
                      }}
                    >
                      {/* Head */}
                      <div style={s.resultHead}>
                        <div style={{
                          ...s.resultNum,
                          ...(item.ok
                            ? { background: "#14532d", color: "#86efac" }
                            : { background: "#450a0a", color: "#fca5a5" }),
                        }}>
                          {index + 1}
                        </div>
                        <div style={s.resultFname} title={item.fileName}>{item.fileName}</div>

                        {item.ok && (
                          <span style={pill("info")}>{filled} fields</span>
                        )}
                        {item.ok && data.equipment_type && (
                          <span style={pill("neutral")}>{data.equipment_type}</span>
                        )}
                        {item.ok && <ResultPill result={data.result} />}
                        <span style={item.ok ? pill("ok") : pill("err")}>
                          {item.ok ? "Success" : "Error"}
                        </span>
                      </div>

                      {/* Body */}
                      <div style={s.resultBody}>

                        {/* Error state */}
                        {!item.ok && (
                          <div style={s.errBox}>
                            <div style={s.errTitle}>{item.error || "Extraction error."}</div>
                            {item.error?.includes("JSON") && (
                              <div style={s.errDetail}>
                                Likely cause: the PDF is large and Gemini truncated the response.
                                Fix: increase <code>maxOutputTokens</code> to <code>4096</code> and set <code>temperature: 0</code> in your API route's <code>generationConfig</code>.
                              </div>
                            )}
                          </div>
                        )}

                        {/* Success state */}
                        {item.ok && (
                          <>
                            {/* Mini info */}
                            <div style={s.miniGrid}>
                              <div style={s.miniCell}>
                                <div style={s.miniLabel}>Certificate no.</div>
                                <div style={s.miniVal}>{data.certificate_number || "—"}</div>
                              </div>
                              <div style={s.miniCell}>
                                <div style={s.miniLabel}>Equipment type</div>
                                <div style={s.miniVal}>{data.equipment_type || "—"}</div>
                              </div>
                              <div style={s.miniCell}>
                                <div style={s.miniLabel}>Result</div>
                                <div style={s.miniVal}><ResultPill result={data.result} /></div>
                              </div>
                              <div style={s.miniCell}>
                                <div style={s.miniLabel}>Inspection date</div>
                                <div style={s.miniVal}>{data.inspection_date || "—"}</div>
                              </div>
                            </div>

                            {/* Summary strip */}
                            <div style={s.summaryStrip}>
                              <div>
                                <div style={s.sumLabel}>Equipment</div>
                                <div style={s.sumVal}>{data.equipment_description || "—"}</div>
                              </div>
                              <div>
                                <div style={s.sumLabel}>Client</div>
                                <div style={s.sumVal}>{data.client_name || "—"}</div>
                              </div>
                              <div>
                                <div style={s.sumLabel}>Serial</div>
                                <div style={s.sumVal}>{data.serial_number || "—"}</div>
                              </div>
                              <div>
                                <div style={s.sumLabel}>Location</div>
                                <div style={s.sumVal}>{data.location || "—"}</div>
                              </div>
                            </div>

                            {/* Raw summary */}
                            {data.raw_text_summary && (
                              <div style={s.rawText}>{data.raw_text_summary}</div>
                            )}

                            {/* Save error */}
                            {item.saveError && (
                              <div style={{ ...s.errBox, marginBottom: 10 }}>
                                <div style={s.errTitle}>{item.saveError}</div>
                              </div>
                            )}

                            {/* Footer actions */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <button
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#64748b",
                                  fontSize: 12,
                                  cursor: "pointer",
                                  textDecoration: "underline",
                                  textUnderlineOffset: 2,
                                  padding: 0,
                                }}
                                onClick={() => setExpanded((prev) => ({ ...prev, [index]: !prev[index] }))}
                              >
                                {isExpanded ? "Hide all fields" : "Show all fields"}
                              </button>

                              <div style={s.btnRow}>
                                {item.saved && item.savedId && (
                                  <Link
                                    href={`/certificates/${item.savedId}`}
                                    style={{ ...s.btn, color: "#60a5fa", borderColor: "#1e3a5f", fontSize: 12, padding: "7px 12px" }}
                                  >
                                    Open saved →
                                  </Link>
                                )}
                                <button
                                  style={{
                                    ...s.btnSuccess,
                                    opacity: item.saved || item.saving ? 0.5 : 1,
                                    cursor: item.saved || item.saving ? "not-allowed" : "pointer",
                                  }}
                                  disabled={item.saved || item.saving}
                                  onClick={() => saveOne(index)}
                                >
                                  {item.saved ? "Saved ✓" : item.saving ? "Saving…" : "Save to register"}
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Expandable detail drawer */}
                      {item.ok && isExpanded && (
                        <div style={s.drawer}>
                          <div style={s.drawerGrid}>
                            {Object.entries(data).map(([key, value]) => (
                              <div key={key} style={s.drawerCell}>
                                <div style={s.drawerKey}>{prettyKey(key)}</div>
                                <div style={s.drawerVal}>{value || "—"}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
