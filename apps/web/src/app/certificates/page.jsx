"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import { getClientById } from "@/services/clients";

const C = {
  green:"#00f5c4",
  purple:"#7c5cfc",
  blue:"#4fc3f7",
  yellow:"#fbbf24",
  red:"#ef4444"
};

function normalizeStatus(cert){

  const raw = cert?.equipment_status || cert?.status || "";
  const v = String(raw).toLowerCase();

  if(v.includes("fail")) return "fail";
  if(v.includes("conditional")) return "conditional";
  if(v.includes("pass")) return "pass";

  return "unknown";
}

function getStatusMeta(cert){

  const st = normalizeStatus(cert);

  if(st==="pass"){
    return {label:"PASS",color:C.green,bg:"rgba(0,245,196,0.1)",border:"rgba(0,245,196,0.25)"};
  }

  if(st==="fail"){
    return {label:"FAIL",color:C.red,bg:"rgba(239,68,68,0.1)",border:"rgba(239,68,68,0.25)"};
  }

  if(st==="conditional"){
    return {label:"CONDITIONAL",color:C.yellow,bg:"rgba(251,191,36,0.1)",border:"rgba(251,191,36,0.25)"};
  }

  return {label:"UNKNOWN",color:"#cbd5e1",bg:"rgba(255,255,255,0.05)",border:"rgba(255,255,255,0.1)"};

}

function formatDate(v){

  if(!v) return "—";

  const d = new Date(v);

  if(isNaN(d.getTime())) return v;

  return d.toLocaleDateString("en-GB",{
    day:"2-digit",
    month:"short",
    year:"numeric"
  });

}

function Th({children}){
  return (
    <th style={{
      textAlign:"left",
      padding:"14px",
      color:"#94a3b8",
      fontSize:11,
      fontWeight:800,
      textTransform:"uppercase"
    }}>
      {children}
    </th>
  );
}

function Td({children,strong}){
  return (
    <td style={{
      padding:"14px",
      color: strong ? "#fff" : "#cbd5e1",
      fontWeight: strong ? 800 : 500
    }}>
      {children}
    </td>
  );
}

function CertificatesPageInner(){

  const searchParams = useSearchParams();
  const clientId = searchParams.get("client");

  const [certificates,setCertificates] = useState([]);
  const [client,setClient] = useState(null);
  const [loading,setLoading] = useState(true);

  const [search,setSearch] = useState("");
  const [statusFilter,setStatusFilter] = useState("all");

  useEffect(()=>{

    async function load(){

      setLoading(true);

      let certs=[];

      if(clientId){

        const {data:clientData}=await getClientById(clientId);
        setClient(clientData);

        const {data:assets}=await supabase
        .from("assets")
        .select("id")
        .eq("client_id",clientId);

        const assetIds=(assets||[]).map(a=>a.id);

        if(assetIds.length>0){

          const {data}=await supabase
          .from("certificates")
          .select("*")
          .in("asset_id",assetIds)
          .order("created_at",{ascending:false});

          certs=data||[];
        }

      }else{

        const {data}=await supabase
        .from("certificates")
        .select("*")
        .order("created_at",{ascending:false});

        certs=data||[];

      }

      setCertificates(certs);
      setLoading(false);

    }

    load();

  },[clientId]);

  const filtered=useMemo(()=>{

    return certificates.filter(cert=>{

      const q=search.toLowerCase();

      const matchSearch=
        !q ||
        (cert.certificate_number||"").toLowerCase().includes(q) ||
        (cert.company||"").toLowerCase().includes(q) ||
        (cert.equipment_id||"").toLowerCase().includes(q);

      const matchStatus=
        statusFilter==="all" || normalizeStatus(cert)===statusFilter;

      return matchSearch && matchStatus;

    });

  },[certificates,search,statusFilter]);

  return (

    <AppLayout title="Certificates">

      <div style={{display:"flex",gap:10,marginBottom:20}}>

        <input
        placeholder="Search certificate..."
        value={search}
        onChange={e=>setSearch(e.target.value)}
        style={{
          padding:"10px",
          borderRadius:8,
          border:"1px solid #333",
          background:"#111",
          color:"#fff"
        }}
        />

        <select
        value={statusFilter}
        onChange={e=>setStatusFilter(e.target.value)}
        style={{
          padding:"10px",
          borderRadius:8,
          background:"#111",
          color:"#fff"
        }}
        >
          <option value="all">All</option>
          <option value="pass">Pass</option>
          <option value="conditional">Conditional</option>
          <option value="fail">Fail</option>
        </select>

      </div>

      <div style={{
        background:"#111",
        borderRadius:14,
        overflow:"hidden"
      }}>

        {loading ? (

          <div style={{padding:40,textAlign:"center"}}>
            Loading certificates...
          </div>

        ) : (

          <table style={{width:"100%",borderCollapse:"collapse"}}>

            <thead>

              <tr>

                <Th>Certificate</Th>
                <Th>Client</Th>
                <Th>Equipment</Th>
                <Th>Issued</Th>
                <Th>Valid</Th>
                <Th>Status</Th>
                <Th>Action</Th>

              </tr>

            </thead>

            <tbody>

              {filtered.map(cert=>{

                const status=getStatusMeta(cert);

                return (

                  <tr key={cert.id} style={{borderTop:"1px solid #222"}}>

                    <Td strong>{cert.certificate_number}</Td>

                    <Td>{cert.company}</Td>

                    <Td>{cert.equipment_description}</Td>

                    <Td>{formatDate(cert.issued_at)}</Td>

                    <Td>{formatDate(cert.valid_to)}</Td>

                    <Td>

                      <span style={{
                        padding:"5px 10px",
                        borderRadius:999,
                        color:status.color,
                        border:`1px solid ${status.border}`,
                        background:status.bg
                      }}>
                        {status.label}
                      </span>

                    </Td>

                    <Td>

                      <a
                      href={`/certificates/${cert.id}`}
                      style={{
                        padding:"6px 12px",
                        borderRadius:8,
                        background:"rgba(79,195,247,0.1)",
                        color:C.blue,
                        textDecoration:"none"
                      }}>
                        Open
                      </a>

                    </Td>

                  </tr>

                );

              })}

            </tbody>

          </table>

        )}

      </div>

    </AppLayout>

  );

}

export default function CertificatesPage(){

  return(

    <Suspense fallback={<div>Loading...</div>}>
      <CertificatesPageInner/>
    </Suspense>

  );

}
