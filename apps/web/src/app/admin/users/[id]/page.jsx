// src/app/admin/users/[id]/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const T = {
  bg:"#070e18", surface:"rgba(13,22,38,0.80)", panel:"rgba(10,18,32,0.92)",
  card:"rgba(255,255,255,0.025)", border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff", textMid:"rgba(240,246,255,0.72)", textDim:"rgba(240,246,255,0.40)",
  accent:"#22d3ee", accentDim:"rgba(34,211,238,0.10)", accentBrd:"rgba(34,211,238,0.25)",
  green:"#34d399", greenDim:"rgba(52,211,153,0.10)", greenBrd:"rgba(52,211,153,0.25)",
  red:"#f87171",   redDim:"rgba(248,113,113,0.10)",   redBrd:"rgba(248,113,113,0.25)",
  amber:"#fbbf24", amberDim:"rgba(251,191,36,0.10)",  amberBrd:"rgba(251,191,36,0.25)",
  purple:"#a78bfa",purpleDim:"rgba(167,139,250,0.10)",purpleBrd:"rgba(167,139,250,0.25)",
  blue:"#60a5fa",  blueDim:"rgba(96,165,250,0.10)",   blueBrd:"rgba(96,165,250,0.25)",
};

const IS = {width:"100%",padding:"10px 12px",borderRadius:9,border:`1px solid ${T.border}`,background:"rgba(18,30,50,0.70)",color:T.text,fontSize:13,fontFamily:"'IBM Plex Sans',sans-serif",outline:"none",minHeight:40,WebkitAppearance:"none",appearance:"none"};
const LS = {fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:T.textDim,display:"block",marginBottom:6};

const ROLES = ["admin","inspector","viewer"];

function roleColor(r){
  if(r==="admin")    return{color:T.accent, bg:T.accentDim, brd:T.accentBrd};
  if(r==="inspector")return{color:T.green,  bg:T.greenDim,  brd:T.greenBrd};
  return{color:T.textMid,bg:T.card,brd:T.border};
}

function avatar(name,email){
  const n=(name||email||"U").trim();
  return n.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)||"U";
}

export default function UserProfilePage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = Array.isArray(params?.id)?params.id[0]:params?.id;

  const [profile,   setProfile]   = useState(null);
  const [certs,     setCerts]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");
  const [editRole,  setEditRole]  = useState("inspector");
  const [editStatus,setEditStatus]= useState("active");

  useEffect(()=>{if(id)load();},[id]);

  async function load(){
    setLoading(true);setError("");
    const{data,error:e}=await supabase.from("users").select("*").eq("id",id).maybeSingle();
    if(e||!data){setError("User not found.");setLoading(false);return;}
    setProfile(data);
    setEditRole(data.role||"inspector");
    setEditStatus(data.status||"active");

    // Load recent certificates by this inspector
    if(data.full_name){
      const{data:certsData}=await supabase.from("certificates")
        .select("id,certificate_number,equipment_description,equipment_type,result,issue_date,expiry_date,client_name")
        .eq("inspector_name",data.full_name)
        .order("issue_date",{ascending:false})
        .limit(8);
      setCerts(certsData||[]);
    }
    setLoading(false);
  }

  async function handleSave(){
    setSaving(true);setError("");setSuccess("");
    const{error:e}=await supabase.from("users").update({role:editRole,status:editStatus}).eq("id",id);
    setSaving(false);
    if(e){setError("Save failed: "+e.message);}
    else{
      setProfile(p=>({...p,role:editRole,status:editStatus}));
      setSuccess("User updated successfully.");
      setTimeout(()=>setSuccess(""),3000);
    }
  }

  async function handleResendInvite(){
    if(!profile?.email)return;
    const{error:e}=await supabase.auth.resend({type:"signup",email:profile.email});
    if(e)setError(e.message);
    else setSuccess(`Invitation resent to ${profile.email}.`);
  }

  const rc = roleColor(profile?.role);
  const av = avatar(profile?.full_name, profile?.email);

  return(
    <AppLayout title="User Profile">
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        select option{background:#0a1420;color:#f0f6ff}
        input::placeholder{color:rgba(240,246,255,0.28)}
        .cert-row{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid ${T.border};flex-wrap:wrap}
        .cert-row:last-child{border-bottom:none}
        @media(max-width:768px){.prof-grid{grid-template-columns:1fr!important}}
      `}</style>

      <div style={{fontFamily:"'IBM Plex Sans',sans-serif",color:T.text,padding:20,maxWidth:1000,margin:"0 auto",display:"grid",gap:16}}>

        {/* Header */}
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:"16px 20px",backdropFilter:"blur(20px)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <button type="button" onClick={()=>router.push("/admin/users")}
              style={{padding:"8px 14px",borderRadius:9,border:`1px solid ${T.border}`,background:T.card,color:T.textMid,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",flexShrink:0,WebkitTapHighlightColor:"transparent"}}>
              ← Back
            </button>
            <div>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent,marginBottom:4}}>Admin · User Profile</div>
              <h1 style={{margin:0,fontSize:20,fontWeight:900,letterSpacing:"-0.02em"}}>
                {loading?"Loading…":profile?.full_name||profile?.email||"User"}
              </h1>
            </div>
          </div>
          {!loading&&profile&&(
            <button type="button" onClick={handleResendInvite}
              style={{padding:"9px 16px",borderRadius:10,border:`1px solid ${T.accentBrd}`,background:T.accentDim,color:T.accent,fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>
              ✉ Resend Invite
            </button>
          )}
        </div>

        {/* Feedback */}
        {error  &&<div style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${T.redBrd}`,  background:T.redDim,  color:T.red,  fontSize:13,fontWeight:700}}>⚠ {error}</div>}
        {success&&<div style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${T.greenBrd}`,background:T.greenDim,color:T.green,fontSize:13,fontWeight:700}}>✓ {success}</div>}

        {loading?(
          <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,padding:40,textAlign:"center",color:T.textDim,fontSize:13}}>Loading profile…</div>
        ):!profile?(
          <div style={{background:T.redDim,border:`1px solid ${T.redBrd}`,borderRadius:16,padding:20,color:T.red,fontSize:14,fontWeight:700}}>⚠ User not found.</div>
        ):(
          <>
            {/* Profile card */}
            <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,padding:20}}>
              <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,paddingBottom:16,borderBottom:`1px solid ${T.border}`,flexWrap:"wrap"}}>
                {/* Avatar */}
                <div style={{width:64,height:64,borderRadius:18,background:`linear-gradient(135deg,${T.accent},${T.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:900,color:"#052e16",flexShrink:0}}>
                  {av}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <h2 style={{margin:"0 0 4px",fontSize:20,fontWeight:900,color:T.text}}>{profile.full_name||"Unnamed User"}</h2>
                  <div style={{fontSize:13,color:T.textDim,marginBottom:6}}>{profile.email}</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <span style={{padding:"3px 10px",borderRadius:99,background:rc.bg,border:`1px solid ${rc.brd}`,color:rc.color,fontSize:11,fontWeight:800,textTransform:"uppercase"}}>
                      {profile.role||"viewer"}
                    </span>
                    <span style={{padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:800,
                      background:profile.status==="active"?T.greenDim:T.redDim,
                      border:`1px solid ${profile.status==="active"?T.greenBrd:T.redBrd}`,
                      color:profile.status==="active"?T.green:T.red}}>
                      {profile.status||"active"}
                    </span>
                  </div>
                </div>
                {/* Stats */}
                <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                  <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 16px",textAlign:"center"}}>
                    <div style={{fontSize:22,fontWeight:900,color:T.accent}}>{certs.length}</div>
                    <div style={{fontSize:10,color:T.textDim,textTransform:"uppercase",letterSpacing:"0.06em",marginTop:2}}>Certificates</div>
                  </div>
                  <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 16px",textAlign:"center"}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.textMid}}>
                      {profile.created_at?new Date(profile.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—"}
                    </div>
                    <div style={{fontSize:10,color:T.textDim,textTransform:"uppercase",letterSpacing:"0.06em",marginTop:2}}>Joined</div>
                  </div>
                </div>
              </div>

              {/* Two-col grid */}
              <div className="prof-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>

                {/* Edit role/status */}
                <div style={{background:T.card,border:`1px solid ${T.purpleBrd}`,borderRadius:12,padding:16}}>
                  <div style={{fontSize:13,fontWeight:800,color:T.purple,marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
                    <span>⚙️</span> Edit User
                  </div>
                  <div style={{display:"grid",gap:12,marginBottom:14}}>
                    <div>
                      <label style={LS}>Role</label>
                      <select style={IS} value={editRole} onChange={e=>setEditRole(e.target.value)}>
                        {ROLES.map(r=><option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LS}>Status</label>
                      <select style={IS} value={editStatus} onChange={e=>setEditStatus(e.target.value)}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <button type="button" onClick={handleSave} disabled={saving}
                    style={{width:"100%",padding:"11px",borderRadius:9,border:"none",background:saving?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#a78bfa,#7c3aed)",color:"#fff",fontWeight:900,fontSize:13,cursor:saving?"not-allowed":"pointer",fontFamily:"'IBM Plex Sans',sans-serif",opacity:saving?.6:1}}>
                    {saving?"Saving…":"Save Changes"}
                  </button>
                </div>

                {/* User info */}
                <div style={{background:T.card,border:`1px solid ${T.accentBrd}`,borderRadius:12,padding:16}}>
                  <div style={{fontSize:13,fontWeight:800,color:T.accent,marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
                    <span>👤</span> Account Info
                  </div>
                  {[
                    {label:"Email",       value:profile.email},
                    {label:"Full Name",   value:profile.full_name},
                    {label:"Role",        value:(profile.role||"viewer").charAt(0).toUpperCase()+(profile.role||"viewer").slice(1)},
                    {label:"Status",      value:profile.status||"active"},
                    {label:"Joined",      value:profile.created_at?new Date(profile.created_at).toLocaleDateString("en-GB"):"—"},
                  ].map(f=>(
                    <div key={f.label} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"9px 0",borderBottom:`1px solid ${T.border}`,fontSize:12}}>
                      <span style={{color:T.textDim,flexShrink:0}}>{f.label}</span>
                      <span style={{color:T.text,fontWeight:600,textAlign:"right",wordBreak:"break-all"}}>{f.value||"—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent certificates */}
            {certs.length>0&&(
              <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,padding:20}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                  <div style={{width:4,height:18,borderRadius:2,background:`linear-gradient(to bottom,${T.green},rgba(52,211,153,0.3))`}}/>
                  <div style={{fontSize:14,fontWeight:800}}>Recent Certificates Issued</div>
                  <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:99,background:T.greenDim,color:T.green,border:`1px solid ${T.greenBrd}`}}>{certs.length}</span>
                </div>
                <div>
                  {certs.map(cert=>(
                    <div key={cert.id} className="cert-row">
                      <div style={{width:7,height:7,borderRadius:"50%",background:cert.result==="PASS"?T.green:T.red,flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:800,color:T.accent,fontFamily:"'IBM Plex Mono',monospace"}}>{cert.certificate_number||"—"}</div>
                        <div style={{fontSize:11,color:T.textDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cert.equipment_description||cert.equipment_type||"—"} · {cert.client_name||"—"}</div>
                      </div>
                      <div style={{fontSize:11,color:T.textDim,flexShrink:0}}>
                        {cert.issue_date?new Date(cert.issue_date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—"}
                      </div>
                      <span style={{padding:"2px 8px",borderRadius:99,fontSize:10,fontWeight:800,
                        background:cert.result==="PASS"?T.greenDim:T.redDim,
                        color:cert.result==="PASS"?T.green:T.red,
                        border:`1px solid ${cert.result==="PASS"?T.greenBrd:T.redBrd}`}}>
                        {cert.result||"PASS"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
