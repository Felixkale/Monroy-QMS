"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  background: "#111827",
  border: "1px solid rgba(102,126,234,0.25)",
  borderRadius: 8,
  color: "#e2e8f0",
  fontSize: 13,
};

const labelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: "rgba(255,255,255,0.6)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 6,
  display: "block",
};

export default function EditEquipmentPage() {

  const params = useParams();
  const router = useRouter();
  const tag = params?.tag;

  const [loading,setLoading] = useState(true);

  const [form,setForm] = useState({
    asset_name:"",
    asset_tag:"",
    asset_type:"",
    manufacturer:"",
    model:"",
    serial_number:"",
    safe_working_load:"",
    location:"",
    inspector_name:"",
    inspector_signature_url:""
  });

  useEffect(()=>{
    loadEquipment();
  },[]);

  async function loadEquipment(){

    const {data} = await supabase
    .from("assets")
    .select("*")
    .eq("asset_tag",tag)
    .single();

    if(data){
      setForm(data);
    }

    setLoading(false);
  }

  function handleChange(e){
    const {name,value}=e.target;
    setForm(prev=>({...prev,[name]:value}));
  }

  async function handleSignatureUpload(e){

    const file=e.target.files?.[0];
    if(!file) return;

    const ext=file.name.split(".").pop();
    const fileName=`signature-${Date.now()}.${ext}`;

    const {error}=await supabase.storage
    .from("documents")
    .upload(`signatures/${fileName}`,file);

    if(error){
      alert(error.message);
      return;
    }

    const {data}=supabase.storage
    .from("documents")
    .getPublicUrl(`signatures/${fileName}`);

    setForm(prev=>({
      ...prev,
      inspector_signature_url:data.publicUrl
    }));
  }

  async function handleSubmit(e){

    e.preventDefault();

    await supabase
    .from("assets")
    .update(form)
    .eq("asset_tag",tag);

    router.push(`/equipment/${tag}`);
  }

  if(loading){
    return <AppLayout title="Edit Equipment">
      <div style={{padding:20,color:"#fff"}}>Loading...</div>
    </AppLayout>
  }

  return (
    <AppLayout title="Edit Equipment">

      <div style={{maxWidth:900,margin:"0 auto"}}>

        <h1 style={{color:"#fff"}}>Edit Equipment</h1>

        <form onSubmit={handleSubmit} style={{marginTop:20}}>

          <label style={labelStyle}>Asset Name</label>
          <input style={inputStyle} name="asset_name" value={form.asset_name||""} onChange={handleChange}/>

          <label style={labelStyle}>Asset Tag</label>
          <input style={inputStyle} name="asset_tag" value={form.asset_tag||""} onChange={handleChange}/>

          <label style={labelStyle}>Equipment Type</label>
          <input style={inputStyle} name="asset_type" value={form.asset_type||""} onChange={handleChange}/>

          <label style={labelStyle}>Manufacturer</label>
          <input style={inputStyle} name="manufacturer" value={form.manufacturer||""} onChange={handleChange}/>

          <label style={labelStyle}>Model</label>
          <input style={inputStyle} name="model" value={form.model||""} onChange={handleChange}/>

          <label style={labelStyle}>Serial Number</label>
          <input style={inputStyle} name="serial_number" value={form.serial_number||""} onChange={handleChange}/>

          <label style={labelStyle}>SWL (Tons)</label>
          <input style={inputStyle} name="safe_working_load" value={form.safe_working_load||""} onChange={handleChange}/>

          <label style={labelStyle}>Location</label>
          <input style={inputStyle} name="location" value={form.location||""} onChange={handleChange}/>

          <h3 style={{color:"#4fc3f7",marginTop:30}}>Inspector</h3>

          <label style={labelStyle}>Inspector Name</label>
          <input
            style={inputStyle}
            name="inspector_name"
            value={form.inspector_name||""}
            onChange={handleChange}
          />

          <label style={labelStyle}>Upload Signature</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleSignatureUpload}
            style={inputStyle}
          />

          {form.inspector_signature_url && (
            <img
              src={form.inspector_signature_url}
              style={{height:80,marginTop:10}}
            />
          )}

          <button
            type="submit"
            style={{
              marginTop:30,
              padding:"12px 20px",
              borderRadius:8,
              border:"none",
              background:"#2563eb",
              color:"#fff",
              fontWeight:700
            }}
          >
            Save Equipment
          </button>

        </form>

      </div>

    </AppLayout>
  );
}
