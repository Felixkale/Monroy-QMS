// ╔══════════════════════════════════════════════════════════╗
// ║  SAVE THIS FILE AS:                                      ║
// ║  src/app/certificates/[id]/edit/page.jsx                 ║
// ╚══════════════════════════════════════════════════════════╝
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const T = {
  bg:"#070e18",surface:"rgba(13,22,38,0.80)",panel:"rgba(10,18,32,0.92)",
  panel2:"rgba(18,30,50,0.70)",card:"rgba(255,255,255,0.025)",
  border:"rgba(148,163,184,0.12)",text:"#f0f6ff",
  textMid:"rgba(240,246,255,0.72)",textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee",accentDim:"rgba(34,211,238,0.10)",accentBrd:"rgba(34,211,238,0.25)",accentGlow:"rgba(34,211,238,0.18)",
  green:"#34d399",greenDim:"rgba(52,211,153,0.10)",greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",redDim:"rgba(248,113,113,0.10)",redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24",amberDim:"rgba(251,191,36,0.10)",amberBrd:"rgba(251,191,36,0.25)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  input::placeholder,textarea::placeholder{color:rgba(240,246,255,0.28)}
  select option{background:#0a1420;color:#f0f6ff}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}

  .eg{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
  .eg-2c{display:grid;grid-template-columns:1.6fr auto;gap:14px;align-items:end}
  .btn-row{display:flex;gap:10px;flex-wrap:wrap}

  @media(max-width:768px){
    .ep{padding:12px!important}
    .eh{flex-direction:column!important;align-items:flex-start!important;gap:12px!important}
    .eh .btn-row{width:100%}.eh .btn-row button,.eh .btn-row a{flex:1;text-align:center;justify-content:center}
    .eg-2c{grid-template-columns:1fr!important}.eg-2c button{width:100%!important}
    .btn-row{width:100%}.btn-row button,.btn-row a{flex:1;justify-content:center}
  }
  @media(max-width:480px){.eg{grid-template-columns:1fr!important}}
`;

const EMPTY = {
  asset_id:"",certificate_type:"",company:"",equipment_description:"",equipment_location:"",
  equipment_id:"",identification_number:"",inspection_no:"",lanyard_serial_no:"",
  swl:"",mawp:"",design_pressure:"",test_pressure:"",capacity:"",year_built:"",
  manufacturer:"",model:"",country_of_origin:"",equipment_status:"PASS",
  issued_at:"",valid_to:"",status:"issued",
  legal_framework:"Mines, Quarries, Works and Machinery Act Cap 44:02",
  inspector_name:"",inspector_id:"",signature_url:"",logo_url:"/logo.png",
  pdf_url:"",folder_id:"",folder_name:"",folder_position:1,
};

function normalizeId(v){return Array.isArray(v)?v[0]:v;}
function san(v,max=250){if(v===undefined||v===null)return "";return String(v).replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim().slice(0,max);}
function toIso(v){if(!v)return null;const d=new Date(v);if(Number.isNaN(d.getTime()))return null;return d.toISOString();}
function toDateInput(v){if(!v)return "";const d=new Date(v);if(Number.isNaN(d.getTime()))return "";return d.toISOString().slice(0,10);}
function detectEquipmentType(t=""){return["pressure vessel","boiler","air receiver","air compressor","oil separator"].includes(String(t).toLowerCase())?"pv":"lift";}
function defaultCertType(t=""){return detectEquipmentType(t)==="pv"?"Pressure Test Certificate":"Load Test Certificate";}

function Field({label,name,value,onChange,type="text",placeholder=""}){
  return(<div><label style={S.label}>{label}</label><input type={type} name={name} value={value??""} onChange={onChange} placeholder={placeholder} style={S.input}/></div>);
}
function Sel({label,name,value,onChange,options}){
  return(<div><label style={S.label}>{label}</label><select name={name} value={value??""} onChange={onChange} style={{...S.input,cursor:"pointer"}}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>);
}
function Sec({title,id,children}){
  return(
    <div id={id} style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:18,padding:20}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <div style={{width:4,height:20,borderRadius:2,background:`linear-gradient(to bottom,${T.accent},rgba(34,211,238,0.3))`,flexShrink:0}}/>
        <div style={{fontSize:15,fontWeight:900,color:T.text}}>{title}</div>
      </div>
      {children}
    </div>
  );
}

export default function EditCertificatePage() {
  const params=useParams();const router=useRouter();
  const id=normalizeId(params?.id);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [assets,setAssets]=useState([]);
  const [certOptions,setCertOptions]=useState([]);
  const [folderMembers,setFolderMembers]=useState([]);
  const [form,setForm]=useState(EMPTY);
  const [linkTargetId,setLinkTargetId]=useState("");
  const [targetPos,setTargetPos]=useState(2);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");

  useEffect(()=>{if(id)loadPage();},[id]);

  const selectedAsset=useMemo(()=>assets.find(a=>String(a.id)===String(form.asset_id))||null,[assets,form.asset_id]);
  const selectableCerts=useMemo(()=>certOptions.filter(c=>String(c.id)!==String(id)),[certOptions,id]);

  async function loadPage(){
    setLoading(true);setError("");setSuccess("");
    const [ar,cr,certR]=await Promise.all([
      supabase.from("assets").select(`id,asset_name,asset_tag,asset_type,location,serial_number,equipment_id,identification_number,inspection_no,lanyard_serial_no,safe_working_load,working_pressure,design_pressure,test_pressure,next_inspection_date,year_built,capacity_volume,manufacturer,model,country_of_origin,inspector_name,inspector_id,clients(company_name)`).order("created_at",{ascending:false}),
      supabase.from("certificates").select(`id,certificate_number,company,client_name,equipment_description,folder_id,folder_name,folder_position`).order("created_at",{ascending:false}),
      supabase.from("certificates").select("*").eq("id",id).maybeSingle(),
    ]);
    if(ar.error){setError(ar.error.message);setLoading(false);return;}
    if(cr.error){setError(cr.error.message);setLoading(false);return;}
    if(certR.error||!certR.data){setError(certR.error?.message||"Certificate not found.");setLoading(false);return;}
    setAssets(ar.data||[]);setCertOptions(cr.data||[]);
    const row=certR.data;
    /* ✅ FIX: expiry_date = valid_to = next_inspection_date — use whichever is set */
    const expiryVal=row.valid_to||row.expiry_date||row.next_inspection_date||"";
    setForm({
      asset_id:row.asset_id||"",certificate_type:row.certificate_type||"",
      company:row.company||row.client_name||"",equipment_description:row.equipment_description||"",
      equipment_location:row.equipment_location||"",equipment_id:row.equipment_id||"",
      identification_number:row.identification_number||"",inspection_no:row.inspection_no||"",
      lanyard_serial_no:row.lanyard_serial_no||"",swl:row.swl||"",mawp:row.mawp||"",
      design_pressure:row.design_pressure||"",test_pressure:row.test_pressure||"",
      capacity:row.capacity||"",year_built:row.year_built||"",manufacturer:row.manufacturer||"",
      model:row.model||"",country_of_origin:row.country_of_origin||"",
      equipment_status:row.equipment_status||row.result||"PASS",
      issued_at:toDateInput(row.issued_at||row.issue_date),
      valid_to:toDateInput(expiryVal),
      status:row.status||"issued",
      legal_framework:row.legal_framework||"Mines, Quarries, Works and Machinery Act Cap 44:02",
      inspector_name:row.inspector_name||"",inspector_id:row.inspector_id||"",
      signature_url:row.signature_url||"",logo_url:row.logo_url||"/logo.png",
      pdf_url:row.pdf_url||"",folder_id:row.folder_id||"",
      folder_name:row.folder_name||"",folder_position:row.folder_position||1,
    });
    if(row.folder_id){
      const{data:members}=await supabase.from("certificates").select("id,certificate_number,equipment_description,folder_position").eq("folder_id",row.folder_id).order("folder_position",{ascending:true});
      setFolderMembers(members||[]);
    }
    setLoading(false);
  }

  const hc=e=>{const{name,value}=e.target;setForm(p=>({...p,[name]:value}));};

  function autoFill(){
    if(!selectedAsset)return;
    const kind=detectEquipmentType(selectedAsset.asset_type||"");
    setForm(prev=>({
      ...prev,
      certificate_type:prev.certificate_type||defaultCertType(selectedAsset.asset_type),
      company:selectedAsset.clients?.company_name||prev.company,
      equipment_description:selectedAsset.asset_type||selectedAsset.asset_name||prev.equipment_description,
      equipment_location:selectedAsset.location||prev.equipment_location,
      equipment_id:selectedAsset.equipment_id||selectedAsset.serial_number||selectedAsset.asset_tag||prev.equipment_id,
      identification_number:selectedAsset.identification_number||prev.identification_number,
      inspection_no:selectedAsset.inspection_no||prev.inspection_no,
      lanyard_serial_no:selectedAsset.lanyard_serial_no||prev.lanyard_serial_no,
      swl:kind==="lift"?selectedAsset.safe_working_load||prev.swl:prev.swl,
      mawp:kind==="pv"?selectedAsset.working_pressure||prev.mawp:prev.mawp,
      design_pressure:selectedAsset.design_pressure||prev.design_pressure,
      test_pressure:selectedAsset.test_pressure||prev.test_pressure,
      capacity:selectedAsset.capacity_volume||prev.capacity,
      year_built:selectedAsset.year_built||prev.year_built,
      manufacturer:selectedAsset.manufacturer||prev.manufacturer,
      model:selectedAsset.model||prev.model,
      country_of_origin:selectedAsset.country_of_origin||prev.country_of_origin,
      inspector_name:selectedAsset.inspector_name||prev.inspector_name,
      inspector_id:selectedAsset.inspector_id||prev.inspector_id,
      /* ✅ FIX: auto-fill both expiry and next_inspection via valid_to */
      valid_to:prev.valid_to||toDateInput(selectedAsset.next_inspection_date),
    }));
  }

  async function unlinkFolder(){
    if(!form.folder_id){setError("Not linked to any folder.");return;}
    setSaving(true);setError("");setSuccess("");
    const{error:e}=await supabase.from("certificates").update({folder_id:null,folder_name:null,folder_position:1}).eq("folder_id",form.folder_id);
    if(e){setError(e.message);setSaving(false);return;}
    setSuccess("Folder removed.");setForm(p=>({...p,folder_id:"",folder_name:"",folder_position:1}));setFolderMembers([]);setLinkTargetId("");setSaving(false);
  }

  async function handleSubmit(e){
    e.preventDefault();setSaving(true);setError("");setSuccess("");
    try{
      if(!san(form.company,120))throw new Error("Company is required.");
      if(!san(form.equipment_description,160))throw new Error("Equipment description is required.");
      if(!san(form.equipment_id,80))throw new Error("Equipment ID is required.");
      let folderId=form.folder_id||null;
      let folderName=san(form.folder_name,120)||null;
      const folderPos=Math.max(1,Number(form.folder_position)||1);
      if(linkTargetId){folderId=folderId||crypto.randomUUID();folderName=folderName||`Linked Folder ${id}`;}

      /* ✅ FIX: always write expiry_date, valid_to, AND next_inspection_date together */
      const expiryIso=form.valid_to||null;

      const payload={
        asset_id:form.asset_id||null,certificate_type:san(form.certificate_type,100)||null,
        company:san(form.company,120),equipment_description:san(form.equipment_description,180),
        equipment_location:san(form.equipment_location,150)||null,equipment_id:san(form.equipment_id,80),
        identification_number:san(form.identification_number,80)||null,inspection_no:san(form.inspection_no,80)||null,
        lanyard_serial_no:san(form.lanyard_serial_no,80)||null,swl:san(form.swl,50)||null,
        mawp:san(form.mawp,50)||null,design_pressure:san(form.design_pressure,50)||null,
        test_pressure:san(form.test_pressure,50)||null,capacity:san(form.capacity,50)||null,
        year_built:san(form.year_built,20)||null,manufacturer:san(form.manufacturer,100)||null,
        model:san(form.model,100)||null,country_of_origin:san(form.country_of_origin,80)||null,
        equipment_status:san(form.equipment_status,30)||"PASS",
        result:san(form.equipment_status,30)||"PASS",  /* keep result in sync */
        issued_at:toIso(form.issued_at),
        issue_date:form.issued_at||null,
        /* ✅ Write all three expiry aliases */
        valid_to:expiryIso,expiry_date:expiryIso,next_inspection_date:expiryIso,
        status:san(form.status,40)||"issued",legal_framework:san(form.legal_framework,250)||null,
        inspector_name:san(form.inspector_name,100)||null,inspector_id:san(form.inspector_id,80)||null,
        signature_url:san(form.signature_url,500)||null,logo_url:san(form.logo_url,500)||null,
        pdf_url:san(form.pdf_url,500)||null,folder_id:folderId,folder_name:folderName,folder_position:folderPos,
      };

      const{error:ue}=await supabase.from("certificates").update(payload).eq("id",id);
      if(ue)throw ue;

      if(folderId&&folderName) await supabase.from("certificates").update({folder_name:folderName}).eq("folder_id",folderId);

      if(linkTargetId){
        const{error:te}=await supabase.from("certificates").update({folder_id:folderId,folder_name:folderName,folder_position:Math.max(1,Number(targetPos)||folderPos+1)}).eq("id",linkTargetId);
        if(te)throw te;
      }

      if(form.asset_id){
        await supabase.from("assets").update({
          location:san(form.equipment_location,150)||null,equipment_id:san(form.equipment_id,80)||null,
          identification_number:san(form.identification_number,80)||null,inspection_no:san(form.inspection_no,80)||null,
          lanyard_serial_no:san(form.lanyard_serial_no,80)||null,safe_working_load:san(form.swl,50)||null,
          working_pressure:san(form.mawp,50)||null,design_pressure:san(form.design_pressure,50)||null,
          test_pressure:san(form.test_pressure,50)||null,
          /* ✅ Sync asset's next_inspection_date with certificate's expiry */
          next_inspection_date:expiryIso,
          year_built:san(form.year_built,20)||null,capacity_volume:san(form.capacity,50)||null,
          manufacturer:san(form.manufacturer,100)||null,model:san(form.model,100)||null,
          country_of_origin:san(form.country_of_origin,80)||null,inspector_name:san(form.inspector_name,100)||null,
          inspector_id:san(form.inspector_id,80)||null,cert_type:san(form.certificate_type,100)||null,
          design_standard:san(form.legal_framework,250)||null,
        }).eq("id",form.asset_id);
      }

      setSuccess("Certificate saved.");
      router.push(`/certificates/${id}`);
    }catch(err){setError(err?.message||"Failed to save.");setSaving(false);}
    setSaving(false);
  }

  if(loading)return <AppLayout title="Edit Certificate"><div style={{padding:40,textAlign:"center",color:"rgba(240,246,255,0.5)",fontFamily:"'IBM Plex Sans',sans-serif"}}>Loading…</div></AppLayout>;

  return(
    <AppLayout title="Edit Certificate">
      <style>{CSS}</style>
      <div className="ep" style={{minHeight:"100vh",background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.05),transparent),${T.bg}`,color:T.text,fontFamily:"'IBM Plex Sans',sans-serif",padding:24}}>
        <div style={{maxWidth:1220,margin:"0 auto",display:"grid",gap:18}}>

          {/* HEADER */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,padding:"20px 22px",backdropFilter:"blur(20px)"}}>
            <div className="eh" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent,marginBottom:6}}>Edit Certificate</div>
                <h1 style={{margin:0,fontSize:22,fontWeight:900,letterSpacing:"-0.02em"}}>Fix fields · Link pairs · Print folder</h1>
              </div>
              <div className="btn-row">
                <button type="button" onClick={()=>router.push("/certificates")} style={S.ghost}>← Back</button>
                <button type="button" onClick={()=>router.push(`/certificates/${id}`)} style={S.ghost}>View</button>
                <button type="button" onClick={()=>window.open(`/certificates/print/${id}`,"_blank","noopener,noreferrer")} style={S.green}>Print</button>
              </div>
            </div>
          </div>

          {error&&<div style={{padding:"12px 16px",borderRadius:12,border:`1px solid ${T.redBrd}`,background:T.redDim,color:T.red,fontSize:13,fontWeight:700}}>⚠ {error}</div>}
          {success&&<div style={{padding:"12px 16px",borderRadius:12,border:`1px solid ${T.greenBrd}`,background:T.greenDim,color:T.green,fontSize:13,fontWeight:700}}>✓ {success}</div>}

          <form onSubmit={handleSubmit} style={{display:"grid",gap:18}}>

            <Sec title="Link to Equipment">
              <div className="eg-2c">
                <div>
                  <label style={S.label}>Select Equipment (Asset)</label>
                  <select name="asset_id" value={form.asset_id} onChange={hc} style={{...S.input,cursor:"pointer"}}>
                    <option value="">— Select equipment —</option>
                    {assets.map(a=><option key={a.id} value={a.id}>{a.asset_tag} — {a.asset_name}{a.serial_number?` (S/N: ${a.serial_number})`:""}</option>)}
                  </select>
                </div>
                <button type="button" onClick={autoFill} disabled={!selectedAsset} style={selectedAsset?S.purple:S.disabled}>Auto-fill from Equipment</button>
              </div>
            </Sec>

            <Sec title="Certificate Details">
              <div className="eg">
                <Field label="Certificate Type" name="certificate_type" value={form.certificate_type} onChange={hc}/>
                <Field label="Company" name="company" value={form.company} onChange={hc}/>
                <Field label="Equipment Description" name="equipment_description" value={form.equipment_description} onChange={hc}/>
                <Field label="Equipment Location" name="equipment_location" value={form.equipment_location} onChange={hc}/>
                <Field label="Equipment ID" name="equipment_id" value={form.equipment_id} onChange={hc}/>
                <Field label="Identification Number" name="identification_number" value={form.identification_number} onChange={hc}/>
                <Field label="Inspection Number" name="inspection_no" value={form.inspection_no} onChange={hc}/>
                <Field label="Lanyard Serial Number" name="lanyard_serial_no" value={form.lanyard_serial_no} onChange={hc}/>
              </div>
            </Sec>

            <Sec title="Technical Fields">
              <div className="eg">
                <Field label="SWL" name="swl" value={form.swl} onChange={hc}/>
                <Field label="MAWP" name="mawp" value={form.mawp} onChange={hc}/>
                <Field label="Design Pressure" name="design_pressure" value={form.design_pressure} onChange={hc}/>
                <Field label="Test Pressure" name="test_pressure" value={form.test_pressure} onChange={hc}/>
                <Field label="Capacity" name="capacity" value={form.capacity} onChange={hc}/>
                <Field label="Year Built" name="year_built" value={form.year_built} onChange={hc}/>
                <Field label="Manufacturer" name="manufacturer" value={form.manufacturer} onChange={hc}/>
                <Field label="Model" name="model" value={form.model} onChange={hc}/>
                <Field label="Country of Origin" name="country_of_origin" value={form.country_of_origin} onChange={hc}/>
              </div>
            </Sec>

            <Sec title="Dates · Status · Inspector">
              <div className="eg">
                <Sel label="Result" name="equipment_status" value={form.equipment_status} onChange={hc} options={[{value:"PASS",label:"PASS"},{value:"FAIL",label:"FAIL"},{value:"REPAIR_REQUIRED",label:"REPAIR REQUIRED"},{value:"OUT_OF_SERVICE",label:"OUT OF SERVICE"}]}/>
                <Sel label="Record Status" name="status" value={form.status} onChange={hc} options={[{value:"issued",label:"Issued"},{value:"draft",label:"Draft"},{value:"archived",label:"Archived"}]}/>
                <Field label="Issue Date" name="issued_at" type="date" value={form.issued_at} onChange={hc}/>
                {/* ✅ Label makes clear this is also the next inspection date */}
                <Field label="Expiry / Next Inspection Date" name="valid_to" type="date" value={form.valid_to} onChange={hc}/>
                <Field label="Inspector Name" name="inspector_name" value={form.inspector_name} onChange={hc}/>
                <Field label="Inspector ID" name="inspector_id" value={form.inspector_id} onChange={hc}/>
                <Field label="Legal Framework" name="legal_framework" value={form.legal_framework} onChange={hc}/>
                <Field label="Signature URL" name="signature_url" value={form.signature_url} onChange={hc}/>
              </div>
            </Sec>

            <Sec title="Stapler / Linked Folder" id="stapler">
              <div style={{border:`1px solid ${T.accentBrd}`,background:T.accentDim,borderRadius:12,padding:"12px 14px",marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:800,color:T.text,marginBottom:4}}>Use this for paired certificates — Safety Harness + Lanyard</div>
                <div style={{color:T.textMid,fontSize:13,lineHeight:1.6}}>Certificates in the same folder print as separate pages in one job and always show together in the viewer.</div>
              </div>
              <div className="eg">
                <Field label="Folder Name" name="folder_name" value={form.folder_name} onChange={hc} placeholder="Harness + Lanyard Set 01"/>
                <Field label="This Certificate's Position" name="folder_position" type="number" value={form.folder_position} onChange={hc}/>
                <div>
                  <label style={S.label}>Link Another Certificate</label>
                  <select value={linkTargetId} onChange={e=>setLinkTargetId(e.target.value)} style={{...S.input,cursor:"pointer"}}>
                    <option value="">— Select certificate to staple —</option>
                    {selectableCerts.map(c=><option key={c.id} value={c.id}>{c.certificate_number||c.id} — {c.equipment_description||c.company||"Certificate"}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Linked Certificate Position</label>
                  <input type="number" value={targetPos} onChange={e=>setTargetPos(e.target.value)} style={S.input}/>
                </div>
              </div>

              {folderMembers.length>0&&(
                <div style={{marginTop:18}}>
                  <div style={{fontSize:13,fontWeight:800,marginBottom:10,color:T.text}}>Current folder members</div>
                  <div style={{display:"grid",gap:8}}>
                    {folderMembers.map(item=>(
                      <div key={item.id} style={{border:`1px solid ${T.border}`,background:T.card,borderRadius:10,padding:"11px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:800,color:T.text}}>{item.certificate_number||"—"}</div>
                          <div style={{color:T.textMid,fontSize:12,marginTop:2}}>{item.equipment_description||"Unnamed"}</div>
                        </div>
                        <div style={{color:T.accent,fontWeight:800,fontSize:12,flexShrink:0}}>Position {item.folder_position||1}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="btn-row" style={{marginTop:16}}>
                <button type="button" onClick={unlinkFolder} style={S.red} disabled={saving}>Remove Linked Folder</button>
              </div>
            </Sec>

            <div className="btn-row">
              <button type="submit" disabled={saving} style={S.green}>{saving?"Saving…":"Save Changes"}</button>
              <button type="button" onClick={()=>router.push(`/certificates/${id}`)} style={S.ghost}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}

const S={
  label:{display:"block",fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(240,246,255,0.50)",marginBottom:7},
  input:{width:"100%",padding:"11px 13px",borderRadius:10,border:`1px solid rgba(148,163,184,0.12)`,background:"rgba(18,30,50,0.70)",color:"#f0f6ff",fontSize:13,fontWeight:500,outline:"none",fontFamily:"'IBM Plex Sans',sans-serif",WebkitAppearance:"none",appearance:"none"},
  ghost:{padding:"10px 18px",borderRadius:12,border:`1px solid rgba(148,163,184,0.18)`,background:"rgba(255,255,255,0.04)",color:"#f0f6ff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"},
  green:{padding:"10px 18px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#34d399,#14b8a6)",color:"#052e16",fontWeight:900,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"},
  purple:{padding:"10px 18px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#a78bfa,#22d3ee)",color:"#f0f6ff",fontWeight:900,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"},
  red:{padding:"10px 18px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#f87171,#f97316)",color:"#fff",fontWeight:900,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"},
  disabled:{padding:"10px 18px",borderRadius:12,border:`1px solid rgba(148,163,184,0.10)`,background:"rgba(255,255,255,0.04)",color:"rgba(240,246,255,0.28)",fontWeight:700,fontSize:13,cursor:"not-allowed",fontFamily:"'IBM Plex Sans',sans-serif"},
};
