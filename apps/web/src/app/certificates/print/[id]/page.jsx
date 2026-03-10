"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";

function row(label, value) {
  if (!value || value === "N/A") return null;

  return (
    <div style={{display:"flex",marginBottom:6}}>
      <div style={{width:170,fontWeight:600}}>{label}</div>
      <div>{value}</div>
    </div>
  );
}

function formatDate(v){
  if(!v) return "";
  const d=new Date(v);
  if(Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-GB");
}

export default function CertificatePrintPage(){

  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const printRef = useRef();

  const [loading,setLoading]=useState(true);
  const [certificate,setCertificate]=useState(null);
  const [asset,setAsset]=useState(null);

  const [equipmentType,setEquipmentType]=useState("lifting");
  const [status,setStatus]=useState("PASS");
  const [inspectorName,setInspectorName]=useState("");

  const [signature,setSignature]=useState("");

  useEffect(()=>{
    async function load(){

      const {data,error} = await supabase
        .from("certificates")
        .select(`
          *,
          assets(*)
        `)
        .eq("id",id)
        .single();

      if(!error && data){
        setCertificate(data);
        setAsset(data.assets || null);
        setInspectorName(data.inspector_name || "");
        setStatus((data.equipment_status || "PASS").toUpperCase());
      }

      setLoading(false);
    }

    if(id) load();

  },[id]);

  function handleSignatureUpload(e){
    const file=e.target.files?.[0];
    if(!file) return;

    const reader=new FileReader();
    reader.onload=(ev)=>{
      setSignature(ev.target.result);
    };
    reader.readAsDataURL(file);
  }

  function print(){
    window.print();
  }

  if(loading){
    return (
      <AppLayout title="Certificate">
        <div style={{padding:40,color:"#fff"}}>Loading certificate...</div>
      </AppLayout>
    );
  }

  const verifyURL =
    typeof window !== "undefined"
      ? `${window.location.origin}/certificates/${certificate.id}`
      : "";

  const qr =
    "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=" +
    encodeURIComponent(verifyURL);

  return (
    <AppLayout title="Certificate">

<style jsx global>{`

@media print{
  body *{visibility:hidden}
  .printArea,.printArea *{visibility:visible}
  .printArea{position:absolute;left:0;top:0;width:100%}
}

`}</style>

<div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>

<div style={{marginBottom:20}}>

<button onClick={()=>router.back()} style={{marginRight:10}}>
Back
</button>

<button onClick={print}>
Print / Save PDF
</button>

</div>

<div ref={printRef} className="printArea"
style={{
width:750,
background:"#fff",
color:"#000",
padding:30,
fontFamily:"Arial"
}}>

{/* HEADER */}

<div style={{display:"flex",justifyContent:"space-between"}}>

<div>
<div style={{fontSize:22,fontWeight:900}}>
MONROY (PTY) LTD
</div>

<div style={{fontSize:12}}>
Process Control Solutions
</div>

<div style={{fontSize:11,marginTop:6}}>
Mophane Avenue, Plot 5180 Mathiba Street
</div>

<div style={{fontSize:11}}>
Tel: +267 7790646 / 71450610
</div>

</div>

<img src="/monroy-logo.png" style={{height:90}} />

</div>

{/* TITLE */}

<div style={{
textAlign:"center",
fontSize:18,
fontWeight:900,
marginTop:10,
marginBottom:15
}}>
{certificate.certificate_type || "Inspection Certificate"}
</div>

{/* CERTIFICATE DETAILS */}

<div style={{marginBottom:16}}>

{row("Certificate Number:",certificate.certificate_number)}
{row("Company:",certificate.company)}
{row("Issue Date:",formatDate(certificate.issued_at))}
{row("Expiry Date:",formatDate(certificate.valid_to))}

</div>

{/* EQUIPMENT IDENTIFICATION */}

<div style={{border:"1px solid #999",marginBottom:12}}>

<div style={{background:"#ddd",padding:6,fontWeight:700}}>
Equipment Identification
</div>

<div style={{padding:10}}>

<div style={{marginBottom:10}}>
<label>Equipment Type</label>
<select
value={equipmentType}
onChange={e=>setEquipmentType(e.target.value)}
style={{marginLeft:10}}
>
<option value="lifting">Lifting Equipment</option>
<option value="pressure">Pressure Vessel</option>
</select>
</div>

{row("Equipment Tag:",asset?.asset_tag)}
{row("Equipment Name:",asset?.asset_name)}
{row("Manufacturer:",asset?.manufacturer)}
{row("Serial Number:",asset?.serial_number)}
{row("Year Built:",asset?.year_built)}
{row("Location:",asset?.location)}

</div>
</div>

{/* NAMEPLATE */}

<div style={{border:"1px solid #999",marginBottom:12}}>

<div style={{background:"#ddd",padding:6,fontWeight:700}}>
Nameplate Data
</div>

<div style={{padding:10}}>

{row("SWL:",asset?.safe_working_load ? asset.safe_working_load+" Tons" : "")}
{row("Proof Load:",asset?.proof_load ? asset.proof_load+" Tons": "")}
{row("Lift Height:",asset?.lifting_height)}
{row("Sling Length:",asset?.sling_length)}

{row("Design Pressure:",asset?.design_pressure ? asset.design_pressure+" kPa": "")}
{row("Working Pressure:",asset?.working_pressure ? asset.working_pressure+" kPa": "")}
{row("Test Pressure:",asset?.test_pressure ? asset.test_pressure+" kPa": "")}

</div>
</div>

{/* COMPLIANCE */}

<div style={{border:"1px solid #999",marginBottom:12}}>

<div style={{background:"#ddd",padding:6,fontWeight:700}}>
Legal Compliance
</div>

<div style={{padding:10,fontSize:12,lineHeight:1.5}}>

This certificate confirms that the equipment listed above has been inspected
by a competent person in accordance with the statutory requirements of the

<b> Mines, Quarries, Works and Machinery Act Cap 44:02 </b>

and the applicable engineering inspection procedures.

The equipment must only be operated within the safe working limits indicated
on its nameplate and must be re-inspected periodically.

</div>
</div>

{/* INSPECTION RECORD */}

<div style={{border:"1px solid #999",marginBottom:12}}>

<div style={{background:"#ddd",padding:6,fontWeight:700}}>
Inspection Record
</div>

<div style={{padding:10}}>

<div style={{marginBottom:10}}>

<label>Inspection Result</label>

<select
value={status}
onChange={e=>setStatus(e.target.value)}
style={{marginLeft:10}}
>
<option>PASS</option>
<option>FAIL</option>
<option>CONDITIONAL</option>
</select>

</div>

{row("Inspection Date:",formatDate(certificate.issued_at))}

</div>
</div>

{/* AUTHORIZATION */}

<div style={{border:"1px solid #999",marginBottom:12}}>

<div style={{background:"#ddd",padding:6,fontWeight:700}}>
Authorized Inspection Body
</div>

<div style={{padding:10}}>

<div style={{marginBottom:8}}>

<label>Inspector Name</label>

<input
value={inspectorName}
onChange={e=>setInspectorName(e.target.value)}
style={{marginLeft:10}}
/>

</div>

<div style={{marginBottom:10}}>

<label>Upload Signature</label>

<input
type="file"
accept="image/*"
onChange={handleSignatureUpload}
style={{marginLeft:10}}
/>

</div>

{signature && (
<img src={signature} style={{height:60}}/>
)}

<div style={{marginTop:10}}>
Date Issued: {formatDate(certificate.issued_at)}
</div>

</div>
</div>

{/* QR */}

<div style={{display:"flex",justifyContent:"center"}}>

<div style={{textAlign:"center"}}>

<img src={qr} width="100"/>

<div style={{fontSize:10}}>
Scan to Verify Certificate
</div>

</div>

</div>

</div>
</div>
</AppLayout>
);
}
