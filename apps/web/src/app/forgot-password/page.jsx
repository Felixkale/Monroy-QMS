// src/app/forgot-password/page.jsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const T = {
  bg:"#060d1a", card:"rgba(10,18,32,0.95)", border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff", textDim:"rgba(240,246,255,0.45)",
  accent:"#22d3ee", accentDim:"rgba(34,211,238,0.10)", accentBrd:"rgba(34,211,238,0.30)",
  red:"#f87171", redDim:"rgba(248,113,113,0.10)", redBrd:"rgba(248,113,113,0.30)",
  green:"#34d399", greenDim:"rgba(52,211,153,0.10)", greenBrd:"rgba(52,211,153,0.30)",
};

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) { setError("Please enter your email address."); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (err) { setError(err.message); }
    else { setSent(true); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:16, fontFamily:"'IBM Plex Sans',sans-serif" }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{background:${T.bg}}
        .fi{width:100%;padding:12px 14px;border-radius:10px;border:1px solid rgba(148,163,184,0.15);background:rgba(15,25,45,0.80);color:${T.text};font-size:14px;font-family:'IBM Plex Sans',sans-serif;outline:none;transition:border-color .2s}
        .fi:focus{border-color:${T.accent}}
        .fi::placeholder{color:${T.textDim}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div style={{width:"100%",maxWidth:400,position:"relative",zIndex:1}}>

        <div style={{textAlign:"center",marginBottom:24}}>
          <a href="/login" style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:T.textDim,textDecoration:"none",marginBottom:20}}>← Back to sign in</a>
          <div style={{width:52,height:52,borderRadius:16,background:"rgba(34,211,238,0.12)",border:"1px solid rgba(34,211,238,0.25)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",fontSize:22}}>🔑</div>
          <div style={{fontSize:20,fontWeight:900,color:T.text,marginBottom:6}}>Reset your password</div>
          <div style={{fontSize:13,color:T.textDim,lineHeight:1.6}}>Enter your email and we'll send you a link to reset your password.</div>
        </div>

        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:18,padding:"24px 22px",backdropFilter:"blur(24px)",boxShadow:"0 24px 64px rgba(0,0,0,0.5)"}}>

          {sent ? (
            <div style={{textAlign:"center",padding:"8px 0"}}>
              <div style={{fontSize:36,marginBottom:14}}>📬</div>
              <div style={{fontSize:15,fontWeight:800,color:T.green,marginBottom:8}}>Check your inbox!</div>
              <div style={{fontSize:13,color:T.textDim,lineHeight:1.7,marginBottom:20}}>
                A password reset link has been sent to <strong style={{color:T.text}}>{email}</strong>.<br/>
                The link expires in 1 hour. Check your spam folder if you don't see it.
              </div>
              <a href="/login" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"11px 24px",borderRadius:10,background:"linear-gradient(135deg,#22d3ee,#0891b2)",color:"#052e16",fontWeight:900,fontSize:13,textDecoration:"none"}}>
                ← Back to Sign In
              </a>
            </div>
          ) : (
            <>
              {error&&(
                <div style={{padding:"10px 13px",borderRadius:9,background:T.redDim,border:`1px solid ${T.redBrd}`,color:T.red,fontSize:12,fontWeight:600,marginBottom:16}}>⚠ {error}</div>
              )}
              <form onSubmit={handleSubmit} style={{display:"grid",gap:16}}>
                <div>
                  <label style={{display:"block",fontSize:11,fontWeight:700,color:T.textDim,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:7}}>Email address</label>
                  <input className="fi" type="email" placeholder="you@monroy.co.bw" value={email} onChange={e=>{setEmail(e.target.value);setError("");}} autoComplete="email" required/>
                </div>
                <button type="submit" disabled={loading} style={{padding:"13px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#22d3ee,#0891b2)",color:"#052e16",fontWeight:900,fontSize:14,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:loading?.6:1}}>
                  {loading?<span style={{display:"inline-block",width:16,height:16,border:"2px solid rgba(5,46,22,0.3)",borderTopColor:"#052e16",borderRadius:"50%",animation:"spin .6s linear infinite"}}/>:null}
                  {loading?"Sending…":"Send Reset Link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
