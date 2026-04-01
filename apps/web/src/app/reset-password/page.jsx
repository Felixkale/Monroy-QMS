"use client";

import { useEffect, useState } from "react";

const T = {
  bg:"#060d1a", card:"rgba(10,18,32,0.95)", border:"rgba(148,163,184,0.12)",
  text:"#f0f6ff", textDim:"rgba(240,246,255,0.45)",
  accent:"#22d3ee", red:"#f87171", redDim:"rgba(248,113,113,0.10)", redBrd:"rgba(248,113,113,0.30)",
  green:"#34d399", greenDim:"rgba(52,211,153,0.10)", greenBrd:"rgba(52,211,153,0.30)",
};

function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

function StrengthBar({ pw }) {
  const s = strength(pw);
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Very strong"];
  const colors = ["", "#f87171", "#fbbf24", "#fbbf24", "#34d399", "#22d3ee"];

  if (!pw) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 99,
              background: i <= s ? colors[s] : "rgba(148,163,184,0.15)",
              transition: "background .3s",
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 11, color: colors[s], fontWeight: 600 }}>{labels[s]}</div>
    </div>
  );
}

function humanizeError(code) {
  const map = {
    missing_token: "The invite link is incomplete.",
    invalid_or_expired_link: "This invite link is invalid, expired, or has already been used.",
    server_error: "Something went wrong while verifying your invite.",
  };

  return map[code] || "This invite link is invalid, expired, or has already been used.";
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("error");

        if (code) {
          if (!mounted) return;
          setError(humanizeError(code));
          setChecking(false);
          return;
        }

        const res = await fetch("/api/auth/session", {
          method: "GET",
          cache: "no-store",
        });

        const json = await res.json().catch(() => ({}));

        if (!mounted) return;

        if (!res.ok || !json?.authenticated) {
          setError("This invite link is invalid, expired, or has already been used.");
          setChecking(false);
          return;
        }

        setSession(json.user || null);
        setChecking(false);
      } catch {
        if (!mounted) return;
        setError("Unable to verify your invite session.");
        setChecking(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSetPassword(e) {
    e.preventDefault();

    if (strength(password) < 2) {
      setError("Password is too weak. Use at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json?.error || "Failed to update password.");
        setLoading(false);
        return;
      }

      setDone(true);
      setLoading(false);

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1200);
    } catch {
      setError("Failed to update password.");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:16, fontFamily:"'IBM Plex Sans',sans-serif" }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{background:${T.bg}}
        .ri{width:100%;padding:12px 14px;border-radius:10px;border:1px solid rgba(148,163,184,0.15);background:rgba(15,25,45,0.80);color:${T.text};font-size:14px;font-family:'IBM Plex Sans',sans-serif;outline:none;transition:border-color .2s;padding-right:46px}
        .ri:focus{border-color:${T.accent}}
        .ri::placeholder{color:${T.textDim}}
        .pw-wrap{position:relative}
        .pw-toggle{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:${T.textDim};cursor:pointer;font-size:16px;padding:4px;line-height:1}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div style={{ width:"100%", maxWidth:420 }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:56, height:56, borderRadius:16, background:"rgba(34,211,238,0.10)", border:"1px solid rgba(34,211,238,0.25)", marginBottom:14 }}>
            <img
              src="/logo.png"
              alt="Monroy"
              style={{ width:38, height:38, objectFit:"contain" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:T.textDim, letterSpacing:"0.08em", textTransform:"uppercase" }}>
            Monroy QMS
          </div>
        </div>

        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:20, padding:"28px 26px", backdropFilter:"blur(24px)", boxShadow:"0 24px 64px rgba(0,0,0,0.5)" }}>
          {checking && (
            <div style={{ textAlign:"center", padding:"24px 0" }}>
              <div style={{ width:24, height:24, border:"2px solid rgba(34,211,238,0.2)", borderTopColor:T.accent, borderRadius:"50%", animation:"spin .8s linear infinite", margin:"0 auto 12px" }} />
              <div style={{ fontSize:13, color:T.textDim }}>Verifying your link…</div>
            </div>
          )}

          {!checking && done && (
            <div style={{ textAlign:"center", padding:"8px 0" }}>
              <div style={{ fontSize:40, marginBottom:14 }}>✅</div>
              <div style={{ fontSize:16, fontWeight:900, color:T.green, marginBottom:8 }}>Password set!</div>
              <div style={{ fontSize:13, color:T.textDim }}>Redirecting you to your dashboard…</div>
            </div>
          )}

          {!checking && !done && session && (
            <>
              <div style={{ textAlign:"center", marginBottom:22 }}>
                <div style={{ fontSize:22, marginBottom:8 }}>🎉</div>
                <div style={{ fontSize:20, fontWeight:900, color:T.text, marginBottom:6 }}>
                  Welcome to Monroy QMS
                </div>
                <div style={{ fontSize:13, color:T.textDim, lineHeight:1.6 }}>
                  Hello {session?.full_name || session?.email}! Create your password to activate your account.
                </div>
              </div>

              {error && (
                <div style={{ padding:"10px 13px", borderRadius:9, background:T.redDim, border:`1px solid ${T.redBrd}`, color:T.red, fontSize:12, fontWeight:600, marginBottom:16 }}>
                  ⚠ {error}
                </div>
              )}

              <form onSubmit={handleSetPassword} style={{ display:"grid", gap:16 }}>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.textDim, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:7 }}>
                    Create password
                  </label>
                  <div className="pw-wrap">
                    <input
                      className="ri"
                      type={showPw ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      required
                      autoFocus
                    />
                    <button
                      className="pw-toggle"
                      type="button"
                      onClick={() => setShowPw((p) => !p)}
                      tabIndex={-1}
                    >
                      {showPw ? "🙈" : "👁"}
                    </button>
                  </div>
                  <StrengthBar pw={password} />
                </div>

                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.textDim, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:7 }}>
                    Confirm password
                  </label>
                  <div className="pw-wrap">
                    <input
                      className="ri"
                      type={showPw ? "text" : "password"}
                      placeholder="Repeat password"
                      value={confirm}
                      onChange={(e) => {
                        setConfirm(e.target.value);
                        setError("");
                      }}
                      required
                    />
                  </div>

                  {confirm && password && confirm !== password && (
                    <div style={{ fontSize:11, color:T.red, marginTop:5, fontWeight:600 }}>⚠ Passwords do not match</div>
                  )}

                  {confirm && password && confirm === password && (
                    <div style={{ fontSize:11, color:T.green, marginTop:5, fontWeight:600 }}>✓ Passwords match</div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || password !== confirm || !password || strength(password) < 2}
                  style={{
                    padding:"13px",
                    borderRadius:10,
                    border:"none",
                    background:"linear-gradient(135deg,#22d3ee,#0891b2)",
                    color:"#052e16",
                    fontWeight:900,
                    fontSize:14,
                    cursor:"pointer",
                    fontFamily:"inherit",
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    gap:8,
                    opacity: loading || !password || password !== confirm || strength(password) < 2 ? 0.5 : 1,
                  }}
                >
                  {loading ? (
                    <span
                      style={{
                        display:"inline-block",
                        width:16,
                        height:16,
                        border:"2px solid rgba(5,46,22,0.3)",
                        borderTopColor:"#052e16",
                        borderRadius:"50%",
                        animation:"spin .6s linear infinite",
                      }}
                    />
                  ) : null}
                  {loading ? "Saving…" : "Activate My Account →"}
                </button>
              </form>
            </>
          )}

          {!checking && !done && !session && (
            <div style={{ textAlign:"center", padding:"8px 0" }}>
              <div style={{ fontSize:40, marginBottom:14 }}>⚠</div>
              <div style={{ fontSize:16, fontWeight:900, color:T.red, marginBottom:8 }}>
                Link invalid
              </div>
              <div style={{ fontSize:13, color:T.textDim, lineHeight:1.7 }}>
                {error || "This invite link is invalid, expired, or has already been used."}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
