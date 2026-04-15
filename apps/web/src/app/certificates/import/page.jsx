"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import { autoRaiseNcr } from "@/lib/autoNcr";

const SYSTEM_PROMPT = `You are an advanced industrial inspection AI for a QMS. Analyze the uploaded document/image and extract structured data. Be adaptive — recognize meaning from scattered, rotated, or poorly formatted data. Handle label aliases: WLL/SWL/Capacity→swl, Tested at X kPa→test_pressure, Next due→next_inspection_due, etc. Prioritize nameplates as most reliable. Detect defects visually and from text. Infer result: PASS if no defects, FAIL/CONDITIONAL if defects present, UNKNOWN if unclear. Return ONLY valid JSON — no markdown, no code fences, no explanation.

{
  "equipment_type":"","equipment_description":"","manufacturer":"","model":"","serial_number":"",
  "year_built":"","capacity_volume":"","swl":"","working_pressure":"","design_pressure":"",
  "test_pressure":"","pressure_unit":"","material":"","standard_code":"","inspection_number":"",
  "client_name":"","location":"","inspection_date":"","expiry_date":"","next_inspection_due":"",
  "inspector_name":"","inspection_body":"","result":"","defects_found":"","recommendations":"",
  "comments":"","qr_code_data":"","nameplate_data":"","raw_text_summary":""
}

Rules: result must be PASS, FAIL, CONDITIONAL, or UNKNOWN. Use "" for missing fields. Think like a certified inspector, not a form reader.`;

const MAX_FILES = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isAllowedFile(file) {
  return (
    file &&
    (file.type === "application/pdf" || file.type.startsWith("image/")) &&
    file.size <= MAX_FILE_SIZE
  );
}

function nonEmpty(data) {
  return Object.values(data || {}).filter(
    (v) => v != null && String(v).trim() !== ""
  ).length;
}

function pillClass(result) {
  const v = String(result || "").toUpperCase();
  if (v === "PASS") return "p-pass";
  if (v === "FAIL") return "p-fail";
  if (v === "CONDITIONAL") return "p-cond";
  return "p-neutral";
}

function slugify(value) {
  return (
    String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 16) || "UNKNOWN"
  );
}

function fileSizeLabel(file) {
  if (!file) return "";
  if (file.size > 1048576) return `${(file.size / 1048576).toFixed(1)} MB`;
  return `${Math.round(file.size / 1024)} KB`;
}

function escapeCsv(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function ImportCertificatesPage() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgressState] = useState({
    visible: false,
    pct: 0,
    label: "Processing...",
  });
  const [overrides, setOverrides] = useState({
    client_name: "",
    location: "",
    inspection_date: "",
    expiry_date: "",
  });

  const fileInputRef = useRef(null);
  const dropInputRef = useRef(null);
  const certSeqRef = useRef(1);

  const overrideCount = useMemo(
    () => Object.values(overrides).filter((v) => String(v || "").trim()).length,
    [overrides]
  );

  const stats = useMemo(() => {
    const ok = results.filter((x) => x.ok).length;
    const err = results.filter((x) => !x.ok).length;
    const pass = results.filter(
      (x) => x.ok && (x.manualResult || x.data?.result) === "PASS"
    ).length;

    return {
      total: results.length,
      ok,
      err,
      pass,
      canSaveAll: results.some((x) => x.ok && !x.saved && !x.saving),
    };
  }, [results]);

  function setProgress(pct, label) {
    setProgressState({
      visible: true,
      pct: Math.round(pct),
      label: label || (pct < 100 ? "Processing..." : "Extraction complete"),
    });
  }

  function resetFileInputs() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (dropInputRef.current) dropInputRef.current.value = "";
  }

  function addFiles(list) {
    setFiles((prev) => {
      const next = [...prev];

      list
        .filter(isAllowedFile)
        .forEach((file) => {
          const exists = next.find(
            (x) => x.file.name === file.name && x.file.size === file.size
          );
          if (!exists && next.length < MAX_FILES) {
            next.push({ id: uid(), file });
          }
        });

      return next;
    });

    resetFileInputs();
  }

  function removeFile(id) {
    setFiles((prev) => prev.filter((x) => x.id !== id));
  }

  function clearAll() {
    setFiles([]);
    setResults([]);
    setProgressState({ visible: false, pct: 0, label: "Processing..." });
    resetFileInputs();
  }

  function clearOverrides() {
    setOverrides({
      client_name: "",
      location: "",
      inspection_date: "",
      expiry_date: "",
    });
  }

  function setOverride(key, value) {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  }

  function applyOverridesToData(data) {
    const next = { ...(data || {}) };

    if (overrides.client_name && !next.client_name) next.client_name = overrides.client_name;
    if (overrides.location && !next.location) next.location = overrides.location;
    if (overrides.inspection_date && !next.inspection_date) next.inspection_date = overrides.inspection_date;
    if (overrides.expiry_date && !next.expiry_date) next.expiry_date = overrides.expiry_date;

    return next;
  }

  function genCert(data, fileName) {
    const base =
      slugify(data?.serial_number) ||
      slugify(data?.inspection_number) ||
      slugify(String(fileName || "").replace(/\.[^.]+$/, ""));
    const seq = String(certSeqRef.current++).padStart(2, "0");
    return `CERT-${base}-${seq}`;
  }

  async function handleExtract() {
    if (!files.length || extracting) return;

    setExtracting(true);
    setResults([]);
    setProgress(5, "Preparing files...");

    try {
      const payloads = [];

      for (let i = 0; i < files.length; i += 1) {
        const item = files[i];
        setProgress(
          5 + (i / files.length) * 30,
          `Reading ${i + 1}/${files.length}: ${item.file.name}`
        );

        const b64 = await toBase64(item.file);
        payloads.push({
          fileName: item.file.name,
          mimeType: item.file.type || "application/pdf",
          base64Data: b64,
        });
      }

      setProgress(42, "Sending to Gemini 2.5 Flash...");

      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: payloads, systemPrompt: SYSTEM_PROMPT }),
      });

      setProgress(85, "Parsing results...");

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || `Server error ${res.status}`);
      }

      if (!Array.isArray(json?.results)) {
        throw new Error("Unexpected response from /api/ai/extract");
      }

      const mapped = json.results.map((item) => {
        if (!item.ok || !item.data) {
          return {
            ...item,
            saved: false,
            saving: false,
            saveError: null,
            expanded: false,
            certNumber: null,
            savedId: null,
            manualResult: "PASS",
            manualDefects: "",
            ncrId: null,
            ncrNumber: null,
            capaId: null,
            capaNumber: null,
            ncrSkipped: null,
          };
        }

        const data = applyOverridesToData(item.data);

        return {
          ...item,
          data,
          saved: false,
          saving: false,
          saveError: null,
          savedId: null,
          expanded: false,
          certNumber: null,
          manualResult: data.result || "PASS",
          manualDefects: data.defects_found || "",
          ncrId: null,
          ncrNumber: null,
          capaId: null,
          capaNumber: null,
          ncrSkipped: null,
        };
      });

      setResults(mapped);
      setProgress(100, "Extraction complete");
    } catch (e) {
      setResults([
        {
          fileName: "Request failed",
          ok: false,
          error: e.message || "Unexpected error",
          saved: false,
          saving: false,
          saveError: null,
          expanded: false,
          certNumber: null,
          savedId: null,
          manualResult: "PASS",
          manualDefects: "",
        },
      ]);
      setProgress(100, "Extraction failed");
    } finally {
      setExtracting(false);
    }
  }

  function setResultField(idx, key, value) {
    setResults((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [key]: value } : item))
    );
  }

  function toggleExpanded(idx) {
    setResults((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, expanded: !item.expanded } : item
      )
    );
  }

  async function saveOne(idx) {
    const row = results[idx];
    if (!row?.ok || row.saved || row.saving) return;

    setResults((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, saving: true, saveError: null } : item
      )
    );

    try {
      const certNumber = genCert(row.data, row.fileName);

      const payload = {
        certificate_number: certNumber,
        inspection_number: row.data.inspection_number || null,
        result: row.manualResult || row.data.result || "UNKNOWN",
        issue_date: row.data.issue_date || null,
        expiry_date: row.data.expiry_date || null,
        equipment_description: row.data.equipment_description || null,
        equipment_type: row.data.equipment_type || null,
        asset_tag: row.data.asset_tag || null,
        asset_name: row.data.equipment_description || row.fileName || null,
        asset_type: row.data.equipment_type || null,
        client_name: row.data.client_name || null,
        status: row.data.status || "active",
        manufacturer: row.data.manufacturer || null,
        model: row.data.model || null,
        serial_number: row.data.serial_number || null,
        year_built: row.data.year_built || null,
        country_of_origin: row.data.country_of_origin || null,
        capacity_volume: row.data.capacity_volume || null,
        swl: row.data.swl || null,
        proof_load: row.data.proof_load || null,
        lift_height: row.data.lift_height || null,
        sling_length: row.data.sling_length || null,
        working_pressure: row.data.working_pressure || null,
        design_pressure: row.data.design_pressure || null,
        test_pressure: row.data.test_pressure || null,
        pressure_unit: row.data.pressure_unit || null,
        temperature_range: row.data.temperature_range || null,
        material: row.data.material || null,
        standard_code: row.data.standard_code || null,
        location: row.data.location || null,
        inspection_date: row.data.inspection_date || null,
        next_inspection_due: row.data.next_inspection_due || null,
        inspector_name: row.data.inspector_name || null,
        inspection_body: row.data.inspection_body || null,
        defects_found: row.manualDefects || row.data.defects_found || null,
        recommendations: row.data.recommendations || null,
        comments: row.data.comments || null,
        nameplate_data: row.data.nameplate_data || null,
        raw_text_summary: row.data.raw_text_summary || null,
      };

      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || `Save failed: ${res.status}`);
      }

      const savedId = json?.id || json?.data?.id || null;

      setResults((prev) =>
        prev.map((item, i) =>
          i === idx
            ? {
                ...item,
                saving: false,
                saved: true,
                certNumber,
                savedId,
                saveError: null,
              }
            : item
        )
      );

      // ── AUTO-RAISE NCR + CAPA if result is non-pass ───────────────────────
      const resultNorm = String(row.manualResult || row.data.result || "")
        .toUpperCase()
        .replace(/\s+/g, "_");
      const NON_PASS = ["FAIL", "REPAIR_REQUIRED", "OUT_OF_SERVICE", "CONDITIONAL"];

      if (NON_PASS.includes(resultNorm) && savedId) {
        const { data: savedCert } = await supabase
          .from("certificates")
          .select("*")
          .eq("id", savedId)
          .maybeSingle();

        if (savedCert) {
          autoRaiseNcr(savedCert, { createCapa: true })
            .then(({ ncr, capa, skipped, error: ncrErr }) => {
              if (ncrErr) {
                console.warn("Auto NCR failed for import cert:", ncrErr);
                return;
              }
              if (ncr) {
                setResults((prev) =>
                  prev.map((it, i) =>
                    i === idx
                      ? {
                          ...it,
                          ncrId: ncr.id,
                          ncrNumber: ncr.ncr_number,
                          capaId: capa?.id ?? null,
                          capaNumber: capa?.capa_number ?? null,
                          ncrSkipped: skipped,
                        }
                      : it
                  )
                );
              }
            })
            .catch((err) => console.warn("Auto NCR error:", err.message));
        }
      }
    } catch (e) {
      setResults((prev) =>
        prev.map((item, i) =>
          i === idx
            ? {
                ...item,
                saving: false,
                saved: false,
                saveError: e.message || "Save failed.",
              }
            : item
        )
      );
    }
  }

  async function saveAll() {
    const indexes = results
      .map((_, i) => i)
      .filter((i) => results[i].ok && !results[i].saved && !results[i].saving);

    for (const idx of indexes) {
      // eslint-disable-next-line no-await-in-loop
      await saveOne(idx);
    }
  }

  function exportCsv() {
    const rows = results
      .filter((x) => x.ok && x.data)
      .map((x) => ({
        file_name: x.fileName,
        certificate_number: x.certNumber || "",
        result: x.manualResult,
        defects_found: x.manualDefects,
        ...x.data,
      }));

    if (!rows.length) return;

    const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "certificates.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <AppLayout title="Import Certificates">
      <div className="cert-import-page">
        <div className="wrap">
          <div className="top-bar">
            <div className="brand">
              <div>
                <div className="brand-label">
                  <span className="brand-dot" />
                  Monroy QMS · Certificates
                </div>
                <div className="brand-title">Import Certificates</div>
              </div>
            </div>

            <div className="nav-btns">
              <Link href="/certificates" className="nav-btn">
                ← Register
              </Link>
              <Link href="/certificates/create" className="nav-btn nav-btn-primary">
                + Create manually
              </Link>
            </div>
          </div>

          <div className="stats">
            <div className="stat-card blue">
              <div className="stat-lbl">Processed</div>
              <div className="stat-val blue">{stats.total}</div>
            </div>
            <div className="stat-card green">
              <div className="stat-lbl">Successful</div>
              <div className="stat-val green">{stats.ok}</div>
            </div>
            <div className="stat-card red">
              <div className="stat-lbl">Errors</div>
              <div className="stat-val red">{stats.err}</div>
            </div>
            <div className="stat-card amber">
              <div className="stat-lbl">Passed</div>
              <div className="stat-val amber">{stats.pass}</div>
            </div>
          </div>

          <div className="layout">
            <div className="left-col">
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M8 2v8M4 7l4-5 4 5M2 14h12"
                          stroke="var(--blue-t)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Upload zone
                    </div>
                    <div className="card-sub">
                      PDF · PNG · JPG · WEBP — max 20 files, 10 MB each
                    </div>
                  </div>

                  <label className="browse-label">
                    Browse
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,image/png,image/jpeg,image/webp"
                      style={{ display: "none" }}
                      onChange={(e) => addFiles(Array.from(e.target.files || []))}
                    />
                  </label>
                </div>

                <div className="card-body">
                  <div
                    className={`drop-area ${dragActive ? "drag" : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      addFiles(Array.from(e.dataTransfer.files || []));
                    }}
                  >
                    <input
                      ref={dropInputRef}
                      type="file"
                      multiple
                      accept=".pdf,image/png,image/jpeg,image/webp"
                      onChange={(e) => addFiles(Array.from(e.target.files || []))}
                    />
                    <div className="drop-icon-ring">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 3v13M6 9l6-6 6 6"
                          stroke="var(--accent)"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M3 20h18"
                          stroke="var(--accent)"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div className="drop-h">Drop files here</div>
                    <div className="drop-p">Certificates, nameplates, equipment photos</div>
                    <div className="type-chips">
                      <span className="chip">PDF</span>
                      <span className="chip">PNG</span>
                      <span className="chip">JPG</span>
                      <span className="chip">WEBP</span>
                    </div>
                  </div>

                  <div className="action-row">
                    <button className="btn btn-ghost" type="button" onClick={clearAll}>
                      Clear all
                    </button>

                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={handleExtract}
                      disabled={!files.length || extracting}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 16 16"
                        fill="none"
                        style={{ flexShrink: 0 }}
                      >
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                        <path
                          d="M8 5v3l2 2"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                      {extracting ? "Extracting..." : "Extract with AI"}
                    </button>
                  </div>

                  <div
                    className="prog-wrap"
                    style={{ display: progress.visible ? "" : "none" }}
                  >
                    <div className="prog-meta">
                      <span>{progress.label}</span>
                      <span className="prog-pct">{progress.pct}%</span>
                    </div>
                    <div className="prog-track">
                      <div className="prog-fill" style={{ width: `${progress.pct}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title" style={{ gap: 8 }}>
                      Manual override
                      {overrideCount ? (
                        <span className="abadge">{overrideCount} active</span>
                      ) : null}
                    </div>
                    <div className="card-sub">
                      Fills missing fields. Won&apos;t overwrite extracted values.
                    </div>
                  </div>

                  {overrideCount ? (
                    <button
                      className="btn btn-ghost"
                      type="button"
                      style={{ fontSize: 11, padding: "5px 10px" }}
                      onClick={clearOverrides}
                    >
                      Clear
                    </button>
                  ) : null}
                </div>

                <div className="card-body">
                  <div className="override-grid">
                    <div className="ov-f">
                      <label className="ov-lbl">Client name</label>
                      <input
                        className="ov-input"
                        type="text"
                        placeholder="e.g. Karowe Mine"
                        value={overrides.client_name}
                        onChange={(e) => setOverride("client_name", e.target.value)}
                      />
                    </div>

                    <div className="ov-f">
                      <label className="ov-lbl">Location / Site</label>
                      <input
                        className="ov-input"
                        type="text"
                        placeholder="e.g. Processing Plant"
                        value={overrides.location}
                        onChange={(e) => setOverride("location", e.target.value)}
                      />
                    </div>

                    <div className="ov-f">
                      <label className="ov-lbl">Inspection date</label>
                      <input
                        className="ov-input"
                        type="date"
                        value={overrides.inspection_date}
                        onChange={(e) => setOverride("inspection_date", e.target.value)}
                      />
                    </div>

                    <div className="ov-f">
                      <label className="ov-lbl">Expiry date</label>
                      <input
                        className="ov-input"
                        type="date"
                        value={overrides.expiry_date}
                        onChange={(e) => setOverride("expiry_date", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Queue</div>
                    <div className="card-sub">{files.length} / 20 selected</div>
                  </div>
                </div>

                <div className="card-body" style={{ paddingBottom: 10 }}>
                  {!files.length ? (
                    <div className="empty-state">No files added yet.</div>
                  ) : (
                    files.map((item) => {
                      const ext = item.file.type === "application/pdf" ? "PDF" : "IMG";
                      return (
                        <div className="q-item" key={item.id}>
                          <div className="q-icon">{ext}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="q-name" title={item.file.name}>
                              {item.file.name}
                            </div>
                            <div className="q-size">{fileSizeLabel(item.file)}</div>
                          </div>
                          <button
                            className="btn-remove"
                            type="button"
                            onClick={() => removeFile(item.id)}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="card" style={{ borderRadius: "var(--rxl)" }}>
              <div className="card-header">
                <div>
                  <div className="card-title">Extracted results</div>
                  <div className="card-sub">
                    Review, set result & defects, then save to register
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button className="btn-csv" type="button" onClick={exportCsv}>
                    ↓ CSV
                  </button>
                  <button
                    className="btn-saveall"
                    type="button"
                    onClick={saveAll}
                    disabled={!stats.canSaveAll}
                  >
                    Save all successful
                  </button>
                </div>
              </div>

              <div className="card-body">
                <div className="result-list">
                  {!results.length ? (
                    <div className="empty-state" style={{ padding: "32px 0" }}>
                      <svg
                        width="36"
                        height="36"
                        viewBox="0 0 36 36"
                        fill="none"
                        style={{ margin: "0 auto 12px", display: "block", opacity: 0.3 }}
                      >
                        <rect
                          x="6"
                          y="4"
                          width="24"
                          height="28"
                          rx="3"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M12 12h12M12 17h12M12 22h7"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      Upload files and click Extract with AI to begin
                    </div>
                  ) : (
                    results.map((item, idx) => {
                      const d = item.data || {};
                      const filled = item.ok ? nonEmpty(d) : 0;
                      const r = item.manualResult || d.result || "UNKNOWN";
                      const disabled = item.saved || item.saving;

                      return (
                        <div
                          key={`${item.fileName}-${idx}`}
                          className={`rcard${
                            item.ok ? (item.saved ? " is-saved" : "") : " is-err"
                          }`}
                        >
                          <div className="rhead">
                            <div
                              className="rnum"
                              style={
                                item.ok
                                  ? { background: "var(--green-bg)", color: "var(--green-t)" }
                                  : { background: "var(--red-bg)", color: "var(--red-t)" }
                              }
                            >
                              {idx + 1}
                            </div>

                            <div className="rfname" title={item.fileName}>
                              {item.fileName}
                            </div>

                            {item.ok ? (
                              <span className="pill p-info">{filled} fields</span>
                            ) : null}

                            {item.ok && d.equipment_type ? (
                              <span className="pill p-neutral">{d.equipment_type}</span>
                            ) : null}

                            {item.ok ? (
                              <span className={`pill ${pillClass(r)}`}>{r}</span>
                            ) : null}

                            {item.saved && item.certNumber ? (
                              <span className="cert-num">{item.certNumber}</span>
                            ) : null}

                            <span className={`pill ${item.ok ? "p-ok" : "p-err"}`}>
                              {item.ok ? "OK" : "Error"}
                            </span>
                          </div>

                          {!item.ok ? (
                            <div className="rbody">
                              <div className="err-box">
                                <div className="err-title">
                                  {item.error || "Extraction failed."}
                                </div>
                                <div className="err-detail">
                                  Check that /api/ai/extract is deployed and your AI API key is set.
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="rbody">
                                <div className="kv-grid">
                                  <div className="kv">
                                    <div className="kv-lbl">Certificate no.</div>
                                    <div className="kv-val">
                                      {item.certNumber || (
                                        <span style={{ color: "var(--hint)", fontWeight: 400 }}>
                                          Auto on save
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="kv">
                                    <div className="kv-lbl">Equipment type</div>
                                    <div className="kv-val">{d.equipment_type || "—"}</div>
                                  </div>
                                  <div className="kv">
                                    <div className="kv-lbl">Inspection date</div>
                                    <div className="kv-val">{d.inspection_date || "—"}</div>
                                  </div>
                                  <div className="kv">
                                    <div className="kv-lbl">Expiry date</div>
                                    <div className="kv-val">{d.expiry_date || "—"}</div>
                                  </div>
                                </div>

                                <div className="strip">
                                  <div>
                                    <div className="strip-lbl">Equipment</div>
                                    <div className="strip-val">
                                      {d.equipment_description || "—"}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="strip-lbl">Client</div>
                                    <div className="strip-val">{d.client_name || "—"}</div>
                                  </div>
                                  <div>
                                    <div className="strip-lbl">Serial no.</div>
                                    <div className="strip-val">{d.serial_number || "—"}</div>
                                  </div>
                                  <div>
                                    <div className="strip-lbl">Location</div>
                                    <div className="strip-val">{d.location || "—"}</div>
                                  </div>
                                </div>

                                {d.raw_text_summary ? (
                                  <div className="raw-sum">{d.raw_text_summary}</div>
                                ) : null}

                                <div className="two-fields">
                                  <div>
                                    <label className="field-lbl">Inspection result</label>
                                    <select
                                      className="sel"
                                      value={item.manualResult}
                                      disabled={disabled}
                                      onChange={(e) =>
                                        setResultField(idx, "manualResult", e.target.value)
                                      }
                                    >
                                      <option value="PASS">PASS</option>
                                      <option value="FAIL">FAIL</option>
                                      <option value="CONDITIONAL">CONDITIONAL</option>
                                      <option value="UNKNOWN">UNKNOWN</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="field-lbl">Defects found</label>
                                    <textarea
                                      className="ta"
                                      value={item.manualDefects}
                                      disabled={disabled}
                                      placeholder="Describe defects, cracks, wear, non-conformances..."
                                      onChange={(e) =>
                                        setResultField(idx, "manualDefects", e.target.value)
                                      }
                                    />
                                  </div>
                                </div>

                                {item.saveError ? (
                                  <div className="save-err">{item.saveError}</div>
                                ) : null}

                                <div className="rfoot">
                                  <button
                                    className="expand-btn"
                                    type="button"
                                    onClick={() => toggleExpanded(idx)}
                                  >
                                    {item.expanded
                                      ? "Hide all fields ↑"
                                      : "Show all fields ↓"}
                                  </button>

                                  <div className="foot-actions">
                                    {item.saved && item.savedId ? (
                                      <>
                                        <Link
                                          href={`/certificates/${item.savedId}`}
                                          className="view-btn"
                                        >
                                          View →
                                        </Link>
                                        <Link
                                          href={`/certificates/${item.savedId}/edit`}
                                          className="edit-btn"
                                        >
                                          Edit
                                        </Link>
                                      </>
                                    ) : null}

                                    <button
                                      className="btn-save"
                                      type="button"
                                      disabled={disabled}
                                      onClick={() => saveOne(idx)}
                                    >
                                      {item.saved ? (
                                        "Saved ✓"
                                      ) : item.saving ? (
                                        <>
                                          <span className="spinner" />
                                          Saving...
                                        </>
                                      ) : (
                                        "Save to register"
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* NCR/CAPA auto-raise indicator */}
                              {item.ncrNumber ? (
                                <div style={{ padding: "8px 14px", borderBottom: "1px solid rgba(248,113,113,0.15)", background: "rgba(248,113,113,0.06)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                  <span style={{ fontSize: 12 }}>🚨</span>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: "#f87171" }}>
                                    {item.ncrSkipped ? "NCR already existed:" : "NCR auto-raised:"}
                                    {" "}
                                    <Link href={`/ncr/${item.ncrId}`} target="_blank" rel="noreferrer" style={{ color: "#f87171", textDecoration: "underline" }}>
                                      {item.ncrNumber}
                                    </Link>
                                  </span>
                                  {item.capaNumber ? (
                                    <span style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa" }}>
                                      CAPA:{" "}
                                      <Link href={`/capa/${item.capaId}`} target="_blank" rel="noreferrer" style={{ color: "#a78bfa", textDecoration: "underline" }}>
                                        {item.capaNumber}
                                      </Link>
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}

                              {item.expanded ? (
                                <div className="drawer">
                                  <div className="drawer-grid">
                                    {Object.entries(d).map(([key, value]) => (
                                      <div className="dc" key={key}>
                                        <div className="dc-k">
                                          {key.replace(/_/g, " ")}
                                        </div>
                                        <div className="dc-v">
                                          {value != null && String(value).trim() !== ""
                                            ? String(value)
                                            : "—"}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <style jsx global>{`
          .cert-import-page * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          .cert-import-page {
            --bg: #060c18;
            --s1: #0d1526;
            --s2: #111d30;
            --s3: #162038;
            --b1: #1a2740;
            --b2: #243450;
            --b3: #2e4060;
            --text: #eef2f8;
            --sub: #7a8fa8;
            --hint: #4a5f78;
            --blue: #4a90e2;
            --blue2: #2d6bc4;
            --blue-dim: #122040;
            --blue-t: #7eb8f7;
            --green: #22c55e;
            --green-bg: #0a2818;
            --green-b: #145228;
            --green-t: #4ade80;
            --red: #ef4444;
            --red-bg: #200a0a;
            --red-b: #5c1a1a;
            --red-t: #f87171;
            --amber: #f59e0b;
            --amber-bg: #1e1208;
            --amber-b: #6b3d08;
            --amber-t: #fbbf24;
            --accent: #00d4ff;
            --accent2: #0099cc;
            --r: 8px;
            --rl: 12px;
            --rxl: 16px;
            background: var(--bg);
            color: var(--text);
            font-family: "IBM Plex Sans", "DM Sans", system-ui, sans-serif;
            font-size: 13px;
            line-height: 1.5;
            min-height: 100vh;
          }

          .cert-import-page .wrap {
            padding: 28px 24px;
            max-width: 1160px;
          }

          .cert-import-page .top-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 32px;
            gap: 16px;
            flex-wrap: wrap;
          }

          .cert-import-page .brand {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .cert-import-page .brand-dot {
            display: inline-block;
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: var(--accent);
            margin-right: 6px;
            vertical-align: middle;
            animation: pulse 2s infinite;
          }

          @keyframes pulse {
            0%,
            100% {
              opacity: 1;
              box-shadow: 0 0 0 0 rgba(0, 212, 255, 0.4);
            }
            50% {
              opacity: 0.8;
              box-shadow: 0 0 0 6px rgba(0, 212, 255, 0);
            }
          }

          .cert-import-page .brand-label {
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: var(--sub);
          }

          .cert-import-page .brand-title {
            font-size: 22px;
            font-weight: 700;
            color: var(--text);
            letter-spacing: -0.02em;
            margin-top: 2px;
          }

          .cert-import-page .nav-btns {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .cert-import-page .nav-btn {
            padding: 8px 16px;
            border-radius: var(--r);
            border: 1px solid var(--b2);
            background: var(--s1);
            color: var(--sub);
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            font-family: inherit;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: border-color 0.15s, color 0.15s;
          }

          .cert-import-page .nav-btn:hover {
            border-color: var(--b3);
            color: var(--text);
          }

          .cert-import-page .nav-btn-primary {
            background: var(--blue2);
            border-color: var(--blue2);
            color: #fff;
          }

          .cert-import-page .nav-btn-primary:hover {
            background: var(--blue);
            border-color: var(--blue);
          }

          .cert-import-page .stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 24px;
          }

          .cert-import-page .stat-card {
            background: var(--s1);
            border: 1px solid var(--b1);
            border-radius: var(--rl);
            padding: 16px 18px;
            position: relative;
            overflow: hidden;
          }

          .cert-import-page .stat-card::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            border-radius: var(--rl) var(--rl) 0 0;
          }

          .cert-import-page .stat-card.blue::before {
            background: var(--blue);
          }

          .cert-import-page .stat-card.green::before {
            background: var(--green);
          }

          .cert-import-page .stat-card.red::before {
            background: var(--red);
          }

          .cert-import-page .stat-card.amber::before {
            background: var(--amber);
          }

          .cert-import-page .stat-lbl {
            font-size: 11px;
            color: var(--sub);
            font-weight: 500;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            margin-bottom: 8px;
          }

          .cert-import-page .stat-val {
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.03em;
          }

          .cert-import-page .stat-val.blue {
            color: var(--blue-t);
          }

          .cert-import-page .stat-val.green {
            color: var(--green-t);
          }

          .cert-import-page .stat-val.red {
            color: var(--red-t);
          }

          .cert-import-page .stat-val.amber {
            color: var(--amber-t);
          }

          .cert-import-page .layout {
            display: grid;
            grid-template-columns: 360px 1fr;
            gap: 16px;
            align-items: start;
          }

          .cert-import-page .left-col {
            display: grid;
            gap: 14px;
          }

          .cert-import-page .card {
            background: var(--s1);
            border: 1px solid var(--b1);
            border-radius: var(--rxl);
            overflow: hidden;
          }

          .cert-import-page .card-header {
            padding: 16px 20px;
            border-bottom: 1px solid var(--b1);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            flex-wrap: wrap;
          }

          .cert-import-page .card-title {
            font-size: 13px;
            font-weight: 600;
            color: var(--text);
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .cert-import-page .card-sub {
            font-size: 11px;
            color: var(--sub);
            margin-top: 2px;
          }

          .cert-import-page .card-body {
            padding: 16px 20px;
          }

          .cert-import-page .browse-label {
            padding: 8px 14px;
            border-radius: var(--r);
            background: var(--blue2);
            color: #fff;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            font-family: inherit;
          }

          .cert-import-page .drop-area {
            border: 1.5px dashed var(--b2);
            border-radius: var(--rl);
            padding: 28px 20px;
            text-align: center;
            background: var(--s2);
            cursor: pointer;
            position: relative;
            transition: border-color 0.2s, background 0.2s;
            margin-bottom: 14px;
          }

          .cert-import-page .drop-area:hover,
          .cert-import-page .drop-area.drag {
            border-color: var(--accent);
            background: rgba(0, 212, 255, 0.04);
          }

          .cert-import-page .drop-area input {
            position: absolute;
            inset: 0;
            opacity: 0;
            cursor: pointer;
            width: 100%;
            height: 100%;
          }

          .cert-import-page .drop-icon-ring {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            border: 1.5px solid var(--b3);
            background: var(--s3);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 14px;
          }

          .cert-import-page .drop-h {
            font-size: 14px;
            font-weight: 600;
            color: var(--text);
            margin-bottom: 4px;
          }

          .cert-import-page .drop-p {
            font-size: 12px;
            color: var(--sub);
          }

          .cert-import-page .type-chips {
            display: flex;
            gap: 5px;
            justify-content: center;
            margin-top: 12px;
            flex-wrap: wrap;
          }

          .cert-import-page .chip {
            font-size: 10px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 4px;
            background: var(--s3);
            border: 1px solid var(--b2);
            color: var(--sub);
            letter-spacing: 0.06em;
          }

          .cert-import-page .action-row {
            display: flex;
            gap: 8px;
            align-items: center;
          }

          .cert-import-page .btn {
            padding: 9px 16px;
            border-radius: var(--r);
            border: 1px solid var(--b2);
            background: var(--s2);
            color: var(--sub);
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            font-family: inherit;
            transition: all 0.15s;
          }

          .cert-import-page .btn:hover {
            border-color: var(--b3);
            color: var(--text);
          }

          .cert-import-page .btn-ghost {
            background: transparent;
            border-color: transparent;
            color: var(--hint);
          }

          .cert-import-page .btn-ghost:hover {
            color: var(--sub);
            border-color: transparent;
          }

          .cert-import-page .btn-primary {
            background: var(--blue2);
            border-color: var(--blue2);
            color: #fff;
            flex: 1;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          }

          .cert-import-page .btn-primary:hover:not(:disabled) {
            background: var(--blue);
            border-color: var(--blue);
          }

          .cert-import-page .btn-primary:disabled {
            opacity: 0.35;
            cursor: not-allowed;
          }

          .cert-import-page .btn-save {
            padding: 7px 14px;
            border-radius: var(--r);
            border: 1px solid var(--green-b);
            background: var(--green-bg);
            color: var(--green-t);
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            font-family: inherit;
            transition: opacity 0.15s;
          }

          .cert-import-page .btn-save:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }

          .cert-import-page .btn-remove {
            padding: 4px 9px;
            border-radius: 6px;
            border: 1px solid var(--red-b);
            background: var(--red-bg);
            color: var(--red-t);
            cursor: pointer;
            font-size: 11px;
            font-family: inherit;
          }

          .cert-import-page .btn-csv {
            padding: 7px 13px;
            border-radius: var(--r);
            border: 1px solid var(--b2);
            background: var(--s2);
            color: var(--sub);
            cursor: pointer;
            font-size: 12px;
            font-family: inherit;
          }

          .cert-import-page .btn-saveall {
            padding: 9px 16px;
            border-radius: var(--r);
            border: none;
            background: var(--blue2);
            color: #fff;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            font-family: inherit;
          }

          .cert-import-page .btn-saveall:disabled {
            opacity: 0.35;
            cursor: not-allowed;
          }

          .cert-import-page .prog-wrap {
            margin-top: 12px;
          }

          .cert-import-page .prog-meta {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: var(--sub);
            margin-bottom: 6px;
          }

          .cert-import-page .prog-pct {
            font-weight: 700;
            color: var(--text);
          }

          .cert-import-page .prog-track {
            height: 3px;
            background: var(--b1);
            border-radius: 999px;
            overflow: hidden;
          }

          .cert-import-page .prog-fill {
            height: 100%;
            background: var(--accent);
            border-radius: 999px;
            transition: width 0.3s ease;
          }

          .cert-import-page .override-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .cert-import-page .ov-f {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .cert-import-page .ov-lbl {
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: var(--hint);
          }

          .cert-import-page .ov-input {
            padding: 8px 10px;
            border-radius: var(--r);
            border: 1px solid var(--b1);
            background: var(--s2);
            color: var(--text);
            font-size: 12px;
            outline: none;
            font-family: inherit;
            width: 100%;
            transition: border-color 0.15s;
          }

          .cert-import-page .ov-input:focus {
            border-color: var(--blue);
          }

          .cert-import-page .abadge {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 700;
            background: var(--blue-dim);
            color: var(--blue-t);
            border: 1px solid #1a3a6a;
            letter-spacing: 0.04em;
          }

          .cert-import-page .q-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 9px 12px;
            border-radius: var(--r);
            border: 1px solid var(--b1);
            background: var(--s2);
            margin-bottom: 6px;
          }

          .cert-import-page .q-icon {
            width: 32px;
            height: 32px;
            border-radius: 7px;
            background: var(--blue-dim);
            color: var(--blue-t);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 700;
            flex-shrink: 0;
            letter-spacing: 0.04em;
          }

          .cert-import-page .q-name {
            font-size: 12px;
            font-weight: 500;
            color: var(--text);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            min-width: 0;
          }

          .cert-import-page .q-size {
            font-size: 11px;
            color: var(--hint);
          }

          .cert-import-page .empty-state {
            padding: 20px 0;
            font-size: 12px;
            color: var(--hint);
            text-align: center;
          }

          .cert-import-page .result-list {
            display: grid;
            gap: 10px;
          }

          .cert-import-page .rcard {
            border: 1px solid var(--b1);
            border-radius: var(--rl);
            overflow: hidden;
            transition: border-color 0.2s;
          }

          .cert-import-page .rcard.is-err {
            border-color: var(--red-b);
          }

          .cert-import-page .rcard.is-saved {
            border-color: var(--green-b);
          }

          .cert-import-page .rhead {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 11px 16px;
            background: var(--s2);
            flex-wrap: wrap;
            border-bottom: 1px solid var(--b1);
          }

          .cert-import-page .rnum {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 700;
            flex-shrink: 0;
          }

          .cert-import-page .rfname {
            font-size: 12px;
            font-weight: 600;
            color: var(--text);
            flex: 1;
            min-width: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .cert-import-page .pill {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 700;
            flex-shrink: 0;
            letter-spacing: 0.04em;
          }

          .cert-import-page .p-info {
            background: var(--blue-dim);
            color: var(--blue-t);
            border: 1px solid #1a3a6a;
          }

          .cert-import-page .p-pass {
            background: var(--green-bg);
            color: var(--green-t);
            border: 1px solid var(--green-b);
          }

          .cert-import-page .p-fail {
            background: var(--red-bg);
            color: var(--red-t);
            border: 1px solid var(--red-b);
          }

          .cert-import-page .p-cond {
            background: var(--amber-bg);
            color: var(--amber-t);
            border: 1px solid var(--amber-b);
          }

          .cert-import-page .p-ok {
            background: var(--green-bg);
            color: var(--green-t);
            border: 1px solid var(--green-b);
          }

          .cert-import-page .p-err {
            background: var(--red-bg);
            color: var(--red-t);
            border: 1px solid var(--red-b);
          }

          .cert-import-page .p-neutral {
            background: var(--s3);
            color: var(--sub);
            border: 1px solid var(--b2);
          }

          .cert-import-page .cert-num {
            font-size: 10px;
            font-family: "IBM Plex Mono", monospace;
            color: var(--green-t);
            background: var(--green-bg);
            border: 1px solid var(--green-b);
            border-radius: 5px;
            padding: 2px 8px;
            font-weight: 700;
          }

          .cert-import-page .rbody {
            padding: 16px 18px;
          }

          .cert-import-page .kv-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 12px;
          }

          .cert-import-page .kv {
            background: var(--s2);
            border: 1px solid var(--b1);
            border-radius: var(--r);
            padding: 9px 11px;
          }

          .cert-import-page .kv-lbl {
            font-size: 10px;
            color: var(--hint);
            margin-bottom: 3px;
            letter-spacing: 0.05em;
          }

          .cert-import-page .kv-val {
            font-size: 12px;
            font-weight: 600;
            color: var(--text);
          }

          .cert-import-page .strip {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            padding: 10px 12px;
            background: var(--s2);
            border: 1px solid var(--b1);
            border-radius: var(--r);
            margin-bottom: 12px;
          }

          .cert-import-page .strip-lbl {
            font-size: 10px;
            color: var(--hint);
            margin-bottom: 2px;
          }

          .cert-import-page .strip-val {
            font-size: 11px;
            font-weight: 600;
            color: var(--text);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .cert-import-page .two-fields {
            display: grid;
            grid-template-columns: 1fr 1.6fr;
            gap: 10px;
            margin-bottom: 12px;
          }

          .cert-import-page .field-lbl {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: var(--hint);
            margin-bottom: 5px;
            display: block;
          }

          .cert-import-page .sel {
            padding: 8px 10px;
            border-radius: var(--r);
            border: 1px solid var(--b1);
            background: var(--s2);
            color: var(--text);
            font-size: 12px;
            outline: none;
            width: 100%;
            font-family: inherit;
            cursor: pointer;
          }

          .cert-import-page .sel:disabled {
            opacity: 0.45;
          }

          .cert-import-page .sel:focus {
            border-color: var(--blue);
          }

          .cert-import-page .ta {
            padding: 8px 10px;
            border-radius: var(--r);
            border: 1px solid var(--b1);
            background: var(--s2);
            color: var(--text);
            font-size: 12px;
            outline: none;
            width: 100%;
            font-family: inherit;
            resize: vertical;
            min-height: 64px;
            line-height: 1.5;
          }

          .cert-import-page .ta:disabled {
            opacity: 0.45;
          }

          .cert-import-page .ta:focus {
            border-color: var(--blue);
          }

          .cert-import-page .raw-sum {
            font-size: 11px;
            color: var(--hint);
            line-height: 1.65;
            margin-bottom: 10px;
            padding: 10px 12px;
            background: var(--s2);
            border-radius: var(--r);
            border-left: 2px solid var(--b3);
          }

          .cert-import-page .err-box {
            background: var(--red-bg);
            border: 1px solid var(--red-b);
            border-radius: var(--r);
            padding: 12px 14px;
            margin-bottom: 10px;
          }

          .cert-import-page .err-title {
            font-size: 12px;
            font-weight: 600;
            color: var(--red-t);
            margin-bottom: 4px;
          }

          .cert-import-page .err-detail {
            font-size: 11px;
            color: #f87171;
            line-height: 1.6;
          }

          .cert-import-page .save-err {
            background: var(--red-bg);
            border: 1px solid var(--red-b);
            border-radius: var(--r);
            padding: 8px 12px;
            font-size: 11px;
            color: var(--red-t);
            margin-bottom: 10px;
          }

          .cert-import-page .rfoot {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            padding-top: 10px;
            border-top: 1px solid var(--b1);
            margin-top: 2px;
          }

          .cert-import-page .expand-btn {
            background: none;
            border: none;
            color: var(--hint);
            font-size: 11px;
            cursor: pointer;
            padding: 0;
            font-family: inherit;
            text-decoration: underline;
            text-underline-offset: 2px;
          }

          .cert-import-page .expand-btn:hover {
            color: var(--sub);
          }

          .cert-import-page .foot-actions {
            display: flex;
            gap: 6px;
            align-items: center;
            flex-wrap: wrap;
          }

          .cert-import-page .view-btn {
            padding: 6px 12px;
            border-radius: var(--r);
            border: 1px solid var(--blue-dim);
            background: transparent;
            color: var(--blue-t);
            font-size: 11px;
            cursor: pointer;
            font-family: inherit;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
          }

          .cert-import-page .edit-btn {
            padding: 6px 12px;
            border-radius: var(--r);
            border: 1px solid var(--amber-b);
            background: var(--amber-bg);
            color: var(--amber-t);
            font-size: 11px;
            cursor: pointer;
            font-family: inherit;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
          }

          .cert-import-page .drawer {
            border-top: 1px solid var(--b1);
            background: var(--bg);
            padding: 14px 18px;
          }

          .cert-import-page .drawer-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 7px;
          }

          .cert-import-page .dc {
            background: var(--s1);
            border: 1px solid var(--b1);
            border-radius: var(--r);
            padding: 8px 10px;
          }

          .cert-import-page .dc-k {
            font-size: 10px;
            color: var(--hint);
            margin-bottom: 3px;
            text-transform: capitalize;
            letter-spacing: 0.03em;
          }

          .cert-import-page .dc-v {
            font-size: 11px;
            font-weight: 600;
            color: var(--text);
            word-break: break-word;
            line-height: 1.4;
          }

          .cert-import-page .spinner {
            display: inline-block;
            width: 11px;
            height: 11px;
            border: 2px solid var(--b3);
            border-top-color: var(--blue-t);
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
            vertical-align: middle;
            margin-right: 4px;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          @media (max-width: 780px) {
            .cert-import-page .layout {
              grid-template-columns: 1fr;
            }
            .cert-import-page .stats {
              grid-template-columns: repeat(2, 1fr);
            }
            .cert-import-page .kv-grid,
            .cert-import-page .strip {
              grid-template-columns: repeat(2, 1fr);
            }
            .cert-import-page .two-fields {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </AppLayout>
  );
}
