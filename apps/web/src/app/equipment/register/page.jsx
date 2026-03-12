import { useState } from "react";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6" };

const BOTSWANA_LOCATIONS = [
  "Gaborone","Francistown","Maun","Lobatse","Selebi-Phikwe","Jwaneng","Orapa",
  "Sowa Town","Kasane","Ghanzi","Letlhakane","Serowe","Molepolole","Kanye",
  "Mahalapye","Palapye","Mochudi","Mogoditshane","Tlokweng",
  "Morupule Colliery","Sua Pan (Botash)","Damtshaa Mine","Letlhakane Mine",
  "Jwaneng Mine Complex","BCL Smelter (Selebi-Phikwe)","Morupule Power Station",
  "Gaborone Industrial","Francistown Industrial","Lobatse Industrial",
];

const EQUIPMENT_TYPES = [
  "Pressure Vessel","Boiler","Air Receiver","Trestle Jack","Air Compressor",
  "Lever Hoist","Bottle Jack","Safety Harness","Jack Stand","Oil Separator",
  "Chain Block","Bow Shackle","Mobile Crane","Trolley Jack","Step Ladders",
  "Tifor","Crawl Beam","Beam Crawl","Beam Clamp","Webbing Sling","Nylon Sling",
  "Wire Sling","Fall Arrest","Man Cage","Shutter Clamp","Drum Clamp",
];

const PRESSURE_TYPES  = ["Pressure Vessel","Boiler","Air Receiver","Air Compressor","Oil Separator"];
const LIFTING_TYPES   = ["Trestle Jack","Lever Hoist","Bottle Jack","Safety Harness","Jack Stand",
  "Chain Block","Bow Shackle","Mobile Crane","Trolley Jack","Step Ladders","Tifor",
  "Crawl Beam","Beam Crawl","Beam Clamp","Webbing Sling","Nylon Sling",
  "Wire Sling","Fall Arrest","Man Cage","Shutter Clamp","Drum Clamp"];
const LANYARD_TYPES   = ["Safety Harness","Fall Arrest"];

const STANDARDS  = ["ASME Section VIII Div 1","ASME Section VIII Div 2","BS PD 5500","EN 13445","AD 2000 (Germany)","AS 1210 (Australia)","SANS 347 (South Africa)","Local / In-house","Other"];
const MATERIALS  = ["Carbon Steel","Stainless Steel 304","Stainless Steel 316","Duplex Stainless","Low Alloy Steel","Hastelloy","Inconel","Aluminium","Copper","Fibreglass (GRP)","Other"];
const FLUIDS     = ["Air / Compressed Air","Steam","Water","Hot Oil","Natural Gas","LPG / Propane","Hydrogen","Nitrogen","Oxygen","Ammonia","Hydrocarbons","Chemicals / Corrosive","Other"];
const CERT_TYPES = ["Compliance Certificate","Pressure Test Certificate","NDT Certificate","Compliance and Test Certificate"];
const FREQS      = ["3 Months","6 Months","12 Months","24 Months"];
const MOCK_CLIENTS = [
  { id:"1", company_name:"Jwaneng Mine Complex",   company_code:"CLT-001" },
  { id:"2", company_name:"BCL Smelter",            company_code:"CLT-002" },
  { id:"3", company_name:"Morupule Power Station", company_code:"CLT-003" },
  { id:"4", company_name:"ZHENGTAI GROUP",         company_code:"CLT-004" },
  { id:"5", company_name:"COMADEV",                company_code:"CLT-005" },
];

const empty = {
  serial_number:"", equipment_type:"Pressure Vessel", manufacturer:"", model:"",
  year_built:"", client_id:"", location:"", department:"",
  cert_type:"Compliance Certificate", design_standard:"ASME Section VIII Div 1",
  inspection_freq:"12 Months", shell_material:"Carbon Steel", fluid_type:"Air / Compressed Air",
  design_pressure:"", working_pressure:"", test_pressure:"", design_temperature:"", capacity_volume:"",
  safe_working_load:"", proof_load:"", lifting_height:"", sling_length:"", chain_size:"", rope_diameter:"",
  lanyard_serial_no:"", last_inspection_date:"", next_inspection_date:"",
  license_status:"valid", license_expiry:"", condition:"Good", status:"active", notes:"",
};

const inp = {
  width:"100%", padding:"10px 13px",
  background:"rgba(255,255,255,0.04)",
  border:"1px solid rgba(102,126,234,0.25)",
  borderRadius:8, color:"#e2e8f0", fontSize:13,
  fontFamily:"inherit", outline:"none", boxSizing:"border-box",
};
const lbl = {
  fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.45)",
  textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5, display:"block",
};
const sec = {
  fontSize:11, fontWeight:800, color:"#667eea", textTransform:"uppercase",
  letterSpacing:"0.12em", borderBottom:"1px solid rgba(102,126,234,0.18)",
  paddingBottom:8, marginBottom:16, marginTop:4,
  display:"flex", alignItems:"center", gap:8,
};

function Field({ label, children, highlight }) {
  return (
    <div>
      <label style={{ ...lbl, color: highlight ? C.green : "rgba(255,255,255,0.45)" }}>{label}</label>
      {children}
    </div>
  );
}

function Sel({ name, value, onChange, children, disabled }) {
  return (
    <div style={{ position:"relative" }}>
      <select name={name} value={value} onChange={onChange} disabled={disabled}
        style={{ ...inp, appearance:"none", WebkitAppearance:"none", paddingRight:36,
          background:"#1a1f2e", color:"#e2e8f0", cursor:disabled?"not-allowed":"pointer" }}>
        {children}
      </select>
      <span style={{ position:"absolute", right:11, top:"50%", transform:"translateY(-50%)",
        color:"#64748b", pointerEvents:"none", fontSize:11 }}>▾</span>
    </div>
  );
}

function LocationPicker({ name, value, onChange }) {
  const [manual, setManual] = useState(false);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <Sel name={name} value={manual?"__m__":(value||"")} onChange={e=>{
        if(e.target.value==="__m__"){ setManual(true); onChange({target:{name,value:""}}); }
        else { setManual(false); onChange(e); }
      }}>
        <option value="">Select location</option>
        {BOTSWANA_LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}
        <option value="__m__">Type manually…</option>
      </Sel>
      {manual && <input style={{...inp, borderColor:"rgba(0,245,196,0.4)"}} type="text"
        name={name} placeholder="Enter location / site name" value={value} onChange={onChange} autoFocus />}
    </div>
  );
}

export default function RegisterEquipmentUI() {
  const [form, setForm] = useState({ ...empty, equipment_type:"Safety Harness" });
  const [saved, setSaved] = useState(false);

  const set = e => {
    const { name, value } = e.target;
    setForm(p => {
      const n = { ...p, [name]:value };
      if (name === "equipment_type") {
        const isPres = PRESSURE_TYPES.includes(value);
        const isLift = LIFTING_TYPES.includes(value);
        const isLan  = LANYARD_TYPES.includes(value);
        if (isPres) { n.safe_working_load=""; n.proof_load=""; n.lifting_height=""; n.sling_length=""; n.chain_size=""; n.rope_diameter=""; n.lanyard_serial_no=""; }
        if (isLift && !isLan) { n.design_pressure=""; n.working_pressure=""; n.test_pressure=""; n.design_temperature=""; n.capacity_volume=""; n.fluid_type=""; n.lanyard_serial_no=""; }
        if (!isPres && !isLift) { n.design_pressure=""; n.working_pressure=""; n.test_pressure=""; n.design_temperature=""; n.capacity_volume=""; n.fluid_type=""; n.safe_working_load=""; n.proof_load=""; n.lifting_height=""; n.sling_length=""; n.chain_size=""; n.rope_diameter=""; n.lanyard_serial_no=""; }
      }
      return n;
    });
  };

  const isPressure = PRESSURE_TYPES.includes(form.equipment_type);
  const isLifting  = LIFTING_TYPES.includes(form.equipment_type);
  const hasLanyard = LANYARD_TYPES.includes(form.equipment_type);

  if (saved) return (
    <div style={{ minHeight:"100vh", background:"#0d1117", display:"flex", alignItems:"center",
      justifyContent:"center", flexDirection:"column", gap:16, fontFamily:"inherit" }}>
      <div style={{ fontSize:56 }}>✅</div>
      <div style={{ fontSize:22, fontWeight:800, color:"#fff" }}>Equipment Registered!</div>
      <div style={{ fontSize:13, color:"#64748b" }}>Redirecting to equipment detail…</div>
      <button onClick={()=>setSaved(false)} style={{ marginTop:8, padding:"10px 24px", borderRadius:8,
        border:"none", background:`linear-gradient(135deg,${C.purple},${C.blue})`,
        color:"#fff", fontWeight:700, cursor:"pointer", fontSize:13 }}>
        ← Back to Form
      </button>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#0d1117", fontFamily:"'Inter',system-ui,sans-serif",
      color:"#e2e8f0", padding:"28px 20px" }}>

      {/* Header */}
      <div style={{ marginBottom:24, maxWidth:900 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
          <button onClick={()=>alert("← Navigating to /equipment")} style={{
            display:"inline-flex", alignItems:"center", gap:6,
            padding:"7px 14px", borderRadius:8, cursor:"pointer",
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)",
            color:"#94a3b8", fontSize:12, fontWeight:600, fontFamily:"inherit",
          }}>
            ← Back to Equipment
          </button>
          <span style={{ color:"#334155" }}>›</span>
          <span style={{ fontSize:11, color:"#94a3b8", fontWeight:600 }}>Register</span>
        </div>
        <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:"#fff" }}>Register Equipment</h1>
        <div style={{ marginTop:8, width:72, height:4, borderRadius:999,
          background:`linear-gradient(90deg,${C.green},${C.purple},${C.blue})` }} />
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, margin:"8px 0 0" }}>
          Equipment tag is auto generated as CERT-01, CERT-02, CERT-03 and continues automatically.
        </p>
      </div>

      <div style={{ background:"linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))",
        border:"1px solid rgba(102,126,234,0.2)", borderRadius:16, padding:"24px 28px", maxWidth:900 }}>

        {/* ── Equipment Identity ── */}
        <div style={sec}>⚙️ Equipment Identity</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:14, marginBottom:24 }}>
          <Field label="Equipment Tag">
            <input style={{ ...inp, opacity:0.5, cursor:"not-allowed" }} value="Auto generated (e.g. CERT-01)" readOnly />
          </Field>
          <Field label="Serial Number / ID No. *">
            <input style={inp} type="text" name="serial_number" value={form.serial_number} onChange={set} placeholder="e.g. 0188" />
          </Field>

          {/* Lanyard — only for Safety Harness / Fall Arrest */}
          {hasLanyard && (
            <Field label={
              <span>Lanyard Serial No.
                <span style={{ marginLeft:6, fontSize:9, color:C.green,
                  background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)",
                  borderRadius:4, padding:"1px 5px", fontWeight:700 }}>
                  on certificate
                </span>
              </span>
            } highlight>
              <input style={{ ...inp, borderColor:"rgba(0,245,196,0.35)" }}
                type="text" name="lanyard_serial_no" value={form.lanyard_serial_no}
                onChange={set} placeholder="e.g. 0135" />
            </Field>
          )}

          <Field label="Equipment Type *">
            <Sel name="equipment_type" value={form.equipment_type} onChange={set}>
              {EQUIPMENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </Sel>
          </Field>
          <Field label="Manufacturer *">
            <input style={inp} type="text" name="manufacturer" value={form.manufacturer} onChange={set} placeholder="e.g. SALA, Petzl" />
          </Field>
          <Field label="Model / Drawing No.">
            <input style={inp} type="text" name="model" value={form.model} onChange={set} />
          </Field>
          <Field label="Year Built">
            <input style={inp} type="text" name="year_built" value={form.year_built} onChange={set} placeholder="Type freely" />
          </Field>
        </div>

        {/* ── Ownership & Site ── */}
        <div style={sec}>🏢 Ownership & Site</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:14, marginBottom:24 }}>
          <Field label="Client *">
            <Sel name="client_id" value={form.client_id} onChange={set}>
              <option value="">Select registered client</option>
              {MOCK_CLIENTS.map(c=><option key={c.id} value={c.id}>{c.company_name} ({c.company_code})</option>)}
            </Sel>
          </Field>
          <Field label="Location / Town *">
            <LocationPicker name="location" value={form.location} onChange={set} />
          </Field>
          <Field label="Department / Plant">
            <input style={inp} type="text" name="department" value={form.department} onChange={set} />
          </Field>
        </div>

        {/* ── Certificate Information ── */}
        <div style={sec}>📜 Certificate Information</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:14, marginBottom:24 }}>
          <Field label="Certificate Type *">
            <Sel name="cert_type" value={form.cert_type} onChange={set}>
              {CERT_TYPES.map(c=><option key={c} value={c}>{c}</option>)}
            </Sel>
          </Field>
          <Field label="Inspection Frequency">
            <Sel name="inspection_freq" value={form.inspection_freq} onChange={set}>
              {FREQS.map(f=><option key={f} value={f}>{f}</option>)}
            </Sel>
          </Field>
          <Field label="License Status">
            <Sel name="license_status" value={form.license_status} onChange={set}>
              <option value="valid">valid</option>
              <option value="expiring">expiring</option>
              <option value="expired">expired</option>
            </Sel>
          </Field>
        </div>

        {/* ── Design & Technical ── */}
        <div style={sec}>📐 Design & Technical Parameters</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:14, marginBottom:24 }}>
          <Field label="Shell / Body Material">
            <Sel name="shell_material" value={form.shell_material} onChange={set}>
              {MATERIALS.map(m=><option key={m} value={m}>{m}</option>)}
            </Sel>
          </Field>
          <Field label="Design Standard">
            <Sel name="design_standard" value={form.design_standard} onChange={set}>
              {STANDARDS.map(s=><option key={s} value={s}>{s}</option>)}
            </Sel>
          </Field>

          {isPressure && (<>
            <Field label="Fluid / Contents Type">
              <Sel name="fluid_type" value={form.fluid_type} onChange={set}>
                {FLUIDS.map(f=><option key={f} value={f}>{f}</option>)}
              </Sel>
            </Field>
            <Field label="Design Pressure (kPa)"><input style={inp} type="text" name="design_pressure" value={form.design_pressure} onChange={set} placeholder="e.g. 1500 kPa" /></Field>
            <Field label="Working Pressure (kPa)"><input style={inp} type="text" name="working_pressure" value={form.working_pressure} onChange={set} placeholder="e.g. 1200 kPa" /></Field>
            <Field label="Test Pressure (kPa)"><input style={inp} type="text" name="test_pressure" value={form.test_pressure} onChange={set} placeholder="e.g. 2250 kPa" /></Field>
            <Field label="Design Temperature"><input style={inp} type="text" name="design_temperature" value={form.design_temperature} onChange={set} /></Field>
            <Field label="Volume / Capacity"><input style={inp} type="text" name="capacity_volume" value={form.capacity_volume} onChange={set} /></Field>
          </>)}

          {isLifting && (<>
            <Field label="SWL"><input style={inp} type="text" name="safe_working_load" value={form.safe_working_load} onChange={set} placeholder="e.g. STANDARD or 2.5 Tons" /></Field>
            <Field label="Proof Load"><input style={inp} type="text" name="proof_load" value={form.proof_load} onChange={set} placeholder="e.g. 3 Tons" /></Field>
            <Field label="Lift Height"><input style={inp} type="text" name="lifting_height" value={form.lifting_height} onChange={set} /></Field>
            <Field label="Sling Length"><input style={inp} type="text" name="sling_length" value={form.sling_length} onChange={set} /></Field>
            <Field label="Chain Size"><input style={inp} type="text" name="chain_size" value={form.chain_size} onChange={set} /></Field>
            <Field label="Rope / Wire Diameter"><input style={inp} type="text" name="rope_diameter" value={form.rope_diameter} onChange={set} /></Field>
          </>)}
        </div>

        {/* ── Dates ── */}
        <div style={sec}>📅 Inspection & Service Dates</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:14, marginBottom:24 }}>
          <Field label="Last Inspection Date"><input style={inp} type="date" name="last_inspection_date" value={form.last_inspection_date} onChange={set} /></Field>
          <Field label="Next Inspection Due"><input style={inp} type="date" name="next_inspection_date" value={form.next_inspection_date} onChange={set} /></Field>
          <Field label="License Expiry"><input style={inp} type="date" name="license_expiry" value={form.license_expiry} onChange={set} /></Field>
        </div>

        {/* ── Operational Status ── */}
        <div style={sec}>📘 Operational Status</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:14, marginBottom:24 }}>
          <Field label="Condition"><input style={inp} type="text" name="condition" value={form.condition} onChange={set} /></Field>
          <Field label="Status">
            <Sel name="status" value={form.status} onChange={set}>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="suspended">suspended</option>
            </Sel>
          </Field>
        </div>

        {/* ── Notes ── */}
        <div style={sec}>📝 Notes</div>
        <div style={{ marginBottom:24 }}>
          <textarea style={{ ...inp, minHeight:90, resize:"vertical" }}
            name="notes" value={form.notes} onChange={set}
            placeholder="Any additional notes about this equipment…" />
        </div>

        {/* ── Live Preview strip ── */}
        {(form.serial_number || form.equipment_type) && (
          <div style={{ background:"rgba(0,245,196,0.04)", border:"1px solid rgba(0,245,196,0.15)",
            borderRadius:12, padding:"14px 18px", marginBottom:20 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.green, textTransform:"uppercase",
              letterSpacing:"0.1em", marginBottom:10 }}>📋 Certificate Preview</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10 }}>
              {[
                ["Equipment",    form.equipment_type],
                ["Serial / ID",  form.serial_number],
                hasLanyard && form.lanyard_serial_no ? ["Lanyard S/N", form.lanyard_serial_no] : null,
                ["Client",       MOCK_CLIENTS.find(c=>c.id===form.client_id)?.company_name],
                ["Location",     form.location],
                ["SWL",          form.safe_working_load],
                ["Cert Type",    form.cert_type],
                ["Issue Date",   form.last_inspection_date],
                ["Expiry Date",  form.next_inspection_date],
              ].filter(Boolean).filter(([,v])=>v).map(([label,val])=>(
                <div key={label}>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", textTransform:"uppercase",
                    letterSpacing:"0.08em", marginBottom:2 }}>{label}</div>
                  <div style={{ fontSize:12, color:"#e2e8f0", fontWeight:600 }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display:"flex", gap:12, justifyContent:"flex-end",
          paddingTop:16, borderTop:"1px solid rgba(102,126,234,0.12)" }}>
          <button onClick={()=>setForm({...empty,equipment_type:"Safety Harness"})} style={{
            padding:"11px 24px", borderRadius:8, cursor:"pointer", fontFamily:"inherit",
            fontWeight:700, background:"rgba(102,126,234,0.1)",
            border:"1px solid rgba(102,126,234,0.25)", color:"#667eea", fontSize:13 }}>
            Clear Form
          </button>
          <button onClick={()=>setSaved(true)} style={{
            padding:"11px 28px", borderRadius:8, cursor:"pointer", fontFamily:"inherit",
            fontWeight:700, background:"linear-gradient(135deg,#667eea,#764ba2)",
            border:"none", color:"#fff", boxShadow:"0 0 20px rgba(102,126,234,0.4)", fontSize:13 }}>
            Register Equipment
          </button>
        </div>
      </div>
    </div>
  );
}
