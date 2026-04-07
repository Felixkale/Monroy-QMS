// src/app/certificates/crane-inspection/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const T = {
  bg:"#070e18", surface:"rgba(13,22,38,0.80)", panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)", border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff", textMid:"rgba(240,246,255,0.72)", textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee", accentDim:"rgba(34,211,238,0.10)", accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399", greenDim:"rgba(52,211,153,0.10)", greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",   redDim:"rgba(248,113,113,0.10)",   redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24", amberDim:"rgba(251,191,36,0.10)",  amberBrd:"rgba(251,191,36,0.25)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
  blue:"#60a5fa",  blueDim:"rgba(96,165,250,0.10)",   blueBrd:"rgba(96,165,250,0.25)",
};

const IS  = { width:"100%", padding:"10px 13px", borderRadius:9, border:`1px solid ${T.border}`, background:"rgba(18,30,50,0.70)", color:T.text, fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif", outline:"none", minHeight:40 };
const LS  = { fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:T.textDim, display:"block", marginBottom:6 };

const INSPECTOR_NAME = "Moemedi Masupe";
const INSPECTOR_ID   = "700117910";

const CRANE_TYPES = [
  "Mobile Crane","Tower Crane","Overhead Crane","Gantry Crane",
  "Crawler Crane","Truck Mounted Crane","Knuckle Boom Crane",
  "Telescopic Crane","Rough Terrain Crane","All Terrain Crane",
];

const STEPS = [
  { id:1, label:"Crane Details",     icon:"🏗" },
  { id:2, label:"Crane Inspection",  icon:"🔍" },
  { id:3, label:"Boom",              icon:"📐" },
  { id:4, label:"Hook",              icon:"🪝" },
  { id:5, label:"Rope",              icon:"🪢" },
  { id:6, label:"Pressure Vessels",  icon:"⚙️" },
  { id:7, label:"Review & Generate", icon:"📜" },
];

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

function ResultSelect({ value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={IS}>
      <option value="PASS">Pass</option>
      <option value="FAIL">Fail</option>
      <option value="CONDITIONAL">Conditional</option>
      <option value="REPAIR_REQUIRED">Repair Required</option>
    </select>
  );
}

function ResultBadge({ result }) {
  const s = result === "PASS" ? { c:T.green, bg:T.greenDim, brd:T.greenBrd, l:"Pass" }
          : result === "FAIL" ? { c:T.red,   bg:T.redDim,   brd:T.redBrd,   l:"Fail" }
          : { c:T.amber, bg:T.amberDim, brd:T.amberBrd, l: result === "REPAIR_REQUIRED" ? "Repair Required" : "Conditional" };
  return <span style={{ padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:800, background:s.bg, border:`1px solid ${s.brd}`, color:s.c }}>{s.l}</span>;
}

function Field({ label, children }) {
  return (
    <div>
      <label style={LS}>{label}</label>
      {children}
    </div>
  );
}

function SectionCard({ title, icon, color=T.accent, brd, children }) {
  return (
    <div style={{ background:T.panel, border:`1px solid ${brd||T.border}`, borderRadius:16, padding:20, marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, paddingBottom:12, borderBottom:`1px solid ${T.border}` }}>
        <span style={{ fontSize:18 }}>{icon}</span>
        <span style={{ fontSize:14, fontWeight:800, color }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function StepBar({ current }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", marginBottom:24, overflowX:"auto", WebkitOverflowScrolling:"touch", gap:0 }}>
      {STEPS.map((s, i) => {
        const done   = s.id < current;
        const active = s.id === current;
        return (
          <div key={s.id} style={{ display:"flex", alignItems:"center", flex:1, minWidth:0 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, flex:1 }}>
              <div style={{
                width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:14, fontWeight:900, flexShrink:0,
                background: done ? T.green : active ? T.accent : T.card,
                border: `2px solid ${done ? T.green : active ? T.accent : T.border}`,
                color: (done || active) ? "#052e16" : T.textDim,
                transition:"all .2s",
              }}>
                {done ? "✓" : s.icon}
              </div>
              <div style={{ fontSize:9, fontWeight:700, color: active ? T.accent : done ? T.green : T.textDim, textAlign:"center", textTransform:"uppercase", letterSpacing:"0.04em", whiteSpace:"nowrap" }}>
                {s.label}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ height:2, width:24, background: done ? T.green : T.border, marginBottom:20, flexShrink:0 }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

const emptyPV = () => ({ sn:"", description:"", capacity:"", working_pressure:"", test_pressure:"", pressure_unit:"bar", result:"PASS", notes:"" });

export default function CraneInspectionPage() {
  const router = useRouter();
  const [step,    setStep]    = useState(1);
  const [clients, setClients] = useState([]);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(null);
  const [error,   setError]   = useState("");

  const [crane, setCrane] = useState({
    client_id:"", client_name:"", client_location:"",
    crane_type:"Mobile Crane", model:"", serial_number:"",
    fleet_number:"", registration_number:"", swl:"",
    inspection_date: new Date().toISOString().split("T")[0],
    notes:"",
  });

  const [craneInsp, setCraneInsp] = useState({
    structural_result:"PASS", boom_condition:"PASS", outriggers:"PASS",
    crane_computer:"PASS", test_load:"", defects:"", recommendations:"", result:"PASS",
  });

  const [boom, setBoom] = useState({
    min_radius:"", max_radius:"", min_boom_length:"", max_boom_length:"",
    actual_boom_length:"", extended_boom_length:"",
    jib_fitted:"no", jib_length:"", jib_angle:"",
    swl_at_min_radius:"", swl_at_max_radius:"", swl_at_actual_config:"",
    boom_angle:"", load_tested_at_radius:"", test_load:"",
    luffing_system:"PASS", slew_system:"PASS", hoist_system:"PASS",
    boom_structure:"PASS", boom_pins:"PASS", boom_wear:"PASS",
    anemometer:"PASS", lmi_test:"PASS", anti_two_block:"PASS",
    notes:"",
  });

  const [hook, setHook] = useState({
    serial_number:"", swl:"", latch_condition:"PASS",
    structural_result:"PASS", wear_percentage:"", result:"PASS", notes:"",
  });

  const [rope, setRope] = useState({
    diameter:"", length:"", rope_type:"Wire Rope",
    broken_wires:"0", corrosion:"none", kinks:"none",
    result:"PASS", notes:"",
  });

  const [pvs, setPvs] = useState([emptyPV()]);

  useEffect(() => {
    supabase.from("clients").select("id,company_name,company_code,city,contact_person").order("company_name")
      .then(({ data, error }) => {
        if(error) console.error("clients fetch error:", error.message);
        setClients(data || []);
      });
  }, []);

  const uc  = (k,v) => setCrane(p => ({ ...p, [k]:v }));
  const uci = (k,v) => setCraneInsp(p => ({ ...p, [k]:v }));
  const ub  = (k,v) => setBoom(p => ({ ...p, [k]:v }));
  const uh  = (k,v) => setHook(p => ({ ...p, [k]:v }));
  const ur  = (k,v) => setRope(p => ({ ...p, [k]:v }));
  const upv = (i,k,v) => setPvs(p => p.map((x,j) => j===i ? { ...x, [k]:v } : x));

  function clientSelected(id) {
    const c = clients.find(x => x.id === id);
    setCrane(p => ({ ...p, client_id:id, client_name:c?.company_name||"", client_location:c?.city||"" }));
  }

  function canNext() {
    if (step === 1) return crane.client_id && crane.serial_number && crane.crane_type && crane.inspection_date;
    return true;
  }

  // Auto-generate company code e.g. GMC-001
  function generateCompanyCode(name) {
    const initials = name.trim().split(/\s+/).map(w => w[0]?.toUpperCase()||"").join("").slice(0,3).padEnd(3,"X");
    const rand = String(Math.floor(Math.random()*900)+100);
    return `${initials}-${rand}`;
  }

  // Auto-register client in clients table if not already there
  async function ensureClient(name, city) {
    if (!name || !name.trim()) return;
    const { data: existing } = await supabase.from("clients")
      .select("id").ilike("company_name", name.trim()).maybeSingle();
    if (!existing) {
      await supabase.from("clients").insert({
        company_name:   name.trim(),
        company_code:   generateCompanyCode(name),
        city:           city || "",
        country:        "Botswana",
        status:         "active",
      });
    }
  }

  async function handleGenerate() {
    if (!crane.client_id || !crane.serial_number) { setError("Please fill crane serial number and client."); return; }
    setSaving(true); setError("");

    // Auto-register client if typed manually
    await ensureClient(crane.client_name, crane.client_location);

    // Auto-generate serial if blank
    const craneData = { ...crane };
    if (!craneData.serial_number?.trim()) {
      const cc = (craneData.client_name||"UNK").trim().split(/\s+/).map(w=>w[0]?.toUpperCase()||"").join("").slice(0,3).padEnd(3,"X");
      craneData.serial_number = `${cc}-CRN-${String(Date.now()).slice(-6)}`;
    }

    const folderId   = crypto.randomUUID();
    const folderName = `Crane-${crane.serial_number}-${crane.inspection_date}`;
    const iDate      = crane.inspection_date;
    const exp1yr     = addMonths(iDate, 12); // crane + pressure vessels
    const exp6mo     = addMonths(iDate, 6);  // hook + rope
    const certs      = [];

    const pad = n => String(n).padStart(5, "0");
    const { count } = await supabase.from("certificates").select("*", { count:"exact", head:true });
    let seq = (count || 0) + 1;
    const nextNo = (prefix) => `CERT-${prefix}${pad(seq++)}`;

    // 1. Crane — Load Test Certificate — 1 year
    certs.push({
      certificate_number: nextNo("CR"),
      equipment_type: crane.crane_type,
      equipment_description: `${craneData.crane_type}${crane.model ? " " + crane.model : ""} SWL ${crane.swl}${crane.fleet_number ? " Fleet " + crane.fleet_number : ""}${crane.registration_number ? " Reg " + crane.registration_number : ""}`,
      serial_number: craneData.serial_number,
      model: craneData.model,
      swl: craneData.swl,
      registration_number: craneData.registration_number,
      client_name: craneData.client_name, client_id: craneData.client_id, location: craneData.client_location,
      issue_date: iDate, inspection_date: iDate, expiry_date: exp1yr, next_inspection_due: exp1yr,
      result: craneInsp.result,
      defects_found: craneInsp.defects,
      recommendations: craneInsp.recommendations,
      inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID,
      certificate_type: "Load Test Certificate",
      folder_id: folderId, folder_name: folderName, folder_position: 1,
      fleet_number: craneData.fleet_number,
      registration_number: craneData.registration_number,
      notes: [
        `Structural: ${craneInsp.structural_result}`,
        `Boom: ${craneInsp.boom_condition}`,
        `Outriggers: ${craneInsp.outriggers}`,
        `Computer: ${craneInsp.crane_computer}`,
        craneInsp.test_load ? `Test load (crane): ${craneInsp.test_load}T` : "",
        boom.actual_boom_length ? `Boom length: ${boom.actual_boom_length}m` : "",
        boom.extended_boom_length ? `Extended: ${boom.extended_boom_length}m` : "",
        boom.boom_angle ? `Angle: ${boom.boom_angle}°` : "",
        boom.load_tested_at_radius ? `Test radius: ${boom.load_tested_at_radius}m` : "",
        boom.test_load ? `Load test (boom): ${boom.test_load}T` : "",
        boom.swl_at_actual_config ? `SWL at config: ${boom.swl_at_actual_config}` : "",
        boom.jib_fitted === "yes" && boom.jib_length ? `Jib: ${boom.jib_length}m @ ${boom.jib_angle}°` : "",
        boom.boom_structure !== "PASS" ? `Boom structure: ${boom.boom_structure}` : "",
        boom.lmi_test !== "PASS" ? `LMI: ${boom.lmi_test}` : "",
        crane.notes ? `Notes: ${crane.notes}` : "",
      ].filter(Boolean).join(" | "),
    });

    // 2. Hook — Load Test Certificate — 6 months
    certs.push({
      certificate_number: nextNo("HK"),
      equipment_type: "Crane Hook",
      equipment_description: `Crane Hook SWL ${hook.swl || crane.swl} — ${crane.crane_type} SN ${crane.serial_number}`,
      serial_number: hook.serial_number || crane.serial_number,
      swl: hook.swl || crane.swl,
      client_name: craneData.client_name, client_id: craneData.client_id, location: craneData.client_location,
      issue_date: iDate, inspection_date: iDate, expiry_date: exp6mo, next_inspection_due: exp6mo,
      result: hook.result,
      serial_number: hook.serial_number || crane.serial_number,
      inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID,
      certificate_type: "Load Test Certificate",
      folder_id: folderId, folder_name: folderName, folder_position: 2,
      notes: `Latch: ${hook.latch_condition} | Structural: ${hook.structural_result}${hook.wear_percentage ? " | Wear: " + hook.wear_percentage + "%" : ""}${hook.notes ? " | Notes: " + hook.notes : ""}`,
    });

    // 3. Rope — Load Test Certificate — 6 months
    certs.push({
      certificate_number: nextNo("RP"),
      equipment_type: "Wire Rope",
      equipment_description: `${rope.rope_type}${rope.diameter ? " Ø" + rope.diameter + "mm" : ""}${rope.length ? " L" + rope.length + "m" : ""} — ${crane.crane_type} SN ${crane.serial_number}`,
      serial_number: craneData.serial_number,
      capacity_volume: rope.diameter ? `Ø${rope.diameter}mm × ${rope.length || "?"}m` : "",
      swl: craneData.swl,
      client_name: craneData.client_name, client_id: craneData.client_id, location: craneData.client_location,
      issue_date: iDate, inspection_date: iDate, expiry_date: exp6mo, next_inspection_due: exp6mo,
      result: rope.result,
      inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID,
      certificate_type: "Load Test Certificate",
      folder_id: folderId, folder_name: folderName, folder_position: 3,
      notes: `Broken wires: ${rope.broken_wires} | Corrosion: ${rope.corrosion} | Kinks: ${rope.kinks}${rope.notes ? " | " + rope.notes : ""}`,
    });

    // 4. Pressure vessels — Pressure Test Certificate — 1 year each
    for (let i = 0; i < pvs.length; i++) {
      const pv = pvs[i];
      if (!pv.sn && !pv.description) continue;
      certs.push({
        certificate_number: nextNo("PV"),
        equipment_type: "Pressure Vessel",
        equipment_description: pv.description || `Pressure Vessel ${i + 1} — ${crane.crane_type} SN ${crane.serial_number}`,
        serial_number: pv.sn,
        capacity_volume: pv.capacity,
        working_pressure: pv.working_pressure,
        test_pressure: pv.test_pressure,
        pressure_unit: pv.pressure_unit,
        client_name: craneData.client_name, client_id: craneData.client_id, location: craneData.client_location,
        issue_date: iDate, inspection_date: iDate,
        expiry_date: exp1yr, // 1 year — same as crane
        next_inspection_due: exp1yr,
        result: pv.result,
        defects_found: pv.notes,
        inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID,
        certificate_type: "Pressure Test Certificate",
        folder_id: folderId, folder_name: folderName, folder_position: 4 + i,
      });
    }

    const { data, error: dbErr } = await supabase.from("certificates").insert(certs).select("id,certificate_number,equipment_type,result,expiry_date");
    if (dbErr) { setError("Failed to save: " + dbErr.message); setSaving(false); return; }
    setSaved({ folderName, folderId, certs: data });
    setSaving(false);
  }

  // ── SAVED STATE ──────────────────────────────────────────────────────────
  if (saved) return (
    <AppLayout title="Crane Inspection — Complete">
      <div style={{ fontFamily:"'IBM Plex Sans',sans-serif", color:T.text, padding:20, maxWidth:800, margin:"0 auto" }}>
        <div style={{ background:T.greenDim, border:`1px solid ${T.greenBrd}`, borderRadius:18, padding:28, textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:40, marginBottom:10 }}>✅</div>
          <div style={{ fontSize:22, fontWeight:900, color:T.green, marginBottom:6 }}>Crane Inspection Complete</div>
          <div style={{ fontSize:14, color:T.textMid, marginBottom:4 }}>{saved.certs.length} certificates generated and saved</div>
          <div style={{ fontSize:12, color:T.textDim }}>Folder: {saved.folderName}</div>
        </div>
        <div style={{ display:"grid", gap:10, marginBottom:20 }}>
          {saved.certs.map(c => (
            <div key={c.id} style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:12, padding:"13px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:T.accent, fontFamily:"'IBM Plex Mono',monospace" }}>{c.certificate_number}</div>
                <div style={{ fontSize:12, color:T.textDim, marginTop:2 }}>{c.equipment_type} · Expires {fmt(c.expiry_date)}</div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                <ResultBadge result={c.result}/>
                <button type="button" onClick={() => window.open(`/certificates/${c.id}`, "_blank")}
                  style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${T.accentBrd}`, background:T.accentDim, color:T.accent, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>View →</button>
                <button type="button" onClick={() => window.open(`/certificates/print/${c.id}`, "_blank")}
                  style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${T.border}`, background:T.card, color:T.textMid, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Print</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <button type="button" onClick={() => { setSaved(null); setStep(1); }}
            style={{ padding:"11px 20px", borderRadius:10, border:`1px solid ${T.border}`, background:T.card, color:T.text, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
            New Inspection
          </button>
          <button type="button" onClick={() => router.push("/certificates")}
            style={{ padding:"11px 20px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#22d3ee,#0891b2)", color:"#052e16", fontWeight:900, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
            View All Certificates →
          </button>
        </div>
      </div>
    </AppLayout>
  );

  // ── WIZARD ───────────────────────────────────────────────────────────────
  return (
    <AppLayout title="Crane Inspection">
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        input::placeholder,textarea::placeholder{color:rgba(240,246,255,0.28)}
        select option{background:#0a1420;color:#f0f6ff}
        textarea{resize:vertical}
        .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
        @media(max-width:640px){.g2{grid-template-columns:1fr!important}.g3{grid-template-columns:1fr 1fr!important}}
      `}</style>

      <div style={{ fontFamily:"'IBM Plex Sans',sans-serif", color:T.text, padding:20, maxWidth:900, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:18, padding:"14px 20px", marginBottom:20, backdropFilter:"blur(20px)" }}>
          <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", color:T.accent, marginBottom:4 }}>Certificates · New Inspection</div>
          <h1 style={{ margin:"0 0 2px", fontSize:22, fontWeight:900, letterSpacing:"-0.02em" }}>Crane Inspection Wizard</h1>
          <p style={{ margin:0, fontSize:12, color:T.textDim }}>Generates certificates for crane, hook, rope and all pressure vessels in one session</p>
          <div style={{display:"flex",gap:12,marginTop:10,flexWrap:"wrap"}}>
            <a href="/certificates" style={{fontSize:11,color:T.accent,textDecoration:"none",fontWeight:700}}>📜 View All Certificates →</a>
            <a href="/clients" style={{fontSize:11,color:T.accent,textDecoration:"none",fontWeight:700}}>🏢 Clients →</a>
            <a href="/certificates/import" style={{fontSize:11,color:T.accent,textDecoration:"none",fontWeight:700}}>🤖 AI Import →</a>
          </div>
        </div>

        <StepBar current={step}/>

        {error && <div style={{ padding:"10px 14px", borderRadius:10, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontSize:13, fontWeight:700, marginBottom:16 }}>⚠ {error}</div>}

        {/* ── STEP 1: Crane Details ── */}
        {step === 1 && (
          <>
            <SectionCard title="Crane Identification" icon="🏗" color={T.accent} brd={T.accentBrd}>
              <div className="g2" style={{ marginBottom:14 }}>
                <Field label="Client">
                  <select style={IS} value={crane.client_id} onChange={e => clientSelected(e.target.value)}>
                    <option value="">— Select Client —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}{c.city ? " — " + c.city : ""}</option>)}
                  </select>
                  {clients.length === 0 && (
                    <div style={{fontSize:11,color:T.amber,marginTop:5}}>No clients found. <a href="/clients/register" target="_blank" style={{color:T.accent}}>Register a client first →</a></div>
                  )}
                  {clients.length > 0 && (
                    <div style={{fontSize:11,color:T.textDim,marginTop:5}}>
                      Client not listed? <a href="/clients/register" target="_blank" style={{color:T.accent,textDecoration:"none",fontWeight:700}}>+ Register new client</a>
                      <span style={{color:T.textDim}}> (then refresh this page)</span>
                    </div>
                  )}
                </Field>
                <Field label="Inspection Date">
                  <input style={IS} type="date" value={crane.inspection_date} onChange={e => uc("inspection_date", e.target.value)}/>
                </Field>
              </div>
              <div className="g2" style={{ marginBottom:14 }}>
                <Field label="Crane Type">
                  <select style={IS} value={crane.crane_type} onChange={e => uc("crane_type", e.target.value)}>
                    {CRANE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Model / Make">
                  <input style={IS} placeholder="e.g. Liebherr LTM 1100" value={crane.model} onChange={e => uc("model", e.target.value)}/>
                </Field>
              </div>
              <div className="g3" style={{ marginBottom:14 }}>
                <Field label="Serial Number *">
                  <input style={IS} placeholder="e.g. LTM-2024-001" value={crane.serial_number} onChange={e => uc("serial_number", e.target.value)}/>
                </Field>
                <Field label="Fleet Number">
                  <input style={IS} placeholder="e.g. FL-042" value={crane.fleet_number} onChange={e => uc("fleet_number", e.target.value)}/>
                </Field>
                <Field label="Registration Number">
                  <input style={IS} placeholder="e.g. B 123 ABC" value={crane.registration_number} onChange={e => uc("registration_number", e.target.value)}/>
                </Field>
              </div>
              <div className="g2" style={{ marginBottom:14 }}>
                <Field label="Safe Working Load (SWL)">
                  <input style={IS} placeholder="e.g. 100T" value={crane.swl} onChange={e => uc("swl", e.target.value)}/>
                </Field>
                <Field label="Client City / Site">
                  <input style={IS} placeholder="Auto-filled from client" value={crane.client_location} onChange={e => uc("client_location", e.target.value)}/>
                </Field>
              </div>
              <Field label="General Notes">
                <textarea style={{ ...IS, minHeight:70 }} placeholder="Any general notes about the crane..." value={crane.notes} onChange={e => uc("notes", e.target.value)}/>
              </Field>
            </SectionCard>
            {/* Expiry preview */}
            {crane.inspection_date && (
              <div style={{ background:T.accentDim, border:`1px solid ${T.accentBrd}`, borderRadius:12, padding:"12px 16px", display:"flex", gap:20, flexWrap:"wrap", fontSize:12, color:T.textMid }}>
                <div>📅 <strong style={{ color:T.text }}>Crane + Pressure Vessels expire:</strong> {fmt(addMonths(crane.inspection_date, 12))} <span style={{ color:T.textDim }}>(1 year)</span></div>
                <div>📅 <strong style={{ color:T.text }}>Hook + Rope expire:</strong> {fmt(addMonths(crane.inspection_date, 6))} <span style={{ color:T.textDim }}>(6 months)</span></div>
              </div>
            )}
          </>
        )}

        {/* ── STEP 2: Crane Inspection ── */}
        {step === 2 && (
          <SectionCard title="Crane Structural & Computer Inspection" icon="🔍" color={T.blue} brd={T.blueBrd}>
            <div className="g2" style={{ marginBottom:14 }}>
              <Field label="Structural Integrity">
                <ResultSelect value={craneInsp.structural_result} onChange={v => uci("structural_result", v)}/>
              </Field>
              <Field label="Boom Condition">
                <ResultSelect value={craneInsp.boom_condition} onChange={v => uci("boom_condition", v)}/>
              </Field>
            </div>
            <div className="g2" style={{ marginBottom:14 }}>
              <Field label="Outriggers">
                <ResultSelect value={craneInsp.outriggers} onChange={v => uci("outriggers", v)}/>
              </Field>
              <Field label="Crane Computer / LMI">
                <ResultSelect value={craneInsp.crane_computer} onChange={v => uci("crane_computer", v)}/>
              </Field>
            </div>
            <div className="g2" style={{ marginBottom:14 }}>
              <Field label="Test Load Applied (Tonnes)">
                <input style={IS} placeholder="e.g. 110" value={craneInsp.test_load} onChange={e => uci("test_load", e.target.value)}/>
              </Field>
              <Field label="Overall Crane Result">
                <ResultSelect value={craneInsp.result} onChange={v => uci("result", v)}/>
              </Field>
            </div>
            <div className="g2" style={{ marginBottom:0 }}>
              <Field label="Defects Found">
                <textarea style={{ ...IS, minHeight:80 }} placeholder="Describe any defects..." value={craneInsp.defects} onChange={e => uci("defects", e.target.value)}/>
              </Field>
              <Field label="Recommendations">
                <textarea style={{ ...IS, minHeight:80 }} placeholder="Recommendations..." value={craneInsp.recommendations} onChange={e => uci("recommendations", e.target.value)}/>
              </Field>
            </div>
          </SectionCard>
        )}

        {/* ── STEP 3: Boom Inspection ── */}
        {step === 3 && (
          <SectionCard title="Boom Configuration & Load Chart" icon="📐" color={T.blue} brd={T.blueBrd}>

            {/* Boom geometry */}
            <div style={{ fontSize:12, fontWeight:800, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Boom Geometry</div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Min Boom Length (m)">
                <input style={IS} placeholder="e.g. 12.5" value={boom.min_boom_length} onChange={e=>ub("min_boom_length",e.target.value)}/>
              </Field>
              <Field label="Max Boom Length (m)">
                <input style={IS} placeholder="e.g. 60" value={boom.max_boom_length} onChange={e=>ub("max_boom_length",e.target.value)}/>
              </Field>
              <Field label="Actual Boom Length (m)">
                <input style={IS} placeholder="e.g. 36" value={boom.actual_boom_length} onChange={e=>ub("actual_boom_length",e.target.value)}/>
              </Field>
            </div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Extended / Telescoped (m)">
                <input style={IS} placeholder="e.g. 28" value={boom.extended_boom_length} onChange={e=>ub("extended_boom_length",e.target.value)}/>
              </Field>
              <Field label="Boom Angle (°)">
                <input style={IS} placeholder="e.g. 75" value={boom.boom_angle} onChange={e=>ub("boom_angle",e.target.value)}/>
              </Field>
              <Field label="Jib Fitted">
                <select style={IS} value={boom.jib_fitted} onChange={e=>ub("jib_fitted",e.target.value)}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>
            </div>
            {boom.jib_fitted === "yes" && (
              <div className="g2" style={{ marginBottom:14 }}>
                <Field label="Jib Length (m)">
                  <input style={IS} placeholder="e.g. 18" value={boom.jib_length} onChange={e=>ub("jib_length",e.target.value)}/>
                </Field>
                <Field label="Jib Angle (°)">
                  <input style={IS} placeholder="e.g. 30" value={boom.jib_angle} onChange={e=>ub("jib_angle",e.target.value)}/>
                </Field>
              </div>
            )}

            {/* Working radius / SWL */}
            <div style={{ fontSize:12, fontWeight:800, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.08em", margin:"18px 0 10px" }}>Working Radius & SWL</div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Min Radius (m)">
                <input style={IS} placeholder="e.g. 3" value={boom.min_radius} onChange={e=>ub("min_radius",e.target.value)}/>
              </Field>
              <Field label="Max Radius (m)">
                <input style={IS} placeholder="e.g. 52" value={boom.max_radius} onChange={e=>ub("max_radius",e.target.value)}/>
              </Field>
              <Field label="Test Radius (m)">
                <input style={IS} placeholder="e.g. 12" value={boom.load_tested_at_radius} onChange={e=>ub("load_tested_at_radius",e.target.value)}/>
              </Field>
            </div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="SWL at Min Radius">
                <input style={IS} placeholder="e.g. 100T" value={boom.swl_at_min_radius} onChange={e=>ub("swl_at_min_radius",e.target.value)}/>
              </Field>
              <Field label="SWL at Max Radius">
                <input style={IS} placeholder="e.g. 6.5T" value={boom.swl_at_max_radius} onChange={e=>ub("swl_at_max_radius",e.target.value)}/>
              </Field>
              <Field label="SWL at Test Config">
                <input style={IS} placeholder="e.g. 50T" value={boom.swl_at_actual_config} onChange={e=>ub("swl_at_actual_config",e.target.value)}/>
              </Field>
            </div>
            <div style={{ marginBottom:14 }}>
              <Field label="Load Test Applied (Tonnes) — 110% of SWL at test config">
                <input style={IS} placeholder="e.g. 55" value={boom.test_load} onChange={e=>ub("test_load",e.target.value)}/>
              </Field>
            </div>

            {/* Systems condition */}
            <div style={{ fontSize:12, fontWeight:800, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.08em", margin:"18px 0 10px" }}>Boom Systems Condition</div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Boom Structure"><ResultSelect value={boom.boom_structure} onChange={v=>ub("boom_structure",v)}/></Field>
              <Field label="Boom Pins & Connections"><ResultSelect value={boom.boom_pins} onChange={v=>ub("boom_pins",v)}/></Field>
              <Field label="Boom Wear / Pads"><ResultSelect value={boom.boom_wear} onChange={v=>ub("boom_wear",v)}/></Field>
            </div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Luffing System"><ResultSelect value={boom.luffing_system} onChange={v=>ub("luffing_system",v)}/></Field>
              <Field label="Slew System"><ResultSelect value={boom.slew_system} onChange={v=>ub("slew_system",v)}/></Field>
              <Field label="Hoist System"><ResultSelect value={boom.hoist_system} onChange={v=>ub("hoist_system",v)}/></Field>
            </div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="LMI Tested at Config"><ResultSelect value={boom.lmi_test} onChange={v=>ub("lmi_test",v)}/></Field>
              <Field label="Anti-Two Block Device"><ResultSelect value={boom.anti_two_block} onChange={v=>ub("anti_two_block",v)}/></Field>
              <Field label="Anemometer (if fitted)"><ResultSelect value={boom.anemometer} onChange={v=>ub("anemometer",v)}/></Field>
            </div>
            <Field label="Boom Notes">
              <textarea style={{ ...IS, minHeight:70 }} placeholder="Additional boom inspection notes..." value={boom.notes} onChange={e=>ub("notes",e.target.value)}/>
            </Field>
          </SectionCard>
        )}


        {/* ── STEP 3: Boom Inspection ── */}
        {step === 5 && (
          <SectionCard title="Boom Configuration & Load Chart" icon="📐" color={T.blue} brd={T.blueBrd}>
            <div style={{ fontSize:12, fontWeight:800, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Boom Geometry</div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Min Boom Length (m)"><input style={IS} placeholder="e.g. 12.5" value={boom.min_boom_length} onChange={e=>ub("min_boom_length",e.target.value)}/></Field>
              <Field label="Max Boom Length (m)"><input style={IS} placeholder="e.g. 60" value={boom.max_boom_length} onChange={e=>ub("max_boom_length",e.target.value)}/></Field>
              <Field label="Actual Boom Length (m)"><input style={IS} placeholder="e.g. 36" value={boom.actual_boom_length} onChange={e=>ub("actual_boom_length",e.target.value)}/></Field>
            </div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Extended / Telescoped (m)"><input style={IS} placeholder="e.g. 28" value={boom.extended_boom_length} onChange={e=>ub("extended_boom_length",e.target.value)}/></Field>
              <Field label="Boom Angle (°)"><input style={IS} placeholder="e.g. 75" value={boom.boom_angle} onChange={e=>ub("boom_angle",e.target.value)}/></Field>
              <Field label="Jib Fitted">
                <select style={IS} value={boom.jib_fitted} onChange={e=>ub("jib_fitted",e.target.value)}>
                  <option value="no">No</option><option value="yes">Yes</option>
                </select>
              </Field>
            </div>
            {boom.jib_fitted === "yes" && (
              <div className="g2" style={{ marginBottom:14 }}>
                <Field label="Jib Length (m)"><input style={IS} placeholder="e.g. 18" value={boom.jib_length} onChange={e=>ub("jib_length",e.target.value)}/></Field>
                <Field label="Jib Angle (°)"><input style={IS} placeholder="e.g. 30" value={boom.jib_angle} onChange={e=>ub("jib_angle",e.target.value)}/></Field>
              </div>
            )}
            <div style={{ fontSize:12, fontWeight:800, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.08em", margin:"18px 0 10px" }}>Working Radius & SWL</div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Min Radius (m)"><input style={IS} placeholder="e.g. 3" value={boom.min_radius} onChange={e=>ub("min_radius",e.target.value)}/></Field>
              <Field label="Max Radius (m)"><input style={IS} placeholder="e.g. 52" value={boom.max_radius} onChange={e=>ub("max_radius",e.target.value)}/></Field>
              <Field label="Test Radius (m)"><input style={IS} placeholder="e.g. 12" value={boom.load_tested_at_radius} onChange={e=>ub("load_tested_at_radius",e.target.value)}/></Field>
            </div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="SWL at Min Radius"><input style={IS} placeholder="e.g. 100T" value={boom.swl_at_min_radius} onChange={e=>ub("swl_at_min_radius",e.target.value)}/></Field>
              <Field label="SWL at Max Radius"><input style={IS} placeholder="e.g. 6.5T" value={boom.swl_at_max_radius} onChange={e=>ub("swl_at_max_radius",e.target.value)}/></Field>
              <Field label="SWL at Test Config"><input style={IS} placeholder="e.g. 50T" value={boom.swl_at_actual_config} onChange={e=>ub("swl_at_actual_config",e.target.value)}/></Field>
            </div>
            <Field label="Load Test Applied (Tonnes) — 110% of SWL at test config">
              <input style={IS} placeholder="e.g. 55" value={boom.test_load} onChange={e=>ub("test_load",e.target.value)}/>
            </Field>
            <div style={{ fontSize:12, fontWeight:800, color:T.textDim, textTransform:"uppercase", letterSpacing:"0.08em", margin:"18px 0 10px" }}>Boom Systems Condition</div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Boom Structure"><ResultSelect value={boom.boom_structure} onChange={v=>ub("boom_structure",v)}/></Field>
              <Field label="Boom Pins & Connections"><ResultSelect value={boom.boom_pins} onChange={v=>ub("boom_pins",v)}/></Field>
              <Field label="Boom Wear / Pads"><ResultSelect value={boom.boom_wear} onChange={v=>ub("boom_wear",v)}/></Field>
            </div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Luffing System"><ResultSelect value={boom.luffing_system} onChange={v=>ub("luffing_system",v)}/></Field>
              <Field label="Slew System"><ResultSelect value={boom.slew_system} onChange={v=>ub("slew_system",v)}/></Field>
              <Field label="Hoist System"><ResultSelect value={boom.hoist_system} onChange={v=>ub("hoist_system",v)}/></Field>
            </div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="LMI Tested at Config"><ResultSelect value={boom.lmi_test} onChange={v=>ub("lmi_test",v)}/></Field>
              <Field label="Anti-Two Block Device"><ResultSelect value={boom.anti_two_block} onChange={v=>ub("anti_two_block",v)}/></Field>
              <Field label="Anemometer (if fitted)"><ResultSelect value={boom.anemometer} onChange={v=>ub("anemometer",v)}/></Field>
            </div>
            <Field label="Boom Notes">
              <textarea style={{ ...IS, minHeight:70 }} placeholder="Additional boom inspection notes..." value={boom.notes} onChange={e=>ub("notes",e.target.value)}/>
            </Field>
          </SectionCard>
        )}

        {/* ── STEP 4: Hook ── */}
        {step === 4 && (
          <SectionCard title="Hook Inspection — expires 6 months" icon="🪝" color={T.amber} brd={T.amberBrd}>
            <div className="g2" style={{ marginBottom:14 }}>
              <Field label="Hook Serial Number">
                <input style={IS} placeholder="e.g. HK-2024-001" value={hook.serial_number} onChange={e => uh("serial_number", e.target.value)}/>
              </Field>
              <Field label="Hook SWL">
                <input style={IS} placeholder="e.g. 100T" value={hook.swl} onChange={e => uh("swl", e.target.value)}/>
              </Field>
            </div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Latch Condition">
                <ResultSelect value={hook.latch_condition} onChange={v => uh("latch_condition", v)}/>
              </Field>
              <Field label="Structural Integrity">
                <ResultSelect value={hook.structural_result} onChange={v => uh("structural_result", v)}/>
              </Field>
              <Field label="Wear (%)">
                <input style={IS} placeholder="e.g. 5" value={hook.wear_percentage} onChange={e => uh("wear_percentage", e.target.value)}/>
              </Field>
            </div>
            <div className="g2">
              <Field label="Overall Hook Result">
                <ResultSelect value={hook.result} onChange={v => uh("result", v)}/>
              </Field>
              <Field label="Notes">
                <input style={IS} placeholder="Any additional notes" value={hook.notes} onChange={e => uh("notes", e.target.value)}/>
              </Field>
            </div>
          </SectionCard>
        )}

        {/* ── STEP 4: Rope ── */}
        {step === 5 && (
          <SectionCard title="Wire Rope Inspection — expires 6 months" icon="🪢" color={T.purple} brd={T.purpleBrd}>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Rope Diameter (mm)">
                <input style={IS} placeholder="e.g. 26" value={rope.diameter} onChange={e => ur("diameter", e.target.value)}/>
              </Field>
              <Field label="Rope Length (m)">
                <input style={IS} placeholder="e.g. 150" value={rope.length} onChange={e => ur("length", e.target.value)}/>
              </Field>
              <Field label="Rope Type">
                <select style={IS} value={rope.rope_type} onChange={e => ur("rope_type", e.target.value)}>
                  <option>Wire Rope</option>
                  <option>Fibre Core Wire Rope</option>
                  <option>Steel Core Wire Rope</option>
                  <option>Compacted Strand Wire Rope</option>
                </select>
              </Field>
            </div>
            <div className="g3" style={{ marginBottom:14 }}>
              <Field label="Broken Wires (count)">
                <input style={IS} placeholder="e.g. 0" value={rope.broken_wires} onChange={e => ur("broken_wires", e.target.value)}/>
              </Field>
              <Field label="Corrosion">
                <select style={IS} value={rope.corrosion} onChange={e => ur("corrosion", e.target.value)}>
                  <option value="none">None</option>
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </Field>
              <Field label="Kinks / Bends">
                <select style={IS} value={rope.kinks} onChange={e => ur("kinks", e.target.value)}>
                  <option value="none">None</option>
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
              </Field>
            </div>
            <div className="g2">
              <Field label="Overall Rope Result">
                <ResultSelect value={rope.result} onChange={v => ur("result", v)}/>
              </Field>
              <Field label="Notes">
                <input style={IS} placeholder="Any additional notes" value={rope.notes} onChange={e => ur("notes", e.target.value)}/>
              </Field>
            </div>
          </SectionCard>
        )}

        {/* ── STEP 5: Pressure Vessels ── */}
        {step === 6 && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:800, color:T.text }}>
                Pressure Vessels <span style={{ fontSize:12, color:T.textDim, fontWeight:400 }}>— expires 1 year · up to 8</span>
              </div>
              {pvs.length < 8 && (
                <button type="button" onClick={() => setPvs(p => [...p, emptyPV()])}
                  style={{ padding:"8px 16px", borderRadius:9, border:`1px solid ${T.greenBrd}`, background:T.greenDim, color:T.green, fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                  + Add Vessel
                </button>
              )}
            </div>
            {pvs.map((pv, i) => (
              <SectionCard key={i} title={`Pressure Vessel ${i + 1}`} icon="⚙️" color={T.green} brd={T.greenBrd}>
                <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:10 }}>
                  {pvs.length > 1 && (
                    <button type="button" onClick={() => setPvs(p => p.filter((_,j) => j !== i))}
                      style={{ padding:"4px 10px", borderRadius:7, border:`1px solid ${T.redBrd}`, background:T.redDim, color:T.red, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      Remove
                    </button>
                  )}
                </div>
                <div className="g2" style={{ marginBottom:14 }}>
                  <Field label="Serial Number">
                    <input style={IS} placeholder="e.g. PV-001" value={pv.sn} onChange={e => upv(i, "sn", e.target.value)}/>
                  </Field>
                  <Field label="Description">
                    <input style={IS} placeholder="e.g. Hydraulic Oil Tank" value={pv.description} onChange={e => upv(i, "description", e.target.value)}/>
                  </Field>
                </div>
                <div className="g3" style={{ marginBottom:14 }}>
                  <Field label="Capacity / Volume">
                    <input style={IS} placeholder="e.g. 200L" value={pv.capacity} onChange={e => upv(i, "capacity", e.target.value)}/>
                  </Field>
                  <Field label="Working Pressure">
                    <input style={IS} placeholder="e.g. 200" value={pv.working_pressure} onChange={e => upv(i, "working_pressure", e.target.value)}/>
                  </Field>
                  <Field label="Test Pressure">
                    <input style={IS} placeholder="e.g. 300" value={pv.test_pressure} onChange={e => upv(i, "test_pressure", e.target.value)}/>
                  </Field>
                </div>
                <div className="g2">
                  <Field label="Pressure Unit">
                    <select style={IS} value={pv.pressure_unit} onChange={e => upv(i, "pressure_unit", e.target.value)}>
                      <option value="bar">bar</option>
                      <option value="psi">psi</option>
                      <option value="MPa">MPa</option>
                      <option value="kPa">kPa</option>
                    </select>
                  </Field>
                  <Field label="Result">
                    <ResultSelect value={pv.result} onChange={v => upv(i, "result", v)}/>
                  </Field>
                </div>
                <div style={{ marginTop:14 }}>
                  <Field label="Notes / Defects">
                    <input style={IS} placeholder="Any defects or notes..." value={pv.notes} onChange={e => upv(i, "notes", e.target.value)}/>
                  </Field>
                </div>
              </SectionCard>
            ))}
          </>
        )}

        {/* ── STEP 6: Review ── */}
        {step === 7 && (
          <>
            <SectionCard title="Inspection Summary" icon="📋" color={T.accent}>
              <div style={{ display:"grid", gap:10 }}>
                {[
                  { label:"Crane", type:crane.crane_type, desc:`SN ${crane.serial_number}${crane.fleet_number?" · Fleet "+crane.fleet_number:""}${crane.registration_number?" · Reg "+crane.registration_number:""}`, result:craneInsp.result, exp:"1 year" },
                  { label:"Hook",  type:"Crane Hook", desc:`SN ${hook.serial_number||"—"} SWL ${hook.swl||crane.swl}`, result:hook.result, exp:"6 months" },
                  { label:"Rope",  type:"Wire Rope", desc:`Ø${rope.diameter||"?"}mm ${rope.rope_type}`, result:rope.result, exp:"6 months" },
                  ...pvs.filter(p=>p.sn||p.description).map((p,i)=>({ label:`PV ${i+1}`, type:"Pressure Vessel", desc:`SN ${p.sn||"—"} ${p.description}`, result:p.result, exp:"1 year" })),
                ].map((row, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:10, background:T.card, border:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                    <div style={{ fontSize:11, fontWeight:800, color:T.textDim, width:60, flexShrink:0 }}>{row.label}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{row.type}</div>
                      <div style={{ fontSize:11, color:T.textDim }}>{row.desc}</div>
                    </div>
                    <div style={{ fontSize:11, color:T.textDim, flexShrink:0 }}>Expires: {row.exp}</div>
                    <ResultBadge result={row.result}/>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:16, padding:"12px 14px", borderRadius:10, background:T.accentDim, border:`1px solid ${T.accentBrd}`, fontSize:12, color:T.textMid }}>
                📋 Client: <strong style={{ color:T.text }}>{crane.client_name}</strong> &nbsp;·&nbsp;
                Inspector: <strong style={{ color:T.text }}>{INSPECTOR_NAME}</strong> &nbsp;·&nbsp;
                Date: <strong style={{ color:T.text }}>{fmt(crane.inspection_date)}</strong>
              </div>
            </SectionCard>
          </>
        )}

        {/* ── NAV BUTTONS ── */}
        <div style={{ display:"flex", justifyContent:"space-between", gap:12, marginTop:8, flexWrap:"wrap" }}>
          <button type="button"
            onClick={() => step > 1 ? setStep(s => s - 1) : router.push("/certificates")}
            style={{ padding:"11px 20px", borderRadius:10, border:`1px solid ${T.border}`, background:T.card, color:T.textMid, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
            {step === 1 ? "← Cancel" : "← Back"}
          </button>

          {step < 7 ? (
            <button type="button"
              onClick={() => { setError(""); if (!canNext()) { setError("Please fill all required fields."); return; } setStep(s => s + 1); }}
              style={{ padding:"11px 24px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#22d3ee,#0891b2)", color:"#052e16", fontWeight:900, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
              Next → {STEPS[step]?.label}
            </button>
          ) : (
            <button type="button" onClick={handleGenerate} disabled={saving}
              style={{ padding:"11px 28px", borderRadius:10, border:"none", background:saving?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#34d399,#14b8a6)", color:saving?"rgba(240,246,255,0.4)":"#052e16", fontWeight:900, fontSize:14, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit" }}>
              {saving ? "Generating…" : "🏗 Generate All Certificates"}
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
