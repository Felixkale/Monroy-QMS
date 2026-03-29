// src/app/certificates/[id]/edit/page.jsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
  blue:"#60a5fa", blueDim:"rgba(96,165,250,0.10)",  blueBrd:"rgba(96,165,250,0.25)",
};

const CSS = `
  *,*::before,*::after{box-sizing:border-box}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  input::placeholder,textarea::placeholder{color:rgba(240,246,255,0.28)}
  select option{background:#0a1420;color:#f0f6ff}
  input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.7);cursor:pointer}
  input[type="file"]{color:rgba(240,246,255,0.6);font-size:12px}
  .ce-hdr{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
  .ce-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}
  .ce-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .ce-tabs{display:flex;gap:0;border-bottom:1px solid rgba(148,163,184,0.12);margin-bottom:18px;overflow-x:auto;-webkit-overflow-scrolling:touch}
  .ce-tab{padding:10px 16px;border:none;background:none;color:rgba(240,246,255,0.45);font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;transition:all .15s;font-family:'IBM Plex Sans',sans-serif;min-height:44px;-webkit-tap-highlight-color:transparent}
  .ce-tab.active{color:#22d3ee;border-bottom-color:#22d3ee}
  .ce-tab:hover:not(.active){color:rgba(240,246,255,0.7)}
  .ce-btn-row{display:flex;gap:10px;flex-wrap:wrap;padding-bottom:8px}
  .link-result{cursor:pointer;padding:10px 12px;border-radius:10px;border:1px solid rgba(148,163,184,0.12);background:rgba(255,255,255,0.025);transition:background .15s;-webkit-tap-highlight-color:transparent}
  .link-result:hover,.link-result:active{background:rgba(34,211,238,0.07);border-color:rgba(34,211,238,0.25)}
  @media(max-width:900px){.ce-grid-2{grid-template-columns:1fr}}
  @media(max-width:768px){
    .ce-page{padding:12px!important}
    .ce-hdr{flex-direction:column!important;gap:10px!important}
    .ce-hdr-btns{width:100%;display:flex;gap:8px;flex-wrap:wrap}.ce-hdr-btns button,.ce-hdr-btns a{flex:1;text-align:center;justify-content:center}
    .ce-grid{grid-template-columns:1fr}
    .ce-btn-row{width:100%}.ce-btn-row button{flex:1}
  }
`;

const IS = {width:"100%",padding:"10px 13px",borderRadius:9,border:"1px solid rgba(148,163,184,0.12)",background:"rgba(18,30,50,0.70)",color:"#f0f6ff",fontSize:13,fontWeight:500,outline:"none",fontFamily:"'IBM Plex Sans',sans-serif",WebkitAppearance:"none",appearance:"none",minHeight:44};
const LS = {display:"block",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(240,246,255,0.45)",marginBottom:6};

function normalizeId(v){return Array.isArray(v)?v[0]:v;}
function toDate(v){if(!v)return "";const d=new Date(v);return isNaN(d.getTime())?"":d.toISOString().slice(0,10);}

function F({label,children,span=1}){
  return(
    <div style={{gridColumn:`span ${span}`}}>
      <label style={LS}>{label}</label>
      {children}
    </div>
  );
}

function Sec({icon,title,children}){
  return(
    <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,padding:18,display:"grid",gap:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8,paddingBottom:12,borderBottom:`1px solid ${T.border}`}}>
        <span style={{fontSize:14}}>{icon}</span>
        <div style={{fontSize:13,fontWeight:800,color:T.text}}>{title}</div>
      </div>
      {children}
    </div>
  );
}

const TABS=["Certificate","Equipment","Technical","Inspector","Link / Folder"];

function CertificateEditInner(){
  const params=useParams();
  const router=useRouter();
  const id=normalizeId(params?.id);

  const [tab,setTab]=useState(0);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");

  // Link state
  const [linkSearch,setLinkSearch]=useState("");
  const [linkResults,setLinkResults]=useState([]);
  const [linkLoading,setLinkLoading]=useState(false);
  const [linking,setLinking]=useState(false);
  const [unlinking,setUnlinking]=useState(false);
  const [bundle,setBundle]=useState([]);

  const [form,setForm]=useState({
    // Certificate
    certificate_number:"",certificate_type:"Certificate of Inspection",
    result:"PASS",equipment_status:"PASS",status:"active",
    issue_date:"",inspection_date:"",expiry_date:"",next_inspection_due:"",
    inspection_number:"",
    // Equipment
    asset_tag:"",asset_name:"",equipment_type:"",equipment_description:"",
    serial_number:"",manufacturer:"",model:"",year_built:"",
    country_of_origin:"",location:"",client_name:"",
    // Technical
    swl:"",capacity_volume:"",working_pressure:"",design_pressure:"",
    test_pressure:"",pressure_unit:"",material:"",standard_code:"",
    lanyard_serial_no:"",
    // Inspector
    inspector_name:"",inspector_id_number:"",inspection_body:"",
    legal_framework:"Mines, Quarries, Works and Machinery Act Cap 44:02",
    defects_found:"",recommendations:"",comments:"",remarks:"",
    // Signature
    signature_url:"",
  });

  useEffect(()=>{if(id)load();},[id]);

  useEffect(()=>{
    const t=setTimeout(()=>searchLink(linkSearch),300);
    return()=>clearTimeout(t);
  },[linkSearch]);

  async function load(){
    setLoading(true);setError("");
    const{data,error:e}=await supabase.from("certificates").select("*").eq("id",id).maybeSingle();
    if(e||!data){setError(e?.message||"Certificate not found.");setLoading(false);return;}
    setForm({
      certificate_number:data.certificate_number||"",
      certificate_type:data.certificate_type||"Certificate of Inspection",
      result:data.result||"PASS",
      equipment_status:data.equipment_status||data.result||"PASS",
      status:data.status||"active",
      issue_date:toDate(data.issue_date||data.issued_at),
      inspection_date:toDate(data.inspection_date||data.issue_date),
      expiry_date:toDate(data.expiry_date||data.valid_to),
      next_inspection_due:toDate(data.next_inspection_due||data.next_inspection_date),
      inspection_number:data.inspection_number||data.inspection_no||"",
      asset_tag:data.asset_tag||"",
      asset_name:data.asset_name||data.equipment_description||"",
      equipment_type:data.equipment_type||data.asset_type||"",
      equipment_description:data.equipment_description||data.asset_name||"",
      serial_number:data.serial_number||"",
      manufacturer:data.manufacturer||"",
      model:data.model||"",
      year_built:data.year_built||"",
      country_of_origin:data.country_of_origin||"",
      location:data.location||"",
      client_name:data.client_name||data.company||"",
      swl:data.swl||"",
      capacity_volume:data.capacity_volume||"",
      working_pressure:data.working_pressure||"",
      design_pressure:data.design_pressure||"",
      test_pressure:data.test_pressure||"",
      pressure_unit:data.pressure_unit||"",
      material:data.material||"",
      standard_code:data.standard_code||"",
      lanyard_serial_no:data.lanyard_serial_no||"",
      inspector_name:data.inspector_name||"",
      inspector_id_number:data.inspector_id_number||"",
      inspection_body:data.inspection_body||"",
      legal_framework:data.legal_framework||"Mines, Quarries, Works and Machinery Act Cap 44:02",
      defects_found:data.defects_found||"",
      recommendations:data.recommendations||"",
      comments:data.comments||"",
      remarks:data.remarks||data.comments||"",
      signature_url:data.signature_url||"",
    });
    // Load folder bundle
    if(data.folder_id){
      const{data:linked}=await supabase.from("certificates").select("id,certificate_number,equipment_description,equipment_type,folder_position")
        .eq("folder_id",data.folder_id).order("folder_position",{ascending:true});
      setBundle(linked||[]);
    }
    setLoading(false);
  }

  const hc=e=>{
    const{name,value}=e.target;
    setForm(p=>{
      const next={...p,[name]:value};
      // Keep result and equipment_status in sync
      if(name==="result")next.equipment_status=value;
      if(name==="equipment_status")next.result=value;
      // Auto-detect equipment type from description
      if(name==="equipment_description"&&!p.equipment_type){
        const t=value.toLowerCase();
        const detected=
          /harness|safety harness/i.test(t)?"Safety Harness":
          /lanyard/i.test(t)?"Lanyard":
          /rope shock|shock absorber/i.test(t)?"Rope":
          /chain sling|chain block/i.test(t)?"Chain Sling":
          /wire rope sling/i.test(t)?"Wire Rope Sling":
          /web sling|webbing sling/i.test(t)?"Web Sling":
          /shackle/i.test(t)?"Shackle":
          /hook/i.test(t)?"Hook":
          /swivel/i.test(t)?"Swivel":
          /eye.?bolt/i.test(t)?"Eye Bolt":
          /beam clamp/i.test(t)?"Beam Clamp":
          /spreader beam/i.test(t)?"Spreader Beam":
          /lifting beam/i.test(t)?"Lifting Beam":
          /mobile crane/i.test(t)?"Mobile Crane":
          /overhead crane|gantry crane/i.test(t)?"Overhead Crane":
          /hoist/i.test(t)?"Hoist":
          /winch/i.test(t)?"Winch":
          /pulley.?block|snatch block/i.test(t)?"Pulley Block":
          /pressure vessel/i.test(t)?"Pressure Vessel":
          /air receiver/i.test(t)?"Air Receiver":
          /boiler/i.test(t)?"Boiler":
          /autoclave/i.test(t)?"Autoclave":
          /compressor/i.test(t)?"Compressor":
          /forklift/i.test(t)?"Forklift":
          /scaffold/i.test(t)?"Scaffold":
          /fire.?extinguisher/i.test(t)?"Fire Extinguisher":
          null;
        if(detected)next.equipment_type=detected;
      }
      // Also auto-detect from equipment_type field itself for cert type
      return next;
    });
  };

  async function handleSave(){
    setSaving(true);setError("");setSuccess("");
    try{
      const{error:e}=await supabase.from("certificates").update({
        certificate_number:form.certificate_number||null,
        certificate_type:form.certificate_type||null,
        result:form.result||null,
        equipment_status:form.result||null,
        status:form.status||"active",
        issue_date:form.issue_date||null,
        inspection_date:form.inspection_date||null,
        expiry_date:form.expiry_date||null,
        next_inspection_due:form.next_inspection_due||null,
        next_inspection_date:form.next_inspection_due||null,
        inspection_number:form.inspection_number||null,
        asset_tag:form.asset_tag||null,
        asset_name:form.asset_name||null,
        equipment_type:form.equipment_type||null,
        equipment_description:form.equipment_description||null,
        serial_number:form.serial_number||null,
        manufacturer:form.manufacturer||null,
        model:form.model||null,
        year_built:form.year_built||null,
        country_of_origin:form.country_of_origin||null,
        location:form.location||null,
        client_name:form.client_name||null,
        swl:form.swl||null,
        capacity_volume:form.capacity_volume||null,
        working_pressure:form.working_pressure||null,
        design_pressure:form.design_pressure||null,
        test_pressure:form.test_pressure||null,
        pressure_unit:form.pressure_unit||null,
        material:form.material||null,
        standard_code:form.standard_code||null,
        lanyard_serial_no:form.lanyard_serial_no||null,
        inspector_name:form.inspector_name||null,
        inspector_id_number:form.inspector_id_number||null,
        inspection_body:form.inspection_body||null,
        legal_framework:form.legal_framework||null,
        defects_found:form.defects_found||null,
        recommendations:form.recommendations||null,
        comments:form.comments||null,
        remarks:form.remarks||null,
        signature_url:form.signature_url||null,
      }).eq("id",id);
      if(e)throw e;
      setSuccess("Saved successfully.");
      setTimeout(()=>router.push(`/certificates/${id}`),900);
    }catch(e){setError("Save failed: "+(e?.message||"Unknown error"));}
    finally{setSaving(false);}
  }

  // Link search
  async function searchLink(q){
    if(!q||q.length<2){setLinkResults([]);return;}
    setLinkLoading(true);
    const{data}=await supabase.from("certificates")
      .select("id,certificate_number,equipment_description,equipment_type,client_name,folder_id")
      .or(`certificate_number.ilike.%${q}%,equipment_description.ilike.%${q}%,client_name.ilike.%${q}%`)
      .neq("id",id).is("folder_id",null).limit(8);
    setLinkResults(data||[]);
    setLinkLoading(false);
  }

  async function handleLink(targetId){
    setLinking(true);
    const folderId=crypto.randomUUID();
    const folderName=`Folder-${form.certificate_number||id.slice(0,8)}`;
    await Promise.all([
      supabase.from("certificates").update({folder_id:folderId,folder_name:folderName,folder_position:1}).eq("id",id),
      supabase.from("certificates").update({folder_id:folderId,folder_name:folderName,folder_position:2}).eq("id",targetId),
    ]);
    setLinking(false);setLinkSearch("");setLinkResults([]);
    await load();
    setSuccess("Certificates linked.");
  }

  async function handleUnlinkOne(targetId){
    setUnlinking(true);
    await supabase.from("certificates").update({folder_id:null,folder_name:null,folder_position:null}).eq("id",targetId);
    setUnlinking(false);
    await load();
  }

  const isLinked=bundle.length>0;

  return(
    <AppLayout title="Edit Certificate">
      <style>{CSS}</style>
      <div className="ce-page" style={{minHeight:"100vh",background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.05),transparent),${T.bg}`,color:T.text,fontFamily:"'IBM Plex Sans',sans-serif",padding:24}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"grid",gap:16}}>

          {/* HEADER */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:"18px 20px",backdropFilter:"blur(20px)"}}>
            <div className="ce-hdr">
              <div>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent,marginBottom:7}}>Edit Certificate</div>
                <h1 style={{margin:0,fontSize:"clamp(17px,3vw,22px)",fontWeight:900,letterSpacing:"-0.02em"}}>{form.certificate_number||"Certificate"}</h1>
                <p style={{margin:"5px 0 0",color:T.textDim,fontSize:12}}>
                  {form.certificate_type||"Certificate of Inspection"}
                  {isLinked&&<span style={{marginLeft:10,color:T.purple}}>📁 {bundle.length} linked</span>}
                </p>
              </div>
              <div className="ce-hdr-btns" style={{display:"flex",gap:8}}>
                <button type="button" onClick={()=>router.push(`/certificates/${id}`)}
                  style={{padding:"9px 14px",borderRadius:10,border:`1px solid ${T.border}`,background:T.card,color:T.textMid,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",WebkitTapHighlightColor:"transparent"}}>
                  ← Back
                </button>
                <button type="button" onClick={()=>window.open(`/certificates/print/${id}`,"_blank")}
                  style={{padding:"9px 14px",borderRadius:10,border:`1px solid ${T.greenBrd}`,background:T.greenDim,color:T.green,fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",WebkitTapHighlightColor:"transparent"}}>
                  🖨 Print
                </button>
                <button type="button" onClick={handleSave} disabled={saving||loading}
                  style={{padding:"9px 18px",borderRadius:10,border:"none",background:saving||loading?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#34d399,#14b8a6)",color:saving||loading?"rgba(240,246,255,0.4)":"#052e16",fontWeight:900,fontSize:13,cursor:saving||loading?"not-allowed":"pointer",fontFamily:"'IBM Plex Sans',sans-serif",WebkitTapHighlightColor:"transparent"}}>
                  {saving?"Saving…":"Save Changes"}
                </button>
              </div>
            </div>
          </div>

          {error  &&<div style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${T.redBrd}`,  background:T.redDim,  color:T.red,  fontSize:13,fontWeight:700}}>⚠ {error}</div>}
          {success&&<div style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${T.greenBrd}`,background:T.greenDim,color:T.green,fontSize:13,fontWeight:700}}>✓ {success}</div>}

          {loading?(
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,padding:40,textAlign:"center",color:T.textDim}}>
              <div style={{fontSize:22,opacity:.4,marginBottom:8}}>⏳</div>
              <div style={{fontSize:13,fontWeight:600}}>Loading certificate…</div>
            </div>
          ):(
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,padding:18}}>

              {/* TABS */}
              <div className="ce-tabs">
                {TABS.map((t,i)=>(
                  <button key={t} type="button" className={`ce-tab${tab===i?" active":""}`} onClick={()=>setTab(i)}>
                    {t}{i===4&&isLinked&&<span style={{marginLeft:5,fontSize:9,padding:"1px 6px",borderRadius:99,background:T.purpleDim,color:T.purple,border:`1px solid ${T.purpleBrd}`}}>{bundle.length}</span>}
                  </button>
                ))}
              </div>

              {/* TAB 0 — CERTIFICATE */}
              {tab===0&&(
                <div className="ce-grid">
                  <F label="Certificate Number">
                    <input name="certificate_number" value={form.certificate_number} onChange={hc} style={IS}/>
                  </F>
                  <F label="Certificate Type">
                    <select name="certificate_type" value={form.certificate_type} onChange={hc} style={IS}>
                      <option value="Certificate of Inspection">Certificate of Inspection</option>
                      <option value="Load Test Certificate">Load Test Certificate</option>
                      <option value="Pressure Test Certificate">Pressure Test Certificate</option>
                      <option value="NDT Certificate">NDT Certificate</option>
                      <option value="Thorough Examination Certificate">Thorough Examination Certificate</option>
                    </select>
                  </F>
                  <F label="Result">
                    <select name="result" value={form.result} onChange={hc} style={IS}>
                      <option value="PASS">Pass</option>
                      <option value="FAIL">Fail</option>
                      <option value="REPAIR_REQUIRED">Repair Required</option>
                      <option value="OUT_OF_SERVICE">Out of Service</option>
                      <option value="UNKNOWN">Unknown</option>
                    </select>
                  </F>
                  <F label="Status">
                    <select name="status" value={form.status} onChange={hc} style={IS}>
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="suspended">Suspended</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </F>
                  <F label="Inspection Number">
                    <input name="inspection_number" value={form.inspection_number} onChange={hc} style={IS}/>
                  </F>
                  <F label="Issue Date">
                    <input name="issue_date" type="date" value={form.issue_date} onChange={hc} style={IS}/>
                  </F>
                  <F label="Inspection Date">
                    <input name="inspection_date" type="date" value={form.inspection_date} onChange={hc} style={IS}/>
                  </F>
                  <F label="Expiry Date">
                    <input name="expiry_date" type="date" value={form.expiry_date} onChange={hc} style={IS}/>
                  </F>
                  <F label="Next Inspection Due">
                    <input name="next_inspection_due" type="date" value={form.next_inspection_due} onChange={hc} style={IS}/>
                  </F>
                  <F label="Defects Found" span={2}>
                    <textarea name="defects_found" value={form.defects_found} onChange={hc} rows={3} style={{...IS,resize:"vertical",minHeight:80}}/>
                  </F>
                  <F label="Recommendations" span={2}>
                    <textarea name="recommendations" value={form.recommendations} onChange={hc} rows={2} style={{...IS,resize:"vertical"}}/>
                  </F>
                  <F label="Remarks / Comments" span={2}>
                    <textarea name="remarks" value={form.remarks} onChange={hc} rows={2} style={{...IS,resize:"vertical"}}/>
                  </F>
                </div>
              )}

              {/* TAB 1 — EQUIPMENT */}
              {tab===1&&(
                <div className="ce-grid">
                  <F label="Equipment Type">
                    <select name="equipment_type" value={form.equipment_type} onChange={hc} style={IS}>
                      <option value="">Select type...</option>
                      <optgroup label="Chain & Block Hoists">
                        <option>Chain Block</option>
                        <option>Manual Chain Hoist</option>
                        <option>Electric Chain Hoist</option>
                        <option>Lever Hoist / Tirfor</option>
                        <option>Chain Pulley Block</option>
                        <option>Beam Trolley with Chain Block</option>
                      </optgroup>
                      <optgroup label="Wire Rope Hoists">
                        <option>Electric Wire Rope Hoist</option>
                        <option>Manual Wire Rope Hoist</option>
                        <option>Wire Rope Winch</option>
                        <option>Cable Hoist</option>
                      </optgroup>
                      <optgroup label="Cranes">
                        <option>Mobile Crane</option>
                        <option>Overhead Crane / EOT Crane</option>
                        <option>Gantry Crane</option>
                        <option>Jib Crane</option>
                        <option>Knuckle Boom Crane</option>
                        <option>Loader Crane</option>
                        <option>Crawler Crane</option>
                        <option>Tower Crane</option>
                        <option>Monorail Hoist</option>
                        <option>Davit Crane</option>
                        <option>Telescopic Handler</option>
                      </optgroup>
                      <optgroup label="Slings">
                        <option>Chain Sling</option>
                        <option>Wire Rope Sling</option>
                        <option>Web Sling / Flat Sling</option>
                        <option>Round Sling</option>
                        <option>Endless Sling</option>
                        <option>Multi-Leg Chain Sling</option>
                        <option>Multi-Leg Wire Rope Sling</option>
                      </optgroup>
                      <optgroup label="Rigging Hardware">
                        <option>Shackle — Bow / Anchor</option>
                        <option>Shackle — D / Dee</option>
                        <option>Hook — Swivel</option>
                        <option>Hook — Eye</option>
                        <option>Hook — Clevis</option>
                        <option>Swivel</option>
                        <option>Eye Bolt</option>
                        <option>Eye Nut</option>
                        <option>Ring Bolt</option>
                        <option>Turnbuckle</option>
                        <option>Master Link</option>
                        <option>Connecting Link</option>
                        <option>Coupling Link</option>
                        <option>Chain Shortener / Clutch</option>
                        <option>Ratchet Lashing Strap</option>
                      </optgroup>
                      <optgroup label="Beams & Spreaders">
                        <option>Spreader Beam</option>
                        <option>Lifting Beam</option>
                        <option>Adjustable Spreader Beam</option>
                        <option>Modular Spreader Beam</option>
                        <option>Lifting Frame</option>
                        <option>Pallet Lifter</option>
                        <option>Coil Lifter</option>
                        <option>Drum Lifter</option>
                        <option>Pipe Lifter</option>
                        <option>Magnetic Lifter</option>
                        <option>Vacuum Lifter Pad</option>
                      </optgroup>
                      <optgroup label="Clamps & Grabs">
                        <option>Beam Clamp</option>
                        <option>Girder Clamp</option>
                        <option>Plate Clamp — Horizontal</option>
                        <option>Plate Clamp — Vertical</option>
                        <option>Pipe Clamp</option>
                        <option>Slab Clamp</option>
                        <option>Drum Clamp</option>
                        <option>Stone Lifter / Excavator Grab</option>
                      </optgroup>
                      <optgroup label="Fall Protection">
                        <option>Safety Harness — Full Body</option>
                        <option>Safety Harness — Sit</option>
                        <option>Lanyard — Energy Absorbing</option>
                        <option>Lanyard — Twin Leg</option>
                        <option>Rope Lanyard</option>
                        <option>Self-Retracting Lifeline (SRL)</option>
                        <option>Fall Arrest Block</option>
                        <option>Rope Grab / Fall Arrester</option>
                        <option>Anchor Point</option>
                        <option>Lifeline System</option>
                        <option>Safety Rope</option>
                      </optgroup>
                      <optgroup label="Winches & Pullers">
                        <option>Electric Winch</option>
                        <option>Hydraulic Winch</option>
                        <option>Air / Pneumatic Winch</option>
                        <option>Hand Winch</option>
                        <option>Come-Along / Hand Puller</option>
                        <option>Snatch Block</option>
                        <option>Pulley Block</option>
                        <option>Gin Block</option>
                      </optgroup>
                      <optgroup label="Forklift & Material Handling">
                        <option>Counterbalance Forklift</option>
                        <option>Reach Truck</option>
                        <option>Telehandler / Telescopic Forklift</option>
                        <option>Side Loader</option>
                        <option>Pallet Jack — Manual</option>
                        <option>Pallet Jack — Electric</option>
                        <option>Order Picker</option>
                        <option>Scissor Lift</option>
                        <option>Boom Lift / Cherry Picker</option>
                        <option>Personnel Basket / Man Basket</option>
                        <option>Mast Climbing Platform</option>
                      </optgroup>
                      <optgroup label="Pressure Equipment">
                        <option>Pressure Vessel</option>
                        <option>Air Receiver</option>
                        <option>Boiler</option>
                        <option>Autoclave</option>
                        <option>Hydraulic Tank</option>
                        <option>Compressor — Air</option>
                        <option>Compressor — Gas</option>
                        <option>Accumulator</option>
                        <option>Gas Cylinder</option>
                        <option>LPG Tank</option>
                        <option>Heat Exchanger</option>
                        <option>Separator</option>
                        <option>Pipeline Section</option>
                      </optgroup>
                      <optgroup label="Mine Equipment">
                        <option>Scaffold</option>
                        <option>Scaffold Hoist</option>
                        <option>Underground Mine Cage</option>
                        <option>Skip Hoist</option>
                        <option>Headgear Sheave</option>
                        <option>Kibble / Bucket</option>
                        <option>Rock Drill Rig</option>
                        <option>Dragline Bucket</option>
                        <option>Locomotive Crane</option>
                        <option>Rail Mounted Crane</option>
                        <option>Fire Extinguisher</option>
                        <option>Other</option>
                      </optgroup>
                    </select>
                  </F>
                  <F label="Equipment Description">
                    <input name="equipment_description" value={form.equipment_description} onChange={hc} style={IS}/>
                  </F>
                  <F label="Asset Tag / ID">
                    <input name="asset_tag" value={form.asset_tag} onChange={hc} style={IS}/>
                  </F>
                  <F label="Asset Name">
                    <input name="asset_name" value={form.asset_name} onChange={hc} style={IS}/>
                  </F>
                  <F label="Serial Number">
                    <input name="serial_number" value={form.serial_number} onChange={hc} style={IS}/>
                  </F>
                  <F label="Manufacturer">
                    <input name="manufacturer" value={form.manufacturer} onChange={hc} style={IS}/>
                  </F>
                  <F label="Model">
                    <input name="model" value={form.model} onChange={hc} style={IS}/>
                  </F>
                  <F label="Year Built">
                    <input name="year_built" value={form.year_built} onChange={hc} style={IS}/>
                  </F>
                  <F label="Country of Origin">
                    <input name="country_of_origin" value={form.country_of_origin} onChange={hc} style={IS}/>
                  </F>
                  <F label="Location / Site">
                    <input name="location" value={form.location} onChange={hc} style={IS}/>
                  </F>
                  <F label="Client Name">
                    <input name="client_name" value={form.client_name} onChange={hc} style={IS}/>
                  </F>
                </div>
              )}

              {/* TAB 2 — TECHNICAL */}
              {tab===2&&(
                <div className="ce-grid">
                  <F label="Safe Working Load (SWL)">
                    <input name="swl" value={form.swl} onChange={hc} style={IS} placeholder="e.g. 2000kg"/>
                  </F>
                  <F label="Capacity / Volume">
                    <input name="capacity_volume" value={form.capacity_volume} onChange={hc} style={IS}/>
                  </F>
                  <F label="Working Pressure">
                    <input name="working_pressure" value={form.working_pressure} onChange={hc} style={IS}/>
                  </F>
                  <F label="Design Pressure">
                    <input name="design_pressure" value={form.design_pressure} onChange={hc} style={IS}/>
                  </F>
                  <F label="Test Pressure">
                    <input name="test_pressure" value={form.test_pressure} onChange={hc} style={IS}/>
                  </F>
                  <F label="Pressure Unit">
                    <select name="pressure_unit" value={form.pressure_unit} onChange={hc} style={IS}>
                      <option value="">Select…</option>
                      <option value="kPa">kPa</option>
                      <option value="bar">bar</option>
                      <option value="MPa">MPa</option>
                      <option value="psi">psi</option>
                    </select>
                  </F>
                  <F label="Material">
                    <input name="material" value={form.material} onChange={hc} style={IS}/>
                  </F>
                  <F label="Standard / Code">
                    <input name="standard_code" value={form.standard_code} onChange={hc} style={IS} placeholder="e.g. EN 361, SANS 347"/>
                  </F>
                  <F label="Lanyard Serial No.">
                    <input name="lanyard_serial_no" value={form.lanyard_serial_no} onChange={hc} style={IS}/>
                  </F>
                </div>
              )}

              {/* TAB 3 — INSPECTOR */}
              {tab===3&&(
                <div className="ce-grid">
                  <F label="Inspector Name">
                    <input name="inspector_name" value={form.inspector_name} onChange={hc} style={IS}/>
                  </F>
                  <F label="Inspector ID Number">
                    <input name="inspector_id_number" value={form.inspector_id_number} onChange={hc} style={IS}/>
                  </F>
                  <F label="Inspection Body">
                    <input name="inspection_body" value={form.inspection_body} onChange={hc} style={IS}/>
                  </F>
                  <F label="Legal Framework" span={2}>
                    <input name="legal_framework" value={form.legal_framework} onChange={hc} style={IS}/>
                  </F>
                  <F label="Signature URL">
                    <input name="signature_url" value={form.signature_url} onChange={hc} style={IS} placeholder="https://… or /Signature.png"/>
                  </F>
                </div>
              )}

              {/* TAB 4 — LINK / FOLDER */}
              {tab===4&&(
                <div style={{display:"grid",gap:16}}>
                  {/* Current folder */}
                  {isLinked&&(
                    <div>
                      <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:T.textDim,marginBottom:10}}>Certificates in this folder</div>
                      <div style={{display:"grid",gap:8}}>
                        {bundle.map((item,i)=>{
                          const isMe=String(item.id)===String(id);
                          return(
                            <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",padding:"11px 14px",borderRadius:11,border:`1px solid ${isMe?T.accentBrd:T.border}`,background:isMe?T.accentDim:T.card}}>
                              <div>
                                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                                  <span style={{fontSize:12,fontWeight:800,color:T.accent,fontFamily:"'IBM Plex Mono',monospace"}}>{item.certificate_number||"—"}</span>
                                  {isMe&&<span style={{fontSize:9,fontWeight:800,color:T.accent}}>← THIS CERT</span>}
                                  <span style={{fontSize:9,fontWeight:700,color:T.textDim}}>Pos {i+1}</span>
                                </div>
                                <div style={{fontSize:11,color:T.textDim}}>{item.equipment_description||item.equipment_type||"—"}</div>
                              </div>
                              <button type="button" onClick={()=>handleUnlinkOne(item.id)} disabled={unlinking}
                                style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${T.redBrd}`,background:T.redDim,color:T.red,fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",WebkitTapHighlightColor:"transparent"}}>
                                {unlinking?"…":"Unlink"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Link new */}
                  <div>
                    <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:T.textDim,marginBottom:10}}>
                      {isLinked?"Add Another Certificate to This Folder":"Link to Another Certificate"}
                    </div>
                    <input
                      value={linkSearch} onChange={e=>setLinkSearch(e.target.value)}
                      placeholder="Search by certificate number, equipment, or client…"
                      style={{...IS,marginBottom:12,WebkitTapHighlightColor:"transparent"}}
                    />
                    {linkLoading&&<div style={{fontSize:12,color:T.textDim,textAlign:"center",padding:"8px 0"}}>Searching…</div>}
                    {!linkLoading&&linkSearch.length>=2&&linkResults.length===0&&(
                      <div style={{fontSize:12,color:T.textDim,textAlign:"center",padding:"8px 0"}}>No unlinked certificates found</div>
                    )}
                    <div style={{display:"grid",gap:8}}>
                      {linkResults.map(cert=>(
                        <div key={cert.id} className="link-result"
                          onClick={()=>!linking&&handleLink(cert.id)}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                            <div>
                              <div style={{fontSize:13,fontWeight:800,color:T.accent,fontFamily:"'IBM Plex Mono',monospace"}}>{cert.certificate_number||"—"}</div>
                              <div style={{fontSize:11,color:T.textDim,marginTop:2}}>{cert.equipment_description||"—"} · {cert.equipment_type||""}</div>
                              {cert.client_name&&<div style={{fontSize:11,color:T.textDim}}>{cert.client_name}</div>}
                            </div>
                            <button type="button" disabled={linking}
                              style={{padding:"7px 14px",borderRadius:9,border:`1px solid ${T.purpleBrd}`,background:T.purpleDim,color:T.purple,fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",WebkitTapHighlightColor:"transparent"}}>
                              {linking?"Linking…":"Link →"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SAVE ROW */}
              {tab!==4&&(
                <div className="ce-btn-row" style={{marginTop:20,paddingTop:16,borderTop:`1px solid ${T.border}`}}>
                  <button type="button" onClick={handleSave} disabled={saving}
                    style={{padding:"12px 28px",borderRadius:11,border:"none",background:saving?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#34d399,#14b8a6)",color:saving?"rgba(240,246,255,0.4)":"#052e16",fontWeight:900,fontSize:14,cursor:saving?"not-allowed":"pointer",fontFamily:"'IBM Plex Sans',sans-serif",WebkitTapHighlightColor:"transparent",flex:1,maxWidth:240}}>
                    {saving?"Saving…":"Save Changes"}
                  </button>
                  <button type="button" onClick={()=>router.push(`/certificates/${id}`)} disabled={saving}
                    style={{padding:"12px 18px",borderRadius:11,border:`1px solid ${T.border}`,background:T.card,color:T.textMid,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",WebkitTapHighlightColor:"transparent"}}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function CertificateEditPage(){
  return(
    <Suspense fallback={
      <div style={{minHeight:"100vh",background:"#070e18",display:"flex",alignItems:"center",
        justifyContent:"center",color:"rgba(240,246,255,0.4)",fontSize:14,
        fontFamily:"'IBM Plex Sans',sans-serif"}}>Loading…</div>
    }>
      <CertificateEditInner/>
    </Suspense>
  );
}
