// src/app/certificates/import/page.jsx
"use client";

import { Suspense, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const T = {
  bg:"#070e18",surface:"rgba(13,22,38,0.80)",panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)",border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff",textMid:"rgba(240,246,255,0.72)",textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee",accentDim:"rgba(34,211,238,0.10)",accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399",greenDim:"rgba(52,211,153,0.10)",greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",  redDim:"rgba(248,113,113,0.10)",  redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24",amberDim:"rgba(251,191,36,0.10)", amberBrd:"rgba(251,191,36,0.25)",
  blue:"#60a5fa", blueDim:"rgba(96,165,250,0.10)",  blueBrd:"rgba(96,165,250,0.25)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@500&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  input::placeholder,textarea::placeholder{color:rgba(240,246,255,0.28)}
  select option{background:#0a1420;color:#f0f6ff}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}

  .bi-root{min-height:100vh;background:radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.05),transparent) #070e18;color:#f0f6ff;font-family:'IBM Plex Sans',sans-serif;padding:20px}
  .bi-inner{max-width:1380px;margin:0 auto;display:grid;gap:14px}

  /* Stats row */
  .bi-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}

  /* Two-panel layout */
  .bi-panels{display:grid;grid-template-columns:340px 1fr;gap:14px;align-items:start}

  /* Upload zone */
  .bi-dropzone{border:1.5px dashed rgba(148,163,184,0.18);border-radius:14px;padding:28px 18px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;background:rgba(255,255,255,0.012)}
  .bi-dropzone.dragging{border-color:#22d3ee;background:rgba(34,211,238,0.06)}
  .bi-file-chip{display:inline-flex;align-items:center;padding:3px 9px;border-radius:6px;border:1px solid rgba(148,163,184,0.15);background:rgba(255,255,255,0.04);font-size:10px;font-weight:700;color:rgba(240,246,255,0.55);letter-spacing:0.06em}

  /* Result cards */
  .bi-card{background:rgba(10,18,32,0.92);border:1px solid rgba(148,163,184,0.12);border-radius:14px;overflow:hidden;margin-bottom:10px}
  .bi-card-hdr{display:grid;grid-template-columns:auto 1fr auto auto auto;gap:8px;align-items:center;padding:11px 14px;border-bottom:1px solid rgba(148,163,184,0.10);cursor:pointer}
  .bi-field-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0}
  .bi-field-cell{padding:10px 13px;border-right:1px solid rgba(148,163,184,0.08);border-bottom:1px solid rgba(148,163,184,0.08)}
  .bi-field-cell:nth-child(4n){border-right:none}
  .bi-badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:6px;font-size:10px;font-weight:800;letter-spacing:0.06em;white-space:nowrap}

  /* Progress bar */
  .bi-progress-track{height:4px;background:rgba(148,163,184,0.10);border-radius:99px;overflow:hidden}
  .bi-progress-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#22d3ee,#34d399);transition:width .4s ease}

  /* Input / select */
  .bi-input{width:100%;padding:8px 11px;border-radius:8px;border:1px solid rgba(148,163,184,0.12);background:rgba(18,30,50,0.70);color:#f0f6ff;font-size:12px;font-weight:500;outline:none;font-family:'IBM Plex Sans',sans-serif;WebkitAppearance:none;appearance:none}
  .bi-input:focus{border-color:rgba(34,211,238,0.35);box-shadow:0 0 0 3px rgba(34,211,238,0.06)}
  .bi-textarea{width:100%;padding:8px 11px;border-radius:8px;border:1px solid rgba(148,163,184,0.12);background:rgba(18,30,50,0.70);color:#f0f6ff;font-size:12px;font-weight:500;outline:none;font-family:'IBM Plex Sans',sans-serif;resize:vertical;min-height:60px}
  .bi-textarea:focus{border-color:rgba(34,211,238,0.35);box-shadow:0 0 0 3px rgba(34,211,238,0.06)}

  /* Buttons */
  .btn-primary{padding:9px 18px;border-radius:9px;border:none;background:linear-gradient(135deg,#22d3ee,#60a5fa);color:#001018;font-weight:900;font-size:12px;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;white-space:nowrap;min-height:36px;display:inline-flex;align-items:center;gap:6px;WebkitTapHighlightColor:transparent;transition:opacity .15s}
  .btn-primary:disabled{opacity:0.4;cursor:not-allowed}
  .btn-ghost{padding:9px 14px;border-radius:9px;border:1px solid rgba(148,163,184,0.15);background:rgba(255,255,255,0.04);color:rgba(240,246,255,0.65);font-weight:700;font-size:12px;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;min-height:36px;display:inline-flex;align-items:center;gap:5px;WebkitTapHighlightColor:transparent;transition:background .15s}
  .btn-ghost:hover{background:rgba(255,255,255,0.07)}
  .btn-green{padding:9px 18px;border-radius:9px;border:none;background:linear-gradient(135deg,#34d399,#14b8a6);color:#052e16;font-weight:900;font-size:12px;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;white-space:nowrap;min-height:36px;display:inline-flex;align-items:center;gap:6px;WebkitTapHighlightColor:transparent;transition:opacity .15s}
  .btn-green:disabled{opacity:0.4;cursor:not-allowed}

  @media(max-width:900px){
    .bi-panels{grid-template-columns:1fr}
    .bi-stats{grid-template-columns:repeat(2,1fr)}
    .bi-field-grid{grid-template-columns:repeat(2,1fr)}
    .bi-field-cell:nth-child(2n){border-right:none}
    .bi-field-cell:nth-child(4n){border-right:1px solid rgba(148,163,184,0.08)}
    .bi-field-cell:nth-child(4n+2){border-right:none}
    .bi-root{padding:12px}
  }
  @media(max-width:500px){
    .bi-stats{grid-template-columns:repeat(2,1fr)}
    .bi-field-grid{grid-template-columns:1fr 1fr}
    .bi-card-hdr{grid-template-columns:auto 1fr;flex-wrap:wrap}
  }
`;

const IS_LABEL = {display:"block",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(240,246,255,0.38)",marginBottom:4};

const RESULT_COLORS = {
  PASS:    {bg:"rgba(52,211,153,0.12)",  border:"rgba(52,211,153,0.25)",  text:"#34d399"},
  FAIL:    {bg:"rgba(248,113,113,0.12)", border:"rgba(248,113,113,0.25)", text:"#f87171"},
  UNKNOWN: {bg:"rgba(251,191,36,0.12)",  border:"rgba(251,191,36,0.25)",  text:"#fbbf24"},
  REPAIR_REQUIRED: {bg:"rgba(251,191,36,0.12)",border:"rgba(251,191,36,0.25)",text:"#fbbf24"},
  OUT_OF_SERVICE:  {bg:"rgba(248,113,113,0.12)",border:"rgba(248,113,113,0.25)",text:"#f87171"},
};

function ResultBadge({ result }) {
  const c = RESULT_COLORS[result] || RESULT_COLORS.UNKNOWN;
  return (
    <span className="bi-badge" style={{background:c.bg, border:`1px solid ${c.border}`, color:c.text}}>
      {result || "UNKNOWN"}
    </span>
  );
}

function OKBadge({ ok }) {
  return ok
    ? <span className="bi-badge" style={{background:"rgba(52,211,153,0.12)",border:"1px solid rgba(52,211,153,0.25)",color:"#34d399"}}>OK</span>
    : <span className="bi-badge" style={{background:"rgba(248,113,113,0.12)",border:"1px solid rgba(248,113,113,0.25)",color:"#f87171"}}>ERR</span>;
}

function FieldBadge({ count }) {
  return (
    <span className="bi-badge" style={{background:"rgba(96,165,250,0.10)",border:"1px solid rgba(96,165,250,0.22)",color:"#60a5fa"}}>
      {count} fields
    </span>
  );
}

function EquipBadge({ label }) {
  if (!label) return null;
  return (
    <span className="bi-badge" style={{background:"rgba(167,139,250,0.10)",border:"1px solid rgba(167,139,250,0.22)",color:"#a78bfa", maxWidth:180, overflow:"hidden", textOverflow:"ellipsis"}}>
      {label}
    </span>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{background:"rgba(10,18,32,0.92)",border:`1px solid rgba(148,163,184,0.12)`,borderRadius:12,padding:"16px 18px",borderTop:`2px solid ${color}`}}>
      <div style={{fontSize:9,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:"rgba(240,246,255,0.40)",marginBottom:6}}>{label}</div>
      <div style={{fontSize:28,fontWeight:900,color,lineHeight:1}}>{value}</div>
    </div>
  );
}

// Count non-null/empty fields
function countFields(extracted = {}) {
  return Object.values(extracted).filter(v => v !== null && v !== "" && v !== undefined).length;
}

function ResultCard({ item, idx, onUpdate, onSave }) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const ex = item.extracted || {};
  const fieldCount = countFields(ex);

  function upd(k) { return v => onUpdate(item.id, k, v); }

  const mainFields = [
    { label: "Certificate no.", key: "certificate_number", value: item.certificate_number || "Auto on save" },
    { label: "Equipment type",  key: "equipment_type",     value: item.equipment_type || ex.equipment_type || "—" },
    { label: "Inspection date", key: "issue_date",         value: item.issue_date || ex.issue_date || "—" },
    { label: "Expiry date",     key: "expiry_date",        value: item.expiry_date || ex.expiry_date || "—" },
    { label: "Equipment",       key: "equipment_description", value: item.equipment_description || ex.equipment_description || "—" },
    { label: "Client",          key: "client_name",        value: item.client_name || ex.client_name || "—" },
    { label: "Serial no.",      key: "serial_number",      value: item.serial_number || ex.serial_number || "—" },
    { label: "Location",        key: "equipment_location", value: item.equipment_location || ex.equipment_location || "—" },
  ];

  const extraFields = [
    { label: "Manufacturer",         key: "manufacturer" },
    { label: "Model",                key: "model" },
    { label: "Year Built",           key: "year_built" },
    { label: "Country of Origin",    key: "country_of_origin" },
    { label: "Equipment ID",         key: "equipment_id" },
    { label: "Identification No.",   key: "identification_number" },
    { label: "Inspection No.",       key: "inspection_no" },
    { label: "Lanyard Serial No.",   key: "lanyard_serial_no" },
    { label: "SWL",                  key: "swl" },
    { label: "MAWP",                 key: "mawp" },
    { label: "Capacity",             key: "capacity" },
    { label: "Design Pressure",      key: "design_pressure" },
    { label: "Test Pressure",        key: "test_pressure" },
    { label: "Inspector Name",       key: "inspector_name" },
    { label: "Inspector ID",         key: "inspector_id" },
    { label: "Legal Framework",      key: "legal_framework" },
  ];

  const notes = ex.remarks || ex.notes || ex.comments || item.remarks || "";
  const equipLabel = item.equipment_type || ex.equipment_type || "";

  return (
    <div className="bi-card">
      {/* Card header */}
      <div className="bi-card-hdr" onClick={() => setExpanded(e => !e)}>
        <div style={{width:22,height:22,borderRadius:6,background:"rgba(96,165,250,0.12)",border:"1px solid rgba(96,165,250,0.22)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:"#60a5fa",flexShrink:0}}>
          {idx + 1}
        </div>
        <div style={{fontSize:12,fontWeight:700,color:T.textMid,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {item.filename}
        </div>
        <FieldBadge count={fieldCount} />
        <EquipBadge label={equipLabel} />
        <ResultBadge result={item.result || "UNKNOWN"} />
        <OKBadge ok={!item.error} />
        <div style={{fontSize:12,color:T.textDim,paddingLeft:4}}>{expanded ? "▲" : "▼"}</div>
      </div>

      {expanded && (
        <div style={{padding:"0 0 14px"}}>
          {/* Main field grid */}
          <div className="bi-field-grid">
            {mainFields.map((f, i) => (
              <div className="bi-field-cell" key={f.key}>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(240,246,255,0.35)",marginBottom:3}}>{f.label}</div>
                <div style={{fontSize:12,fontWeight:600,color:T.text}}>{f.value || "—"}</div>
              </div>
            ))}
          </div>

          {/* AI notes */}
          {notes && (
            <div style={{margin:"10px 14px 0",padding:"9px 12px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(148,163,184,0.08)",borderRadius:8,fontSize:11,color:T.textDim,lineHeight:1.5}}>
              {notes}
            </div>
          )}

          {/* Show all fields toggle */}
          {showAll && (
            <div style={{padding:"10px 14px 0"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8}}>
                {extraFields.map(f => (
                  <div key={f.key}>
                    <label style={IS_LABEL}>{f.label}</label>
                    <input
                      className="bi-input"
                      value={item[f.key] || ex[f.key] || ""}
                      onChange={e => onUpdate(item.id, f.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result + defects + actions */}
          <div style={{padding:"12px 14px 0",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>
              <label style={IS_LABEL}>Inspection Result</label>
              <div style={{position:"relative"}}>
                <select
                  className="bi-input"
                  value={item.result || "UNKNOWN"}
                  onChange={e => onUpdate(item.id, "result", e.target.value)}
                  style={{paddingRight:28}}
                >
                  <option value="UNKNOWN">UNKNOWN</option>
                  <option value="PASS">PASS</option>
                  <option value="FAIL">FAIL</option>
                  <option value="REPAIR_REQUIRED">REPAIR REQUIRED</option>
                  <option value="OUT_OF_SERVICE">OUT OF SERVICE</option>
                </select>
                <span style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",color:T.textDim,fontSize:10,pointerEvents:"none"}}>▼</span>
              </div>
            </div>
            <div>
              <label style={IS_LABEL}>Defects Found</label>
              <textarea
                className="bi-textarea"
                rows={2}
                placeholder="Describe defects, cracks, wear, non-conformances..."
                value={item.defects || ""}
                onChange={e => onUpdate(item.id, "defects", e.target.value)}
              />
            </div>
          </div>

          {/* Footer actions */}
          <div style={{padding:"10px 14px 0",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <button
              type="button"
              onClick={() => setShowAll(s => !s)}
              style={{background:"none",border:"none",color:T.accent,fontSize:12,fontWeight:700,cursor:"pointer",padding:0,fontFamily:"'IBM Plex Sans',sans-serif"}}
            >
              {showAll ? "Hide extra fields ↑" : "Show all fields ↓"}
            </button>

            {item.saved ? (
              <span className="bi-badge" style={{background:"rgba(52,211,153,0.12)",border:"1px solid rgba(52,211,153,0.25)",color:"#34d399",fontSize:12}}>
                ✓ Saved
              </span>
            ) : (
              <button
                type="button"
                className="btn-green"
                disabled={item.saving}
                onClick={() => onSave(item.id)}
              >
                {item.saving ? "Saving…" : "Save to register"}
              </button>
            )}
          </div>

          {item.saveError && (
            <div style={{margin:"8px 14px 0",padding:"7px 10px",borderRadius:7,background:T.redDim,border:`1px solid ${T.redBrd}`,color:T.red,fontSize:11,fontWeight:700}}>
              ⚠ {item.saveError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Manual override defaults ──────────────────────────────────────
const DEFAULTS = {
  inspector_name: "Moemedi Masupe",
  inspector_id:   "700117910",
  legal_framework:"Mines, Quarries, Works and Machinery Act Cap 44:02",
};

let _uid = 0;
function uid() { return ++_uid; }

function ImportInner() {
  const router = useRouter();
  const dropRef  = useRef(null);
  const fileRef  = useRef(null);

  const [files,    setFiles]    = useState([]);   // raw File objects queued
  const [dragging, setDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState(0);   // 0-100

  const [results, setResults]   = useState([]);   // processed items
  const [overrides, setOverrides] = useState(DEFAULTS); // manual override fields
  const [showOverride, setShowOverride] = useState(false);

  // Stats
  const processed  = results.length;
  const successful = results.filter(r => !r.error).length;
  const errors     = results.filter(r =>  r.error).length;
  const passed     = results.filter(r => (r.result||"") === "PASS").length;

  // ── File handling ──────────────────────────────────────────────
  function addFiles(newFiles) {
    const valid = Array.from(newFiles).filter(f => {
      if (f.size > 10 * 1024 * 1024) return false;
      return /pdf|image/i.test(f.type);
    }).slice(0, 20 - files.length);
    setFiles(prev => [...prev, ...valid]);
  }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function handleDragOver(e) { e.preventDefault(); setDragging(true); }
  function handleDragLeave()  { setDragging(false); }

  // ── Extract ────────────────────────────────────────────────────
  async function handleExtract() {
    if (!files.length) return;
    setExtracting(true); setProgress(0);
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const itemId = uid();

      // Optimistically add a "scanning" placeholder
      setResults(prev => [...prev, {
        id: itemId, filename: file.name, scanning: true,
        extracted: null, error: null, result: "UNKNOWN",
        defects: "", saved: false, saving: false, saveError: "",
        ...DEFAULTS,
      }]);

      try {
        const body = new FormData();
        body.append("file", file);
        // apply manual overrides as hints
        body.append("overrides", JSON.stringify(overrides));

        const res  = await fetch("/api/certificates/import", { method: "POST", body });
        let json;
        try { json = await res.json(); }
        catch { throw new Error("Invalid server response — check GEMINI_API_KEY in Render.com env vars."); }
        if (!res.ok)     throw new Error(json?.error || `Server error ${res.status}`);
        if (!json.success) throw new Error(json?.error || "Extraction failed.");

        const ex = json.extracted || {};

        setResults(prev => prev.map(r => r.id !== itemId ? r : {
          ...r, scanning: false, extracted: ex,
          certificate_number:    ex.certificate_number    || "",
          certificate_type:      ex.certificate_type      || "Load Test Certificate",
          client_name:           ex.client_name           || "",
          equipment_description: ex.equipment_description || "",
          equipment_type:        ex.equipment_type        || "",
          equipment_location:    ex.equipment_location    || "",
          equipment_id:          ex.equipment_id          || "",
          identification_number: ex.identification_number || "",
          inspection_no:         ex.inspection_no         || "",
          lanyard_serial_no:     ex.lanyard_serial_no     || "",
          manufacturer:          ex.manufacturer          || "",
          model:                 ex.model                 || "",
          serial_number:         ex.serial_number         || "",
          year_built:            ex.year_built            || "",
          country_of_origin:     ex.country_of_origin     || "",
          swl:                   ex.swl                   || "",
          mawp:                  ex.mawp                  || "",
          capacity:              ex.capacity              || "",
          design_pressure:       ex.design_pressure       || "",
          test_pressure:         ex.test_pressure         || "",
          inspector_name:        ex.inspector_name        || overrides.inspector_name,
          inspector_id:          ex.inspector_id          || overrides.inspector_id,
          result:                ex.result                || "UNKNOWN",
          issue_date:            ex.issue_date            || "",
          expiry_date:           ex.expiry_date           || "",
          legal_framework:       ex.legal_framework       || overrides.legal_framework,
          remarks:               ex.remarks               || "",
          defects:               "",
        }));
      } catch (e) {
        setResults(prev => prev.map(r => r.id !== itemId ? r : {
          ...r, scanning: false, error: e?.message || "Extraction failed.",
        }));
      }

      setProgress(Math.round(((i + 1) / total) * 100));
    }

    setFiles([]);
    setExtracting(false);
  }

  // ── Update field ───────────────────────────────────────────────
  function handleUpdate(id, key, value) {
    setResults(prev => prev.map(r => r.id !== id ? r : { ...r, [key]: value }));
  }

  // ── Save single ────────────────────────────────────────────────
  async function handleSave(id) {
    const item = results.find(r => r.id === id);
    if (!item || item.saved) return;

    setResults(prev => prev.map(r => r.id !== id ? r : { ...r, saving: true, saveError: "" }));

    try {
      // Match or create client
      let clientId = null;
      if (item.client_name?.trim()) {
        const { data: clients } = await supabase.from("clients")
          .select("id,company_name")
          .ilike("company_name", item.client_name.trim())
          .limit(1);
        if (clients?.length) {
          clientId = clients[0].id;
        } else {
          const { data: newClient, error: ce } = await supabase.from("clients")
            .insert({ company_name: item.client_name.trim(), status: "active" })
            .select("id").single();
          if (!ce) clientId = newClient.id;
        }
      }

      let certNum = item.certificate_number?.trim();
      if (!certNum) {
        const base = (item.serial_number || item.equipment_id || "IMP").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12);
        certNum = `CERT-${base}-${Date.now().toString(36).toUpperCase()}`;
      }

      const payload = {
        certificate_number:    certNum,
        certificate_type:      item.certificate_type    || "Load Test Certificate",
        client_id:             clientId,
        client_name:           item.client_name         || null,
        company:               item.client_name         || null,
        equipment_description: item.equipment_description || null,
        equipment_type:        item.equipment_type      || null,
        equipment_location:    item.equipment_location  || null,
        equipment_id:          item.equipment_id        || null,
        identification_number: item.identification_number || null,
        inspection_no:         item.inspection_no       || null,
        lanyard_serial_no:     item.lanyard_serial_no   || null,
        manufacturer:          item.manufacturer        || null,
        model:                 item.model               || null,
        serial_number:         item.serial_number       || null,
        year_built:            item.year_built          || null,
        country_of_origin:     item.country_of_origin   || null,
        swl:                   item.swl                 || null,
        mawp:                  item.mawp                || null,
        capacity:              item.capacity            || null,
        design_pressure:       item.design_pressure     || null,
        test_pressure:         item.test_pressure       || null,
        inspector_name:        item.inspector_name      || "Moemedi Masupe",
        inspector_id:          item.inspector_id        || "700117910",
        result:                item.result              || "PASS",
        equipment_status:      item.result              || "PASS",
        issue_date:            item.issue_date          || null,
        issued_at:             item.issue_date ? new Date(item.issue_date).toISOString() : null,
        expiry_date:           item.expiry_date         || null,
        valid_to:              item.expiry_date         || null,
        next_inspection_date:  item.expiry_date         || null,
        legal_framework:       item.legal_framework     || "Mines, Quarries, Works and Machinery Act Cap 44:02",
        remarks:               item.remarks             || item.defects || null,
        comments:              item.defects             || item.remarks || null,
        logo_url:              "/logo.png",
        signature_url:         "/Signature.png",
        status:                "active",
        extracted_data:        item.extracted,
        detected_from_nameplate: true,
      };

      const { error: ie } = await supabase.from("certificates").insert(payload);
      if (ie) throw ie;

      setResults(prev => prev.map(r => r.id !== id ? r : { ...r, saving: false, saved: true }));
    } catch (e) {
      setResults(prev => prev.map(r => r.id !== id ? r : {
        ...r, saving: false, saveError: "Save failed: " + (e?.message || "Unknown error"),
      }));
    }
  }

  // ── Save all successful ────────────────────────────────────────
  async function handleSaveAll() {
    const toSave = results.filter(r => !r.error && !r.saved && !r.scanning);
    for (const r of toSave) await handleSave(r.id);
  }

  // ── Export CSV ─────────────────────────────────────────────────
  function handleCSV() {
    const cols = ["filename","certificate_number","certificate_type","client_name","equipment_description","equipment_type","equipment_location","serial_number","manufacturer","model","result","issue_date","expiry_date","inspector_name","inspector_id"];
    const rows = results.map(r => cols.map(c => JSON.stringify(r[c] ?? "")).join(","));
    const blob = new Blob([cols.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "certificates.csv"; a.click();
  }

  const activeOverrides = Object.values(overrides).filter(v => v?.trim()).length;

  return (
    <AppLayout title="Import Certificates">
      <style>{CSS}</style>
      <div className="bi-root">
        <div className="bi-inner">

          {/* HEADER */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:"16px 20px",backdropFilter:"blur(20px)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:9,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent,marginBottom:5}}>Bulk AI Import</div>
              <h1 style={{margin:0,fontSize:"clamp(16px,3vw,22px)",fontWeight:900,letterSpacing:"-0.02em"}}>Import Certificates</h1>
            </div>
            <button type="button" className="btn-ghost" onClick={() => router.push("/certificates")}>← Back</button>
          </div>

          {/* STATS */}
          <div className="bi-stats">
            <StatCard label="Processed"  value={processed}  color={T.textDim} />
            <StatCard label="Successful" value={successful} color={T.green}   />
            <StatCard label="Errors"     value={errors}     color={T.red}     />
            <StatCard label="Passed"     value={passed}     color={T.amber}   />
          </div>

          {/* PANELS */}
          <div className="bi-panels">

            {/* LEFT — Upload zone */}
            <div style={{display:"grid",gap:10}}>
              <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,padding:14}}>
                <div style={{fontSize:12,fontWeight:800,color:T.text,marginBottom:4,display:"flex",alignItems:"center",gap:7}}>
                  <span>⬆</span> Upload zone
                </div>
                <div style={{fontSize:10,color:T.textDim,marginBottom:10}}>PDF · PNG · JPG · WEBP — max 20 files, 10 MB each</div>

                {/* Dropzone */}
                <div
                  ref={dropRef}
                  className={`bi-dropzone${dragging ? " dragging" : ""}`}
                  onClick={() => fileRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <div style={{fontSize:24,opacity:.25,marginBottom:8}}>⬆</div>
                  <div style={{fontSize:13,fontWeight:700,color:T.textMid,marginBottom:3}}>Drop files here</div>
                  <div style={{fontSize:11,color:T.textDim}}>Certificates, nameplates, equipment photos</div>
                  <div style={{display:"flex",gap:5,justifyContent:"center",marginTop:10,flexWrap:"wrap"}}>
                    {["PDF","PNG","JPG","WEBP"].map(t => <span key={t} className="bi-file-chip">{t}</span>)}
                  </div>
                </div>
                <input ref={fileRef} type="file" multiple accept=".pdf,image/*" style={{display:"none"}}
                  onChange={e => addFiles(e.target.files)} />

                {files.length > 0 && (
                  <div style={{marginTop:8,display:"grid",gap:3}}>
                    {files.map((f, i) => (
                      <div key={i} style={{fontSize:10,color:T.textDim,display:"flex",justifyContent:"space-between"}}>
                        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"80%"}}>📄 {f.name}</span>
                        <span>{(f.size/1024).toFixed(0)} KB</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Buttons */}
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <button type="button" className="btn-ghost"
                    style={{flex:1}} disabled={!files.length && !results.length}
                    onClick={() => { setFiles([]); setResults([]); setProgress(0); }}>
                    Clear all
                  </button>
                  <button type="button" className="btn-primary"
                    style={{flex:2}} disabled={extracting || !files.length}
                    onClick={handleExtract}>
                    {extracting ? "⏳ Extracting…" : "✦ Extract with AI"}
                  </button>
                </div>

                {/* Progress */}
                {(extracting || progress > 0) && (
                  <div style={{marginTop:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.textDim,marginBottom:5}}>
                      <span>{extracting ? "Extracting…" : "Extraction complete"}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="bi-progress-track">
                      <div className="bi-progress-fill" style={{width:`${progress}%`}}/>
                    </div>
                  </div>
                )}
              </div>

              {/* Manual override */}
              <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,padding:14}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:showOverride?10:0,cursor:"pointer"}}
                  onClick={() => setShowOverride(s => !s)}>
                  <div>
                    <div style={{fontSize:12,fontWeight:800,color:T.text,display:"flex",alignItems:"center",gap:7}}>
                      Manual override
                      <span className="bi-badge" style={{background:"rgba(251,191,36,0.10)",border:"1px solid rgba(251,191,36,0.25)",color:"#fbbf24",fontSize:9}}>
                        {activeOverrides} active
                      </span>
                    </div>
                    {!showOverride && <div style={{fontSize:10,color:T.textDim,marginTop:2}}>Fills missing fields. Won't overwrite extracted values.</div>}
                  </div>
                  <span style={{fontSize:10,color:T.textDim}}>{showOverride?"▲":"▼"}</span>
                </div>
                {showOverride && (
                  <div style={{display:"grid",gap:8}}>
                    {[
                      { label: "Inspector Name", key: "inspector_name" },
                      { label: "Inspector ID",   key: "inspector_id" },
                      { label: "Legal Framework",key: "legal_framework" },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={IS_LABEL}>{f.label}</label>
                        <input className="bi-input" value={overrides[f.key] || ""}
                          onChange={e => setOverrides(p => ({...p,[f.key]:e.target.value}))}/>
                      </div>
                    ))}
                    <button type="button" className="btn-ghost"
                      style={{fontSize:11,padding:"6px 10px"}}
                      onClick={() => setOverrides(DEFAULTS)}>
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — Extracted results */}
            <div>
              {results.length > 0 ? (
                <>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:800,color:T.text}}>Extracted results</div>
                      <div style={{fontSize:10,color:T.textDim,marginTop:2}}>Review, set result &amp; defects, then save to register</div>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button type="button" className="btn-ghost" onClick={handleCSV}>↓ CSV</button>
                      <button type="button" className="btn-green"
                        disabled={!results.some(r => !r.error && !r.saved && !r.scanning)}
                        onClick={handleSaveAll}>
                        Save all successful
                      </button>
                    </div>
                  </div>

                  {results.map((item, idx) => (
                    item.scanning ? (
                      <div key={item.id} className="bi-card" style={{padding:"16px 14px",display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:20,height:20,border:"2px solid rgba(34,211,238,0.3)",borderTopColor:"#22d3ee",borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0}}/>
                        <span style={{fontSize:12,color:T.textDim}}>Scanning {item.filename}…</span>
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                      </div>
                    ) : item.error ? (
                      <div key={item.id} className="bi-card" style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:10,borderTop:`2px solid ${T.red}`}}>
                        <OKBadge ok={false}/>
                        <span style={{fontSize:12,fontWeight:600,color:T.textMid,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.filename}</span>
                        <span style={{fontSize:11,color:T.red}}>{item.error}</span>
                      </div>
                    ) : (
                      <ResultCard key={item.id} item={item} idx={idx} onUpdate={handleUpdate} onSave={handleSave}/>
                    )
                  ))}
                </>
              ) : (
                <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,padding:"52px 20px",textAlign:"center"}}>
                  <div style={{fontSize:32,opacity:.2,marginBottom:10}}>🤖</div>
                  <div style={{fontSize:14,fontWeight:700,color:T.textMid,marginBottom:4}}>Upload certificates and click Extract with AI</div>
                  <div style={{fontSize:11,color:T.textDim}}>Supports PDF, JPEG, PNG and WebP · Gemini 2.5 Flash</div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}

export default function CertificateImportPage() {
  return (
    <Suspense fallback={
      <div style={{minHeight:"100vh",background:"#070e18",display:"flex",alignItems:"center",justifyContent:"center",
        color:"rgba(240,246,255,0.4)",fontSize:14,fontFamily:"'IBM Plex Sans',sans-serif"}}>
        Loading…
      </div>
    }>
      <ImportInner/>
    </Suspense>
  );
}
