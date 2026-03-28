// src/app/certificates/import/page.jsx
"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  blue:"#60a5fa", blueDim:"rgba(96,165,250,0.10)",  blueBrd:"rgba(96,165,250,0.25)",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@500&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  input::placeholder,textarea::placeholder{color:rgba(240,246,255,0.28)}
  select option{background:#0a1420;color:#f0f6ff}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:99px}
  .ip-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
  .ip-hdr{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
  .ip-btns{display:flex;gap:8px;flex-wrap:wrap}
  @media(max-width:768px){
    .ip-page{padding:12px!important}
    .ip-hdr{flex-direction:column!important;gap:10px!important}
    .ip-btns{width:100%}.ip-btns button{flex:1}
    .ip-grid{grid-template-columns:1fr}
  }
`;

const IS={width:"100%",padding:"10px 13px",borderRadius:9,border:"1px solid rgba(148,163,184,0.12)",background:"rgba(18,30,50,0.70)",color:"#f0f6ff",fontSize:13,fontWeight:500,outline:"none",fontFamily:"'IBM Plex Sans',sans-serif",WebkitAppearance:"none",appearance:"none"};
const LS={display:"block",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(240,246,255,0.45)",marginBottom:6};

function F({label,value,onChange,mono=false}){
  return(
    <div>
      <label style={LS}>{label}</label>
      <input value={value||""} onChange={e=>onChange(e.target.value)}
        style={{...IS,...(mono?{fontFamily:"'IBM Plex Mono',monospace",fontSize:12}:{})}}/>
    </div>
  );
}
function Sec({icon,title,children}){
  return(
    <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,padding:18}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,paddingBottom:11,borderBottom:`1px solid ${T.border}`}}>
        <span style={{fontSize:14}}>{icon}</span>
        <div style={{fontSize:14,fontWeight:800,color:T.text}}>{title}</div>
      </div>
      {children}
    </div>
  );
}

function ImportInner() {
  const router = useRouter();
  const fileRef = useRef(null);

  const [file,setFile]       = useState(null);
  const [preview,setPreview] = useState("");
  const [scanning,setScanning] = useState(false);
  const [saving,setSaving]   = useState(false);
  const [error,setError]     = useState("");
  const [success,setSuccess] = useState("");
  const [extracted,setExtracted] = useState(null);

  // Editable form state after extraction
  const [form,setForm] = useState({
    certificate_number:"",certificate_type:"",client_name:"",
    equipment_description:"",equipment_type:"",equipment_location:"",
    equipment_id:"",identification_number:"",inspection_no:"",lanyard_serial_no:"",
    manufacturer:"",model:"",serial_number:"",year_built:"",country_of_origin:"",
    swl:"",mawp:"",capacity:"",design_pressure:"",test_pressure:"",
    inspector_name:"Moemedi Masupe",inspector_id:"700117910",
    result:"PASS",issue_date:"",expiry_date:"",
    legal_framework:"Mines, Quarries, Works and Machinery Act Cap 44:02",
    remarks:"",
  });

  function sf(k){return v=>setForm(p=>({...p,[k]:v}));}

  function handleFileChange(e){
    const f = e.target.files?.[0];
    if(!f) return;
    setFile(f);
    setError("");setSuccess("");setExtracted(null);
    if(f.type.startsWith("image/")){
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview("");
    }
  }

  async function handleScan(){
    if(!file){ setError("Please select a file first."); return; }
    setScanning(true);setError("");setSuccess("");setExtracted(null);
    try{
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/certificates/import", { method:"POST", body });
      let json;
      try { json = await res.json(); }
      catch { throw new Error("Server returned an invalid response. Check that GEMINI_API_KEY is set in Render.com environment variables."); }
      if(!res.ok) throw new Error(json?.error || `Server error ${res.status}`);
      if(!json.success) throw new Error(json?.error || "Extraction failed.");

      const ex = json.extracted || {};
      setExtracted(ex);
      setForm({
        certificate_number: ex.certificate_number||"",
        certificate_type:   ex.certificate_type||"Load Test Certificate",
        client_name:        ex.client_name||"",
        equipment_description: ex.equipment_description||"",
        equipment_type:     ex.equipment_type||"",
        equipment_location: ex.equipment_location||"",
        equipment_id:       ex.equipment_id||"",
        identification_number: ex.identification_number||"",
        inspection_no:      ex.inspection_no||"",
        lanyard_serial_no:  ex.lanyard_serial_no||"",
        manufacturer:       ex.manufacturer||"",
        model:              ex.model||"",
        serial_number:      ex.serial_number||"",
        year_built:         ex.year_built||"",
        country_of_origin:  ex.country_of_origin||"",
        swl:                ex.swl||"",
        mawp:               ex.mawp||"",
        capacity:           ex.capacity||"",
        design_pressure:    ex.design_pressure||"",
        test_pressure:      ex.test_pressure||"",
        inspector_name:     ex.inspector_name||"Moemedi Masupe",
        inspector_id:       ex.inspector_id||"700117910",
        result:             ex.result||"PASS",
        issue_date:         ex.issue_date||"",
        expiry_date:        ex.expiry_date||"",
        legal_framework:    ex.legal_framework||"Mines, Quarries, Works and Machinery Act Cap 44:02",
        remarks:            ex.remarks||"",
      });
      setSuccess("Extraction complete — review and confirm below.");
    }catch(e){
      setError(e?.message||"Import failed.");
    }finally{
      setScanning(false);
    }
  }

  async function handleSave(){
    if(!extracted){ setError("Scan a document first."); return; }
    setSaving(true);setError("");setSuccess("");
    try{
      // Try to match or create client
      let clientId = null;
      if(form.client_name?.trim()){
        const{data:clients}=await supabase.from("clients")
          .select("id,company_name")
          .ilike("company_name",form.client_name.trim())
          .limit(1);
        if(clients?.length){
          clientId = clients[0].id;
        } else {
          const{data:newClient,error:ce}=await supabase.from("clients")
            .insert({company_name:form.client_name.trim(),status:"active"})
            .select("id").single();
          if(!ce) clientId = newClient.id;
        }
      }

      // Generate cert number if missing
      let certNum = form.certificate_number?.trim();
      if(!certNum){
        const base = (form.serial_number||form.equipment_id||"IMP").replace(/[^a-zA-Z0-9]/g,"").toUpperCase().slice(0,12);
        certNum = `CERT-${base}-${Date.now().toString(36).toUpperCase()}`;
      }

      const payload = {
        certificate_number:    certNum,
        certificate_type:      form.certificate_type||"Load Test Certificate",
        client_id:             clientId,
        client_name:           form.client_name||null,
        company:               form.client_name||null,
        equipment_description: form.equipment_description||null,
        equipment_type:        form.equipment_type||null,
        equipment_location:    form.equipment_location||null,
        equipment_id:          form.equipment_id||null,
        identification_number: form.identification_number||null,
        inspection_no:         form.inspection_no||null,
        lanyard_serial_no:     form.lanyard_serial_no||null,
        manufacturer:          form.manufacturer||null,
        model:                 form.model||null,
        serial_number:         form.serial_number||null,
        year_built:            form.year_built||null,
        country_of_origin:     form.country_of_origin||null,
        swl:                   form.swl||null,
        mawp:                  form.mawp||null,
        capacity:              form.capacity||null,
        design_pressure:       form.design_pressure||null,
        test_pressure:         form.test_pressure||null,
        inspector_name:        form.inspector_name||"Moemedi Masupe",
        inspector_id:          form.inspector_id||"700117910",
        result:                form.result||"PASS",
        equipment_status:      form.result||"PASS",
        issue_date:            form.issue_date||null,
        issued_at:             form.issue_date?new Date(form.issue_date).toISOString():null,
        expiry_date:           form.expiry_date||null,
        valid_to:              form.expiry_date||null,
        next_inspection_date:  form.expiry_date||null,
        legal_framework:       form.legal_framework||"Mines, Quarries, Works and Machinery Act Cap 44:02",
        remarks:               form.remarks||null,
        comments:              form.remarks||null,
        logo_url:              "/logo.png",
        signature_url:         "/Signature.png",
        status:                "active",
        extracted_data:        extracted,
        detected_from_nameplate: true,
      };

      const{error:ie}=await supabase.from("certificates").insert(payload);
      if(ie) throw ie;
      setSuccess("Certificate imported successfully!");
      setTimeout(()=>router.push("/certificates"),1200);
    }catch(e){
      setError("Save failed: "+(e?.message||"Unknown error"));
    }finally{
      setSaving(false);
    }
  }

  return(
    <AppLayout title="Import Certificate">
      <style>{CSS}</style>
      <div className="ip-page" style={{minHeight:"100vh",background:`radial-gradient(ellipse 70% 50% at 0% 0%,rgba(34,211,238,0.05),transparent),${T.bg}`,color:T.text,fontFamily:"'IBM Plex Sans',sans-serif",padding:24}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"grid",gap:16}}>

          {/* HEADER */}
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:"18px 20px",backdropFilter:"blur(20px)"}}>
            <div className="ip-hdr">
              <div>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent,marginBottom:7}}>AI Certificate Import</div>
                <h1 style={{margin:0,fontSize:"clamp(18px,3vw,24px)",fontWeight:900,letterSpacing:"-0.02em"}}>Import from PDF or Image</h1>
                <p style={{margin:"5px 0 0",color:T.textDim,fontSize:12}}>Gemini 2.5 Flash extracts all fields. Review and confirm before saving.</p>
              </div>
              <div className="ip-btns">
                <button type="button" onClick={()=>router.push("/certificates")}
                  style={{padding:"9px 14px",borderRadius:10,border:`1px solid ${T.border}`,background:T.card,color:T.textMid,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                  ← Back
                </button>
              </div>
            </div>
          </div>

          {error  &&<div style={{padding:"11px 14px",borderRadius:10,border:`1px solid ${T.redBrd}`,  background:T.redDim,  color:T.red,  fontSize:13,fontWeight:700}}>⚠ {error}</div>}
          {success&&<div style={{padding:"11px 14px",borderRadius:10,border:`1px solid ${T.greenBrd}`,background:T.greenDim,color:T.green,fontSize:13,fontWeight:700}}>✓ {success}</div>}

          {/* UPLOAD */}
          <Sec icon="📎" title="Upload Document">
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"end"}}>
              <div>
                <label style={LS}>Select File (PDF, JPEG, PNG, WebP)</label>
                <input ref={fileRef} type="file" accept=".pdf,image/*" onChange={handleFileChange}
                  style={{...IS,cursor:"pointer",padding:"10px 12px"}}/>
                {file&&<div style={{fontSize:11,color:T.textDim,marginTop:5}}>📄 {file.name} ({(file.size/1024).toFixed(0)} KB)</div>}
              </div>
              <button type="button" onClick={handleScan} disabled={scanning||!file}
                style={{padding:"11px 20px",borderRadius:11,border:"none",
                  background:scanning||!file?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#22d3ee,#60a5fa)",
                  color:scanning||!file?"rgba(240,246,255,0.4)":"#001018",
                  fontWeight:900,fontSize:13,cursor:scanning||!file?"not-allowed":"pointer",
                  fontFamily:"'IBM Plex Sans',sans-serif",whiteSpace:"nowrap",minHeight:44,
                  WebkitTapHighlightColor:"transparent"}}>
                {scanning?"⏳ Scanning…":"⚡ Scan with AI"}
              </button>
            </div>
            {preview&&(
              <div style={{marginTop:14,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden",maxWidth:400}}>
                <img src={preview} alt="Preview" style={{width:"100%",display:"block",objectFit:"cover"}}/>
              </div>
            )}
          </Sec>

          {/* EXTRACTED FIELDS — shown after scan */}
          {extracted&&(
            <>
              <Sec icon="📋" title="Certificate Details">
                <div className="ip-grid">
                  <F label="Certificate Number" value={form.certificate_number} onChange={sf("certificate_number")} mono/>
                  <F label="Certificate Type"   value={form.certificate_type}   onChange={sf("certificate_type")}/>
                  <F label="Client / Company"   value={form.client_name}        onChange={sf("client_name")}/>
                  <F label="Equipment Description" value={form.equipment_description} onChange={sf("equipment_description")}/>
                  <F label="Equipment Type"     value={form.equipment_type}     onChange={sf("equipment_type")}/>
                  <F label="Location"           value={form.equipment_location} onChange={sf("equipment_location")}/>
                </div>
              </Sec>

              <Sec icon="🔩" title="Equipment">
                <div className="ip-grid">
                  <F label="Equipment ID"         value={form.equipment_id}          onChange={sf("equipment_id")} mono/>
                  <F label="Identification No."   value={form.identification_number} onChange={sf("identification_number")} mono/>
                  <F label="Inspection No."       value={form.inspection_no}         onChange={sf("inspection_no")} mono/>
                  <F label="Lanyard Serial No."   value={form.lanyard_serial_no}     onChange={sf("lanyard_serial_no")} mono/>
                  <F label="Serial Number"        value={form.serial_number}         onChange={sf("serial_number")} mono/>
                  <F label="Manufacturer"         value={form.manufacturer}          onChange={sf("manufacturer")}/>
                  <F label="Model"                value={form.model}                 onChange={sf("model")}/>
                  <F label="Year Built"           value={form.year_built}            onChange={sf("year_built")}/>
                  <F label="Country of Origin"    value={form.country_of_origin}     onChange={sf("country_of_origin")}/>
                </div>
              </Sec>

              <Sec icon="⚙️" title="Technical Data">
                <div className="ip-grid">
                  <F label="SWL"            value={form.swl}            onChange={sf("swl")}/>
                  <F label="MAWP"           value={form.mawp}           onChange={sf("mawp")}/>
                  <F label="Capacity"       value={form.capacity}       onChange={sf("capacity")}/>
                  <F label="Design Pressure" value={form.design_pressure} onChange={sf("design_pressure")}/>
                  <F label="Test Pressure"  value={form.test_pressure}  onChange={sf("test_pressure")}/>
                </div>
              </Sec>

              <Sec icon="📅" title="Dates, Result & Inspector">
                <div className="ip-grid">
                  <div>
                    <label style={LS}>Result</label>
                    <select value={form.result} onChange={e=>setForm(p=>({...p,result:e.target.value}))} style={IS}>
                      <option value="PASS">PASS</option>
                      <option value="FAIL">FAIL</option>
                      <option value="REPAIR_REQUIRED">REPAIR REQUIRED</option>
                      <option value="OUT_OF_SERVICE">OUT OF SERVICE</option>
                    </select>
                  </div>
                  <div>
                    <label style={LS}>Issue Date</label>
                    <input type="date" value={form.issue_date} onChange={e=>setForm(p=>({...p,issue_date:e.target.value}))} style={IS}/>
                  </div>
                  <div>
                    <label style={LS}>Expiry Date</label>
                    <input type="date" value={form.expiry_date} onChange={e=>setForm(p=>({...p,expiry_date:e.target.value}))} style={IS}/>
                  </div>
                  <F label="Inspector Name" value={form.inspector_name} onChange={sf("inspector_name")}/>
                  <F label="Inspector ID"   value={form.inspector_id}   onChange={sf("inspector_id")} mono/>
                  <F label="Legal Framework" value={form.legal_framework} onChange={sf("legal_framework")}/>
                </div>
                <div style={{marginTop:12}}>
                  <label style={LS}>Remarks</label>
                  <textarea value={form.remarks} onChange={e=>setForm(p=>({...p,remarks:e.target.value}))} rows={3}
                    style={{...IS,resize:"vertical"}}/>
                </div>
              </Sec>

              {/* SAVE */}
              <div style={{display:"flex",gap:10,flexWrap:"wrap",paddingBottom:8}}>
                <button type="button" onClick={handleSave} disabled={saving}
                  style={{padding:"12px 28px",borderRadius:12,border:"none",
                    background:saving?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#34d399,#14b8a6)",
                    color:saving?"rgba(240,246,255,0.4)":"#052e16",
                    fontWeight:900,fontSize:14,cursor:saving?"not-allowed":"pointer",
                    fontFamily:"'IBM Plex Sans',sans-serif",
                    WebkitTapHighlightColor:"transparent",minHeight:44}}>
                  {saving?"Saving…":"✓ Save Certificate"}
                </button>
                <button type="button" onClick={()=>{setExtracted(null);setFile(null);setPreview("");setSuccess("");setError("");}}
                  style={{padding:"12px 18px",borderRadius:12,border:`1px solid ${T.border}`,background:T.card,
                    color:T.textMid,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                  Reset
                </button>
              </div>
            </>
          )}

          {!extracted&&!scanning&&(
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:14,padding:"36px 20px",textAlign:"center"}}>
              <div style={{fontSize:28,opacity:.3,marginBottom:10}}>🤖</div>
              <div style={{fontSize:14,fontWeight:700,color:T.textMid,marginBottom:4}}>Upload a certificate PDF or image</div>
              <div style={{fontSize:12,color:T.textDim}}>Gemini will extract all visible fields. Supports PDF, JPEG, PNG and WebP.</div>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}

export default function CertificateImportPage() {
  return (
    <Suspense fallback={
      <div style={{minHeight:"100vh",background:"#070e18",display:"flex",alignItems:"center",justifyContent:"center",
        color:"rgba(240,246,255,0.4)",fontSize:14,fontFamily:"'IBM Plex Sans',sans-serif"}}>
        Loading…
      </div>
    }>
      <ImportInner/>
    </Suspense>
  );
}
