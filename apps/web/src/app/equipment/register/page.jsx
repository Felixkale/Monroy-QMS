// src/app/equipment/register/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import { registerEquipment } from "@/services/equipment";

const T = {
  bg:"#070e18",surface:"rgba(13,22,38,0.80)",panel:"rgba(10,18,32,0.92)",
  panel2:"rgba(18,30,50,0.70)",card:"rgba(255,255,255,0.025)",
  border:"rgba(148,163,184,0.12)",text:"#f0f6ff",
  textMid:"rgba(240,246,255,0.72)",textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee",accentDim:"rgba(34,211,238,0.10)",accentBrd:"rgba(34,211,238,0.25)",accentGlow:"rgba(34,211,238,0.18)",
  green:"#34d399",greenDim:"rgba(52,211,153,0.10)",greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",redDim:"rgba(248,113,113,0.10)",redBrd:"rgba(248,113,113,0.25)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  input::placeholder,textarea::placeholder{color:rgba(240,246,255,0.28)}
  select option{background:#0a1420;color:#f0f6ff}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.7);cursor:pointer}
  .reg-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
  .reg-btn-row{display:flex;gap:10px;flex-wrap:wrap}
  @media(max-width:768px){
    .reg-page-pad{padding:12px!important}
    .reg-hdr{flex-direction:column!important;gap:12px!important}
    .reg-grid{grid-template-columns:1fr}
    .reg-btn-row{width:100%}.reg-btn-row button{flex:1}
  }
`;

const BOTSWANA_LOCATIONS = [
  "Gaborone","Francistown","Maun","Lobatse","Selebi-Phikwe","Jwaneng","Orapa",
  "Sowa Town","Kasane","Ghanzi","Serowe","Molepolole","Kanye","Mahalapye","Palapye",
  "Mochudi","Letlhakane","Bobonong","Morupule Colliery","Sua Pan (Botash)",
  "Damtshaa Mine","Letlhakane Mine","Jwaneng Mine Complex","BCL Smelter (Selebi-Phikwe)",
  "Morupule Power Station","Gaborone Industrial","Francistown Industrial","Lobatse Industrial",
];
const EQUIPMENT_TYPES = [
  "Pressure Vessel","Boiler","Air Receiver","Trestle Jack","Air Compressor",
  "Lever Hoist","Bottle Jack","Safety Harness","Jack Stand","Oil Separator",
  "Chain Block","Bow Shackle","Mobile Crane","Trolley Jack","Step Ladders",
  "Tifor","Crawl Beam","Beam Crawl","Beam Clamp","Webbing Sling","Nylon Sling",
  "Wire Sling","Fall Arrest","Man Cage","Shutter Clamp","Drum Clamp","Manual Rod Handlers",
];
const PRESSURE_TYPES = ["Pressure Vessel","Boiler","Air Receiver","Air Compressor","Oil Separator"];
const LIFTING_TYPES  = ["Trestle Jack","Lever Hoist","Bottle Jack","Safety Harness","Jack Stand","Chain Block","Bow Shackle","Mobile Crane","Trolley Jack","Step Ladders","Tifor","Crawl Beam","Beam Crawl","Beam Clamp","Webbing Sling","Nylon Sling","Wire Sling","Fall Arrest","Man Cage","Shutter Clamp","Drum Clamp","Manual Rod Handlers"];
const LANYARD_TYPES  = ["Safety Harness","Fall Arrest"];
const CERT_TYPES     = ["Load Test Certificate","Pressure Test Certificate","Certificate of Statutory Inspection","Inspection Certificate","Compliance Certificate","NDT Certificate"];
const STANDARDS      = ["ASME Section VIII Div 1","ASME Section VIII Div 2","BS PD 5500","EN 13445","Mines, Quarries, Works and Machinery Act Cap 44:02","SANS 347 (South Africa)","Local / In-house","Other"];
const MATERIALS      = ["Carbon Steel","Stainless Steel 304","Stainless Steel 316","Duplex Stainless","Low Alloy Steel","Aluminium","Fibreglass (GRP)","Other"];
const FLUID_TYPES    = ["Air / Compressed Air","Steam","Water","Hot Oil","Natural Gas","LPG / Propane","Hydrogen","Nitrogen","Oxygen","Ammonia","Chemicals / Corrosive","Other"];
const INSP_FREQS     = ["3 Months","6 Months","12 Months","24 Months"];

function san(v,max=200){if(!v&&v!==0)return "";return String(v).replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim().slice(0,max);}

const EMPTY = {
  serial_number:"",equipment_id:"",identification_number:"",inspection_no:"",
  equipment_type:"Pressure Vessel",manufacturer:"",model:"",year_built:"",country_of_origin:"",
  client_id:"",location:"",department:"",inspector_name:"",inspector_id:"",
  cert_type:"Pressure Test Certificate",design_standard:"ASME Section VIII Div 1",
  inspection_freq:"12 Months",shell_material:"Carbon Steel",fluid_type:"Air / Compressed Air",
  design_pressure:"",working_pressure:"",test_pressure:"",design_temperature:"",
  capacity_volume:"",safe_working_load:"",proof_load:"",lifting_height:"",
  sling_length:"",chain_size:"",rope_diameter:"",lanyard_serial_no:"",
  last_inspection_date:"",next_inspection_date:"",license_expiry:"",
  license_status:"valid",condition:"Good",status:"active",notes:"",
};

const IS = { width:"100%",padding:"11px 13px",borderRadius:10,border:"1px solid rgba(148,163,184,0.12)",background:"rgba(18,30,50,0.70)",color:"#f0f6ff",fontSize:13,fontWeight:500,outline:"none",fontFamily:"'IBM Plex Sans',sans-serif",WebkitAppearance:"none",appearance:"none" };
const LS = { display:"block",fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(240,246,255,0.50)",marginBottom:7 };

function F({label,name,value,onChange,type="text",placeholder="",readOnly=false}){
  return(<div><label style={LS}>{label}</label><input type={type} name={name} value={value??""} onChange={onChange} placeholder={placeholder} readOnly={readOnly} style={{...IS,...(readOnly?{opacity:.5,cursor:"not-allowed"}:{})}} /></div>);
}
function S({label,name,value,onChange,children,disabled=false}){
  return(<div><label style={LS}>{label}</label><select name={name} value={value??""} onChange={onChange} disabled={disabled} style={{...IS,cursor:disabled?"not-allowed":"pointer",...(disabled?{opacity:.5}:{})}}>{children}</select></div>);
}
function Sec({icon,title,children}){
  return(
    <div style={{background:T.panel,border:"1px solid rgba(148,163,184,0.12)",borderRadius:18,padding:20}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,paddingBottom:12,borderBottom:"1px solid rgba(148,163,184,0.12)"}}>
        <span style={{fontSize:16}}>{icon}</span>
        <div style={{fontSize:14,fontWeight:800,color:"#f0f6ff"}}>{title}</div>
      </div>
      {children}
    </div>
  );
}
function LocationPicker({name,value,onChange}){
  const [manual,setManual]=useState(value&&!BOTSWANA_LOCATIONS.includes(value));
  const hSel=e=>{if(e.target.value==="__manual__"){setManual(true);onChange({target:{name,value:""}});}else{setManual(false);onChange(e);}};
  return(
    <div style={{display:"grid",gap:6}}>
      <select name={name} value={manual?"__manual__":(value||"")} onChange={hSel} style={{...IS,cursor:"pointer"}}>
        <option value="">Select location</option>
        {BOTSWANA_LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}
        <option value="__manual__">Type manually...</option>
      </select>
      {manual&&<input name={name} type="text" value={value||""} onChange={onChange} placeholder="Enter location / site name" style={{...IS,borderColor:"rgba(34,211,238,0.25)"}} autoFocus />}
    </div>
  );
}

export default function RegisterEquipmentPage() {
  const router = useRouter();
  const [form,setForm]=useState(EMPTY);
  const [clients,setClients]=useState([]);
  const [clientsLoading,setClientsLoading]=useState(true);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    supabase.from("clients").select("id,company_name,company_code,status").eq("status","active").order("company_name",{ascending:true})
      .then(({data})=>{setClients(data||[]);setClientsLoading(false);});
  },[]);

  const hc=e=>{
    const {name,value}=e.target;
    setForm(prev=>{
      const next={...prev,[name]:value};
      if(name==="equipment_type"){
        const isPv=PRESSURE_TYPES.includes(value);
        const isLft=LIFTING_TYPES.includes(value);
        if(isPv){next.cert_type="Pressure Test Certificate";["safe_working_load","proof_load","lifting_height","sling_length","chain_size","rope_diameter","lanyard_serial_no"].forEach(k=>next[k]="");}
        if(isLft){next.cert_type="Load Test Certificate";["design_pressure","working_pressure","test_pressure","design_temperature","capacity_volume","fluid_type"].forEach(k=>next[k]="");if(!LANYARD_TYPES.includes(value))next.lanyard_serial_no="";}
      }
      return next;
    });
  };

  async function generateCertNumber(serial,assetId){
    const base=serial?serial.replace(/[\s\-\/]+/g,"").toUpperCase():`ASSET${assetId}`;
    const prefix=`CERT-${base}-`;
    const {data}=await supabase.from("certificates").select("certificate_number").like("certificate_number",`${prefix}%`).order("certificate_number",{ascending:false}).limit(1).maybeSingle();
    let seq=1;
    if(data?.certificate_number){const p=data.certificate_number.split("-");const n=parseInt(p[p.length-1],10);if(!isNaN(n))seq=n+1;}
    return `${prefix}${String(seq).padStart(2,"0")}`;
  }

  async function handleSubmit(e){
    e.preventDefault();setLoading(true);setError("");
    try{
      const client=clients.find(c=>c.id===form.client_id);
      if(!client)throw new Error("Please select a registered client.");
      if(!form.serial_number.trim())throw new Error("Serial number is required.");
      if(!form.manufacturer.trim())throw new Error("Manufacturer is required.");
      if(form.last_inspection_date&&form.next_inspection_date&&new Date(form.next_inspection_date)<=new Date(form.last_inspection_date))
        throw new Error("Next inspection date must be after last inspection date.");

      const assetName=form.model?`${form.equipment_type} - ${form.model}`:`${form.equipment_type} - ${form.serial_number}`;
      const {data:asset,error:ae}=await registerEquipment({
        asset_name:san(assetName,150),client_id:form.client_id,asset_type:san(form.equipment_type,100),
        serial_number:san(form.serial_number,80),manufacturer:san(form.manufacturer,100),
        model:san(form.model,100)||null,year_built:san(form.year_built,20)||null,
        location:san(form.location,150),department:san(form.department,100)||null,
        cert_type:san(form.cert_type,100),design_standard:san(form.design_standard,120)||null,
        inspection_freq:san(form.inspection_freq,50)||null,shell_material:san(form.shell_material,80)||null,
        fluid_type:san(form.fluid_type,80)||null,design_pressure:san(form.design_pressure,50)||null,
        working_pressure:san(form.working_pressure,50)||null,test_pressure:san(form.test_pressure,50)||null,
        design_temperature:san(form.design_temperature,50)||null,capacity_volume:san(form.capacity_volume,50)||null,
        safe_working_load:san(form.safe_working_load,50)||null,proof_load:san(form.proof_load,50)||null,
        lifting_height:san(form.lifting_height,50)||null,sling_length:san(form.sling_length,50)||null,
        chain_size:san(form.chain_size,50)||null,rope_diameter:san(form.rope_diameter,50)||null,
        lanyard_serial_no:san(form.lanyard_serial_no,80)||null,identification_number:san(form.identification_number,80)||null,
        inspection_no:san(form.inspection_no,80)||null,equipment_id:san(form.equipment_id,80)||null,
        country_of_origin:san(form.country_of_origin,80)||null,inspector_name:san(form.inspector_name,100)||null,
        inspector_id:san(form.inspector_id,80)||null,last_inspection_date:form.last_inspection_date||null,
        next_inspection_date:form.next_inspection_date||null,expiry_date:form.next_inspection_date||null,
        license_status:san(form.license_status,30),license_expiry:form.license_expiry||null,
        condition:san(form.condition,50)||null,status:san(form.status,30),notes:san(form.notes,1000)||null,
        description:form.notes?`${form.equipment_type} | ${san(form.notes,300)}`:san(form.equipment_type,100),
      });
      if(ae)throw ae;
      if(!asset?.id)throw new Error("Equipment created but no asset ID returned.");

      const certNumber=await generateCertNumber(form.serial_number,asset.id);
      const {error:ce}=await supabase.from("certificates").insert([{
        certificate_number:certNumber,certificate_type:form.cert_type||"Inspection Certificate",
        asset_id:asset.id,company:client.company_name,client_name:client.company_name,
        equipment_description:san(form.equipment_type,100),equipment_type:san(form.equipment_type,100),
        equipment_location:san(form.location,150)||null,
        equipment_id:san(form.identification_number,80)||san(form.equipment_id,80)||san(form.serial_number,80)||asset.asset_tag,
        identification_number:san(form.identification_number,80)||null,inspection_no:san(form.inspection_no,80)||null,
        lanyard_serial_no:san(form.lanyard_serial_no,80)||null,swl:san(form.safe_working_load,50)||null,
        mawp:san(form.working_pressure,50)||null,capacity:san(form.capacity_volume,50)||null,
        country_of_origin:san(form.country_of_origin,80)||null,year_built:san(form.year_built,20)||null,
        manufacturer:san(form.manufacturer,100)||null,model:san(form.model,100)||null,
        design_pressure:san(form.design_pressure,50)||null,test_pressure:san(form.test_pressure,50)||null,
        equipment_status:"PASS",result:"PASS",
        issued_at:form.last_inspection_date?new Date(form.last_inspection_date).toISOString():new Date().toISOString(),
        issue_date:form.last_inspection_date||new Date().toISOString().slice(0,10),
        valid_to:form.next_inspection_date||null,expiry_date:form.next_inspection_date||null,
        next_inspection_date:form.next_inspection_date||null,
        status:"issued",legal_framework:san(form.design_standard,120)||null,
        inspector_name:san(form.inspector_name,100)||null,inspector_id:san(form.inspector_id,80)||null,logo_url:"/logo.png",
      }]);
      if(ce)throw ce;
      router.push(`/equipment/${asset.asset_tag}`);
    }catch(err){setError(err?.message||"Failed to register equipment.");}
    finally{setLoading(false);}
  }

  const isPv=PRESSURE_TYPES.includes(form.equipment_type);
  const isLft=LIFTING_TYPES.includes(form.equipment_type);
  const hasLanyard=LANYARD_TYPES.includes(form.equipment_type);

  return(
    <AppLayout title="Register Equipment">
      <style>{CSS}</style>
      <div className="reg-page-pad" style={{minHeight:"100vh",background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.05),transparent),${T.bg}`,color:T.text,fontFamily:"'IBM Plex Sans',sans-serif",padding:24}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"grid",gap:18}}>

          <div style={{background:T.surface,border:"1px solid rgba(148,163,184,0.12)",borderRadius:20,padding:"20px 22px",backdropFilter:"blur(20px)"}}>
            <div className="reg-hdr" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent,marginBottom:8}}>Equipment Register</div>
                <h1 style={{margin:0,fontSize:"clamp(20px,3vw,26px)",fontWeight:900,letterSpacing:"-0.02em"}}>Register Equipment</h1>
                <p style={{margin:"6px 0 0",color:T.textDim,fontSize:13}}>
                  Asset tag auto-generated. Certificate: <span style={{color:T.textMid,fontFamily:"'IBM Plex Mono',monospace",fontSize:12}}>CERT-SerialNo-01</span>
                </p>
              </div>
              <div className="reg-btn-row">
                <button type="button" onClick={()=>router.push("/equipment")} style={{padding:"10px 16px",borderRadius:11,border:"1px solid rgba(148,163,184,0.12)",background:T.card,color:T.textMid,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                  &larr; Back
                </button>
              </div>
            </div>
          </div>

          {error&&<div style={{padding:"12px 16px",borderRadius:12,border:"1px solid rgba(248,113,113,0.25)",background:"rgba(248,113,113,0.10)",color:"#f87171",fontSize:13,fontWeight:700}}>&#9888; {error}</div>}

          <form onSubmit={handleSubmit} style={{display:"grid",gap:18}}>

            <Sec icon="&#9881;" title="Equipment Identity">
              <div className="reg-grid">
                <F label="Asset Tag" value="Auto-generated" readOnly />
                <F label="Serial Number / ID No. *" name="serial_number" value={form.serial_number} onChange={hc} />
                <F label="Equipment ID" name="equipment_id" value={form.equipment_id} onChange={hc} placeholder="Optional" />
                <F label="Identification Number" name="identification_number" value={form.identification_number} onChange={hc} placeholder="Optional" />
                <F label="Inspection No." name="inspection_no" value={form.inspection_no} onChange={hc} placeholder="Optional" />
                {hasLanyard&&(
                  <div>
                    <label style={LS}>Lanyard Serial No. <span style={{color:T.accent,fontSize:9,background:T.accentDim,border:"1px solid rgba(34,211,238,0.25)",borderRadius:4,padding:"1px 5px"}}>on certificate</span></label>
                    <input name="lanyard_serial_no" value={form.lanyard_serial_no} onChange={hc} style={{...IS,borderColor:"rgba(34,211,238,0.25)"}} placeholder="e.g. 0135" />
                  </div>
                )}
                <S label="Equipment Type *" name="equipment_type" value={form.equipment_type} onChange={hc}>
                  {EQUIPMENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                </S>
                <F label="Manufacturer *" name="manufacturer" value={form.manufacturer} onChange={hc} />
                <F label="Model / Drawing No." name="model" value={form.model} onChange={hc} />
                <F label="Year Built" name="year_built" value={form.year_built} onChange={hc} placeholder="e.g. 2018" />
                <F label="Country of Origin" name="country_of_origin" value={form.country_of_origin} onChange={hc} placeholder="e.g. South Africa" />
              </div>
            </Sec>

            <Sec icon="&#127970;" title="Ownership and Site">
              <div className="reg-grid">
                <S label="Client *" name="client_id" value={form.client_id} onChange={hc} disabled={clientsLoading}>
                  <option value="">{clientsLoading?"Loading clients...":"Select registered client"}</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.company_name}{c.company_code?` (${c.company_code})`:""}</option>)}
                </S>
                <div>
                  <label style={LS}>Location / Town *</label>
                  <LocationPicker name="location" value={form.location} onChange={hc} />
                </div>
                <F label="Department / Plant" name="department" value={form.department} onChange={hc} />
              </div>
            </Sec>

            <Sec icon="&#128220;" title="Certificate Information">
              <div className="reg-grid">
                <S label="Certificate Type *" name="cert_type" value={form.cert_type} onChange={hc}>
                  {CERT_TYPES.map(c=><option key={c} value={c}>{c}</option>)}
                </S>
                <S label="Inspection Frequency" name="inspection_freq" value={form.inspection_freq} onChange={hc}>
                  {INSP_FREQS.map(f=><option key={f} value={f}>{f}</option>)}
                </S>
                <S label="License Status" name="license_status" value={form.license_status} onChange={hc}>
                  <option value="valid">Valid</option>
                  <option value="expiring">Expiring</option>
                  <option value="expired">Expired</option>
                </S>
              </div>
            </Sec>

            <Sec icon="&#128208;" title="Technical Parameters">
              <div className="reg-grid">
                <S label="Shell / Body Material" name="shell_material" value={form.shell_material} onChange={hc}>
                  {MATERIALS.map(m=><option key={m} value={m}>{m}</option>)}
                </S>
                <S label="Design Standard" name="design_standard" value={form.design_standard} onChange={hc}>
                  {STANDARDS.map(s=><option key={s} value={s}>{s}</option>)}
                </S>
                {isPv&&<>
                  <S label="Fluid / Contents Type" name="fluid_type" value={form.fluid_type} onChange={hc}>
                    {FLUID_TYPES.map(f=><option key={f} value={f}>{f}</option>)}
                  </S>
                  <F label="Design Pressure" name="design_pressure" value={form.design_pressure} onChange={hc} placeholder="e.g. 1500 kPa" />
                  <F label="Working Pressure (MAWP)" name="working_pressure" value={form.working_pressure} onChange={hc} placeholder="e.g. 1200 kPa" />
                  <F label="Test Pressure" name="test_pressure" value={form.test_pressure} onChange={hc} placeholder="e.g. 2250 kPa" />
                  <F label="Design Temperature" name="design_temperature" value={form.design_temperature} onChange={hc} />
                  <F label="Volume / Capacity" name="capacity_volume" value={form.capacity_volume} onChange={hc} placeholder="e.g. 200 L" />
                </>}
                {isLft&&<>
                  <F label="Safe Working Load (SWL)" name="safe_working_load" value={form.safe_working_load} onChange={hc} placeholder="e.g. 2.5T" />
                  <F label="Proof Load" name="proof_load" value={form.proof_load} onChange={hc} placeholder="e.g. 3T" />
                  <F label="Lift Height" name="lifting_height" value={form.lifting_height} onChange={hc} />
                  <F label="Sling Length" name="sling_length" value={form.sling_length} onChange={hc} />
                  <F label="Chain Size" name="chain_size" value={form.chain_size} onChange={hc} />
                  <F label="Rope / Wire Diameter" name="rope_diameter" value={form.rope_diameter} onChange={hc} />
                </>}
              </div>
            </Sec>

            <Sec icon="&#128119;" title="Inspector Details">
              <div className="reg-grid">
                <F label="Inspector Name" name="inspector_name" value={form.inspector_name} onChange={hc} />
                <F label="Inspector ID" name="inspector_id" value={form.inspector_id} onChange={hc} />
              </div>
            </Sec>

            <Sec icon="&#128197;" title="Inspection and Expiry Dates">
              <div className="reg-grid">
                <F label="Last Inspection Date" name="last_inspection_date" type="date" value={form.last_inspection_date} onChange={hc} />
                <F label="Next Inspection / Expiry Date" name="next_inspection_date" type="date" value={form.next_inspection_date} onChange={hc} />
                <F label="License Expiry" name="license_expiry" type="date" value={form.license_expiry} onChange={hc} />
              </div>
            </Sec>

            <Sec icon="&#128218;" title="Operational Status and Notes">
              <div className="reg-grid" style={{marginBottom:14}}>
                <F label="Condition" name="condition" value={form.condition} onChange={hc} />
                <S label="Status" name="status" value={form.status} onChange={hc}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </S>
              </div>
              <div>
                <label style={LS}>Notes</label>
                <textarea name="notes" value={form.notes} onChange={hc} rows={4} style={{...IS,resize:"vertical",minHeight:90}} placeholder="Comments, findings, conditions..." />
              </div>
            </Sec>

            <div className="reg-btn-row" style={{paddingBottom:8}}>
              <button type="button" onClick={()=>setForm(EMPTY)} style={{padding:"11px 20px",borderRadius:12,border:"1px solid rgba(148,163,184,0.18)",background:"rgba(255,255,255,0.04)",color:"#f0f6ff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                Clear Form
              </button>
              <button type="button" onClick={()=>router.push("/equipment")} style={{padding:"11px 20px",borderRadius:12,border:"1px solid rgba(148,163,184,0.18)",background:"rgba(255,255,255,0.04)",color:"#f0f6ff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                Cancel
              </button>
              <button type="submit" disabled={loading||clientsLoading} style={{padding:"11px 28px",borderRadius:12,border:"none",background:loading?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#22d3ee,#60a5fa)",color:loading?"rgba(240,246,255,0.4)":"#001018",fontWeight:900,fontSize:13,cursor:loading?"not-allowed":"pointer",fontFamily:"'IBM Plex Sans',sans-serif",flex:1,maxWidth:260}}>
                {loading?"Saving...":"Register Equipment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
