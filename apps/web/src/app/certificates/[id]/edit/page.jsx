// src/app/certificates/[id]/edit/page.jsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

/* ── Design tokens (match existing app theme) ──────────── */
const T = {
  bg:"#070e18", surface:"rgba(13,22,38,0.80)", panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)", border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff", textMid:"rgba(240,246,255,0.72)", textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee", accentDim:"rgba(34,211,238,0.10)", accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399", greenDim:"rgba(52,211,153,0.10)", greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",   redDim:"rgba(248,113,113,0.10)",   redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24", amberDim:"rgba(251,191,36,0.10)",  amberBrd:"rgba(251,191,36,0.25)",
  blue:"#60a5fa",  blueDim:"rgba(96,165,250,0.10)",   blueBrd:"rgba(96,165,250,0.25)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
};

/* ── Shared input style ─────────────────────────────────── */
const IS = {
  width:"100%", padding:"9px 12px", borderRadius:8,
  border:`1px solid ${T.border}`, background:"rgba(18,30,50,0.70)",
  color:T.text, fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif",
  outline:"none", minHeight:38, transition:"border-color .15s",
};
const IS_FOCUS = { borderColor:T.accent };

/* ── Helper: parse notes stored in various shapes ───────── */
function parseNotesObj(raw) {
  if (!raw) return {};
  try {
    const p = JSON.parse(raw);
    if (typeof p === "object" && p !== null) return p;
  } catch {}
  const obj = {};
  String(raw).split("|").forEach(part => {
    const idx = part.indexOf(":");
    if (idx < 0) return;
    obj[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  });
  return obj;
}

function stringifyNotes(obj) {
  return JSON.stringify(obj);
}

/* ── Section heading ────────────────────────────────────── */
function SectionHead({ icon, title, color = T.accent }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:9,
      padding:"10px 16px", margin:"0 0 0",
      background:`linear-gradient(90deg,${color}18,transparent)`,
      borderLeft:`3px solid ${color}`, borderRadius:"0 6px 6px 0",
    }}>
      {icon && <span style={{ fontSize:16 }}>{icon}</span>}
      <span style={{ fontSize:12, fontWeight:900, letterSpacing:"0.06em", textTransform:"uppercase", color }}>{title}</span>
    </div>
  );
}

/* ── Individual field row in list mode ──────────────────── */
function FieldRow({
  label, sublabel, value, onChange, type="text",
  options, placeholder, mono=false, readOnly=false,
  wide=false, danger=false, highlight=false,
}) {
  const [focused, setFocused] = useState(false);
  const borderColor = focused ? T.accent : danger ? T.redBrd : highlight ? T.greenBrd : T.border;
  const rowBg = danger ? "rgba(248,113,113,0.04)" : highlight ? "rgba(52,211,153,0.04)" : "transparent";

  const inputStyle = {
    ...IS,
    borderColor,
    fontFamily: mono ? "'IBM Plex Mono',monospace" : IS.fontFamily,
    fontSize: mono ? 12 : 13,
    background: readOnly ? "rgba(34,211,238,0.05)" : IS.background,
    color: readOnly ? T.textMid : T.text,
    cursor: readOnly ? "default" : "text",
  };

  return (
    <div style={{
      display:"grid",
      gridTemplateColumns: wide ? "1fr" : "220px 1fr",
      gap:wide?6:12,
      alignItems:"flex-start",
      padding:"10px 16px",
      borderBottom:`1px solid ${T.border}`,
      background: rowBg,
      transition:"background .15s",
    }}>
      <div style={{ paddingTop: wide ? 0 : 8 }}>
        <div style={{ fontSize:12, fontWeight:700, color:T.textMid, lineHeight:1.3 }}>{label}</div>
        {sublabel && <div style={{ fontSize:10, color:T.textDim, marginTop:3, lineHeight:1.4 }}>{sublabel}</div>}
      </div>
      <div>
        {type === "select" ? (
          <select
            value={value || ""}
            onChange={e => onChange(e.target.value)}
            disabled={readOnly}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{ ...inputStyle, appearance:"none", WebkitAppearance:"none",
              backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(240,246,255,0.4)' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
              backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center",
              paddingRight:36,
            }}
          >
            {(options || []).map(o => (
              <option key={o.value ?? o} value={o.value ?? o} style={{ background:"#0a1420", color:"#f0f6ff" }}>
                {o.label ?? o}
              </option>
            ))}
          </select>
        ) : type === "textarea" ? (
          <textarea
            value={value || ""}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder || ""}
            readOnly={readOnly}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{ ...inputStyle, minHeight:80, resize:"vertical" }}
          />
        ) : type === "result" ? (
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {["PASS","FAIL","REPAIR_REQUIRED","CONDITIONAL","OUT_OF_SERVICE"].map(opt => {
              const active = (value || "PASS") === opt;
              const colors = {
                PASS:           { c:T.green,  bg:T.greenDim,  brd:T.greenBrd  },
                FAIL:           { c:T.red,    bg:T.redDim,    brd:T.redBrd    },
                REPAIR_REQUIRED:{ c:T.amber,  bg:T.amberDim,  brd:T.amberBrd  },
                CONDITIONAL:    { c:T.amber,  bg:T.amberDim,  brd:T.amberBrd  },
                OUT_OF_SERVICE: { c:T.purple, bg:T.purpleDim, brd:T.purpleBrd },
              };
              const s = colors[opt] || { c:T.textMid, bg:T.card, brd:T.border };
              const labels = { PASS:"Pass", FAIL:"Fail", REPAIR_REQUIRED:"Repair Required", CONDITIONAL:"Conditional", OUT_OF_SERVICE:"Out of Service" };
              return (
                <button key={opt} type="button"
                  onClick={() => !readOnly && onChange(opt)}
                  style={{
                    padding:"6px 12px", borderRadius:8, fontSize:11, fontWeight:800,
                    cursor: readOnly ? "default" : "pointer", fontFamily:"inherit",
                    border:`1.5px solid ${active ? s.brd : T.border}`,
                    background: active ? s.bg : T.card,
                    color: active ? s.c : T.textDim,
                    opacity: readOnly ? 0.6 : 1,
                    transition:"all .12s",
                  }}>
                  {labels[opt]}
                </button>
              );
            })}
          </div>
        ) : (
          <input
            type={type}
            value={value || ""}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder || ""}
            readOnly={readOnly}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={inputStyle}
          />
        )}
      </div>
    </div>
  );
}

/* ── Collapsible card section ───────────────────────────── */
function EditCard({ title, icon, color=T.accent, brd, defaultOpen=true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background:T.panel, border:`1px solid ${brd||T.border}`, borderRadius:14, overflow:"hidden", marginBottom:14 }}>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        style={{
          width:"100%", display:"flex", alignItems:"center", gap:10,
          padding:"13px 16px", background:"transparent", border:"none",
          borderBottom: open ? `1px solid ${T.border}` : "none",
          cursor:"pointer", color:T.text, fontFamily:"'IBM Plex Sans',sans-serif",
        }}
      >
        <span style={{ fontSize:16 }}>{icon}</span>
        <span style={{ flex:1, textAlign:"left", fontSize:14, fontWeight:900, color }}>{title}</span>
        <span style={{ fontSize:12, color:T.textDim, transform:open?"rotate(180deg)":"none", transition:"transform .2s" }}>▼</span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

/* ── Notes editor — understands JSON or pipe-delimited ──── */
function NotesEditor({ value, onChange }) {
  const [mode, setMode] = useState("raw");  // "raw" | "json"
  const isJson = (() => { try { if (value) JSON.parse(value); return true; } catch { return false; } })();

  return (
    <div>
      {isJson && (
        <div style={{ display:"flex", gap:6, padding:"8px 16px", borderBottom:`1px solid ${T.border}` }}>
          {["raw","json"].map(m => (
            <button key={m} type="button" onClick={() => setMode(m)}
              style={{ padding:"4px 10px", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                border:`1px solid ${mode===m?T.accentBrd:T.border}`,
                background:mode===m?T.accentDim:T.card,
                color:mode===m?T.accent:T.textDim,
              }}>
              {m === "raw" ? "Raw Text" : "Formatted JSON"}
            </button>
          ))}
          <span style={{ fontSize:10, color:T.textDim, alignSelf:"center", marginLeft:4 }}>Notes stored as JSON</span>
        </div>
      )}
      {mode === "json" && isJson ? (
        <pre style={{ margin:0, padding:"12px 16px", fontSize:11, fontFamily:"'IBM Plex Mono',monospace",
          color:T.textMid, background:"rgba(0,0,0,0.2)", overflowX:"auto", maxHeight:300,
          lineHeight:1.6, whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
          {JSON.stringify(JSON.parse(value), null, 2)}
        </pre>
      ) : (
        <div style={{ padding:"0 0" }}>
          <FieldRow label="Raw Notes" sublabel="Pipe-delimited (Key:Value|Key2:Value2) or JSON" type="textarea" value={value} onChange={onChange} wide/>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   INSPECTION DATA EDITOR
   Renders type-aware field editors for the notes/checklist
   so inspectors can edit them without touching raw JSON.
══════════════════════════════════════════════════════════ */

/* Result options shorthand */
const RESULT_OPTS = ["PASS","FAIL","REPAIR_REQUIRED","CONDITIONAL"];

/* Generic boom editor (telehandler / cherry picker) */
function BoomEditor({ data, onChange }) {
  const u = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div>
      <SectionHead icon="📐" title="Boom Geometry" />
      <FieldRow label="Min Boom Length (m)" value={data.min_boom_length} onChange={v=>u("min_boom_length",v)} placeholder="e.g. 6"/>
      <FieldRow label="Max Boom Length (m)" value={data.max_boom_length} onChange={v=>u("max_boom_length",v)} placeholder="e.g. 18"/>
      <FieldRow label="Actual Boom Length (m)" value={data.actual_boom_length} onChange={v=>u("actual_boom_length",v)} placeholder="e.g. 12"/>
      <FieldRow label="Extended / Telescoped (m)" value={data.extended_boom_length} onChange={v=>u("extended_boom_length",v)}/>
      <FieldRow label="Boom Angle (°)" value={data.boom_angle} onChange={v=>u("boom_angle",v)}/>
      <FieldRow label="Max Working Height (m)" sublabel="Cherry Picker only" value={data.max_height} onChange={v=>u("max_height",v)}/>
      <SectionHead icon="📏" title="Working Radius & SWL" />
      <FieldRow label="Min Radius (m)" value={data.min_radius} onChange={v=>u("min_radius",v)}/>
      <FieldRow label="Max Radius (m)" value={data.max_radius} onChange={v=>u("max_radius",v)}/>
      <FieldRow label="Load Test Radius (m)" value={data.load_tested_at_radius} onChange={v=>u("load_tested_at_radius",v)}/>
      <FieldRow label="SWL at Min Radius" value={data.swl_at_min_radius} onChange={v=>u("swl_at_min_radius",v)}/>
      <FieldRow label="SWL at Max Radius" value={data.swl_at_max_radius} onChange={v=>u("swl_at_max_radius",v)}/>
      <FieldRow label="SWL at Test Config" value={data.swl_at_actual_config} onChange={v=>u("swl_at_actual_config",v)}/>
      <FieldRow label="Test Load Applied" sublabel="110% of SWL" value={data.test_load} onChange={v=>u("test_load",v)} highlight/>
      <SectionHead icon="🔧" title="Boom Systems Condition" />
      <FieldRow label="Boom Structure" type="result" value={data.boom_structure||"PASS"} onChange={v=>u("boom_structure",v)}/>
      <FieldRow label="Boom Pins & Connections" type="result" value={data.boom_pins||"PASS"} onChange={v=>u("boom_pins",v)}/>
      <FieldRow label="Boom Wear / Pads" type="result" value={data.boom_wear||"PASS"} onChange={v=>u("boom_wear",v)}/>
      <FieldRow label="Luffing / Extension System" type="result" value={data.luffing_system||"PASS"} onChange={v=>u("luffing_system",v)}/>
      <FieldRow label="Slew / Rotation System" type="result" value={data.slew_system||"PASS"} onChange={v=>u("slew_system",v)}/>
      <FieldRow label="Hoist / Lift System" type="result" value={data.hoist_system||"PASS"} onChange={v=>u("hoist_system",v)}/>
      <FieldRow label="LMI Tested at Config" type="result" value={data.lmi_test||"PASS"} onChange={v=>u("lmi_test",v)}/>
      <FieldRow label="Anti-Two Block / Overload" type="result" value={data.anti_two_block||"PASS"} onChange={v=>u("anti_two_block",v)}/>
      <FieldRow label="Jib / Fork Attachment" type="select" options={[{value:"no",label:"Not Fitted"},{value:"yes",label:"Yes — Fitted"}]} value={data.jib_fitted||"no"} onChange={v=>u("jib_fitted",v)}/>
      <FieldRow label="Notes" type="textarea" value={data.notes} onChange={v=>u("notes",v)}/>
    </div>
  );
}

/* Bucket / Platform editor (cherry picker) */
function BucketEditor({ data, onChange }) {
  const u = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div>
      <SectionHead icon="🪣" title="Platform Specification" color={T.blue} />
      <FieldRow label="Platform SWL" value={data.platform_swl} onChange={v=>u("platform_swl",v)} placeholder="e.g. 250kg" highlight/>
      <FieldRow label="Platform Dimensions (m)" value={data.platform_dimensions} onChange={v=>u("platform_dimensions",v)} placeholder="e.g. 1.2 x 0.8"/>
      <FieldRow label="Platform Material" value={data.platform_material} onChange={v=>u("platform_material",v)} placeholder="e.g. Steel"/>
      <FieldRow label="Test Load Applied" sublabel="Should be 110% of SWL" value={data.test_load_applied} onChange={v=>u("test_load_applied",v)} highlight/>
      <SectionHead icon="🔩" title="Structural Condition" color={T.blue} />
      <FieldRow label="Platform Structure" type="result" value={data.platform_structure||"PASS"} onChange={v=>u("platform_structure",v)}/>
      <FieldRow label="Platform Floor" type="result" value={data.platform_floor||"PASS"} onChange={v=>u("platform_floor",v)}/>
      <FieldRow label="Guardrails / Toe Boards" type="result" value={data.guardrails||"PASS"} onChange={v=>u("guardrails",v)}/>
      <SectionHead icon="🛡" title="Safety Systems" color={T.blue} />
      <FieldRow label="Gate / Latch System" type="result" value={data.gate_latch||"PASS"} onChange={v=>u("gate_latch",v)}/>
      <FieldRow label="Platform Auto-Levelling" type="result" value={data.levelling_system||"PASS"} onChange={v=>u("levelling_system",v)}/>
      <FieldRow label="Emergency Lowering Device" type="result" value={data.emergency_lowering||"PASS"} onChange={v=>u("emergency_lowering",v)}/>
      <FieldRow label="Overload / SWL Cut-Off Device" type="result" value={data.overload_device||"PASS"} onChange={v=>u("overload_device",v)}/>
      <FieldRow label="Tilt / Inclination Alarm" type="result" value={data.tilt_alarm||"PASS"} onChange={v=>u("tilt_alarm",v)}/>
      <FieldRow label="Notes" type="textarea" value={data.notes} onChange={v=>u("notes",v)}/>
    </div>
  );
}

/* Checklist editor (generic machine checklist object) */
function ChecklistEditor({ data, onChange, fields }) {
  const u = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div>
      {(fields || []).map(f => (
        <FieldRow key={f.key} label={f.label} sublabel={f.sub}
          type={f.type === "result" ? "result" : f.type || "text"}
          value={data[f.key] || (f.type === "result" ? "PASS" : "")}
          onChange={v => u(f.key, v)}
          danger={f.type === "result" && data[f.key] && data[f.key] !== "PASS"}
        />
      ))}
    </div>
  );
}

/* Fork editor */
function ForksEditor({ data, onChange }) {
  const forks = Array.isArray(data) ? data : [];
  const update = (i, k, v) => {
    const next = forks.map((f, j) => j === i ? { ...f, [k]: v } : f);
    onChange(next);
  };
  const add = () => onChange([...forks, { fork_number:"", length:"", thickness_heel:"", thickness_blade:"", width:"", swl:"", result:"PASS", cracks:"no", bending:"no", wear_pct:"", notes:"" }]);
  const remove = i => onChange(forks.filter((_, j) => j !== i));

  return (
    <div>
      {forks.map((fk, i) => (
        <div key={i} style={{ marginBottom:12, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 14px", background:`rgba(251,191,36,0.07)`, borderBottom:`1px solid ${T.border}` }}>
            <span style={{ fontSize:12, fontWeight:800, color:T.amber }}>🍴 Fork Arm {i + 1}</span>
            <button type="button" onClick={() => remove(i)}
              style={{ padding:"3px 9px", borderRadius:6, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              Remove
            </button>
          </div>
          <FieldRow label="Fork Serial / ID" value={fk.fork_number} onChange={v=>update(i,"fork_number",v)} placeholder="e.g. FK-001-A" mono/>
          <FieldRow label="Safe Working Load" value={fk.swl} onChange={v=>update(i,"swl",v)} placeholder="e.g. 3T"/>
          <FieldRow label="Length (mm)" value={fk.length} onChange={v=>update(i,"length",v)}/>
          <FieldRow label="Thickness at Heel (mm)" value={fk.thickness_heel} onChange={v=>update(i,"thickness_heel",v)}/>
          <FieldRow label="Thickness at Blade (mm)" value={fk.thickness_blade} onChange={v=>update(i,"thickness_blade",v)}/>
          <FieldRow label="Width (mm)" value={fk.width} onChange={v=>update(i,"width",v)}/>
          <FieldRow label="Wear % vs Original" value={fk.wear_pct} onChange={v=>update(i,"wear_pct",v)} placeholder="e.g. 8" danger={parseFloat(fk.wear_pct)>10}/>
          <FieldRow label="Cracks / Fractures" type="select" options={[{value:"no",label:"No — Clear"},{value:"yes",label:"Yes — FAIL"}]} value={fk.cracks||"no"} onChange={v=>update(i,"cracks",v)}/>
          <FieldRow label="Bending / Deformation" type="select" options={[{value:"no",label:"No — Clear"},{value:"yes",label:"Yes — FAIL"}]} value={fk.bending||"no"} onChange={v=>update(i,"bending",v)}/>
          <FieldRow label="Overall Result" type="result" value={fk.result||"PASS"} onChange={v=>update(i,"result",v)}/>
          <FieldRow label="Notes" type="textarea" value={fk.notes} onChange={v=>update(i,"notes",v)} wide/>
        </div>
      ))}
      <div style={{ padding:"12px 16px" }}>
        <button type="button" onClick={add}
          style={{ padding:"8px 16px", borderRadius:9, border:`1px solid ${T.greenBrd}`, background:T.greenDim, color:T.green, fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
          + Add Fork Arm
        </button>
      </div>
    </div>
  );
}

/* Pressure vessel checklist (stored under notes.checklist for PV type) */
function PVChecklistEditor({ data, onChange }) {
  const u = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div>
      <SectionHead icon="⚙️" title="Vessel Condition" color={T.green} />
      <FieldRow label="External Visual Condition" type="select"
        options={["Satisfactory","Unsatisfactory","See notes"]}
        value={data.vessel_condition_external||"Satisfactory"} onChange={v=>u("vessel_condition_external",v)}/>
      <FieldRow label="Internal Condition (if applicable)" type="select"
        options={["Satisfactory","Unsatisfactory","Not accessible","N/A"]}
        value={data.vessel_condition_internal||"Satisfactory"} onChange={v=>u("vessel_condition_internal",v)}/>
      <SectionHead icon="🔧" title="Fittings" color={T.green} />
      <FieldRow label="Safety Valve Fitted & Operating" type="select"
        options={["Yes","No","Not applicable"]}
        value={data.safety_valve_fitted||"Yes"} onChange={v=>u("safety_valve_fitted",v)}/>
      <FieldRow label="Pressure Gauge Fitted & Reading Correctly" type="select"
        options={["Yes","No","Requires calibration"]}
        value={data.pressure_gauge_fitted||"Yes"} onChange={v=>u("pressure_gauge_fitted",v)}/>
      <FieldRow label="Drain Valve Fitted & Operating" type="select"
        options={["Yes","No","Not applicable"]}
        value={data.drain_valve_fitted||"Yes"} onChange={v=>u("drain_valve_fitted",v)}/>
      <SectionHead icon="🔍" title="Corrosion & Testing" color={T.green} />
      <FieldRow label="Signs of Corrosion / Cracking" sublabel="Choose the most accurate option" type="select"
        options={["None observed","Yes — minor","Yes — significant","Yes — severe","Yes — see defects"]}
        value={data.signs_of_corrosion||"None observed"}
        onChange={v=>u("signs_of_corrosion",v)}
        danger={/^yes/i.test(data.signs_of_corrosion||"")}/>
      <FieldRow label="Nameplate Legible & Data Correct" type="select"
        options={["Yes","No","Partially legible"]}
        value={data.nameplate_legible||"Yes"} onChange={v=>u("nameplate_legible",v)}/>
      <FieldRow label="Hydrostatic Test Performed" type="select"
        options={["Yes","No","N/A"]}
        value={data.hydrostatic_test||"N/A"} onChange={v=>u("hydrostatic_test",v)}/>
      <FieldRow label="Hydrostatic Test Pressure (kPa)" sublabel="Only if hydrostatic test was done"
        value={data.hydrostatic_test_pressure_kpa} onChange={v=>u("hydrostatic_test_pressure_kpa",v)} placeholder="e.g. 1200"/>
      <FieldRow label="Overall Assessment" type="select"
        options={["Pass","Fail","Conditional pass","Out of service"]}
        value={data.overall_assessment||"Pass"} onChange={v=>u("overall_assessment",v)}/>
    </div>
  );
}

/* ── Detect equipment family from type string ───────────── */
function detectFamily(equipType) {
  const t = String(equipType||"").toLowerCase();
  if (/mobile.crane|crane/i.test(t) && !/hook|rope|cherry|telehandler|forklift/i.test(t)) return "crane";
  if (/cherry.picker|aerial.work.platform|boom.lift/i.test(t)) return "cherry_picker";
  if (/telehandler/i.test(t)) return "telehandler";
  if (/forklift|fork.lift/i.test(t)) return "forklift";
  if (/tlb|tractor.loader/i.test(t)) return "machine";
  if (/pressure.vessel|air.receiver|boiler|autoclave/i.test(t)) return "pressure_vessel";
  if (/wire.rope.sling/i.test(t)) return "sling";
  if (/hook/i.test(t)) return "hook_rope";
  if (/fork.arm/i.test(t)) return "fork_arm";
  if (/horse.*mover|prime.mover/i.test(t)) return "horse";
  if (/^trailer$/i.test(t.trim())) return "trailer";
  return "generic";
}

/* ── Checklist field definitions per family ─────────────── */
const FAMILY_CHECKLIST = {
  telehandler: [
    { key:"structural_result", label:"Structural Integrity",             type:"result" },
    { key:"hydraulics_result", label:"Hydraulic System",                 type:"result" },
    { key:"lmi_result",        label:"Load Management Indicator (LMI)", type:"result" },
    { key:"brakes_result",     label:"Brake / Drive System",             type:"result" },
    { key:"tyres_result",      label:"Tyres & Wheels",                   type:"result" },
  ],
  cherry_picker: [
    { key:"structural_result",  label:"Structural Integrity",           type:"result" },
    { key:"hydraulics_result",  label:"Hydraulic System",               type:"result" },
    { key:"safety_devices",     label:"Safety Devices / Interlocks",    type:"result" },
    { key:"emergency_lowering", label:"Emergency Lowering System",      type:"result" },
  ],
  forklift: [
    { key:"structural_result", label:"Mast / Structural Integrity",     type:"result" },
    { key:"hydraulics_result", label:"Hydraulic System",                type:"result" },
    { key:"brakes_result",     label:"Brake System",                    type:"result" },
    { key:"lmi_result",        label:"Load Indicator / SWL Plate",     type:"result" },
    { key:"tyres_result",      label:"Tyres / Wheels",                  type:"result" },
    { key:"forks_result",      label:"Fork Arms Overall",               type:"result" },
  ],
  machine: [
    { key:"structural_result",  label:"Structural Integrity",           type:"result" },
    { key:"operational_result", label:"Operational Check",             type:"result" },
    { key:"safety_result",      label:"Safety Systems",                type:"result" },
    { key:"hydraulics_result",  label:"Hydraulic System",              type:"result" },
  ],
};

/* ── Inspection Data (smart) editor ─────────────────────── */
function InspectionDataEditor({ family, notesJson, onChange }) {
  const nd = parseNotesObj(notesJson);

  const updateSection = useCallback((section, val) => {
    const next = { ...nd, [section]: val };
    onChange(stringifyNotes(next));
  }, [nd, onChange]);

  const updateChecklist = useCallback((val) => {
    const next = { ...nd, checklist: val };
    onChange(stringifyNotes(next));
  }, [nd, onChange]);

  const updateRoot = useCallback((key, val) => {
    const next = { ...nd, [key]: val };
    onChange(stringifyNotes(next));
  }, [nd, onChange]);

  // Families that have a boom section
  const hasBoom = ["telehandler","cherry_picker"].includes(family);
  const hasBucket = family === "cherry_picker";
  const hasForks = ["telehandler","forklift","machine"].includes(family);
  const hasChecklist = !!FAMILY_CHECKLIST[family];
  const hasPVChecklist = family === "pressure_vessel";

  // For families that have no structured notes, fall through to raw editor
  if (!hasBoom && !hasBucket && !hasForks && !hasChecklist && !hasPVChecklist) {
    return null; // will show raw notes editor
  }

  return (
    <div style={{ display:"grid", gap:14 }}>
      {/* Checklist section */}
      {hasChecklist && (
        <EditCard title="Inspection Checklist" icon="🔍" color={T.blue} brd={T.blueBrd}>
          <ChecklistEditor
            data={nd.checklist || {}}
            onChange={updateChecklist}
            fields={FAMILY_CHECKLIST[family]}
          />
          <SectionHead icon="📋" title="Overall Result & Defects" color={T.blue} />
          <FieldRow label="Overall Result" type="result" value={nd.overall_result||"PASS"} onChange={v=>updateRoot("overall_result",v)}/>
          <FieldRow label="Defects Found" type="textarea" value={nd.defects} onChange={v=>updateRoot("defects",v)} danger={!!nd.defects} wide/>
          <FieldRow label="Recommendations" type="textarea" value={nd.recommendations} onChange={v=>updateRoot("recommendations",v)} wide/>
        </EditCard>
      )}

      {/* Boom section */}
      {hasBoom && (
        <EditCard title="Boom Configuration & Load Test" icon="📐" color={T.accent} brd={T.accentBrd}>
          <BoomEditor data={nd.boom || {}} onChange={val => updateSection("boom", val)}/>
        </EditCard>
      )}

      {/* Bucket / Platform section */}
      {hasBucket && (
        <EditCard title="Platform / Bucket Inspection" icon="🪣" color={T.blue} brd={T.blueBrd}>
          <BucketEditor data={nd.bucket || {}} onChange={val => updateSection("bucket", val)}/>
        </EditCard>
      )}

      {/* Fork arms section */}
      {hasForks && (
        <EditCard title="Fork Arms Inspection" icon="🍴" color={T.amber} brd={T.amberBrd} defaultOpen={false}>
          <ForksEditor data={nd.forks || []} onChange={val => updateSection("forks", val)}/>
        </EditCard>
      )}

      {/* PV checklist */}
      {hasPVChecklist && (
        <EditCard title="Pressure Vessel Inspection Checklist" icon="⚙️" color={T.green} brd={T.greenBrd}>
          <PVChecklistEditor data={nd.checklist || {}} onChange={val => updateChecklist(val)}/>
        </EditCard>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN EDIT PAGE
══════════════════════════════════════════════════════════ */
export default function EditCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState("");
  const [record,   setRecord]   = useState(null);
  const [clients,  setClients]  = useState([]);

  // All editable fields as flat state
  const [form, setForm] = useState({});
  const [notesJson, setNotesJson] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("certificates").select("*").eq("id", id).maybeSingle(),
      supabase.from("clients").select("id,company_name,city").order("company_name"),
    ]).then(([{ data: cert, error: ce }, { data: cls }]) => {
      if (ce || !cert) { setError(ce?.message || "Certificate not found."); setLoading(false); return; }
      setRecord(cert);
      setForm({
        certificate_number: cert.certificate_number || "",
        certificate_type:   cert.certificate_type || "",
        equipment_type:     cert.equipment_type || "",
        equipment_description: cert.equipment_description || "",
        manufacturer:       cert.manufacturer || "",
        model:              cert.model || "",
        serial_number:      cert.serial_number || "",
        fleet_number:       cert.fleet_number || "",
        registration_number: cert.registration_number || "",
        client_id:          cert.client_id || "",
        client_name:        cert.client_name || "",
        location:           cert.location || "",
        issue_date:         cert.issue_date || cert.issued_at?.split("T")[0] || "",
        expiry_date:        cert.expiry_date || "",
        inspection_date:    cert.inspection_date || "",
        next_inspection_due: cert.next_inspection_due || "",
        result:             cert.result || "PASS",
        swl:                cert.swl || "",
        working_pressure:   cert.working_pressure || "",
        test_pressure:      cert.test_pressure || "",
        design_pressure:    cert.design_pressure || "",
        pressure_unit:      cert.pressure_unit || "bar",
        capacity_volume:    cert.capacity_volume || "",
        mawp:               cert.mawp || "",
        machine_hours:      cert.machine_hours || "",
        defects_found:      cert.defects_found || "",
        recommendations:    cert.recommendations || "",
        comments:           cert.comments || "",
        remarks:            cert.remarks || "",
        inspector_name:     cert.inspector_name || "",
        inspector_id:       cert.inspector_id || "",
      });
      setNotesJson(cert.notes || "");
      setClients(cls || []);
      setLoading(false);
    });
  }, [id]);

  const uf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function clientSelected(clientId) {
    const c = clients.find(x => x.id === clientId);
    setForm(p => ({ ...p, client_id: clientId, client_name: c?.company_name || "", location: c?.city || p.location }));
  }

  const family = detectFamily(form.equipment_type || record?.equipment_type);

  const hasStructuredNotes = ["telehandler","cherry_picker","forklift","machine","pressure_vessel"].includes(family);

  async function handleSave() {
    setSaving(true); setError(""); setSaved(false);
    const payload = {
      ...form,
      notes: notesJson || null,
      updated_at: new Date().toISOString(),
    };
    // Remove undefined/empty optional fields that shouldn't overwrite DB
    ["mawp","machine_hours","design_pressure"].forEach(k => {
      if (!payload[k]) delete payload[k];
    });
    const { error: e } = await supabase.from("certificates").update(payload).eq("id", id);
    if (e) { setError("Save failed: " + e.message); setSaving(false); return; }
    setSaved(true); setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return (
    <AppLayout title="Edit Certificate">
      <div style={{ minHeight:"60vh", display:"flex", alignItems:"center", justifyContent:"center", color:T.textDim, fontSize:14, fontFamily:"'IBM Plex Sans',sans-serif" }}>
        Loading…
      </div>
    </AppLayout>
  );

  if (error && !record) return (
    <AppLayout title="Edit Certificate">
      <div style={{ padding:20, color:T.red, fontFamily:"'IBM Plex Sans',sans-serif" }}>⚠ {error}</div>
    </AppLayout>
  );

  return (
    <AppLayout title="Edit Certificate">
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        input::placeholder,textarea::placeholder{color:rgba(240,246,255,0.28)}
        select option{background:#0a1420;color:#f0f6ff}
        textarea{resize:vertical}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(1) opacity(.4)}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
        @media(max-width:700px){.edit-cols{grid-template-columns:1fr!important}}
      `}</style>

      <div style={{
        fontFamily:"'IBM Plex Sans',sans-serif", color:T.text,
        padding:20, maxWidth:960, margin:"0 auto",
        background:`radial-gradient(ellipse 60% 40% at 0% 0%,rgba(34,211,238,0.04),transparent)`,
        minHeight:"100vh",
      }}>

        {/* ── HEADER ─────────────────────────────────────────── */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:"14px 20px", marginBottom:20, backdropFilter:"blur(20px)" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", color:T.accent, marginBottom:4 }}>Certificates · Edit</div>
              <h1 style={{ margin:"0 0 4px", fontSize:20, fontWeight:900, letterSpacing:"-0.02em" }}>
                {record?.certificate_number || "Certificate"}
              </h1>
              <div style={{ fontSize:12, color:T.textDim }}>
                {record?.equipment_type} · {record?.client_name}
              </div>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button type="button" onClick={() => router.back()}
                style={{ padding:"9px 14px", borderRadius:10, border:`1px solid ${T.border}`, background:T.card, color:T.textMid, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                ← Back
              </button>
              <a href={`/certificates/${id}`}
                style={{ padding:"9px 14px", borderRadius:10, border:`1px solid ${T.border}`, background:T.card, color:T.textMid, fontWeight:700, fontSize:12, textDecoration:"none", display:"inline-flex", alignItems:"center" }}>
                👁 View
              </a>
              <button type="button" onClick={handleSave} disabled={saving}
                style={{
                  padding:"9px 22px", borderRadius:10, border:"none", fontWeight:900, fontSize:13, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit",
                  background:saving?"rgba(255,255,255,0.06)":saved?"linear-gradient(135deg,#34d399,#14b8a6)":"linear-gradient(135deg,#22d3ee,#0891b2)",
                  color:saving?"rgba(240,246,255,0.4)":saved?"#052e16":"#052e16",
                }}>
                {saving?"Saving…":saved?"✓ Saved":"💾 Save Changes"}
              </button>
            </div>
          </div>
          {error && (
            <div style={{ marginTop:10, padding:"9px 12px", borderRadius:9, background:T.redDim, border:`1px solid ${T.redBrd}`, color:T.red, fontSize:12, fontWeight:700 }}>
              ⚠ {error}
            </div>
          )}
          {saved && (
            <div style={{ marginTop:10, padding:"9px 12px", borderRadius:9, background:T.greenDim, border:`1px solid ${T.greenBrd}`, color:T.green, fontSize:12, fontWeight:700 }}>
              ✓ Certificate updated successfully
            </div>
          )}
        </div>

        <div className="edit-cols" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, alignItems:"start" }}>

          {/* ── LEFT COLUMN ─────────────────────────────────── */}
          <div>

            {/* Certificate Identity */}
            <EditCard title="Certificate Identity" icon="📜" color={T.accent} brd={T.accentBrd}>
              <FieldRow label="Certificate Number" sublabel="Unique identifier — change with care" value={form.certificate_number} onChange={v=>uf("certificate_number",v)} mono/>
              <FieldRow label="Certificate Type" value={form.certificate_type} onChange={v=>uf("certificate_type",v)} placeholder="e.g. Load Test Certificate"/>
              <FieldRow label="Equipment Type" sublabel="Controls which certificate template renders" value={form.equipment_type} onChange={v=>uf("equipment_type",v)} placeholder="e.g. Telehandler"/>
              <FieldRow label="Equipment Description" value={form.equipment_description} onChange={v=>uf("equipment_description",v)} type="textarea" wide/>
            </EditCard>

            {/* Equipment Details */}
            <EditCard title="Equipment Details" icon="🔧" color={T.blue} brd={T.blueBrd}>
              <FieldRow label="Manufacturer" value={form.manufacturer} onChange={v=>uf("manufacturer",v)} placeholder="e.g. JLG, Genie"/>
              <FieldRow label="Model" value={form.model} onChange={v=>uf("model",v)}/>
              <FieldRow label="Serial Number" value={form.serial_number} onChange={v=>uf("serial_number",v)} mono/>
              <FieldRow label="Fleet Number" value={form.fleet_number} onChange={v=>uf("fleet_number",v)}/>
              <FieldRow label="Registration Number" value={form.registration_number} onChange={v=>uf("registration_number",v)}/>
              <FieldRow label="Machine Hours" value={form.machine_hours} onChange={v=>uf("machine_hours",v)} placeholder="e.g. 4250"/>
            </EditCard>

            {/* Technical Data */}
            <EditCard title="Technical Data" icon="📊" color={T.green} brd={T.greenBrd}>
              <FieldRow label="Safe Working Load (SWL)" value={form.swl} onChange={v=>uf("swl",v)} placeholder="e.g. 5T"/>
              <FieldRow label="Working Pressure / MAWP" value={form.working_pressure||form.mawp} onChange={v=>uf("working_pressure",v)} placeholder="e.g. 8"/>
              <FieldRow label="Test Pressure" value={form.test_pressure} onChange={v=>uf("test_pressure",v)} placeholder="e.g. 12 (1.5 × MAWP)"/>
              <FieldRow label="Design Pressure" value={form.design_pressure} onChange={v=>uf("design_pressure",v)}/>
              <FieldRow label="Pressure Unit" type="select"
                options={[{value:"bar",label:"bar"},{value:"psi",label:"psi"},{value:"MPa",label:"MPa"},{value:"kPa",label:"kPa"}]}
                value={form.pressure_unit||"bar"} onChange={v=>uf("pressure_unit",v)}/>
              <FieldRow label="Capacity / Volume" value={form.capacity_volume} onChange={v=>uf("capacity_volume",v)} placeholder="e.g. 200L"/>
            </EditCard>

          </div>

          {/* ── RIGHT COLUMN ────────────────────────────────── */}
          <div>

            {/* Client & Location */}
            <EditCard title="Client & Location" icon="🏢" color={T.purple} brd={T.purpleBrd}>
              <FieldRow label="Client" type="select"
                options={[{value:"",label:"— Select Client —"}, ...clients.map(c=>({value:c.id,label:c.company_name+(c.city?` — ${c.city}`:"")}))]}
                value={form.client_id} onChange={clientSelected}/>
              <FieldRow label="Client Name" sublabel="Auto-filled from selection, or type manually" value={form.client_name} onChange={v=>uf("client_name",v)}/>
              <FieldRow label="Site Location" value={form.location} onChange={v=>uf("location",v)} placeholder="e.g. Orapa Mine, Botswana"/>
              <FieldRow label="Inspector Name" value={form.inspector_name} onChange={v=>uf("inspector_name",v)}/>
              <FieldRow label="Inspector ID" value={form.inspector_id} onChange={v=>uf("inspector_id",v)} mono/>
            </EditCard>

            {/* Dates */}
            <EditCard title="Dates & Validity" icon="📅" color={T.amber} brd={T.amberBrd}>
              <FieldRow label="Issue Date" type="date" value={form.issue_date} onChange={v=>uf("issue_date",v)}/>
              <FieldRow label="Inspection Date" type="date" value={form.inspection_date} onChange={v=>uf("inspection_date",v)}/>
              <FieldRow label="Expiry Date" type="date" value={form.expiry_date} onChange={v=>uf("expiry_date",v)} highlight/>
              <FieldRow label="Next Inspection Due" type="date" value={form.next_inspection_due} onChange={v=>uf("next_inspection_due",v)}/>
            </EditCard>

            {/* Outcome */}
            <EditCard title="Inspection Outcome" icon="🏁" color={T.red} brd={T.redBrd}>
              <FieldRow label="Overall Result" type="result" value={form.result||"PASS"} onChange={v=>uf("result",v)}/>
              <FieldRow label="Defects Found" type="textarea" value={form.defects_found} onChange={v=>uf("defects_found",v)}
                danger={!!form.defects_found} wide
                sublabel="Describe all observed defects clearly"/>
              <FieldRow label="Recommendations" type="textarea" value={form.recommendations} onChange={v=>uf("recommendations",v)} wide/>
              <FieldRow label="Comments / Remarks" type="textarea" value={form.comments||form.remarks} onChange={v=>uf("comments",v)} wide/>
            </EditCard>

          </div>
        </div>

        {/* ── INSPECTION DATA (full width, structured) ────────── */}
        {hasStructuredNotes ? (
          <div style={{ marginTop:0 }}>
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", color:T.accent, marginBottom:12, paddingLeft:4 }}>
              — Inspection Data ({family.replace("_"," ")}) —
            </div>
            <InspectionDataEditor
              family={family}
              notesJson={notesJson}
              onChange={setNotesJson}
            />
          </div>
        ) : null}

        {/* ── RAW NOTES (always shown, collapsible) ───────────── */}
        <EditCard
          title="Raw Notes / Additional Data"
          icon="📝"
          color={T.textDim}
          brd={T.border}
          defaultOpen={!hasStructuredNotes}
        >
          <div style={{ padding:"10px 16px 0", fontSize:11, color:T.textDim, lineHeight:1.6 }}>
            {hasStructuredNotes
              ? "The structured editors above write directly to this field. Edit here only for advanced corrections or to add pipe-delimited keys not covered by the form above."
              : "Notes are stored as JSON or pipe-delimited key:value pairs. Use the structured inspection wizard to populate these fields."
            }
          </div>
          <NotesEditor value={notesJson} onChange={setNotesJson}/>
        </EditCard>

        {/* ── BOTTOM SAVE ─────────────────────────────────────── */}
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:6, paddingBottom:32 }}>
          <button type="button" onClick={() => router.back()}
            style={{ padding:"11px 20px", borderRadius:10, border:`1px solid ${T.border}`, background:T.card, color:T.textMid, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            style={{
              padding:"11px 28px", borderRadius:10, border:"none", fontWeight:900, fontSize:14,
              cursor:saving?"not-allowed":"pointer", fontFamily:"inherit",
              background:saving?"rgba(255,255,255,0.06)":saved?"linear-gradient(135deg,#34d399,#14b8a6)":"linear-gradient(135deg,#22d3ee,#0891b2)",
              color:saving?"rgba(240,246,255,0.4)":saved?"#052e16":"#052e16",
            }}>
            {saving?"Saving…":saved?"✓ Saved":"💾 Save Changes"}
          </button>
        </div>

      </div>
    </AppLayout>
  );
}
