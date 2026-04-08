// apps/web/src/app/certificates/create/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import { registerEquipment } from "@/services/equipment";
import { buildDocumentGroup, buildEquipmentDescription, detectEquipmentType, expiryBucketFromDate, normalizeText } from "@/lib/equipmentDetection";

const T = {
  bg:"#070e18", surface:"rgba(13,22,38,0.80)", panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)", border:"rgba(148,163,184,0.12)", text:"#f0f6ff",
  textMid:"rgba(240,246,255,0.72)", textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee", accentDim:"rgba(34,211,238,0.10)", accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399", greenDim:"rgba(52,211,153,0.10)", greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171", redDim:"rgba(248,113,113,0.10)", redBrd:"rgba(248,113,113,0.25)",
  blue:"#60a5fa", blueDim:"rgba(96,165,250,0.10)",
};

const CSS = `
  *,*::before,*::after{box-sizing:border-box}
  input::placeholder,textarea::placeholder{color:rgba(240,246,255,0.28)}
  select option{background:#0a1420;color:#f0f6ff}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  .cg4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
  .cg3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
  .cg2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
  .scan-layout{display:grid;grid-template-columns:1fr 300px;gap:18px;align-items:start}
  @media(max-width:1024px){.cg4{grid-template-columns:repeat(2,1fr)}.cg3{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:768px){
    .create-page-pad{padding:14px!important}
    .cg4,.cg3,.cg2{grid-template-columns:1fr!important}
    .scan-layout{grid-template-columns:1fr!important}
    .scan-preview{order:-1}
  }
`;

const EQUIP_GROUPS = [
  {label:"Chain & Block Hoists",types:["Chain Block","Manual Chain Hoist","Electric Chain Hoist","Lever Hoist / Tirfor","Chain Pulley Block","Electric Wire Rope Hoist","Wire Rope Winch"]},
  {label:"Cranes",types:["Mobile Crane","Crane Boom","Crane Hook","Wire Rope","Overhead Crane / EOT Crane","Gantry Crane","Jib Crane","Knuckle Boom Crane","Davit Crane","Crawler Crane","Tower Crane","Rough Terrain Crane","All Terrain Crane","Truck Mounted Crane"]},
  {label:"Slings",types:["Chain Sling","Wire Rope Sling","Web Sling / Flat Sling","Round Sling","Multi-Leg Chain Sling","Multi-Leg Wire Rope Sling","Endless Sling"]},
  {label:"Shackles",types:["Shackle — Bow / Anchor","Shackle — D / Dee","Shackle — Safety Bow","Shackle — Wide Mouth","Shackle — Screw Pin Anchor","Shackle — Screw Pin Chain","Shackle — Bolt Type Anchor","Shackle — Bolt Type Chain","Shackle — Alloy","Shackle — Stainless Steel"]},
  {label:"Rigging Hardware",types:["Hook — Swivel","Hook — Eye","Hook — Clevis","Hook — Crane","Swivel","Eye Bolt","Eye Nut","Ring Bolt","Turnbuckle","Master Link","Master Link — Oblong","Connecting Link","Coupling Link","Wire Rope Clip","Thimble","Load Binder","Ratchet Lashing Strap"]},
  {label:"Beams & Spreaders",types:["Spreader Beam","Lifting Beam","Adjustable Spreader Beam","Modular Spreader Beam","Lifting Frame","Pallet Lifter","Coil Lifter","Drum Lifter","Pipe Lifter","Magnetic Lifter","Vacuum Lifter Pad"]},
  {label:"Clamps & Grabs",types:["Beam Clamp","Girder Clamp","Plate Clamp — Horizontal","Plate Clamp — Vertical","Pipe Clamp","Slab Clamp","Drum Clamp","Stone Lifter / Excavator Grab"]},
  {label:"Fall Protection",types:["Safety Harness — Full Body","Safety Harness — Sit","Lanyard — Energy Absorbing","Lanyard — Twin Leg","Rope Lanyard","Self-Retracting Lifeline (SRL)","Fall Arrest Block","Rope Grab / Fall Arrester","Anchor Point","Lifeline System","Safety Rope"]},
  {label:"Winches & Pullers",types:["Electric Winch","Hydraulic Winch","Air / Pneumatic Winch","Hand Winch","Come-Along / Hand Puller","Snatch Block","Pulley Block","Gin Block"]},
  {label:"Jacks",types:["Hydraulic Floor Jack","Bottle Jack — Hydraulic","Screw Jack / Mechanical Jack","Toe Jack","Pancake Jack / Low Profile Jack","Trolley Jack","Pneumatic Jack","Trestle Jack","Axle Jack","Floor Jack","Jack Stand","Strand Jack","Hydraulic Climbing Jack","Lifting Jack — General"]},
  {label:"Forklift & Machines",types:["Counterbalance Forklift","Reach Truck","Telehandler","Scissor Lift","Boom Lift / Cherry Picker","Personnel Basket / Man Basket","Pallet Jack — Manual","Pallet Jack — Electric","Stacker — Manual","Stacker — Electric","Order Picker","TLB (Tractor Loader Backhoe)","Front Loader / Wheel Loader","Crane Truck / Hiab","Water Bowser","Tipper Truck","Bus / Personnel Carrier","Air Compressor","Container Handler","Reach Stacker"]},
  {label:"Pressure Equipment",types:["Pressure Vessel","Air Receiver","Boiler","Autoclave","Hydraulic Tank","Compressor — Air","Compressor — Gas","Accumulator","Gas Cylinder","LPG Tank","Heat Exchanger","Separator","Pipeline Section"]},
  {label:"Mine & Site Equipment",types:["Scaffold","Scaffold Hoist","Underground Mine Cage","Skip Hoist","Headgear Sheave","Kibble / Bucket","Rock Drill Rig","Dragline Bucket","Fire Extinguisher","Other"]},
];

const CERT_TYPES = ["Load Test Certificate","Pressure Test Certificate","Certificate of Inspection","NDT Certificate","Thorough Examination Certificate","Certificate of Compliance"];

function isoDateOnly(v){if(!v)return"";const d=new Date(v);if(Number.isNaN(d.getTime()))return"";return d.toISOString().slice(0,10);}
function addDays(start,days){const d=new Date(start||new Date());d.setDate(d.getDate()+days);return isoDateOnly(d);}
function normalizeCertResult(v){const r=String(v||"").trim().toUpperCase();if(["PASS","FAIL","REPAIR_REQUIRED","OUT_OF_SERVICE","UNKNOWN","CONDITIONAL"].includes(r))return r;if(r==="REPAIR REQUIRED")return"REPAIR_REQUIRED";return"PASS";}
function normalizeCertStatus(v){const r=String(v||"").trim().toLowerCase();if(["active","issued","draft","expired","inactive","void"].includes(r))return r;return"active";}

async function getClients(){const{data,error}=await supabase.from("clients").select("id,company_name,company_code").order("company_name",{ascending:true});if(error)throw error;return data||[];}
async function getClientByName(name){const c=normalizeText(name);if(!c)return null;const{data,error}=await supabase.from("clients").select("id,company_name,company_code").ilike("company_name",c).limit(1).maybeSingle();if(error)throw error;return data;}
async function createClient(name){const c=normalizeText(name);const{data,error}=await supabase.from("clients").insert([{company_name:c,status:"active"}]).select("id,company_name,company_code").single();if(error)throw error;return data;}
async function uploadToCertsBucket(file,folder){const ext=file.name.split(".").pop()||"jpg";const path=`${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;const{error}=await supabase.storage.from("certificates").upload(path,file,{upsert:true});if(error)throw error;const{data}=supabase.storage.from("certificates").getPublicUrl(path);return data.publicUrl;}
async function generateCertNumber(serial,assetId){const base=normalizeText(serial)?normalizeText(serial).replace(/[\s\-\/]+/g,"").toUpperCase():`ASSET${assetId}`;const prefix=`CERT-${base}-`;const{data,error}=await supabase.from("certificates").select("certificate_number").like("certificate_number",`${prefix}%`).order("certificate_number",{ascending:false}).limit(1).maybeSingle();if(error)throw error;let next=1;if(data?.certificate_number){const parts=data.certificate_number.split("-");const seq=parseInt(parts[parts.length-1],10);if(!Number.isNaN(seq))next=seq+1;}return`${prefix}${String(next).padStart(2,"0")}`;}

const INIT={
  client_id:"",client_name:"",site_id:"",site_name:"",
  manufacturer:"",model:"",serial_number:"",year_built:"",
  equipment_id:"",identification_number:"",
  capacity:"",swl:"",mawp:"",design_pressure:"",test_pressure:"",pressure_unit:"bar",
  country_of_origin:"",equipment_type:"",equipment_description:"",
  asset_name:"",asset_tag:"",fleet_number:"",registration_number:"",lanyard_serial_no:"",
  certificate_type:"Load Test Certificate",equipment_status:"PASS",document_status:"active",
  inspection_date:isoDateOnly(new Date()),issue_date:isoDateOnly(new Date()),
  expiry_date:addDays(new Date(),365),
  inspector_name:"Moemedi Masupe",inspector_id:"700117910",
  defects_found:"",recommendations:"",remarks:"",
  pdf_url:"",nameplate_image_url:"",ocr_raw_text:"",detected_from_nameplate:false,
};

export default function CreateCertificatePage(){
  const router=useRouter();
  const[loadingClients,setLoadingClients]=useState(true);
  const[clients,setClients]=useState([]);
  const[saving,setSaving]=useState(false);
  const[scanLoading,setScanLoading]=useState(false);
  const[error,setError]=useState("");
  const[success,setSuccess]=useState("");
  const[nameplateFile,setNameplateFile]=useState(null);
  const[nameplatePreview,setNameplatePreview]=useState("");
  const[form,setForm]=useState(INIT);

  useEffect(()=>{
    let mounted=true;
    async function load(){try{setLoadingClients(true);const rows=await getClients();if(mounted)setClients(rows);}catch(e){if(mounted)setError(e.message||"Failed to load clients.");}finally{if(mounted)setLoadingClients(false);}}
    load();
    return()=>{mounted=false;if(nameplatePreview)URL.revokeObjectURL(nameplatePreview);};
  },[]);

  const expiryBucket=useMemo(()=>expiryBucketFromDate(form.expiry_date),[form.expiry_date]);

  function setField(name,value){
    setForm(prev=>{
      const next={...prev,[name]:value};
      if(["manufacturer","model","capacity","serial_number","identification_number","equipment_id","equipment_type"].includes(name)){
        next.equipment_description=buildEquipmentDescription({manufacturer:name==="manufacturer"?value:next.manufacturer,equipment_type:name==="equipment_type"?value:next.equipment_type,model:name==="model"?value:next.model,capacity:name==="capacity"?value:next.capacity,serial_number:name==="serial_number"?value:next.serial_number,identification_number:name==="identification_number"?value:next.identification_number,equipment_id:name==="equipment_id"?value:next.equipment_id});
        next.asset_name=next.equipment_description;
      }
      return next;
    });
  }

  function handleClientChange(e){const v=e.target.value;const sel=clients.find(c=>String(c.id)===String(v));setForm(p=>({...p,client_id:sel?.id||"",client_name:sel?.company_name||p.client_name}));}
  function handleNameplateSelect(e){const file=e.target.files?.[0];if(!file)return;if(nameplatePreview)URL.revokeObjectURL(nameplatePreview);setNameplateFile(file);setNameplatePreview(URL.createObjectURL(file));setSuccess("");setError("");}

  async function handleScanNameplate(){
    if(!nameplateFile){setError("Choose or capture a nameplate image first.");return;}
    try{
      setScanLoading(true);setError("");setSuccess("");
      const body=new FormData();body.append("file",nameplateFile);
      const res=await fetch("/api/nameplate/scan",{method:"POST",body});
      const json=await res.json();
      if(!res.ok)throw new Error(json.error||"Failed to scan nameplate.");
      const parsed=json.parsed||{};
      const detection=detectEquipmentType({raw_text:json.ocr?.raw_text||parsed.raw_text||"",manufacturer:parsed.manufacturer,model:parsed.model,serial_number:parsed.serial_number,capacity:parsed.capacity,swl:parsed.swl,mawp:parsed.mawp});
      setForm(prev=>{
        const equipment_type=parsed.equipment_type||detection.type||prev.equipment_type;
        const certificate_type=parsed.document_category||detection.category||prev.certificate_type;
        const equipment_description=buildEquipmentDescription({manufacturer:parsed.manufacturer||prev.manufacturer,equipment_type,model:parsed.model||prev.model,capacity:parsed.capacity||prev.capacity,serial_number:parsed.serial_number||prev.serial_number,identification_number:parsed.equipment_id||prev.identification_number,equipment_id:parsed.equipment_id||prev.equipment_id});
        return{...prev,manufacturer:parsed.manufacturer||prev.manufacturer,model:parsed.model||prev.model,serial_number:parsed.serial_number||prev.serial_number,year_built:parsed.year_built||prev.year_built,capacity:parsed.capacity||prev.capacity,swl:parsed.swl||prev.swl,mawp:parsed.mawp||prev.mawp,design_pressure:parsed.design_pressure||prev.design_pressure,test_pressure:parsed.test_pressure||prev.test_pressure,country_of_origin:parsed.country_of_origin||prev.country_of_origin,equipment_id:parsed.equipment_id||prev.equipment_id,identification_number:parsed.equipment_id||prev.identification_number,equipment_type,certificate_type,equipment_description,asset_name:equipment_description,ocr_raw_text:json.ocr?.raw_text||parsed.raw_text||"",detected_from_nameplate:true};
      });
      setSuccess("Nameplate scanned successfully.");
    }catch(e){setError(e.message||"Scan failed.");}
    finally{setScanLoading(false);}
  }

  async function resolveClient(){
    if(form.client_id){const sel=clients.find(c=>c.id===form.client_id);return{id:form.client_id,company_name:sel?.company_name||form.client_name};}
    if(!normalizeText(form.client_name))throw new Error("Enter client name or choose a client.");
    const existing=await getClientByName(form.client_name);
    if(existing)return existing;
    const created=await createClient(form.client_name);
    setClients(p=>[...p,created].sort((a,b)=>a.company_name.localeCompare(b.company_name)));
    return created;
  }

  async function createOrUpdateAsset(client,nameplateImageUrl){
    const lookupSerial=normalizeText(form.serial_number||form.identification_number||form.equipment_id);
    if(lookupSerial){
      const{data:existing,error}=await supabase.from("assets").select("id,asset_tag").eq("client_id",client.id).eq("serial_number",lookupSerial).limit(1).maybeSingle();
      if(error)throw error;
      if(existing){
        await supabase.from("assets").update({client_id:client.id,asset_name:form.asset_name||form.equipment_description,asset_tag:form.asset_tag||existing.asset_tag||null,equipment_type:form.equipment_type||null,manufacturer:form.manufacturer||null,model:form.model||null,serial_number:form.serial_number||lookupSerial,year_built:form.year_built||null,swl:form.swl||null,capacity_volume:form.capacity||null,working_pressure:form.mawp||null,design_pressure:form.design_pressure||null,test_pressure:form.test_pressure||null,country_of_origin:form.country_of_origin||null,location:form.site_name||null,next_inspection_due:form.expiry_date||null,inspection_date:form.inspection_date||null,nameplate_image_url:nameplateImageUrl||null}).eq("id",existing.id);
        return{id:existing.id,asset_tag:form.asset_tag||existing.asset_tag||null,asset_name:form.asset_name||form.equipment_description};
      }
    }
    const payload={client_id:client.id,asset_name:form.asset_name||form.equipment_description,asset_tag:form.asset_tag||null,equipment_type:form.equipment_type,equipment_description:form.equipment_description,manufacturer:form.manufacturer,model:form.model,serial_number:form.serial_number||lookupSerial||null,year_built:form.year_built,swl:form.swl,capacity:form.capacity,capacity_volume:form.capacity,working_pressure:form.mawp,design_pressure:form.design_pressure,test_pressure:form.test_pressure,identification_number:form.identification_number,equipment_id:form.equipment_id,country_of_origin:form.country_of_origin,location:form.site_name||null,next_inspection_due:form.expiry_date||null,inspection_date:form.inspection_date||null,nameplate_image_url:nameplateImageUrl||null};
    const{data,error}=await registerEquipment(payload);
    if(error)throw error;
    return data;
  }

  async function handleSave(){
    try{
      setSaving(true);setError("");setSuccess("");
      const client=await resolveClient();
      let nameplateImageUrl=form.nameplate_image_url;
      if(nameplateFile&&!nameplateImageUrl)nameplateImageUrl=await uploadToCertsBucket(nameplateFile,"nameplates");
      const asset=await createOrUpdateAsset(client,nameplateImageUrl);
      const certificate_number=await generateCertNumber(form.serial_number||form.identification_number||form.equipment_id,asset.id);
      const detected=detectEquipmentType({raw_text:form.ocr_raw_text,manufacturer:form.manufacturer,model:form.model,serial_number:form.serial_number,capacity:form.capacity,swl:form.swl,mawp:form.mawp});
      const equipment_type=normalizeText(form.equipment_type)||detected.type;
      const equipment_description=normalizeText(form.equipment_description)||buildEquipmentDescription({manufacturer:form.manufacturer,equipment_type,model:form.model,capacity:form.capacity,serial_number:form.serial_number,identification_number:form.identification_number,equipment_id:form.equipment_id});
      const canonicalResult=normalizeCertResult(form.equipment_status);
      const canonicalStatus=normalizeCertStatus(form.document_status);
      const comments=normalizeText(form.remarks)||null;

      const payload={
        certificate_number,client_id:client.id,client_name:client.company_name,company:client.company_name,company_name:client.company_name,
        asset_id:asset.id,asset_tag:asset?.asset_tag||form.asset_tag||null,asset_name:asset?.asset_name||form.asset_name||equipment_description,
        asset_type:equipment_type,equipment_type,equipment_description,
        site_id:form.site_id||null,location:form.site_name||null,
        certificate_type:form.certificate_type,document_category:form.certificate_type,
        result:canonicalResult,equipment_status:canonicalResult,status:canonicalStatus,document_status:canonicalStatus,
        inspection_date:form.inspection_date||null,issue_date:form.issue_date||null,expiry_date:form.expiry_date||null,
        last_inspection_date:form.inspection_date||null,next_inspection_date:form.expiry_date||null,next_inspection_due:form.expiry_date||null,
        issued_at:form.issue_date?new Date(form.issue_date).toISOString():null,valid_to:form.expiry_date,
        manufacturer:form.manufacturer||null,model:form.model||null,serial_number:form.serial_number||null,year_built:form.year_built||null,
        equipment_id:form.equipment_id||null,identification_number:form.identification_number||null,inspection_number:form.identification_number||null,
        capacity:form.capacity||null,capacity_volume:form.capacity||null,swl:form.swl||null,mawp:form.mawp||null,working_pressure:form.mawp||null,
        design_pressure:form.design_pressure||null,test_pressure:form.test_pressure||null,pressure_unit:form.pressure_unit||"bar",
        country_of_origin:form.country_of_origin||null,fleet_number:form.fleet_number||null,registration_number:form.registration_number||null,
        lanyard_serial_no:form.lanyard_serial_no||null,
        inspector_name:form.inspector_name||null,inspector_id:form.inspector_id||null,inspection_body:"Monroy (Pty) Ltd",
        defects_found:form.defects_found||null,recommendations:form.recommendations||null,comments,remarks:comments,
        nameplate_image_url:nameplateImageUrl||null,pdf_url:form.pdf_url||null,logo_url:"/logo.png",
        detected_from_nameplate:!!form.detected_from_nameplate,ocr_raw_text:form.ocr_raw_text||null,version_no:1,
        document_group:buildDocumentGroup({clientName:client.company_name,equipmentType:equipment_type,equipmentDescription:equipment_description}),
      };

      const{error:insertError}=await supabase.from("certificates").insert([payload]);
      if(insertError)throw insertError;
      setSuccess(`Certificate saved — expiry: ${expiryBucket}`);
      setTimeout(()=>router.push("/certificates"),1500);
    }catch(e){setError(e.message||"Failed to save certificate.");}
    finally{setSaving(false);}
  }

  return(
    <AppLayout title="Create Certificate">
      <style>{CSS}</style>
      <div className="create-page-pad" style={{minHeight:"100vh",background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.05),transparent),${T.bg}`,color:T.text,fontFamily:"'IBM Plex Sans',sans-serif",padding:24}}>
        <div style={{maxWidth:1300,margin:"0 auto",display:"grid",gap:18}}>

          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,padding:"20px 22px",backdropFilter:"blur(20px)",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent,marginBottom:8}}>New Certificate</div>
              <h1 style={{margin:"0 0 4px",fontSize:24,fontWeight:900,letterSpacing:"-0.02em"}}>Create Certificate</h1>
              <p style={{margin:0,color:T.textDim,fontSize:13}}>Scan nameplate with AI, auto-detect equipment type, assign client and save.</p>
            </div>
            <button type="button" onClick={()=>router.push("/certificates")} style={S.btnGhost}>← Back</button>
          </div>

          {error&&<div style={{padding:"12px 16px",borderRadius:12,border:`1px solid ${T.redBrd}`,background:T.redDim,color:T.red,fontSize:13,fontWeight:700}}>⚠ {error}</div>}
          {success&&<div style={{padding:"12px 16px",borderRadius:12,border:`1px solid ${T.greenBrd}`,background:T.greenDim,color:T.green,fontSize:13,fontWeight:700}}>✓ {success}</div>}

          <Sec title="Nameplate Scan" color={T.blue}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap",marginBottom:16}}>
              <div style={{color:T.textMid,fontSize:13}}>Upload or capture a nameplate photo. AI will extract the visible fields automatically.</div>
              <button type="button" onClick={handleScanNameplate} disabled={scanLoading||!nameplateFile} style={{padding:"10px 18px",borderRadius:12,border:"none",background:scanLoading||!nameplateFile?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#60a5fa,#22d3ee)",color:scanLoading||!nameplateFile?T.textDim:"#001018",fontWeight:800,fontSize:13,cursor:scanLoading||!nameplateFile?"not-allowed":"pointer"}}>
                {scanLoading?"Scanning…":"⚡ Scan Nameplate"}
              </button>
            </div>
            <div className="scan-layout">
              <div>
                <label style={S.label}>Image / Photo</label>
                <input type="file" accept="image/*" capture="environment" onChange={handleNameplateSelect} style={S.input}/>
              </div>
              {nameplatePreview&&<div className="scan-preview" style={{border:`1px solid ${T.border}`,borderRadius:14,overflow:"hidden"}}><img src={nameplatePreview} alt="Nameplate" style={{width:"100%",display:"block",objectFit:"cover"}}/></div>}
            </div>
          </Sec>

          <Sec title="Client">
            <div className="cg3">
              <div>
                <label style={S.label}>Choose Existing Client</label>
                <select value={form.client_id} onChange={handleClientChange} style={S.input} disabled={loadingClients}>
                  <option value="">Select client</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              <FF label="Client Name (or type new)" value={form.client_name} onChange={v=>setField("client_name",v)} placeholder="Enter client/company name"/>
              <FF label="Site / Location" value={form.site_name} onChange={v=>setField("site_name",v)} placeholder="Mine / plant / section"/>
            </div>
          </Sec>

          <Sec title="Equipment Identification">
            <div className="cg4" style={{marginBottom:14}}>
              <FF label="Manufacturer" value={form.manufacturer} onChange={v=>setField("manufacturer",v)}/>
              <FF label="Model" value={form.model} onChange={v=>setField("model",v)}/>
              <FF label="Serial Number" value={form.serial_number} onChange={v=>setField("serial_number",v)}/>
              <FF label="Year Built" value={form.year_built} onChange={v=>setField("year_built",v)}/>
              <FF label="Fleet Number" value={form.fleet_number} onChange={v=>setField("fleet_number",v)} placeholder="e.g. FL-042"/>
              <FF label="Registration Number" value={form.registration_number} onChange={v=>setField("registration_number",v)} placeholder="e.g. B 123 ABC"/>
              <FF label="Equipment ID" value={form.equipment_id} onChange={v=>setField("equipment_id",v)}/>
              <FF label="Asset Tag" value={form.asset_tag} onChange={v=>setField("asset_tag",v)}/>
              <FF label="Country of Origin" value={form.country_of_origin} onChange={v=>setField("country_of_origin",v)}/>
              <FF label="Lanyard Serial No." value={form.lanyard_serial_no} onChange={v=>setField("lanyard_serial_no",v)}/>
            </div>
            <div className="cg2" style={{marginBottom:14}}>
              <div>
                <label style={S.label}>Equipment Type</label>
                <select value={form.equipment_type} onChange={e=>setField("equipment_type",e.target.value)} style={S.input}>
                  <option value="">— Select Equipment Type —</option>
                  {EQUIP_GROUPS.map(g=>(
                    <optgroup key={g.label} label={g.label}>
                      {g.types.map(t=><option key={t} value={t}>{t}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <FF label="Equipment Description" value={form.equipment_description} onChange={v=>setField("equipment_description",v)}/>
            </div>
            <div className="cg2">
              <FF label="Asset Name" value={form.asset_name} onChange={v=>setField("asset_name",v)}/>
              <FF label="PDF URL" value={form.pdf_url} onChange={v=>setField("pdf_url",v)} placeholder="Optional"/>
            </div>
          </Sec>

          <Sec title="Technical Data">
            <div className="cg4">
              <FF label="Capacity / Volume" value={form.capacity} onChange={v=>setField("capacity",v)} placeholder="e.g. 500L"/>
              <FF label="SWL / WLL" value={form.swl} onChange={v=>setField("swl",v)} placeholder="e.g. 5T"/>
              <FF label="Working Pressure (MAWP)" value={form.mawp} onChange={v=>setField("mawp",v)}/>
              <div>
                <label style={S.label}>Pressure Unit</label>
                <select value={form.pressure_unit} onChange={e=>setField("pressure_unit",e.target.value)} style={S.input}>
                  {["bar","kPa","MPa","psi"].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <FF label="Design Pressure" value={form.design_pressure} onChange={v=>setField("design_pressure",v)}/>
              <FF label="Test Pressure" value={form.test_pressure} onChange={v=>setField("test_pressure",v)}/>
            </div>
          </Sec>

          <Sec title="Certificate Details">
            <div className="cg4">
              <div>
                <label style={S.label}>Certificate Type</label>
                <select value={form.certificate_type} onChange={e=>setField("certificate_type",e.target.value)} style={S.input}>
                  {CERT_TYPES.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Result</label>
                <select value={form.equipment_status} onChange={e=>setField("equipment_status",e.target.value)} style={S.input}>
                  {["PASS","FAIL","REPAIR_REQUIRED","CONDITIONAL","OUT_OF_SERVICE","UNKNOWN"].map(o=><option key={o} value={o}>{o.replace(/_/g," ")}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Status</label>
                <select value={form.document_status} onChange={e=>setField("document_status",e.target.value)} style={S.input}>
                  {["active","issued","draft","expired","inactive","void"].map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Expiry Bucket</label>
                <input value={expiryBucket} readOnly style={{...S.input,opacity:.6}}/>
              </div>
              <FF label="Inspection Date" type="date" value={form.inspection_date} onChange={v=>setField("inspection_date",v)}/>
              <FF label="Issue Date" type="date" value={form.issue_date} onChange={v=>setField("issue_date",v)}/>
              <FF label="Expiry Date" type="date" value={form.expiry_date} onChange={v=>setField("expiry_date",v)}/>
            </div>
          </Sec>

          <Sec title="Inspector & Findings">
            <div className="cg3" style={{marginBottom:14}}>
              <FF label="Inspector Name" value={form.inspector_name} onChange={v=>setField("inspector_name",v)}/>
              <FF label="Inspector ID" value={form.inspector_id} onChange={v=>setField("inspector_id",v)}/>
              <FF label="Nameplate Image URL" value={form.nameplate_image_url} onChange={v=>setField("nameplate_image_url",v)} placeholder="Auto after upload"/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={S.label}>Defects Found</label>
              <textarea value={form.defects_found} onChange={e=>setField("defects_found",e.target.value)} rows={3} style={{...S.input,resize:"vertical",minHeight:80,width:"100%"}} placeholder="Describe any defects, cracks, wear, non-conformances…"/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={S.label}>Recommendations</label>
              <textarea value={form.recommendations} onChange={e=>setField("recommendations",e.target.value)} rows={2} style={{...S.input,resize:"vertical",width:"100%"}} placeholder="Maintenance, re-inspection, repair recommendations…"/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={S.label}>Comments / Remarks</label>
              <textarea value={form.remarks} onChange={e=>setField("remarks",e.target.value)} rows={3} style={{...S.input,resize:"vertical",minHeight:80,width:"100%"}} placeholder="Additional comments, observations…"/>
            </div>
            <div>
              <label style={S.label}>OCR / Extracted Raw Text</label>
              <textarea value={form.ocr_raw_text} onChange={e=>setField("ocr_raw_text",e.target.value)} rows={5} style={{...S.input,resize:"vertical",minHeight:120,width:"100%"}} placeholder="Raw text from AI nameplate scan"/>
            </div>
          </Sec>

          <div style={{display:"flex",justifyContent:"flex-end",gap:10,paddingBottom:24}}>
            <button type="button" onClick={()=>router.push("/certificates")} style={S.btnGhost}>Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} style={{padding:"12px 28px",borderRadius:12,border:"none",background:saving?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#22d3ee,#60a5fa)",color:saving?T.textDim:"#001018",fontWeight:900,fontSize:14,cursor:saving?"not-allowed":"pointer",minWidth:180,fontFamily:"'IBM Plex Sans',sans-serif"}}>
              {saving?"Saving…":"💾 Save Certificate"}
            </button>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}

function Sec({title,children,color}){
  const c=color||"#22d3ee";
  return(
    <div style={{background:"rgba(10,18,32,0.92)",border:`1px solid rgba(148,163,184,0.12)`,borderRadius:18,padding:20}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
        <div style={{width:4,height:20,borderRadius:2,background:`linear-gradient(to bottom,${c},rgba(34,211,238,0.25))`,flexShrink:0}}/>
        <div style={{fontSize:15,fontWeight:900,color:"#f0f6ff"}}>{title}</div>
      </div>
      {children}
    </div>
  );
}

function FF({label,value,onChange,type="text",placeholder="",readOnly=false}){
  return(
    <div>
      <label style={S.label}>{label}</label>
      <input type={type} value={value||""} onChange={onChange?(e=>onChange(e.target.value)):undefined} style={readOnly?{...S.input,opacity:.6}:S.input} placeholder={placeholder} readOnly={readOnly}/>
    </div>
  );
}

const S={
  label:{display:"block",fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(240,246,255,0.50)",marginBottom:7},
  input:{width:"100%",padding:"11px 13px",borderRadius:10,border:`1px solid rgba(148,163,184,0.12)`,background:"rgba(18,30,50,0.70)",color:"#f0f6ff",fontSize:13,fontWeight:500,outline:"none",fontFamily:"'IBM Plex Sans',sans-serif",WebkitAppearance:"none",appearance:"none",boxSizing:"border-box"},
  btnGhost:{padding:"10px 18px",borderRadius:12,border:`1px solid rgba(148,163,184,0.18)`,background:"rgba(255,255,255,0.04)",color:"#f0f6ff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"},
};
