// src/app/equipment/[tag]/edit/page.jsx
// (Replace the simple version - this is the full featured edit page)
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const T = {
  bg:"#070e18",surface:"rgba(13,22,38,0.80)",panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)",border:"rgba(148,163,184,0.12)",text:"#f0f6ff",
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
  input[type="file"]{color:rgba(240,246,255,0.60)}
  .eg{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
  .btn-row{display:flex;gap:10px;flex-wrap:wrap}
  @media(max-width:768px){
    .ep{padding:12px!important}
    .eh{flex-direction:column!important;gap:12px!important}
    .eg{grid-template-columns:1fr}
    .btn-row{width:100%}.btn-row button{flex:1}
  }
`;

function san(v,max=300){if(!v&&v!==0)return "";return String(v).replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim().slice(0,max);}
function toDate(v){if(!v)return "";const d=new Date(v);return isNaN(d.getTime())?"":d.toISOString().slice(0,10);}

const IS={width:"100%",padding:"11px 13px",borderRadius:10,border:"1px solid rgba(148,163,184,0.12)",background:"rgba(18,30,50,0.70)",color:"#f0f6ff",fontSize:13,fontWeight:500,outline:"none",fontFamily:"'IBM Plex Sans',sans-serif",WebkitAppearance:"none",appearance:"none"};
const LS={display:"block",fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(240,246,255,0.50)",marginBottom:7};

const EQUIPMENT_TYPES=["Pressure Vessel","Boiler","Air Receiver","Trestle Jack","Air Compressor","Lever Hoist","Bottle Jack","Safety Harness","Jack Stand","Oil Separator","Chain Block","Bow Shackle","Mobile Crane","Trolley Jack","Step Ladders","Tifor","Crawl Beam","Beam Crawl","Beam Clamp","Webbing Sling","Nylon Sling","Wire Sling","Fall Arrest","Man Cage","Shutter Clamp","Drum Clamp","Manual Rod Handlers"];
const PRESSURE_TYPES=["Pressure Vessel","Boiler","Air Receiver","Air Compressor","Oil Separator"];
const LIFTING_TYPES=["Trestle Jack","Lever Hoist","Bottle Jack","Safety Harness","Jack Stand","Chain Block","Bow Shackle","Mobile Crane","Trolley Jack","Step Ladders","Tifor","Crawl Beam","Beam Crawl","Beam Clamp","Webbing Sling","Nylon Sling","Wire Sling","Fall Arrest","Man Cage","Shutter Clamp","Drum Clamp","Manual Rod Handlers"];
const LANYARD_TYPES=["Safety Harness","Fall Arrest"];

function F({label,name,value,onChange,type="text",placeholder="",readOnly=false}){
  return(<div><label style={LS}>{label}</label><input type={type} name={name} value={value??""} onChange={onChange} placeholder={placeholder} readOnly={readOnly} style={{...IS,...(readOnly?{opacity:.5,cursor:"not-allowed"}:{})}} /></div>);
}
function Sel({label,name,value,onChange,children}){
  return(<div><label style={LS}>{label}</label><select name={name} value={value??""} onChange={onChange} style={{...IS,cursor:"pointer"}}>{children}</select></div>);
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
  const params=useParams();
  const router=useRouter();
  const tag=params?.tag;

  const [assetId,setAssetId]=useState(null);
  const [form,setForm]=useState({});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [uploadingSignature,setUploadingSignature]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");

  useEffect(()=>{
    if(!tag)return;
    async function load(){
      setLoading(true);setError("");
      const{data,error:e}=await supabase.from("assets").select("*").eq("asset_tag",tag).maybeSingle();
      if(e||!data){setError("Equipment not found.");setLoading(false);return;}
      setAssetId(data.id);
      setForm({
        asset_name:data.asset_name||"",asset_tag:data.asset_tag||"",
        asset_type:data.asset_type||"",serial_number:data.serial_number||"",
        equipment_id:data.equipment_id||"",identification_number:data.identification_number||"",
        inspection_no:data.inspection_no||"",manufacturer:data.manufacturer||"",
        model:data.model||"",year_built:data.year_built||"",country_of_origin:data.country_of_origin||"",
        location:data.location||"",department:data.department||"",
        safe_working_load:data.safe_working_load||"",proof_load:data.proof_load||"",
        capacity_volume:data.capacity_volume||"",working_pressure:data.working_pressure||"",
        design_pressure:data.design_pressure||"",test_pressure:data.test_pressure||"",
        design_temperature:data.design_temperature||"",
        lifting_height:data.lifting_height||"",sling_length:data.sling_length||"",
        chain_size:data.chain_size||"",rope_diameter:data.rope_diameter||"",
        lanyard_serial_no:data.lanyard_serial_no||"",
        last_inspection_date:toDate(data.last_inspection_date),
        next_inspection_date:toDate(data.next_inspection_date||data.expiry_date),
        license_expiry:toDate(data.license_expiry),
        inspector_name:data.inspector_name||"",inspector_id:data.inspector_id||"",
        inspector_signature_url:data.inspector_signature_url||"",
        cert_type:data.cert_type||"",design_standard:data.design_standard||"",
        license_status:data.license_status||"valid",condition:data.condition||"",
        status:data.status||"active",notes:data.notes||"",
      });
      setLoading(false);
    }
    load();
  },[tag]);

  const hc=e=>{const{name,value}=e.target;setForm(p=>({...p,[name]:value}));};
  const goBack=()=>router.push(tag?`/equipment/${tag}`:"/equipment");

  async function handleSignatureUpload(e){
    const file=e.target.files?.[0];
    if(!file)return;
    setUploadingSignature(true);
    try{
      const ext=file.name.split(".").pop()||"jpg";
      const path=`signatures/sig-${Date.now()}.${ext}`;
      const{error:ue}=await supabase.storage.from("documents").upload(path,file,{upsert:true});
      if(ue)throw ue;
      const{data}=supabase.storage.from("documents").getPublicUrl(path);
      setForm(p=>({...p,inspector_signature_url:data.publicUrl}));
    }catch(err){setError("Signature upload failed: "+(err?.message||"Unknown error"));}
    finally{setUploadingSignature(false);}
  }

  /* ✅ Sync latest certificate after every asset save */
  async function syncLatestCertificate(){
    if(!assetId)return;
    const{data:cert}=await supabase.from("certificates").select("id")
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
      valid_to:expiryIso, expiry_date:expiryIso, next_inspection_date:expiryIso,
      legal_framework:san(form.design_standard,150)||null,
      inspector_name:san(form.inspector_name,100)||null,
      inspector_id:san(form.inspector_id,80)||null,
      signature_url:san(form.inspector_signature_url,500)||null,
    }).eq("id",cert.id);
  }

  async function handleSubmit(e){
    e.preventDefault();setSaving(true);setError("");setSuccess("");
    try{
      if(!san(form.serial_number))throw new Error("Serial number is required.");
      const expiryIso=form.next_inspection_date||null;
      const{error:ue}=await supabase.from("assets").update({
        asset_name:san(form.asset_name,150)||null,
        asset_type:san(form.asset_type,100)||null,
        serial_number:san(form.serial_number,80)||null,
        equipment_id:san(form.equipment_id,80)||null,
        identification_number:san(form.identification_number,80)||null,
        inspection_no:san(form.inspection_no,80)||null,
        manufacturer:san(form.manufacturer,100)||null,
        model:san(form.model,100)||null,
        year_built:san(form.year_built,20)||null,
        country_of_origin:san(form.country_of_origin,80)||null,
        location:san(form.location,150)||null,
        department:san(form.department,100)||null,
        safe_working_load:san(form.safe_working_load,50)||null,
        proof_load:san(form.proof_load,50)||null,
        capacity_volume:san(form.capacity_volume,50)||null,
        working_pressure:san(form.working_pressure,50)||null,
        design_pressure:san(form.design_pressure,50)||null,
        test_pressure:san(form.test_pressure,50)||null,
        design_temperature:san(form.design_temperature,50)||null,
        lifting_height:san(form.lifting_height,50)||null,
        sling_length:san(form.sling_length,50)||null,
        chain_size:san(form.chain_size,50)||null,
        rope_diameter:san(form.rope_diameter,50)||null,
        lanyard_serial_no:san(form.lanyard_serial_no,80)||null,
        last_inspection_date:form.last_inspection_date||null,
        next_inspection_date:expiryIso,
        expiry_date:expiryIso,
        inspector_name:san(form.inspector_name,100)||null,
        inspector_id:san(form.inspector_id,80)||null,
        inspector_signature_url:san(form.inspector_signature_url,500)||null,
        cert_type:san(form.cert_type,100)||null,
        design_standard:san(form.design_standard,150)||null,
        license_status:san(form.license_status,30)||"valid",
        license_expiry:form.license_expiry||null,
        condition:san(form.condition,50)||null,
        status:san(form.status,30)||"active",
        notes:san(form.notes,1000)||null,
      }).eq("asset_tag",tag);
      if(ue)throw ue;
      await syncLatestCertificate();
      setSuccess("Equipment saved successfully.");
      setTimeout(()=>goBack(),1100);
    }catch(err){setError("Save failed: "+(err?.message||"Unknown error"));}
    finally{setSaving(false);}
  }

  const isPv=PRESSURE_TYPES.includes(form.asset_type);
  const isLft=LIFTING_TYPES.includes(form.asset_type);
  const hasLanyard=LANYARD_TYPES.includes(form.asset_type);

  return(
    <AppLayout title="Edit Equipment">
      <style>{CSS}</style>
      <div className="ep" style={{minHeight:"100vh",background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.05),transparent),${T.bg}`,color:T.text,fontFamily:"'IBM Plex Sans',sans-serif",padding:24}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"grid",gap:18}}>

          {/* HEADER */}
          <div style={{background:T.surface,border:"1px solid rgba(148,163,184,0.12)",borderRadius:20,padding:"20px 22px",backdropFilter:"blur(20px)"}}>
            <div className="eh" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent,marginBottom:8}}>Equipment</div>
                <h1 style={{margin:0,fontSize:"clamp(20px,3vw,26px)",fontWeight:900,letterSpacing:"-0.02em"}}>Edit Equipment</h1>
                {tag&&<p style={{margin:"6px 0 0",color:T.textDim,fontSize:13}}>
                  Tag: <span style={{color:T.textMid,fontFamily:"'IBM Plex Mono',monospace"}}>{tag}</span>
                  &nbsp;&bull;&nbsp;Changes sync to linked certificate automatically
                </p>}
              </div>
              <div className="btn-row">
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
              <div style={{fontSize:13,fontWeight:600}}>Loading equipment...</div>
            </div>
          ):(
            <form onSubmit={handleSubmit} style={{display:"grid",gap:18}}>

              <Sec icon="&#9881;" title="Equipment Identity">
                <div className="eg">
                  <F label="Asset Name" name="asset_name" value={form.asset_name} onChange={hc} />
                  <F label="Asset Tag" name="asset_tag" value={form.asset_tag} onChange={hc} readOnly />
                  <div>
                    <label style={LS}>Equipment Type</label>
                    <select name="asset_type" value={form.asset_type||""} onChange={hc} style={{...IS,cursor:"pointer"}}>
                      {EQUIPMENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <F label="Serial Number *" name="serial_number" value={form.serial_number} onChange={hc} />
                  <F label="Equipment ID" name="equipment_id" value={form.equipment_id} onChange={hc} />
                  <F label="Identification Number" name="identification_number" value={form.identification_number} onChange={hc} />
                  <F label="Inspection No." name="inspection_no" value={form.inspection_no} onChange={hc} />
                  {hasLanyard&&<F label="Lanyard Serial No." name="lanyard_serial_no" value={form.lanyard_serial_no} onChange={hc} />}
                  <F label="Manufacturer" name="manufacturer" value={form.manufacturer} onChange={hc} />
                  <F label="Model" name="model" value={form.model} onChange={hc} />
                  <F label="Year Built" name="year_built" value={form.year_built} onChange={hc} />
                  <F label="Country of Origin" name="country_of_origin" value={form.country_of_origin} onChange={hc} />
                  <F label="Location" name="location" value={form.location} onChange={hc} />
                  <F label="Department / Plant" name="department" value={form.department} onChange={hc} />
                </div>
              </Sec>

              <Sec icon="&#128208;" title="Technical Data">
                <div className="eg">
                  <F label="Certificate Type" name="cert_type" value={form.cert_type} onChange={hc} />
                  <F label="Design Standard" name="design_standard" value={form.design_standard} onChange={hc} />
                  {isPv&&<>
                    <F label="Design Pressure" name="design_pressure" value={form.design_pressure} onChange={hc} placeholder="e.g. 1500 kPa" />
                    <F label="Working Pressure (MAWP)" name="working_pressure" value={form.working_pressure} onChange={hc} placeholder="e.g. 1200 kPa" />
                    <F label="Test Pressure" name="test_pressure" value={form.test_pressure} onChange={hc} placeholder="e.g. 2250 kPa" />
                    <F label="Design Temperature" name="design_temperature" value={form.design_temperature} onChange={hc} />
                    <F label="Volume / Capacity" name="capacity_volume" value={form.capacity_volume} onChange={hc} placeholder="e.g. 200 L" />
                  </>}
                  {isLft&&<>
                    <F label="Safe Working Load (SWL)" name="safe_working_load" value={form.safe_working_load} onChange={hc} placeholder="e.g. 2.5T" />
                    <F label="Proof Load" name="proof_load" value={form.proof_load} onChange={hc} />
                    <F label="Lift Height" name="lifting_height" value={form.lifting_height} onChange={hc} />
                    <F label="Sling Length" name="sling_length" value={form.sling_length} onChange={hc} />
                    <F label="Chain Size" name="chain_size" value={form.chain_size} onChange={hc} />
                    <F label="Rope / Wire Diameter" name="rope_diameter" value={form.rope_diameter} onChange={hc} />
                  </>}
                </div>
              </Sec>

              <Sec icon="&#128119;" title="Inspector &amp; Signature">
                <div className="eg" style={{marginBottom:16}}>
                  <F label="Inspector Name" name="inspector_name" value={form.inspector_name} onChange={hc} />
                  <F label="Inspector ID" name="inspector_id" value={form.inspector_id} onChange={hc} />
                  <F label="Signature URL (manual)" name="inspector_signature_url" value={form.inspector_signature_url} onChange={hc} placeholder="https://..." />
                </div>

                {/* Signature upload */}
                <div style={{background:T.card,border:"1px solid rgba(34,211,238,0.15)",borderRadius:12,padding:16}}>
                  <div style={{fontSize:12,fontWeight:700,color:T.textMid,marginBottom:10}}>Upload Signature Image</div>
                  <input type="file" accept="image/*" onChange={handleSignatureUpload} disabled={uploadingSignature} style={{...IS,padding:"9px 12px",cursor:"pointer"}} />
                  {uploadingSignature&&<div style={{fontSize:12,color:T.accent,marginTop:8}}>Uploading...</div>}
                  {form.inspector_signature_url&&(
                    <div style={{marginTop:12}}>
                      <div style={{fontSize:11,color:T.textDim,marginBottom:6}}>Current signature:</div>
                      <img
                        src={form.inspector_signature_url}
                        alt="Inspector signature"
                        style={{height:70,maxWidth:280,objectFit:"contain",background:"#fff",borderRadius:8,padding:6,border:"1px solid rgba(148,163,184,0.18)"}}
                        onError={e=>{e.currentTarget.style.display="none";}}
                      />
                    </div>
                  )}
                </div>
              </Sec>

              <Sec icon="&#128197;" title="Dates &amp; Status">
                <div className="eg">
                  <F label="Last Inspection Date" name="last_inspection_date" type="date" value={form.last_inspection_date} onChange={hc} />
                  <F label="Next Inspection / Expiry Date" name="next_inspection_date" type="date" value={form.next_inspection_date} onChange={hc} />
                  <F label="License Expiry" name="license_expiry" type="date" value={form.license_expiry} onChange={hc} />
                  <div>
                    <label style={LS}>License Status</label>
                    <select name="license_status" value={form.license_status||"valid"} onChange={hc} style={{...IS,cursor:"pointer"}}>
                      {["valid","expiring","expired","pending","suspended"].map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
                    </select>
                  </div>
                  <F label="Condition" name="condition" value={form.condition} onChange={hc} />
                  <div>
                    <label style={LS}>Status</label>
                    <select name="status" value={form.status||"active"} onChange={hc} style={{...IS,cursor:"pointer"}}>
                      {["active","inactive","suspended"].map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
              </Sec>

              <Sec icon="&#128218;" title="Notes">
                <div>
                  <label style={LS}>Notes</label>
                  <textarea name="notes" value={form.notes||""} onChange={hc} rows={4} style={{...IS,resize:"vertical",minHeight:90}} placeholder="Comments, findings, conditions..." />
                </div>
              </Sec>

              <div className="btn-row" style={{paddingBottom:8}}>
                <button type="submit" disabled={saving||uploadingSignature} style={{padding:"11px 28px",borderRadius:12,border:"none",background:saving?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#34d399,#14b8a6)",color:saving?"rgba(240,246,255,0.4)":"#052e16",fontWeight:900,fontSize:13,cursor:saving?"not-allowed":"pointer",fontFamily:"'IBM Plex Sans',sans-serif",flex:1,maxWidth:220}}>
                  {saving?"Saving...":"Save Equipment"}
                </button>
                <button type="button" onClick={goBack} disabled={saving} style={{padding:"11px 20px",borderRadius:12,border:"1px solid rgba(148,163,184,0.18)",background:"rgba(255,255,255,0.04)",color:"#f0f6ff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                  Cancel
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
