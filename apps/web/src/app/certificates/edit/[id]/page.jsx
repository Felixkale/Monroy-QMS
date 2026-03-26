// apps/web/src/app/certificates/[id]/edit/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

/* ── Tokens ── */
const T = {
  bg:"#070e18", surface:"rgba(13,22,38,0.80)", panel:"rgba(10,18,32,0.92)",
  panel2:"rgba(18,30,50,0.70)", card:"rgba(255,255,255,0.025)",
  border:"rgba(148,163,184,0.12)", borderHi:"rgba(148,163,184,0.22)",
  text:"#f0f6ff", textMid:"rgba(240,246,255,0.72)", textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee", accentDim:"rgba(34,211,238,0.10)", accentBrd:"rgba(34,211,238,0.25)", accentGlow:"rgba(34,211,238,0.18)",
  green:"#34d399", greenDim:"rgba(52,211,153,0.10)", greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",   redDim:"rgba(248,113,113,0.10)",  redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24", amberDim:"rgba(251,191,36,0.10)", amberBrd:"rgba(251,191,36,0.25)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  input::placeholder,textarea::placeholder{color:rgba(240,246,255,0.28)}
  select option{background:#0a1420;color:#f0f6ff}
  ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}

  .edit-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}
  .edit-2col{display:grid;grid-template-columns:1.5fr auto;gap:14px;align-items:end}
  .btn-row{display:flex;gap:10px;flex-wrap:wrap}
  .folder-member{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}

  @media(max-width:768px){
    .edit-page-wrap{padding:14px!important}
    .edit-header{flex-direction:column!important;align-items:flex-start!important;gap:12px!important}
    .edit-header .btn-row{width:100%}
    .edit-header .btn-row button,.edit-header .btn-row a{flex:1;text-align:center}
    .edit-2col{grid-template-columns:1fr!important}
    .edit-2col button{width:100%}
    .btn-row{width:100%}
    .btn-row button,.btn-row a{flex:1;justify-content:center}
  }
  @media(max-width:480px){
    .edit-grid{grid-template-columns:1fr!important}
  }
`;

const EMPTY_FORM = {
  asset_id:"",certificate_type:"",company:"",equipment_description:"",equipment_location:"",
  equipment_id:"",identification_number:"",inspection_no:"",lanyard_serial_no:"",
  swl:"",mawp:"",design_pressure:"",test_pressure:"",capacity:"",year_built:"",
  manufacturer:"",model:"",country_of_origin:"",equipment_status:"PASS",
  issued_at:"",valid_to:"",status:"issued",
  legal_framework:"Mines, Quarries, Works and Machinery Act Cap 44:02",
  inspector_name:"",inspector_id:"",signature_url:"",logo_url:"/logo.png",
  pdf_url:"",folder_id:"",folder_name:"",folder_position:1,
};

function normalizeId(v){ return Array.isArray(v)?v[0]:v; }
function sanitizeText(v,max=250){ if(v===undefined||v===null) return ""; return String(v).replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim().slice(0,max); }
function normalizeDateForDb(v){ if(!v) return null; const d=new Date(v); if(Number.isNaN(d.getTime())) return null; return d.toISOString(); }
function toDateInput(v){ if(!v) return ""; const d=new Date(v); if(Number.isNaN(d.getTime())) return ""; return d.toISOString().slice(0,10); }
function detectEquipmentType(t=""){ return ["pressure vessel","boiler","air receiver","air compressor","oil separator"].includes(String(t).toLowerCase())?"pv":"lift"; }
function defaultCertType(t=""){ return detectEquipmentType(t)==="pv"?"Pressure Test Certificate":"Load Test Certificate"; }

function Field({label,name,value,onChange,type="text",placeholder=""}){
  return(
    <div>
      <label style={S.label}>{label}</label>
      <input type={type} name={name} value={value??""} onChange={onChange} placeholder={placeholder} style={S.input}/>
    </div>
  );
}
function SelectField({label,name,value,onChange,options}){
  return(
    <div>
      <label style={S.label}>{label}</label>
      <select name={name} value={value??""} onChange={onChange} style={{...S.input,cursor:"pointer"}}>
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export default function EditCertificatePage() {
  const params=useParams(); const router=useRouter();
  const id=normalizeId(params?.id);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [assets,setAssets]=useState([]);
  const [certOptions,setCertOptions]=useState([]);
  const [folderMembers,setFolderMembers]=useState([]);
  const [form,setForm]=useState(EMPTY_FORM);
  const [linkTargetId,setLinkTargetId]=useState("");
  const [targetFolderPosition,setTargetFolderPosition]=useState(2);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");

  useEffect(()=>{if(id) loadPage();},[id]);

  const selectedAsset=useMemo(()=>assets.find(a=>String(a.id)===String(form.asset_id))||null,[assets,form.asset_id]);
  const selectableCerts=useMemo(()=>certOptions.filter(c=>String(c.id)!==String(id)),[certOptions,id]);

  async function loadPage(){
    setLoading(true);setError("");setSuccess("");
    const [assetsRes,certListRes,certRes]=await Promise.all([
      supabase.from("assets").select(`id,asset_name,asset_tag,asset_type,location,serial_number,equipment_id,identification_number,inspection_no,lanyard_serial_no,safe_working_load,working_pressure,design_pressure,test_pressure,next_inspection_date,year_built,capacity_volume,manufacturer,model,country_of_origin,inspector_name,inspector_id,clients(company_name)`).order("created_at",{ascending:false}),
      supabase.from("certificates").select(`id,certificate_number,company,client_name,equipment_description,folder_id,folder_name,folder_position`).order("created_at",{ascending:false}),
      supabase.from("certificates").select("*").eq("id",id).maybeSingle(),
    ]);

    if(assetsRes.error){setError(assetsRes.error.message||"Failed to load assets.");setLoading(false);return;}
    if(certListRes.error){setError(certListRes.error.message||"Failed to load certificates.");setLoading(false);return;}
    if(certRes.error||!certRes.data){setError(certRes.error?.message||"Certificate not found.");setLoading(false);return;}

    setAssets(assetsRes.data||[]);
    setCertOptions(certListRes.data||[]);
    const row=certRes.data;
    setForm({
      asset_id:row.asset_id||"",certificate_type:row.certificate_type||"",company:row.company||row.client_name||"",
      equipment_description:row.equipment_description||"",equipment_location:row.equipment_location||"",
      equipment_id:row.equipment_id||"",identification_number:row.identification_number||"",
      inspection_no:row.inspection_no||"",lanyard_serial_no:row.lanyard_serial_no||"",
      swl:row.swl||"",mawp:row.mawp||"",design_pressure:row.design_pressure||"",test_pressure:row.test_pressure||"",
      capacity:row.capacity||"",year_built:row.year_built||"",manufacturer:row.manufacturer||"",
      model:row.model||"",country_of_origin:row.country_of_origin||"",
      equipment_status:row.equipment_status||row.result||"PASS",
      issued_at:toDateInput(row.issued_at||row.issue_date),valid_to:toDateInput(row.valid_to||row.expiry_date),
      status:row.status||"issued",legal_framework:row.legal_framework||"Mines, Quarries, Works and Machinery Act Cap 44:02",
      inspector_name:row.inspector_name||"",inspector_id:row.inspector_id||"",
      signature_url:row.signature_url||"",logo_url:row.logo_url||"/logo.png",pdf_url:row.pdf_url||"",
      folder_id:row.folder_id||"",folder_name:row.folder_name||"",folder_position:row.folder_position||1,
    });

    if(row.folder_id){
      const{data:members}=await supabase.from("certificates")
        .select("id,certificate_number,equipment_description,folder_position")
        .eq("folder_id",row.folder_id).order("folder_position",{ascending:true}).order("created_at",{ascending:true});
      setFolderMembers(members||[]);
    }
    setLoading(false);
  }

  function handleChange(e){const{name,value}=e.target;setForm(p=>({...p,[name]:value}));}

  function handleUseEquipmentData(){
    if(!selectedAsset) return;
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
      valid_to:prev.valid_to||toDateInput(selectedAsset.next_inspection_date),
    }));
  }

  async function handleUnlinkFolder(){
    if(!form.folder_id){setError("Not linked to any folder.");return;}
    setSaving(true);setError("");setSuccess("");
    const{error:e}=await supabase.from("certificates").update({folder_id:null,folder_name:null,folder_position:1}).eq("folder_id",form.folder_id);
    if(e){setError(e.message||"Failed to unlink.");setSaving(false);return;}
    setSuccess("Linked folder removed.");
    setForm(p=>({...p,folder_id:"",folder_name:"",folder_position:1}));
    setFolderMembers([]);setLinkTargetId("");setSaving(false);
  }

  async function handleSubmit(e){
    e.preventDefault();setSaving(true);setError("");setSuccess("");
    try{
      if(!sanitizeText(form.company,120)) throw new Error("Company is required.");
      if(!sanitizeText(form.equipment_description,160)) throw new Error("Equipment description is required.");
      if(!sanitizeText(form.equipment_id,80)) throw new Error("Equipment ID is required.");

      let folderId=form.folder_id||null;
      let folderName=sanitizeText(form.folder_name,120)||null;
      const folderPosition=Math.max(1,Number(form.folder_position)||1);
      if(linkTargetId){folderId=folderId||crypto.randomUUID();folderName=folderName||`Linked Folder ${id}`;}

      const payload={
        asset_id:form.asset_id||null,certificate_type:sanitizeText(form.certificate_type,100)||null,
        company:sanitizeText(form.company,120),equipment_description:sanitizeText(form.equipment_description,180),
        equipment_location:sanitizeText(form.equipment_location,150)||null,equipment_id:sanitizeText(form.equipment_id,80),
        identification_number:sanitizeText(form.identification_number,80)||null,inspection_no:sanitizeText(form.inspection_no,80)||null,
        lanyard_serial_no:sanitizeText(form.lanyard_serial_no,80)||null,swl:sanitizeText(form.swl,50)||null,
        mawp:sanitizeText(form.mawp,50)||null,design_pressure:sanitizeText(form.design_pressure,50)||null,
        test_pressure:sanitizeText(form.test_pressure,50)||null,capacity:sanitizeText(form.capacity,50)||null,
        year_built:sanitizeText(form.year_built,20)||null,manufacturer:sanitizeText(form.manufacturer,100)||null,
        model:sanitizeText(form.model,100)||null,country_of_origin:sanitizeText(form.country_of_origin,80)||null,
        equipment_status:sanitizeText(form.equipment_status,30)||"PASS",
        issued_at:normalizeDateForDb(form.issued_at),valid_to:form.valid_to||null,
        status:sanitizeText(form.status,40)||"issued",legal_framework:sanitizeText(form.legal_framework,250)||null,
        inspector_name:sanitizeText(form.inspector_name,100)||null,inspector_id:sanitizeText(form.inspector_id,80)||null,
        signature_url:sanitizeText(form.signature_url,500)||null,logo_url:sanitizeText(form.logo_url,500)||null,
        pdf_url:sanitizeText(form.pdf_url,500)||null,folder_id:folderId,folder_name:folderName,folder_position:folderPosition,
      };

      const{error:updateError}=await supabase.from("certificates").update(payload).eq("id",id);
      if(updateError) throw updateError;

      if(folderId&&folderName) await supabase.from("certificates").update({folder_name:folderName}).eq("folder_id",folderId);

      if(linkTargetId){
        const{error:tErr}=await supabase.from("certificates").update({folder_id:folderId,folder_name:folderName,folder_position:Math.max(1,Number(targetFolderPosition)||folderPosition+1)}).eq("id",linkTargetId);
        if(tErr) throw tErr;
      }

      if(form.asset_id){
        await supabase.from("assets").update({
          location:sanitizeText(form.equipment_location,150)||null,equipment_id:sanitizeText(form.equipment_id,80)||null,
          identification_number:sanitizeText(form.identification_number,80)||null,inspection_no:sanitizeText(form.inspection_no,80)||null,
          lanyard_serial_no:sanitizeText(form.lanyard_serial_no,80)||null,safe_working_load:sanitizeText(form.swl,50)||null,
          working_pressure:sanitizeText(form.mawp,50)||null,design_pressure:sanitizeText(form.design_pressure,50)||null,
          test_pressure:sanitizeText(form.test_pressure,50)||null,next_inspection_date:form.valid_to||null,
          year_built:sanitizeText(form.year_built,20)||null,capacity_volume:sanitizeText(form.capacity,50)||null,
          manufacturer:sanitizeText(form.manufacturer,100)||null,model:sanitizeText(form.model,100)||null,
          country_of_origin:sanitizeText(form.country_of_origin,80)||null,inspector_name:sanitizeText(form.inspector_name,100)||null,
          inspector_id:sanitizeText(form.inspector_id,80)||null,cert_type:sanitizeText(form.certificate_type,100)||null,
          design_standard:sanitizeText(form.legal_framework,250)||null,
        }).eq("id",form.asset_id);
      }

      setSuccess("Certificate saved successfully.");
      router.push(`/certificates/${id}`);
    }catch(err){setError(err?.message||"Failed to save.");setSaving(false);}
    setSaving(false);
  }

  if(loading) return <AppLayout title="Edit Certificate"><div style={{padding:40,textAlign:"center",color:"rgba(240,246,255,0.5)",fontFamily:"'IBM Plex Sans',sans-serif"}}>Loading certificate…</div></AppLayout>;

  return(
    <AppLayout title="Edit Certificate">
      <style>{CSS}</style>
      <div className="edit-page-wrap" style={{minHeight:"100vh",background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.05),transparent),${T.bg}`,color:T.text,fontFamily:"'IBM Plex Sans',sans-serif",padding:24}}>
        <div style={{maxWidth:1220,margin:"0 auto",display:"grid",gap:18}}>

          {/* HEADER */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,padding:"20px 22px",backdropFilter:"blur(20px)"}}>
            <div className="edit-header" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent,marginBottom:8}}>Edit Certificate</div>
                <h1 style={{margin:0,fontSize:24,fontWeight:900,letterSpacing:"-0.02em"}}>Fix fields · Link pairs · Print folder</h1>
              </div>
              <div className="btn-row">
                <button type="button" onClick={()=>router.push("/certificates")} style={S.btnGhost}>← Back</button>
                <button type="button" onClick={()=>router.push(`/certificates/${id}`)} style={S.btnGhost}>View</button>
                <button type="button" onClick={()=>window.open(`/certificates/print/${id}`,"_blank","noopener,noreferrer")} style={S.btnGreen}>Print</button>
              </div>
            </div>
          </div>

          {error&&<div style={{padding:"12px 16px",borderRadius:12,border:`1px solid ${T.redBrd}`,background:T.redDim,color:T.red,fontSize:13,fontWeight:700}}>⚠ {error}</div>}
          {success&&<div style={{padding:"12px 16px",borderRadius:12,border:`1px solid ${T.greenBrd}`,background:T.greenDim,color:T.green,fontSize:13,fontWeight:700}}>✓ {success}</div>}

          <form onSubmit={handleSubmit} style={{display:"grid",gap:18}}>

            {/* Link to Equipment */}
            <Section title="Link to Equipment">
              <div className="edit-2col">
                <div>
                  <label style={S.label}>Select Equipment (Asset)</label>
                  <select name="asset_id" value={form.asset_id} onChange={handleChange} style={{...S.input,cursor:"pointer"}}>
                    <option value="">— Select equipment —</option>
                    {assets.map(a=><option key={a.id} value={a.id}>{a.asset_tag} — {a.asset_name}{a.serial_number?` (S/N: ${a.serial_number})`:""}</option>)}
                  </select>
                </div>
                <button type="button" onClick={handleUseEquipmentData} disabled={!selectedAsset} style={selectedAsset?S.btnPurple:S.btnDisabled}>Auto-fill from Equipment</button>
              </div>
            </Section>

            {/* Certificate Details */}
            <Section title="Certificate Details">
              <div className="edit-grid">
                <Field label="Certificate Type" name="certificate_type" value={form.certificate_type} onChange={handleChange}/>
                <Field label="Company" name="company" value={form.company} onChange={handleChange}/>
                <Field label="Equipment Description" name="equipment_description" value={form.equipment_description} onChange={handleChange}/>
                <Field label="Equipment Location" name="equipment_location" value={form.equipment_location} onChange={handleChange}/>
                <Field label="Equipment ID" name="equipment_id" value={form.equipment_id} onChange={handleChange}/>
                <Field label="Identification Number" name="identification_number" value={form.identification_number} onChange={handleChange}/>
                <Field label="Inspection Number" name="inspection_no" value={form.inspection_no} onChange={handleChange}/>
                <Field label="Lanyard Serial Number" name="lanyard_serial_no" value={form.lanyard_serial_no} onChange={handleChange}/>
              </div>
            </Section>

            {/* Technical */}
            <Section title="Technical Fields">
              <div className="edit-grid">
                <Field label="SWL" name="swl" value={form.swl} onChange={handleChange}/>
                <Field label="MAWP" name="mawp" value={form.mawp} onChange={handleChange}/>
                <Field label="Design Pressure" name="design_pressure" value={form.design_pressure} onChange={handleChange}/>
                <Field label="Test Pressure" name="test_pressure" value={form.test_pressure} onChange={handleChange}/>
                <Field label="Capacity" name="capacity" value={form.capacity} onChange={handleChange}/>
                <Field label="Year Built" name="year_built" value={form.year_built} onChange={handleChange}/>
                <Field label="Manufacturer" name="manufacturer" value={form.manufacturer} onChange={handleChange}/>
                <Field label="Model" name="model" value={form.model} onChange={handleChange}/>
                <Field label="Country of Origin" name="country_of_origin" value={form.country_of_origin} onChange={handleChange}/>
              </div>
            </Section>

            {/* Dates, Status, Inspector */}
            <Section title="Dates · Status · Inspector">
              <div className="edit-grid">
                <SelectField label="Result" name="equipment_status" value={form.equipment_status} onChange={handleChange} options={[{value:"PASS",label:"PASS"},{value:"FAIL",label:"FAIL"},{value:"REPAIR_REQUIRED",label:"REPAIR REQUIRED"},{value:"OUT_OF_SERVICE",label:"OUT OF SERVICE"}]}/>
                <SelectField label="Record Status" name="status" value={form.status} onChange={handleChange} options={[{value:"issued",label:"Issued"},{value:"draft",label:"Draft"},{value:"archived",label:"Archived"}]}/>
                <Field label="Issue Date" name="issued_at" type="date" value={form.issued_at} onChange={handleChange}/>
                <Field label="Expiry Date" name="valid_to" type="date" value={form.valid_to} onChange={handleChange}/>
                <Field label="Inspector Name" name="inspector_name" value={form.inspector_name} onChange={handleChange}/>
                <Field label="Inspector ID" name="inspector_id" value={form.inspector_id} onChange={handleChange}/>
                <Field label="Legal Framework" name="legal_framework" value={form.legal_framework} onChange={handleChange}/>
                <Field label="Signature URL" name="signature_url" value={form.signature_url} onChange={handleChange}/>
              </div>
            </Section>

            {/* Stapler */}
            <Section title="Stapler / Linked Folder" id="stapler">
              <div style={{border:`1px solid ${T.accentBrd}`,background:T.accentDim,borderRadius:12,padding:"12px 14px",marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:800,color:T.text,marginBottom:4}}>Use this for paired certificates like Safety Harness + Lanyard</div>
                <div style={{color:T.textMid,fontSize:13,lineHeight:1.6}}>When two certificates share the same folder, the print page will print them as separate pages in one job, and the certificate view will always show them together.</div>
              </div>
              <div className="edit-grid">
                <Field label="Folder Name" name="folder_name" value={form.folder_name} onChange={handleChange} placeholder="Harness + Lanyard Set 01"/>
                <Field label="Current Certificate Position" name="folder_position" type="number" value={form.folder_position} onChange={handleChange}/>
                <div>
                  <label style={S.label}>Link Another Certificate</label>
                  <select value={linkTargetId} onChange={e=>setLinkTargetId(e.target.value)} style={{...S.input,cursor:"pointer"}}>
                    <option value="">— Select certificate to staple —</option>
                    {selectableCerts.map(c=><option key={c.id} value={c.id}>{c.certificate_number||c.id} — {c.equipment_description||c.company||c.client_name||"Certificate"}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Linked Certificate Position</label>
                  <input type="number" value={targetFolderPosition} onChange={e=>setTargetFolderPosition(e.target.value)} style={S.input}/>
                </div>
              </div>

              {folderMembers.length>0&&(
                <div style={{marginTop:18}}>
                  <div style={{fontSize:14,fontWeight:800,marginBottom:10,color:T.text}}>Current linked folder members</div>
                  <div style={{display:"grid",gap:10}}>
                    {folderMembers.map(item=>(
                      <div key={item.id} className="folder-member" style={{border:`1px solid ${T.border}`,background:T.card,borderRadius:12,padding:"12px 14px"}}>
                        <div>
                          <div style={{fontSize:14,fontWeight:800,color:T.text}}>{item.certificate_number||"—"}</div>
                          <div style={{color:T.textMid,fontSize:13,marginTop:2}}>{item.equipment_description||"Unnamed equipment"}</div>
                        </div>
                        <div style={{color:T.accent,fontWeight:800,fontSize:13,flexShrink:0}}>Position {item.folder_position||1}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="btn-row" style={{marginTop:18}}>
                <button type="button" onClick={handleUnlinkFolder} style={S.btnRed} disabled={saving}>Remove Linked Folder</button>
              </div>
            </Section>

            {/* Submit */}
            <div className="btn-row">
              <button type="submit" disabled={saving} style={S.btnGreen}>{saving?"Saving…":"Save Changes"}</button>
              <button type="button" onClick={()=>router.push(`/certificates/${id}`)} style={S.btnGhost}>Cancel</button>
            </div>

          </form>
        </div>
      </div>
    </AppLayout>
  );
}

function Section({title,children,id}){
  return(
    <div id={id} style={{background:"rgba(10,18,32,0.92)",border:`1px solid rgba(148,163,184,0.12)`,borderRadius:18,padding:20}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
        <div style={{width:4,height:20,borderRadius:2,background:`linear-gradient(to bottom,#22d3ee,rgba(34,211,238,0.3))`,flexShrink:0}}/>
        <div style={{fontSize:16,fontWeight:900,color:"#f0f6ff"}}>{title}</div>
      </div>
      {children}
    </div>
  );
}

const S={
  label:{display:"block",fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(240,246,255,0.55)",marginBottom:7},
  input:{width:"100%",padding:"11px 13px",borderRadius:10,border:`1px solid rgba(148,163,184,0.12)`,background:"rgba(18,30,50,0.70)",color:"#f0f6ff",fontSize:14,fontWeight:500,outline:"none",fontFamily:"'IBM Plex Sans',sans-serif",WebkitAppearance:"none",appearance:"none"},
  btnGhost:{padding:"11px 18px",borderRadius:12,border:`1px solid rgba(148,163,184,0.18)`,background:"rgba(255,255,255,0.04)",color:"#f0f6ff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"},
  btnGreen:{padding:"11px 18px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#34d399,#14b8a6)",color:"#052e16",fontWeight:900,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"},
  btnPurple:{padding:"11px 18px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#a78bfa,#22d3ee)",color:"#f0f6ff",fontWeight:900,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"},
  btnRed:{padding:"11px 18px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#f87171,#f97316)",color:"#fff",fontWeight:900,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"},
  btnDisabled:{padding:"11px 18px",borderRadius:12,border:`1px solid rgba(148,163,184,0.10)`,background:"rgba(255,255,255,0.04)",color:"rgba(240,246,255,0.30)",fontWeight:700,fontSize:13,cursor:"not-allowed",fontFamily:"'IBM Plex Sans',sans-serif"},
};
