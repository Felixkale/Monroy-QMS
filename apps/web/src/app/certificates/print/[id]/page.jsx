"use client";

import { useEffect,useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function PrintCertificate(){

  const params=useParams();
  const id=params?.id;

  const [certificate,setCertificate]=useState(null);
  const [equipment,setEquipment]=useState(null);

  useEffect(()=>{
    loadData();
  },[]);

  async function loadData(){

    const {data}=await supabase
    .from("certificates")
    .select("*")
    .eq("id",id)
    .single();

    setCertificate(data);

    const {data:asset}=await supabase
    .from("assets")
    .select("*")
    .eq("id",data.asset_id)
    .single();

    setEquipment(asset);

    setTimeout(()=>window.print(),500);
  }

  if(!certificate || !equipment) return null;

  return (

    <div style={{padding:40,fontFamily:"serif"}}>

      <div style={{textAlign:"center",marginBottom:30}}>

        <img src="/logo.png" style={{height:70}}/>

        <h1 style={{color:"#4fc3f7"}}>
          CERTIFICATE OF STATUTORY INSPECTION
        </h1>

      </div>

      <h2 style={{color:"#4fc3f7"}}>
        Equipment Identification
      </h2>

      <table style={{width:"100%",borderCollapse:"collapse"}}>

        <tbody>

          <tr>
            <td>Equipment</td>
            <td>{equipment.asset_name}</td>
          </tr>

          <tr>
            <td>Asset Tag</td>
            <td>{equipment.asset_tag}</td>
          </tr>

          <tr>
            <td>Manufacturer</td>
            <td>{equipment.manufacturer}</td>
          </tr>

          <tr>
            <td>Model</td>
            <td>{equipment.model}</td>
          </tr>

          <tr>
            <td>Serial Number</td>
            <td>{equipment.serial_number}</td>
          </tr>

          <tr>
            <td>SWL</td>
            <td>{equipment.safe_working_load} Tons</td>
          </tr>

          <tr>
            <td>MAWP</td>
            <td>{certificate.mawp} kPa</td>
          </tr>

          <tr>
            <td>Location</td>
            <td>{equipment.location}</td>
          </tr>

        </tbody>

      </table>

      <h2 style={{marginTop:40,color:"#4fc3f7"}}>
        Inspection
      </h2>

      <table style={{width:"100%"}}>

        <tbody>

          <tr>
            <td>Inspection Date</td>
            <td>{certificate.issued_at?.slice(0,10)}</td>
          </tr>

          <tr>
            <td>Expiry</td>
            <td>{certificate.valid_to}</td>
          </tr>

        </tbody>

      </table>

      <div style={{marginTop:80}}>

        <img
          src={equipment.inspector_signature_url}
          style={{height:90}}
        />

        <div style={{marginTop:10,fontWeight:700}}>
          {equipment.inspector_name}
        </div>

        <div>Inspector</div>

      </div>

    </div>

  );
}
