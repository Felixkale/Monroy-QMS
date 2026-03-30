// src/app/login/page.jsx
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const T = {
  bg:"#060d1a", card:"rgba(10,18,32,0.95)", border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff", textDim:"rgba(240,246,255,0.45)", textMid:"rgba(240,246,255,0.70)",
  accent:"#22d3ee", accentDim:"rgba(34,211,238,0.10)", accentBrd:"rgba(34,211,238,0.30)",
  red:"#f87171", redDim:"rgba(248,113,113,0.10)", redBrd:"rgba(248,113,113,0.30)",
  green:"#34d399", greenDim:"rgba(52,211,153,0.10)", greenBrd:"rgba(52,211,153,0.30)",
  input:"rgba(15,25,45,0.80)", inputBrd:"rgba(148,163,184,0.15)",
};

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  // Read error from URL (set by auth callback after failed OAuth)
  const urlErr = searchParams.get("error");
  const blockedEmail = searchParams.get("email");
  const urlErrMsg =
    urlErr === "not_whitelisted" ? `Access denied for ${blockedEmail||"this account"}. Your email is not registered in Monroy QMS. Contact your administrator.` :
    urlErr === "account_inactive" ? "Your account has been deactivated. Contact your administrator." :
    urlErr === "auth_failed" ? "Authentication failed. Please try again." :
    "";
  const [error, setError] = useState(urlErrMsg);

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      setError(
        err.message.includes("Invalid login") ? "Incorrect email or password." :
        err.message.includes("Email not confirmed") ? "Please confirm your email before logging in. Check your inbox." :
        err.message
      );
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  }



  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:16, fontFamily:"'IBM Plex Sans',sans-serif" }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{background:${T.bg}}
        input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus{
          -webkit-box-shadow:0 0 0 1000px rgba(15,25,45,0.95) inset!important;
          -webkit-text-fill-color:#f0f6ff!important;
          caret-color:#f0f6ff;
        }
        .login-input{width:100%;padding:12px 14px;border-radius:10px;border:1px solid ${T.inputBrd};background:${T.input};color:${T.text};font-size:14px;font-family:'IBM Plex Sans',sans-serif;outline:none;transition:border-color .2s;-webkit-tap-highlight-color:transparent}
        .login-input:focus{border-color:${T.accent}}
        .login-input::placeholder{color:${T.textDim}}
        .pw-wrap{position:relative}
        .pw-wrap .login-input{padding-right:44px}
        .pw-toggle{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:${T.textDim};cursor:pointer;font-size:16px;line-height:1;padding:4px;-webkit-tap-highlight-color:transparent}
        .pw-toggle:hover{color:${T.text}}
        .btn-primary{width:100%;padding:13px;border-radius:10px;border:none;background:linear-gradient(135deg,#22d3ee,#0891b2);color:#052e16;font-size:14px;font-weight:900;font-family:'IBM Plex Sans',sans-serif;cursor:pointer;transition:opacity .2s;-webkit-tap-highlight-color:transparent;min-height:46px;display:flex;align-items:center;justify-content:center;gap:8px}
        .btn-primary:disabled{opacity:.5;cursor:not-allowed}
        .forgot-link{display:block;text-align:right;font-size:12px;color:${T.accent};text-decoration:none;margin-top:6px;-webkit-tap-highlight-color:transparent}
        .forgot-link:hover{text-decoration:underline}
        .geo-circle{position:absolute;border-radius:50%;pointer-events:none}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        .logo-float{animation:float 4s ease-in-out infinite}
      `}</style>

      {/* Background glow circles */}
      <div style={{position:"fixed",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:0}}>
        <div className="geo-circle" style={{width:500,height:500,background:"radial-gradient(circle,rgba(34,211,238,0.07),transparent 70%)",top:-100,left:-100}}/>
        <div className="geo-circle" style={{width:400,height:400,background:"radial-gradient(circle,rgba(96,165,250,0.05),transparent 70%)",bottom:-50,right:-50}}/>
      </div>

      <div style={{width:"100%",maxWidth:420,position:"relative",zIndex:1}}>

        {/* Logo + Brand */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div className="logo-float" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:64,height:64,borderRadius:18,background:"linear-gradient(135deg,rgba(34,211,238,0.15),rgba(96,165,250,0.10))",border:"1px solid rgba(34,211,238,0.25)",marginBottom:14}}>
            <img src="/logo.png" alt="Monroy" style={{width:44,height:44,objectFit:"contain"}} onError={e=>{e.currentTarget.style.display="none";}}/>
            <span style={{fontSize:24,fontWeight:900,color:T.accent,display:"none"}}>M</span>
          </div>
          <div style={{fontSize:22,fontWeight:900,color:T.text,letterSpacing:"-0.02em",marginBottom:4}}>Monroy QMS</div>
          <div style={{fontSize:12,color:T.textDim,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:600}}>Quality Management System</div>
        </div>

        {/* Card */}
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:20,padding:"28px 26px",backdropFilter:"blur(24px)",boxShadow:"0 24px 64px rgba(0,0,0,0.5)"}}>
          <div style={{fontSize:16,fontWeight:800,color:T.text,marginBottom:4}}>Sign in to your account</div>
          <div style={{fontSize:12,color:T.textDim,marginBottom:22}}>Enter your email and password. First time? Use the link sent to your email to set your password.</div>

          {/* Error */}
          {error&&(
            <div style={{padding:"10px 13px",borderRadius:9,background:T.redDim,border:`1px solid ${T.redBrd}`,color:T.red,fontSize:12,fontWeight:600,marginBottom:16,display:"flex",alignItems:"flex-start",gap:8}}>
              <span style={{flexShrink:0}}>⚠</span><span>{error}</span>
            </div>
          )}



          {/* Form */}
          <form onSubmit={handleLogin} style={{display:"grid",gap:14}}>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:T.textDim,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:7}}>Email address</label>
              <input className="login-input" type="email" placeholder="you@monroy.co.bw" value={email} onChange={e=>{setEmail(e.target.value);setError("");}} autoComplete="email" required/>
            </div>

            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                <label style={{fontSize:11,fontWeight:700,color:T.textDim,letterSpacing:"0.08em",textTransform:"uppercase"}}>Password</label>
                <a href="/forgot-password" className="forgot-link">Forgot password?</a>
              </div>
              <div className="pw-wrap">
                <input className="login-input" type={showPw?"text":"password"} placeholder="Enter your password" value={password} onChange={e=>{setPassword(e.target.value);setError("");}} autoComplete="current-password" required/>
                <button className="pw-toggle" type="button" onClick={()=>setShowPw(p=>!p)} tabIndex={-1}>{showPw?"🙈":"👁"}</button>
              </div>
            </div>

            <button className="btn-primary" type="submit" disabled={loading} style={{marginTop:4}}>
              {loading?(
                <span style={{display:"inline-block",width:16,height:16,border:"2px solid rgba(5,46,22,0.3)",borderTopColor:"#052e16",borderRadius:"50%",animation:"spin .6s linear infinite"}}/>
              ):"Sign In"}
              {!loading&&" →"}
            </button>
          </form>
        </div>

        <div style={{textAlign:"center",marginTop:20,fontSize:11,color:T.textDim}}>
          Don't have an account? Contact your system administrator.
        </div>
        <div style={{textAlign:"center",marginTop:8,fontSize:11,color:T.textDim}}>
          © {new Date().getFullYear()} Monroy (Pty) Ltd · Maun, Botswana
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", background:"#060d1a", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:24, height:24, border:"2px solid rgba(34,211,238,0.2)", borderTopColor:"#22d3ee", borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
      </div>
    }>
      <LoginInner/>
    </Suspense>
  );
}
