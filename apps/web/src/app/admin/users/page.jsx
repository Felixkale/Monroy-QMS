// src/app/admin/users/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
};

const IS = {width:"100%",padding:"10px 12px",borderRadius:9,border:"1px solid rgba(148,163,184,0.12)",background:"rgba(18,30,50,0.70)",color:T.text,fontSize:13,fontFamily:"'IBM Plex Sans',sans-serif",outline:"none",minHeight:40};
const LS = {fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:T.textDim,display:"block",marginBottom:6};

const ROLES = [
  { value:"admin",    label:"Admin",    desc:"Full access — clients, equipment, certificates, users", color:T.accent },
  { value:"inspector",label:"Inspector",desc:"Can create and edit certificates, NCRs, CAPAs",          color:T.green  },
  { value:"viewer",   label:"Viewer",   desc:"Read-only — can view and print certificates",            color:T.textMid},
];

function roleBadge(role) {
  const r = ROLES.find(x=>x.value===role)||ROLES[2];
  const bg = role==="admin"?T.accentDim:role==="inspector"?T.greenDim:T.card;
  const brd= role==="admin"?T.accentBrd:role==="inspector"?T.greenBrd:T.border;
  return(
    <span style={{padding:"3px 9px",borderRadius:99,background:bg,border:`1px solid ${brd}`,color:r.color,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.06em"}}>
      {role||"viewer"}
    </span>
  );
}

function avatar(name,email) {
  const n=(name||email||"U").trim();
  return n.charAt(0).toUpperCase();
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState({ email:"", full_name:"", role:"inspector" });

  useEffect(()=>{ loadUsers(); },[]);

  async function loadUsers() {
    setLoading(true);
    const { data, error: e } = await supabase.from("users").select("*").order("created_at", { ascending: false });
    if (e) setError(e.message);
    else setUsers(data||[]);
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.email||!form.full_name) { setError("Name and email are required."); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      // Create auth user via admin API (requires service role — use API route)
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, full_name: form.full_name, role: form.role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to invite user.");
      // Show warning (partial success) or full success
      if (json.warning) {
        setSuccess(`✉ Invitation sent to ${form.email}. Warning: ${json.warning}`);
      } else {
        setSuccess(`✉ Invitation sent to ${form.email}. They will receive an email to set their password.`);
      }
      setForm({ email:"", full_name:"", role:"inspector" });
      setShowForm(false);
      await loadUsers();
    } catch(err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleRoleChange(userId, newRole) {
    const { error: e } = await supabase.from("users").update({ role: newRole }).eq("id", userId);
    if (e) setError(e.message);
    else { setSuccess("Role updated."); await loadUsers(); }
  }

  async function handleDeactivate(userId, currentStatus) {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    setDeleting(userId);
    const { error: e } = await supabase.from("users").update({ status: newStatus }).eq("id", userId);
    if (e) setError(e.message);
    else { setSuccess(`User ${newStatus === "active" ? "activated" : "deactivated"}.`); await loadUsers(); }
    setDeleting(null);
  }

  async function handleResendConfirmation(email) {
    const { error: e } = await supabase.auth.resend({ type: "signup", email });
    if (e) setError(e.message);
    else setSuccess(`Confirmation email resent to ${email}.`);
  }

  const hf = (k,v) => setForm(p=>({...p,[k]:v}));

  return (
    <AppLayout title="User Management">
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        input::placeholder{color:rgba(240,246,255,0.28)}
        select option{background:#0a1420;color:#f0f6ff}
        .usr-table{width:100%;border-collapse:collapse;font-size:13px}
        .usr-table th{padding:10px 14px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${T.textDim};border-bottom:1px solid ${T.border};white-space:nowrap}
        .usr-table td{padding:13px 14px;border-bottom:1px solid ${T.border};vertical-align:middle}
        .usr-table tr:last-child td{border-bottom:none}
        .usr-table tr:hover td{background:rgba(255,255,255,0.015)}
        .usr-row-inactive td{opacity:.5}
        @media(max-width:768px){.usr-table{display:none}.usr-cards{display:grid;gap:10px}}
        @media(min-width:769px){.usr-cards{display:none}}
      `}</style>

      <div style={{fontFamily:"'IBM Plex Sans',sans-serif",color:T.text,padding:20,maxWidth:1100,margin:"0 auto",display:"grid",gap:16}}>

        {/* Header */}
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:"16px 20px",backdropFilter:"blur(20px)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <button type="button" onClick={()=>router.push("/admin")}
                style={{padding:"8px 14px",borderRadius:9,border:`1px solid ${T.border}`,background:T.card,color:T.textMid,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",WebkitTapHighlightColor:"transparent",flexShrink:0}}>
                ← Admin
              </button>
              <div>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:T.accent,marginBottom:4}}>Admin · User Management</div>
                <h1 style={{margin:0,fontSize:20,fontWeight:900,letterSpacing:"-0.02em"}}>System Users</h1>
                <p style={{margin:"3px 0 0",color:T.textDim,fontSize:12}}>{users.length} registered user{users.length!==1?"s":""}</p>
              </div>
            </div>
            <button type="button" onClick={()=>{setShowForm(p=>!p);setError("");setSuccess("");}}
              style={{padding:"10px 18px",borderRadius:11,border:"none",background:showForm?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#22d3ee,#0891b2)",color:showForm?T.textMid:"#052e16",fontWeight:900,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
              {showForm?"✕ Cancel":"+ Invite User"}
            </button>
          </div>
        </div>

        {/* Feedback */}
        {error  &&<div style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${T.redBrd}`,  background:T.redDim,  color:T.red,  fontSize:12,fontWeight:600,lineHeight:1.8,wordBreak:"break-word"}}>⚠ {error}</div>}
        {success&&<div style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${T.greenBrd}`,background:T.greenDim,color:T.green,fontSize:13,fontWeight:700,lineHeight:1.6}}>✓ {success}</div>}

        {/* Create user form */}
        {showForm&&(
          <div style={{background:T.panel,border:`1px solid ${T.accentBrd}`,borderRadius:16,padding:20}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${T.border}`}}>
              <span style={{fontSize:14}}>👤</span>
              <div style={{fontSize:14,fontWeight:800,color:T.accent}}>Invite New User</div>
              <div style={{fontSize:11,color:T.textDim,marginLeft:"auto"}}>A confirmation email will be sent automatically</div>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:16}}>
                <div>
                  <label style={LS}>Full Name</label>
                  <input style={IS} value={form.full_name} onChange={e=>hf("full_name",e.target.value)} placeholder="e.g. Moemedi Masupe" required/>
                </div>
                <div>
                  <label style={LS}>Email Address</label>
                  <input style={IS} type="email" value={form.email} onChange={e=>hf("email",e.target.value)} placeholder="user@monroy.co.bw" required/>
                </div>

                <div>
                  <label style={LS}>Role</label>
                  <select style={IS} value={form.role} onChange={e=>hf("role",e.target.value)}>
                    {ROLES.map(r=><option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
                  </select>
                </div>
              </div>
              <div style={{background:T.accentDim,border:`1px solid ${T.accentBrd}`,borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:12,color:T.textMid,lineHeight:1.8}}>
                <strong style={{color:T.accent}}>📧 Invite flow:</strong> The user will receive an <strong style={{color:T.text}}>email invitation</strong> with a link to set their own password. They cannot log in until they click the link and create their password. Their email is added to the approved list automatically.
              </div>
              <button type="submit" disabled={saving} style={{padding:"11px 24px",borderRadius:10,border:"none",background:saving?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#34d399,#14b8a6)",color:saving?"rgba(240,246,255,0.4)":"#052e16",fontWeight:900,fontSize:13,cursor:saving?"not-allowed":"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                {saving?"Sending invitation…":"✉ Send Invitation"}
              </button>
            </form>
          </div>
        )}

        {/* Users table */}
        <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,overflow:"hidden"}}>
          {loading?(
            <div style={{padding:40,textAlign:"center",color:T.textDim,fontSize:13}}>Loading users…</div>
          ):users.length===0?(
            <div style={{padding:40,textAlign:"center",color:T.textDim,fontSize:13}}>No users yet. Click "Invite User" to add the first user.</div>
          ):(
            <>
              {/* Desktop table */}
              <div style={{overflowX:"auto"}}>
                <table className="usr-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u=>(
                      <tr key={u.id} className={u.status==="inactive"?"usr-row-inactive":""}>
                        <td>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <div style={{width:34,height:34,borderRadius:10,background:`linear-gradient(135deg,${T.accent},${T.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#052e16",flexShrink:0}}>
                              {avatar(u.full_name,u.email)}
                            </div>
                            <div>
                              <div style={{fontWeight:700,color:T.text,fontSize:13}}>{u.full_name||"—"}</div>
                              {u.id&&<div style={{fontSize:10,color:T.textDim,fontFamily:"'IBM Plex Mono',monospace"}}>{u.id.slice(0,8)}…</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{color:T.textMid,fontSize:12}}>{u.email}</td>
                        <td>
                          <select value={u.role||"viewer"} onChange={e=>handleRoleChange(u.id,e.target.value)}
                            style={{background:"transparent",border:"none",color:u.role==="admin"?T.accent:u.role==="inspector"?T.green:T.textMid,fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",outline:"none",padding:0}}>
                            {ROLES.map(r=><option key={r.value} value={r.value} style={{background:"#0a1420",color:"#f0f6ff"}}>{r.label}</option>)}
                          </select>
                        </td>
                        <td>
                          <span style={{padding:"3px 9px",borderRadius:99,fontSize:10,fontWeight:800,background:u.status==="active"?T.greenDim:T.redDim,color:u.status==="active"?T.green:T.red,border:`1px solid ${u.status==="active"?T.greenBrd:T.redBrd}`}}>
                            {u.status||"active"}
                          </span>
                        </td>
                        <td style={{color:T.textDim,fontSize:12}}>
                          {u.created_at?new Date(u.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—"}
                        </td>
                        <td>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            <button type="button" onClick={()=>handleResendConfirmation(u.email)}
                              style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${T.accentBrd}`,background:T.accentDim,color:T.accent,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                              Resend Email
                            </button>
                            <button type="button" onClick={()=>handleDeactivate(u.id,u.status)} disabled={deleting===u.id}
                              style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${u.status==="active"?T.redBrd:T.greenBrd}`,background:u.status==="active"?T.redDim:T.greenDim,color:u.status==="active"?T.red:T.green,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",opacity:deleting===u.id?.5:1}}>
                              {deleting===u.id?"…":u.status==="active"?"Deactivate":"Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="usr-cards" style={{padding:12}}>
                {users.map(u=>(
                  <div key={u.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:14,opacity:u.status==="inactive"?.5:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                      <div style={{width:40,height:40,borderRadius:12,background:`linear-gradient(135deg,${T.accent},${T.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#052e16",flexShrink:0}}>
                        {avatar(u.full_name,u.email)}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:700,color:T.text,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.full_name||"—"}</div>
                        <div style={{fontSize:11,color:T.textDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email}</div>
                      </div>
                      {roleBadge(u.role)}
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <button type="button" onClick={()=>handleResendConfirmation(u.email)}
                        style={{padding:"6px 10px",borderRadius:7,border:`1px solid ${T.accentBrd}`,background:T.accentDim,color:T.accent,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                        Resend Email
                      </button>
                      <button type="button" onClick={()=>handleDeactivate(u.id,u.status)}
                        style={{padding:"6px 10px",borderRadius:7,border:`1px solid ${u.status==="active"?T.redBrd:T.greenBrd}`,background:u.status==="active"?T.redDim:T.greenDim,color:u.status==="active"?T.red:T.green,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                        {u.status==="active"?"Deactivate":"Activate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
