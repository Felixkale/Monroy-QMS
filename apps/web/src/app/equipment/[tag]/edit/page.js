// src/app/equipment/[tag]/edit/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const T = {
  bg:"#070e18",surface:"rgba(13,22,38,0.80)",panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)",border:"rgba(148,163,184,0.12)",text:"#f0f6ff",
  textMid:"rgba(240,246,255,0.72)",textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee",accentDim:"rgba(34,211,238,0.10)",accentBrd:"rgba(34,211,238,0.25)",accentGlow:"rgba(34,211,238,0.18)",
  green:"#34d399",greenDim:"rgba(52,211,153,0.10)",greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",redDim:"rgba(248,113,113,0.10)",redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24",amberDim:"rgba(251,191,36,0.10)",amberBrd:"rgba(251,191,36,0.25)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  input::placeholder,textarea::placeholder{color:rgba(240,246,255,0.28)}
  select option{background:#0a1420;color:#f0f6ff}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.7);cursor:pointer}
  .edit-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
  .edit-btn-row{display:flex;gap:10px;flex-wrap:wrap}
  @media(max-width:768px){
    .edit-page-pad{padding:12px!important}
    .edit-hdr{flex-direction:column!important;gap:12px!important}
    .edit-grid{grid-template-columns:1fr}
    .edit-btn-row{width:100%}.edit-btn-row button{flex:1}
  }
`;

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

function san(v,max=300){if(!v&&v!==0)return "";return String(v).replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim().slice(0,max);}
function toDate(v){if(!v)return "";const d=new Date(v);return isNaN(d.getTime())?"":d.toISOString().slice(0,10);}

const IS = { width:"100%",padding:"11px 13px",borderRadius:10,border:"1px solid rgba(148,163,184,0.12)",background:"rgba(18,30,50,0.70)",color:"#f0f6ff",fontSize:13,fontWeight:500,outline:"none",fontFamily:"'IBM Plex Sans',sans-serif",WebkitAppearance:"none",appearance:"none" };
const LS = { display:"block",fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(240,246,255,0.50)",marginBottom:7 };

function F({label,value,onChange,type="text",placeholder="",readOnly=false}){
  return(<div><label style={LS}>{label}</label><input type={type} value={value??""} onChange={onChange} placeholder={placeholder} readOnly={readOnly} style={{...IS,...(readOnly?{opacity:.5,cursor:"not-allowed"}:{})}} /></div>);
}
function Sel({label,value,onChange,children}){
  return(<div><label style={LS}>{label}</label><select value={value??""} onChange={onChange} style={{...IS,cursor:"pointer"}}>{children}</select></div>);
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

export default function EditEquipmentPage() {
  const router = useRouter();
  const params = useParams();
  const [assetTag,setAssetTag]=useState(params?.tag||"");
  const [assetId,setAssetId]=useState(null);
  const [form,setForm]=useState({});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");

  useEffect(()=>{
    const tag=params?.tag;
    if(!tag)return;
    async function fetch(){
      setLoading(true);setError("");
      const {data,error:e}=await supabase.from("assets").select("*").eq("asset_tag",tag).maybeSingle();
      if(e||!data){setError("Equipment not found.");}
      else{
        setAssetId(data.id);setAssetTag(data.asset_tag);
        setForm({
          asset_type:data.asset_type||"",serial_number:data.serial_number||"",
          equipment_id:data.equipment_id||"",identification_number:data.identification_number||"",
          inspection_no:data.inspection_no||"",manufacturer:data.manufacturer||"",
          model:data.model||"",year_built:data.year_built||"",country_of_origin:data.country_of_origin||"",
          capacity_volume:data.capacity_volume||"",location:data.location||"",department:data.department||"",
          design_standard:data.design_standard||"",fluid_type:data.fluid_type||"",
          design_pressure:data.design_pressure||"",working_pressure:data.working_pressure||"",
          test_pressure:data.test_pressure||"",design_temperature:data.design_temperature||"",
          safe_working_load:data.safe_working_load||"",proof_load:data.proof_load||"",
          lifting_height:data.lifting_height||"",sling_length:data.sling_length||"",
          chain_size:data.chain_size||"",rope_diameter:data.rope_diameter||"",
          lanyard_serial_no:data.lanyard_serial_no||"",
          last_inspection_date:toDate(data.last_inspection_date),
          next_inspection_date:toDate(data.next_inspection_date||data.expiry_date),
          inspector_name:data.inspector_name||"",inspector_id:data.inspector_id||"",
          cert_type:data.cert_type||"",license_status:data.license_status||"valid",
          license_expiry:toDate(data.license_expiry),condition:data.condition||"",
          status:data.status||"active",notes:data.notes||"",
        });
      }
      setLoading(false);
    }
    fetch();
  },[params?.tag]);

  const goBack=()=>{const tag=assetTag||form.asset_tag;router.push(tag?`/equipment/${tag}`:"/equipment");};

  function hc(key,value){
    setForm(prev=>{
      const next={...prev,[key]:value};
      if(key==="asset_type"){
        const isPv=PRESSURE_TYPES.includes(value);
        const isLft=LIFTING_TYPES.includes(value);
        const hasL=LANYARD_TYPES.includes(value);
        if(isPv){["safe_working_load","proof_load","lifting_height","sling_length","chain_size","rope_diameter","lanyard_serial_no"].forEach(k=>next[k]="");}
        if(isLft&&!hasL){["design_pressure","working_pressure","test_pressure","design_temperature","fluid_type","lanyard_serial_no"].forEach(k=>next[k]="");}
      }
      return next;
    });
  }

  /* ✅ Sync latest certificate whenever equipment is saved */
  async function syncLatestCertificate(){
    const {data:cert}=await supabase.from("certificates").select("id")
      .eq("asset_id",assetId).order("issued_at",{ascending:false}).limit(1).maybeSingle();
    if(!cert?.id)return;
    const expiryIso=form.next_inspection_date||null;
    await supabase.from("certificates").update({
      certificate_type:san(form.cert_type,100)||null,
      equipment_description:san(form.asset_type,100)||null,
      equipment_type:san(form.asset_type,100)||null,
      equipment_location:san(form.location,150)||null,
      equipment_id:san(form.identification_number,80)||san(form.equipment_id,80)||san(form.serial_number,80)||null,
      identification_number:san(form.identification_number,80)||null,
      inspection_no:san(form.inspection_no,80)||null,
      lanyard_serial_no:san(form.lanyard_serial_no,80)||null,
      swl:san(form.safe_working_load,50)||null,
      mawp:san(form.working_pressure,50)||null,
      capacity:san(form.capacity_volume,50)||null,
      country_of_origin:san(form.country_of_origin,80)||null,
      year_built:san(form.year_built,20)||null,
      manufacturer:san(form.manufacturer,100)||null,
      model:san(form.model,100)||null,
      design_pressure:san(form.design_pressure,50)||null,
      test_pressure:san(form.test_pressure,50)||null,
      /* ✅ sync ALL expiry aliases on the certificate */
      valid_to:expiryIso,
      expiry_date:expiryIso,
      next_inspection_date:expiryIso,
      legal_framework:san(form.design_standard,150)||null,
      inspector_name:san(form.inspector_name,100)||null,
      inspector_id:san(form.inspector_id,80)||null,
    }).eq("id",cert.id);
  }

  async function handleSave(){
    if(!assetId)return;
    setSaving(true);setError("");setSuccess("");
    try{
      if(!san(form.asset_type))throw new Error("Equipment type is required.");
      if(!san(form.serial_number))throw new Error("Serial number is required.");
      if(form.last_inspection_date&&form.next_inspection_date&&new Date(form.next_inspection_date)<=new Date(form.last_inspection_date))
        throw new Error("Next inspection date must be after last inspection date.");

      const expiryIso=form.next_inspection_date||null;
      const {error:e}=await supabase.from("assets").update({
        asset_type:san(form.asset_type,100)||null,serial_number:san(form.serial_number,80)||null,
        equipment_id:san(form.equipment_id,80)||null,identification_number:san(form.identification_number,80)||null,
        inspection_no:san(form.inspection_no,80)||null,manufacturer:san(form.manufacturer,100)||null,
        model:san(form.model,100)||null,year_built:san(form.year_built,20)||null,
        country_of_origin:san(form.country_of_origin,80)||null,capacity_volume:san(form.capacity_volume,50)||null,
        location:san(form.location,150)||null,department:san(form.department,100)||null,
        design_standard:san(form.design_standard,150)||null,fluid_type:san(form.fluid_type,80)||null,
        design_pressure:san(form.design_pressure,50)||null,working_pressure:san(form.working_pressure,50)||null,
        test_pressure:san(form.test_pressure,50)||null,design_temperature:san(form.design_temperature,50)||null,
        safe_working_load:san(form.safe_working_load,50)||null,proof_load:san(form.proof_load,50)||null,
        lifting_height:san(form.lifting_height,50)||null,sling_length:san(form.sling_length,50)||null,
        chain_size:san(form.chain_size,50)||null,rope_diameter:san(form.rope_diameter,50)||null,
        lanyard_serial_no:san(form.lanyard_serial_no,80)||null,
        last_inspection_date:form.last_inspection_date||null,
        /* ✅ write both asset expiry aliases */
        next_inspection_date:expiryIso,expiry_date:expiryIso,
        inspector_name:san(form.inspector_name,100)||null,inspector_id:san(form.inspector_id,80)||null,
        cert_type:san(form.cert_type,100)||null,license_status:san(form.license_status,30)||"valid",
        license_expiry:form.license_expiry||null,condition:san(form.condition,50)||null,
        status:san(form.status,30)||"active",notes:san(form.notes,1000)||null,
      }).eq("id",assetId);
      if(e)throw e;

      /* ✅ Always sync certificate after saving asset */
      await syncLatestCertificate();

      setSuccess("Equipment updated successfully.");
      setTimeout(()=>goBack(),1200);
    }catch(err){setError("Save failed: "+(err?.message||"Unknown error"));}
    finally{setSaving(false);}
  }

  const isPv=PRESSURE_TYPES.includes(form.asset_type);
  const isLft=LIFTING_TYPES.includes(form.asset_type);
  const hasLanyard=LANYARD_TYPES.includes(form.asset_type);

  return(
    <AppLayout title="Edit Equipment">
      <style>{CSS}</style>
      <div className="edit-page-pad" style={{minHeight:"100vh",background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.05),transparent),${T.bg}`,color:T.text,fontFamily:"'IBM Plex Sans',sans-serif",padding:24}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"grid",gap:18}}>

          <div style={{background:T.surface,border:"1px solid rgba(148,163,184,0.12)",borderRadius:20,padding:"20px 22px",backdropFilter:"blur(20px)"}}>
            <div className="edit-hdr" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent,marginBottom:8}}>Equipment</div>
                <h1 style={{margin:0,fontSize:"clamp(20px,3vw,26px)",fontWeight:900,letterSpacing:"-0.02em"}}>Edit Equipment</h1>
                {assetTag&&<p style={{margin:"6px 0 0",color:T.textDim,fontSize:13}}>Asset Tag: <span style={{color:T.textMid,fontFamily:"'IBM Plex Mono',monospace"}}>{assetTag}</span> &bull; Saves to asset and syncs latest certificate automatically</p>}
              </div>
              <div className="edit-btn-row">
                <button type="button" onClick={goBack} style={{padding:"10px 16px",borderRadius:11,border:"1px solid rgba(148,163,184,0.12)",background:T.card,color:T.textMid,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                  &larr; Back
                </button>
              </div>
            </div>
          </div>

          {error&&<div style={{padding:"12px 16px",borderRadius:12,border:"1px solid rgba(248,113,113,0.25)",background:"rgba(248,113,113,0.10)",color:"#f87171",fontSize:13,fontWeight:700}}>&#9888; {error}</div>}
          {success&&<div style={{padding:"12px 16px",borderRadius:12,border:"1px solid rgba(52,211,153,0.25)",background:"rgba(52,211,153,0.10)",color:"#34d399",fontSize:13,fontWeight:700}}>&#10003; {success}</div>}

          {loading?(
            <div style={{background:T.panel,border:"1px solid rgba(148,163,184,0.12)",borderRadius:16,padding:40,textAlign:"center",color:T.textDim}}>
              <div style={{fontSize:24,opacity:.4,marginBottom:10}}>&#9203;</div>
              <div style={{fontSize:13,fontWeight:600}}>Loading equipment data...</div>
            </div>
          ):(
            <>
              <Sec icon="&#9881;" title="Equipment Info">
                <div className="edit-grid">
                  <F label="Asset Tag" value={assetTag} readOnly />
                  <Sel label="Equipment Type" value={form.asset_type||""} onChange={e=>hc("asset_type",e.target.value)}>
                    {EQUIPMENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </Sel>
                  <F label="Serial Number" value={form.serial_number} onChange={e=>hc("serial_number",e.target.value)} />
                  <F label="Equipment ID" value={form.equipment_id} onChange={e=>hc("equipment_id",e.target.value)} />
                  <F label="Identification Number" value={form.identification_number} onChange={e=>hc("identification_number",e.target.value)} />
                  <F label="Inspection No." value={form.inspection_no} onChange={e=>hc("inspection_no",e.target.value)} />
                  {hasLanyard&&<F label="Lanyard Serial No." value={form.lanyard_serial_no} onChange={e=>hc("lanyard_serial_no",e.target.value)} />}
                  <F label="Manufacturer" value={form.manufacturer} onChange={e=>hc("manufacturer",e.target.value)} />
                  <F label="Model" value={form.model} onChange={e=>hc("model",e.target.value)} />
                  <F label="Year Built" value={form.year_built} onChange={e=>hc("year_built",e.target.value)} />
                  <F label="Country of Origin" value={form.country_of_origin} onChange={e=>hc("country_of_origin",e.target.value)} />
                  <F label="Capacity" value={form.capacity_volume} onChange={e=>hc("capacity_volume",e.target.value)} />
                  <F label="Location" value={form.location} onChange={e=>hc("location",e.target.value)} />
                  <F label="Department" value={form.department} onChange={e=>hc("department",e.target.value)} />
                </div>
              </Sec>

              <Sec icon="&#128208;" title="Technical Details">
                <div className="edit-grid">
                  <F label="Certificate Type" value={form.cert_type} onChange={e=>hc("cert_type",e.target.value)} />
                  <F label="Design Standard" value={form.design_standard} onChange={e=>hc("design_standard",e.target.value)} />
                  {isPv&&<>
                    <F label="Fluid Type" value={form.fluid_type} onChange={e=>hc("fluid_type",e.target.value)} />
                    <F label="Design Pressure" value={form.design_pressure} onChange={e=>hc("design_pressure",e.target.value)} />
                    <F label="Working Pressure (MAWP)" value={form.working_pressure} onChange={e=>hc("working_pressure",e.target.value)} />
                    <F label="Test Pressure" value={form.test_pressure} onChange={e=>hc("test_pressure",e.target.value)} />
                    <F label="Design Temperature" value={form.design_temperature} onChange={e=>hc("design_temperature",e.target.value)} />
                  </>}
                  {isLft&&<>
                    <F label="Safe Working Load (SWL)" value={form.safe_working_load} onChange={e=>hc("safe_working_load",e.target.value)} />
                    <F label="Proof Load" value={form.proof_load} onChange={e=>hc("proof_load",e.target.value)} />
                    <F label="Lift Height" value={form.lifting_height} onChange={e=>hc("lifting_height",e.target.value)} />
                    <F label="Sling Length" value={form.sling_length} onChange={e=>hc("sling_length",e.target.value)} />
                    <F label="Chain Size" value={form.chain_size} onChange={e=>hc("chain_size",e.target.value)} />
                    <F label="Rope / Wire Diameter" value={form.rope_diameter} onChange={e=>hc("rope_diameter",e.target.value)} />
                  </>}
                </div>
              </Sec>

              <Sec icon="&#128197;" title="Inspection Details">
                <div className="edit-grid">
                  <F label="Last Inspection Date" type="date" value={form.last_inspection_date} onChange={e=>hc("last_inspection_date",e.target.value)} />
                  <F label="Next Inspection / Expiry Date" type="date" value={form.next_inspection_date} onChange={e=>hc("next_inspection_date",e.target.value)} />
                  <F label="Inspector Name" value={form.inspector_name} onChange={e=>hc("inspector_name",e.target.value)} />
                  <F label="Inspector ID" value={form.inspector_id} onChange={e=>hc("inspector_id",e.target.value)} />
                  <Sel label="License Status" value={form.license_status||"valid"} onChange={e=>hc("license_status",e.target.value)}>
                    {["valid","expiring","expired","pending","suspended"].map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
                  </Sel>
                  <F label="License Expiry" type="date" value={form.license_expiry} onChange={e=>hc("license_expiry",e.target.value)} />
                  <F label="Condition" value={form.condition} onChange={e=>hc("condition",e.target.value)} />
                  <Sel label="Status" value={form.status||"active"} onChange={e=>hc("status",e.target.value)}>
                    {["active","inactive","suspended"].map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
                  </Sel>
                </div>
              </Sec>

              <Sec icon="&#128218;" title="Notes">
                <div>
                  <label style={LS}>Notes</label>
                  <textarea value={form.notes||""} onChange={e=>hc("notes",e.target.value)} rows={4} style={{...IS,resize:"vertical",minHeight:90}} />
                </div>
              </Sec>

              <div className="edit-btn-row" style={{paddingBottom:8}}>
                <button onClick={handleSave} disabled={saving} style={{padding:"11px 28px",borderRadius:12,border:"none",background:saving?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#34d399,#14b8a6)",color:saving?"rgba(240,246,255,0.4)":"#052e16",fontWeight:900,fontSize:13,cursor:saving?"not-allowed":"pointer",fontFamily:"'IBM Plex Sans',sans-serif",flex:1,maxWidth:220}}>
                  {saving?"Saving...":"Save Changes"}
                </button>
                <button onClick={goBack} disabled={saving} style={{padding:"11px 20px",borderRadius:12,border:"1px solid rgba(148,163,184,0.18)",background:"rgba(255,255,255,0.04)",color:"#f0f6ff",fontWeight:700,fontSize:13,cursor:saving?"not-allowed":"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
