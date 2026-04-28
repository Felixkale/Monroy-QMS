// ─────────────────────────────────────────────────────────────────────────────
// FILE: src/app/certificates/import/HookRopeMode.jsx
//
// This is a self-contained component. Import it in your import/page.jsx and
// add the tab as shown at the bottom of this file.
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// ── Constants ─────────────────────────────────────────────────────────────────
const INSPECTOR_NAME = "Moemedi Masupe";
const INSPECTOR_ID   = "700117910";
const MAX_FILE_SIZE  = 10 * 1024 * 1024;

// ── AI Prompt ─────────────────────────────────────────────────────────────────
const HOOK_ROPE_PROMPT = `You are an expert industrial inspection AI. Extract ALL data from this Hook & Rope Inspection Report / Certificate.

READ EVERY FIELD carefully — this is a Monroy (Pty) Ltd Hook & Rope Inspection Certificate.

Return ONLY valid JSON, no markdown, no extra text:
{
  "client_name": "",
  "location": "",
  "crane_make": "",
  "crane_serial": "",
  "crane_fleet": "",
  "crane_swl": "",
  "machine_hours": "",
  "inspection_date": "",
  "expiry_date": "",
  "report_number": "",
  "drum_main_condition": "",
  "drum_aux_condition": "",
  "rope_lay_main": "",
  "rope_lay_aux": "",
  "rope_diameter_main": "",
  "rope_diameter_aux": "",
  "rope_length_3x_main": "",
  "rope_length_3x_aux": "",
  "reduction_dia_main": "",
  "reduction_dia_aux": "",
  "core_protrusion_main": "",
  "core_protrusion_aux": "",
  "corrosion_main": "",
  "corrosion_aux": "",
  "broken_wires_main": "",
  "broken_wires_aux": "",
  "rope_kinks_main": "",
  "rope_kinks_aux": "",
  "other_defects_main": "",
  "other_defects_aux": "",
  "end_fittings_main": "",
  "end_fittings_aux": "",
  "serviceability_main": "",
  "serviceability_aux": "",
  "lower_limit_main": "",
  "lower_limit_aux": "",
  "damaged_strands_main": "",
  "damaged_strands_aux": "",
  "hook1_sn": "",
  "hook1_swl": "",
  "hook1_swl_marked": "",
  "hook1_safety_catch": "",
  "hook1_cracks": "",
  "hook1_swivel": "",
  "hook1_corrosion": "",
  "hook1_side_bending": "",
  "hook1_ab": "",
  "hook1_ac": "",
  "hook2_sn": "",
  "hook2_swl": "",
  "hook2_swl_marked": "",
  "hook2_safety_catch": "",
  "hook2_cracks": "",
  "hook2_swivel": "",
  "hook2_corrosion": "",
  "hook2_side_bending": "",
  "hook2_ab": "",
  "hook2_ac": "",
  "hook3_sn": "",
  "hook3_swl": "",
  "overall_result": "PASS",
  "defects_found": "",
  "comments": ""
}

READING RULES:
- inspection_date: the date the inspection was done e.g. "18/11/2025" → "2025-11-18"
- expiry_date: the expiry on the certificate e.g. "18/04/2026" → "2026-04-18"
- For Yes/No tick boxes: ticked on "Yes" column → "yes", ticked on "No" → "no"
- hook1_safety_catch: "safety catch fitted and in good condition" — yes or no
- hook1_cracks: "signs of cracks" — yes means cracks present (bad), no means no cracks (good)
- hook1_side_bending: yes means bending found (bad)
- drum condition: "Good", "Fair", "Poor", or "FAIL"
- overall_result: "PASS" unless fail indicators present or "Compliance Certificate NOT to be issued"`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function toBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function normalizeDate(raw) {
  if (!raw) return "";
  const s = String(raw).trim();
  if (!s || s === "—" || s === "-") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split("/").map(Number);
    return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }
  if (/^\d{1,2}\/\d{4}$/.test(s)) {
    const [m, y] = s.split("/").map(Number);
    return `${y}-${String(m).padStart(2,"0")}-${String(new Date(y,m,0).getDate()).padStart(2,"0")}`;
  }
  try { const d = new Date(s); if (!isNaN(d)) return d.toISOString().slice(0,10); } catch(e) {}
  return "";
}

function addMonths(dateStr, months) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function pad5(n) { return String(n).padStart(5, "0"); }

function fileSizeLabel(f) {
  if (!f) return "";
  return f.size > 1048576 ? `${(f.size/1048576).toFixed(1)} MB` : `${Math.round(f.size/1024)} KB`;
}

function pillClass(r) {
  const v = String(r||"").toUpperCase();
  return v==="PASS" ? "p-pass" : v==="FAIL" ? "p-fail" : v==="CONDITIONAL" ? "p-cond" : "p-neutral";
}

async function fetchNextSeqBatch(count) {
  const { data, error } = await supabase.rpc("next_cert_seq_batch", { batch_size: count });
  if (error) throw new Error("Sequence RPC error: " + error.message);
  return data;
}

async function uploadPdfToStorage(file, certId, certNumber) {
  try {
    if (!file || file.type !== "application/pdf") return null;
    const safeCertNum = (certNumber || certId || "CERT").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeOriginal = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const { data, error } = await supabase.storage
      .from("certificates")
      .upload(`${safeCertNum}_${safeOriginal}`, file, { contentType:"application/pdf", upsert:true });
    if (error) return null;
    const { data: urlData } = supabase.storage.from("certificates").getPublicUrl(data.path);
    return urlData?.publicUrl || null;
  } catch (e) { return null; }
}

// ── Main Component ────────────────────────────────────────────────────────────
export function HookRopeMode() {
  const [file,       setFile]       = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [extracted,  setExtracted]  = useState(null);
  const [progress,   setProgressSt] = useState({ visible:false, pct:0, label:"" });
  const [error,      setError]      = useState("");
  const [saved,      setSaved]      = useState(null);
  const fileInputRef = useRef(null);

  function setProgress(pct, label) { setProgressSt({ visible:true, pct:Math.round(pct), label }); }

  function addFile(f) {
    if (!f) return;
    if (!f || (!f.type.startsWith("image/") && f.type !== "application/pdf") || f.size > MAX_FILE_SIZE) {
      setError("File must be PDF or image under 10 MB"); return;
    }
    setFile(f); setExtracted(null); setSaved(null); setError("");
  }

  async function handleExtract() {
    if (!file || extracting) return;
    setExtracting(true); setError(""); setExtracted(null); setSaved(null);
    setProgress(10, "Reading file…");
    try {
      const base64 = await toBase64(file);
      setProgress(40, "AI extracting Hook & Rope data…");
      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          files: [{ fileName:file.name, mimeType:file.type||"application/pdf", base64Data:base64 }],
          systemPrompt: HOOK_ROPE_PROMPT,
          mode: "hookrope",  // uses HOOK_ROPE_SCHEMA — all 60 fields returned reliably
        }),
      });
      setProgress(80, "Parsing fields…");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Server error ${res.status}`);
      const result = json.results?.[0];
      if (!result?.ok || !result?.data) throw new Error(result?.error || "Extraction returned no data");
      const d = result.data;
      d.inspection_date = normalizeDate(d.inspection_date);
      d.expiry_date     = normalizeDate(d.expiry_date);
      setExtracted(d);
      setProgress(100, "Extraction complete");
    } catch (e) {
      setError(e.message || "Extraction failed");
      setProgress(100, "Failed");
    } finally { setExtracting(false); }
  }

  async function handleSave() {
    if (!extracted || saving) return;
    setSaving(true); setError("");
    try {
      const d       = extracted;
      const iDate   = d.inspection_date || new Date().toISOString().split("T")[0];
      const expDate = d.expiry_date || addMonths(iDate, 6);
      const folderId   = crypto.randomUUID();
      const folderName = `HookRope-${d.crane_serial||"IMPORT"}-${iDate}`;

      const seqNums = await fetchNextSeqBatch(2);
      const certHK  = `CERT-HK${pad5(seqNums[0])}`;
      const certRP  = `CERT-RP${pad5(seqNums[1])}`;

      // ── HOOK notes — formatted exactly as HookRopePage reads ──────────────
      const hookNotes = [
        `Latch: ${d.hook1_safety_catch === "yes" ? "PASS" : "FAIL"}`,
        `Structural: ${d.hook1_cracks === "yes" ? "FAIL" : "PASS"}`,
        d.hook1_swl       ? `Hook 1 SWL: ${d.hook1_swl}`      : "",
        d.hook1_sn        ? `Hook 1 SN: ${d.hook1_sn}`         : "",
        d.hook1_ab        ? `Hook AB: ${d.hook1_ab}`            : "",
        d.hook1_ac        ? `Hook AC: ${d.hook1_ac}`            : "",
        d.hook2_swl       ? `Hook 2 SWL: ${d.hook2_swl}`      : "",
        d.hook2_sn        ? `Hook 2 SN: ${d.hook2_sn}`         : "",
        d.rope_diameter_main ? `Rope dia: ${d.rope_diameter_main}mm` : "",
        `Broken wires: ${d.broken_wires_main || "none"}`,
        `Corrosion: ${d.corrosion_main || "none"}`,
        `Kinks: ${d.rope_kinks_main || "none"}`,
        d.comments      ? `Notes: ${d.comments}`    : "",
        d.defects_found ? `Defects: ${d.defects_found}` : "",
      ].filter(Boolean).join(" | ");

      // ── ROPE notes — formatted exactly as HookRopePage reads ──────────────
      const ropeNotes = [
        d.rope_diameter_main   ? `Rope dia: ${d.rope_diameter_main}mm`       : "",
        `Broken wires: ${d.broken_wires_main || "none"}`,
        `Corrosion: ${d.corrosion_main || "none"}`,
        `Kinks: ${d.rope_kinks_main || "none"}`,
        `End fittings: ${d.end_fittings_main || "none"}`,
        `Serviceability: ${d.serviceability_main || "Good"}`,
        `Drum: ${d.drum_main_condition || "Good"}`,
        `Rope lay: ${d.rope_lay_main || "Good"}`,
        d.rope_diameter_aux    ? `Aux dia: ${d.rope_diameter_aux}mm`         : "",
        `Aux drum: ${d.drum_aux_condition || "Good"}`,
        d.drum_main_condition  ? `Drum main: ${d.drum_main_condition}`       : "",
        d.drum_aux_condition   ? `Drum aux: ${d.drum_aux_condition}`         : "",
        d.rope_lay_main        ? `Lay main: ${d.rope_lay_main}`              : "",
        d.rope_lay_aux         ? `Lay aux: ${d.rope_lay_aux}`                : "",
        d.reduction_dia_main   ? `Reduction: ${d.reduction_dia_main}`        : "",
        d.core_protrusion_main ? `Core protrusion: ${d.core_protrusion_main}`: "",
        d.lower_limit_main     ? `Lower limit: ${d.lower_limit_main}`        : "",
        d.comments             ? `Notes: ${d.comments}`                      : "",
      ].filter(Boolean).join(" | ");

      const overallResult = String(d.overall_result || "PASS").toUpperCase();

      const base = {
        serial_number:       d.crane_serial  || null,
        fleet_number:        d.crane_fleet   || null,
        model:               d.crane_make    || null,
        swl:                 d.hook1_swl     || d.crane_swl || null,
        client_name:         d.client_name   || null,
        location:            d.location      || null,
        issue_date:          iDate,
        inspection_date:     iDate,
        expiry_date:         expDate,
        next_inspection_due: expDate,
        inspector_name:      INSPECTOR_NAME,
        inspector_id:        INSPECTOR_ID,
        certificate_type:    "Load Test Certificate",
        folder_id:           folderId,
        folder_name:         folderName,
        result:              overallResult,
      };

      const certs = [
        {
          ...base,
          certificate_number:   certHK,
          equipment_type:       "Crane Hook",
          equipment_description:`Crane Hook & Wire Rope — SWL ${d.hook1_swl||d.crane_swl||""} — ${d.crane_make||"Mobile Crane"} SN ${d.crane_serial||""}`,
          defects_found:        d.defects_found || null,
          folder_position:      1,
          notes:                hookNotes,
        },
        {
          ...base,
          certificate_number:   certRP,
          equipment_type:       "Wire Rope",
          equipment_description:`Wire Rope Ø${d.rope_diameter_main||"?"}mm — ${d.crane_make||"Mobile Crane"} SN ${d.crane_serial||""}`,
          capacity_volume:      d.rope_diameter_main ? `Ø${d.rope_diameter_main}mm` : null,
          defects_found:        d.defects_found || null,
          folder_position:      2,
          notes:                ropeNotes,
        },
      ];

      const { data: inserted, error: dbErr } = await supabase
        .from("certificates").insert(certs)
        .select("id,certificate_number,equipment_type,result,expiry_date");

      if (dbErr) throw new Error("Save failed: " + dbErr.message);

      // upload original PDF linked to both certs
      if (file && file.type === "application/pdf") {
        for (const cert of (inserted || [])) {
          const url = await uploadPdfToStorage(file, cert.id, cert.certificate_number);
          if (url) await supabase.from("certificates").update({ pdf_url:url }).eq("id", cert.id);
        }
      }

      setSaved({ certs: inserted, folderId, folderName });
    } catch (e) {
      setError(e.message || "Save failed");
    } finally { setSaving(false); }
  }

  const d = extracted;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:"grid", gap:14 }}>

      {/* info banner */}
      <div style={{ background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.25)",
        borderRadius:12, padding:"12px 16px", fontSize:12, color:"var(--sub)", lineHeight:1.7 }}>
        <strong style={{ color:"var(--amber-t)" }}>🪝 Hook &amp; Rope Import</strong> — Upload an existing
        Hook &amp; Rope inspection certificate (PDF or photo). AI extracts all fields and saves as{" "}
        <strong style={{ color:"var(--text)" }}>CERT-HK##### + CERT-RP#####</strong> using the exact
        Monroy certificate template. Both certificates expire{" "}
        <strong style={{ color:"var(--amber-t)" }}>6 months</strong> from inspection date.
      </div>

      {/* upload */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Upload Hook &amp; Rope Certificate</div>
            <div className="card-sub">PDF or image · Monroy HR format · Gulfstream · any standard format</div>
          </div>
          {file && (
            <button className="btn-remove" type="button"
              onClick={() => { setFile(null); setExtracted(null); setSaved(null); setError("");
                if (fileInputRef.current) fileInputRef.current.value = ""; }}>
              ✕ Clear
            </button>
          )}
        </div>
        <div className="card-body">
          <div className={`drop-area${file ? " drag" : ""}`}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); addFile(e.dataTransfer.files?.[0]); }}>
            <input ref={fileInputRef} type="file" accept=".pdf,image/*"
              onChange={e => addFile(e.target.files?.[0])}/>
            {file ? (
              <div style={{ display:"flex", alignItems:"center", gap:12, justifyContent:"center" }}>
                <div className="q-icon" style={{ width:40, height:40 }}>
                  {file.type === "application/pdf" ? "PDF" : "IMG"}
                </div>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"var(--text)" }}>{file.name}</div>
                  <div style={{ fontSize:11, color:"var(--hint)" }}>{fileSizeLabel(file)}</div>
                </div>
              </div>
            ) : (
              <>
                <div className="drop-icon-ring">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3v13M6 9l6-6 6 6" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 20h18" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="drop-h">Drop Hook &amp; Rope certificate here</div>
                <div className="drop-p">PDF or photo — any Monroy HR format</div>
                <div className="type-chips">
                  <span className="chip">PDF</span><span className="chip">PNG</span><span className="chip">JPG</span>
                </div>
              </>
            )}
          </div>

          <div className="action-row">
            <button className="btn btn-ghost" type="button"
              onClick={() => { setFile(null); setExtracted(null); setSaved(null); setError(""); }}>
              Clear
            </button>
            <button className="btn-amber" type="button" onClick={handleExtract}
              disabled={!file || extracting}
              style={{ background:"#92400e", borderColor:"#b45309", color:"#fef3c7",
                flex:1, fontWeight:600, display:"inline-flex", alignItems:"center",
                justifyContent:"center", gap:6, padding:"9px 16px", borderRadius:"var(--r)",
                border:"1px solid", cursor:"pointer", fontSize:12, fontFamily:"inherit",
                opacity: (!file || extracting) ? 0.35 : 1 }}>
              {extracting
                ? <><span className="spinner"/>Extracting…</>
                : "⚡ Extract with AI"}
            </button>
          </div>

          {progress.visible && (
            <div className="prog-wrap">
              <div className="prog-meta">
                <span>{progress.label}</span>
                <span className="prog-pct">{progress.pct}%</span>
              </div>
              <div className="prog-track">
                <div className="prog-fill" style={{ width:`${progress.pct}%`, background:"var(--amber)" }}/>
              </div>
            </div>
          )}

          {error && (
            <div className="err-box" style={{ marginTop:12 }}>
              <div className="err-title">⚠ {error}</div>
              <div className="err-detail">Check file quality and try again.</div>
            </div>
          )}
        </div>
      </div>

      {/* extracted preview */}
      {d && !saved && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">✓ Extracted Data — Review before saving</div>
              <div className="card-sub">Both certificates will be generated from this data.</div>
            </div>
            <span className={`pill ${pillClass(d.overall_result || "PASS")}`}>
              {d.overall_result || "PASS"}
            </span>
          </div>
          <div className="card-body">

            {/* Crane details */}
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:".1em", textTransform:"uppercase",
              color:"var(--amber-t)", margin:"0 0 8px", paddingLeft:10, borderLeft:"3px solid var(--amber)" }}>
              Crane &amp; Job Details
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:8, marginBottom:16 }}>
              {[
                ["Client",          d.client_name],
                ["Location",        d.location],
                ["Crane Make",      d.crane_make],
                ["Serial Number",   d.crane_serial],
                ["Fleet Number",    d.crane_fleet],
                ["Crane SWL",       d.crane_swl],
                ["Machine Hours",   d.machine_hours],
                ["Inspection Date", d.inspection_date],
                ["Expiry Date",     d.expiry_date],
                ["Report No.",      d.report_number],
              ].map(([l, v]) => (
                <div key={l} style={{ background:"var(--s2)", border:"1px solid var(--b1)",
                  borderRadius:"var(--r)", padding:"9px 12px" }}>
                  <div style={{ fontSize:10, color:"var(--hint)", marginBottom:3,
                    textTransform:"uppercase", letterSpacing:".06em" }}>{l}</div>
                  <div style={{ fontSize:12, fontWeight:700,
                    color: v ? "var(--text)" : "var(--hint)" }}>{v || "—"}</div>
                </div>
              ))}
            </div>

            {/* Hook details */}
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:".1em", textTransform:"uppercase",
              color:"var(--amber-t)", margin:"0 0 8px", paddingLeft:10, borderLeft:"3px solid var(--amber)" }}>
              Hook Inspection
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:8, marginBottom:16 }}>
              {[
                ["Hook 1 SWL",     d.hook1_swl],
                ["Hook 1 SN",      d.hook1_sn],
                ["Safety Catch",   d.hook1_safety_catch],
                ["Cracks",         d.hook1_cracks],
                ["Swivel OK",      d.hook1_swivel],
                ["Side Bending",   d.hook1_side_bending],
                ["A–B (mm)",       d.hook1_ab],
                ["A–C (mm)",       d.hook1_ac],
                ["Hook 2 SWL",     d.hook2_swl],
                ["Hook 2 SN",      d.hook2_sn],
              ].map(([l, v]) => (
                <div key={l} style={{ background:"var(--s2)", border:"1px solid var(--b1)",
                  borderRadius:"var(--r)", padding:"9px 12px" }}>
                  <div style={{ fontSize:10, color:"var(--hint)", marginBottom:3,
                    textTransform:"uppercase", letterSpacing:".06em" }}>{l}</div>
                  <div style={{ fontSize:12, fontWeight:700,
                    color: v ? "var(--text)" : "var(--hint)" }}>{v || "—"}</div>
                </div>
              ))}
            </div>

            {/* Rope details */}
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:".1em", textTransform:"uppercase",
              color:"#c4b5fd", margin:"0 0 8px", paddingLeft:10, borderLeft:"3px solid #7c3aed" }}>
              Wire Rope Inspection
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:8, marginBottom:16 }}>
              {[
                ["Rope Dia (Main)",  d.rope_diameter_main],
                ["Rope Dia (Aux)",   d.rope_diameter_aux],
                ["Drum (Main)",      d.drum_main_condition],
                ["Drum (Aux)",       d.drum_aux_condition],
                ["Rope Lay (Main)",  d.rope_lay_main],
                ["Broken Wires",     d.broken_wires_main],
                ["Corrosion",        d.corrosion_main],
                ["Kinks",            d.rope_kinks_main],
                ["End Fittings",     d.end_fittings_main],
                ["Serviceability",   d.serviceability_main],
              ].map(([l, v]) => (
                <div key={l} style={{ background:"var(--s2)", border:"1px solid var(--b1)",
                  borderRadius:"var(--r)", padding:"9px 12px" }}>
                  <div style={{ fontSize:10, color:"var(--hint)", marginBottom:3,
                    textTransform:"uppercase", letterSpacing:".06em" }}>{l}</div>
                  <div style={{ fontSize:12, fontWeight:700,
                    color: v ? "var(--text)" : "var(--hint)" }}>{v || "—"}</div>
                </div>
              ))}
            </div>

            {/* Certificates to be created */}
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:".1em", textTransform:"uppercase",
              color:"var(--accent)", margin:"0 0 10px", paddingLeft:10, borderLeft:"3px solid var(--accent)" }}>
              Certificates to be Generated
            </div>
            {[
              { icon:"🪝", label:"CERT-HK##### — Crane Hook",
                desc:`Hook & Wire Rope · SWL ${d.hook1_swl||d.crane_swl||"—"} · SN ${d.crane_serial||"—"}`,
                expiry: d.expiry_date || addMonths(d.inspection_date, 6),
                borderColor:"var(--amber-b)", bg:"var(--amber-bg)", textColor:"var(--amber-t)" },
              { icon:"🪢", label:"CERT-RP##### — Wire Rope",
                desc:`Wire Rope Ø${d.rope_diameter_main||"?"}mm · ${d.crane_make||""} SN ${d.crane_serial||"—"}`,
                expiry: d.expiry_date || addMonths(d.inspection_date, 6),
                borderColor:"#4c1d95", bg:"#1a0a40", textColor:"#c4b5fd" },
            ].map((row, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12,
                padding:"13px 16px", borderRadius:"var(--rl)", marginBottom:10,
                border:`1px solid ${row.borderColor}`, background:row.bg, flexWrap:"wrap" }}>
                <div style={{ fontSize:20 }}>{row.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:row.textColor }}>{row.label}</div>
                  <div style={{ fontSize:11, color:"var(--sub)", marginTop:2 }}>{row.desc}</div>
                </div>
                <div style={{ fontSize:11, color:"var(--hint)" }}>
                  Expires: <strong style={{ color:"var(--text)" }}>{row.expiry || "6 months"}</strong>
                </div>
              </div>
            ))}

            {error && <div className="save-err" style={{ marginBottom:10 }}>{error}</div>}

            <div style={{ display:"flex", gap:10, marginTop:6 }}>
              <button className="btn" type="button"
                onClick={() => { setExtracted(null); setProgressSt({ visible:false, pct:0, label:"" }); }}>
                ← Re-extract
              </button>
              <button className="btn-saveall" type="button" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><span className="spinner"/>Saving…</>
                  : "🪝 Save as 2 Certificates"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* saved */}
      {saved && (
        <div className="card" style={{ border:"1px solid var(--green-b)" }}>
          <div className="card-body" style={{ textAlign:"center", padding:28 }}>
            <div style={{ fontSize:36, marginBottom:10 }}>✅</div>
            <div style={{ fontSize:18, fontWeight:900, color:"var(--green-t)", marginBottom:6 }}>
              Hook &amp; Rope Import Complete
            </div>
            <div style={{ fontSize:13, color:"var(--sub)", marginBottom:16 }}>
              2 certificates saved — both expire 6 months from inspection date
            </div>
            <div style={{ display:"grid", gap:10, maxWidth:600, margin:"0 auto 20px" }}>
              {(saved.certs || []).map(c => (
                <div key={c.id} style={{ display:"flex", alignItems:"center", gap:12,
                  padding:"11px 14px", borderRadius:10, flexWrap:"wrap",
                  border:`1px solid ${c.equipment_type==="Crane Hook"?"var(--amber-b)":"#4c1d95"}`,
                  background: c.equipment_type==="Crane Hook" ? "var(--amber-bg)" : "#1a0a40" }}>
                  <div style={{ fontSize:16 }}>{c.equipment_type==="Crane Hook"?"🪝":"🪢"}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontFamily:"'IBM Plex Mono',monospace", fontWeight:800,
                      color: c.equipment_type==="Crane Hook" ? "var(--amber-t)" : "#c4b5fd" }}>
                      {c.certificate_number}
                    </div>
                    <div style={{ fontSize:11, color:"var(--sub)", marginTop:1 }}>
                      {c.equipment_type} · Expires {c.expiry_date}
                    </div>
                  </div>
                  <span className={`pill ${pillClass(c.result)}`}>{c.result}</span>
                  <Link href={`/certificates/${c.id}`} className="view-btn">View →</Link>
                  <button type="button" className="btn" style={{ fontSize:11, padding:"5px 10px" }}
                    onClick={() => window.open(`/certificates/print/${c.id}`, "_blank")}>
                    Print
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
              <button className="btn" type="button"
                onClick={() => {
                  setFile(null); setExtracted(null); setSaved(null); setError("");
                  setProgressSt({ visible:false, pct:0, label:"" });
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}>
                Import Another
              </button>
              <button className="btn-saveall" type="button"
                onClick={() => {
                  const ids = saved.certs.map(c => c.id).join(",");
                  window.open(`/bulk-print?ids=${ids}`, "_blank");
                }}>
                🖨 Print Both
              </button>
              <Link href="/certificates" className="nav-btn nav-btn-primary">
                View All Certificates →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOW TO WIRE INTO YOUR EXISTING import/page.jsx
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. IMPORT at the top of import/page.jsx:
//    import { HookRopeMode } from "./HookRopeMode";
//
// 2. ADD the tab to your mode-toggle section (after the list mode button):
//    <button type="button"
//      className={`mode-btn${mode==="hookrope"?" active":""}`}
//      onClick={()=>setMode("hookrope")}>
//      🪝 Hook &amp; Rope
//      <span className="mode-sub">Import Hook &amp; Rope PDF → 2 certificates</span>
//    </button>
//
// 3. ADD to the render branch (alongside the existing mode checks):
//    {mode==="hookrope" && <HookRopeMode/>}
//
// That's it — no other changes needed.
// ─────────────────────────────────────────────────────────────────────────────
