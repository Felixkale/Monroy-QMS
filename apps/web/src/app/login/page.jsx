// src/app/login/page.jsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* ─── Security helpers ──────────────────────────────────────────
   Sanitise user input before it ever touches the auth call.
   These run entirely client-side and are a first line of defence.
   Supabase's own parameterised queries protect the database layer.
──────────────────────────────────────────────────────────────── */
const MAX_EMAIL_LEN    = 254;   // RFC 5321
const MAX_PASSWORD_LEN = 128;

function sanitiseEmail(raw) {
  return String(raw ?? "")
    .trim()
    .slice(0, MAX_EMAIL_LEN)
    .replace(/[<>"'`;\\]/g, "");   // strip obvious injection chars
}

function sanitisePassword(raw) {
  // Do NOT trim passwords — spaces are valid password chars.
  // Only enforce max length to prevent DoS via huge payloads.
  return String(raw ?? "").slice(0, MAX_PASSWORD_LEN);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateEmail(email) {
  if (!email) return "Email is required.";
  if (!EMAIL_RE.test(email)) return "Enter a valid email address.";
  return null;
}

function validatePassword(password) {
  if (!password) return "Password is required.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  return null;
}

/* ─── Rate-limit (client-side, soft guard) ──────────────────── */
const ATTEMPT_LIMIT = 5;
const LOCKOUT_MS    = 60_000; // 1 minute

function useRateLimit() {
  const [attempts, setAttempts]   = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);

  const isLocked = lockedUntil && Date.now() < lockedUntil;
  const secondsLeft = isLocked ? Math.ceil((lockedUntil - Date.now()) / 1000) : 0;

  function recordAttempt() {
    const next = attempts + 1;
    setAttempts(next);
    if (next >= ATTEMPT_LIMIT) {
      setLockedUntil(Date.now() + LOCKOUT_MS);
      setAttempts(0);
    }
  }

  function recordSuccess() {
    setAttempts(0);
    setLockedUntil(null);
  }

  return { isLocked, secondsLeft, recordAttempt, recordSuccess };
}

/* ─── CSS ───────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    background: #040b14;
    font-family: 'IBM Plex Sans', -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }

  /* Scrollable on tiny screens */
  @media (max-height: 640px) {
    html, body { overflow: auto; }
  }

  /* ── Page shell ── */
  .lp-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(ellipse 80% 60% at 0% 0%,   rgba(34,211,238,0.10), transparent),
      radial-gradient(ellipse 60% 50% at 100% 100%,rgba(167,139,250,0.08), transparent),
      radial-gradient(ellipse 50% 40% at 50% 120%, rgba(34,211,238,0.04), transparent),
      #070e18;
  }

  /* Animated background orbs */
  .lp-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    pointer-events: none;
    animation: orb-drift 12s ease-in-out infinite alternate;
  }
  .lp-orb-1 {
    width: 420px; height: 280px;
    top: -100px; left: -60px;
    background: rgba(34,211,238,0.09);
    animation-delay: 0s;
  }
  .lp-orb-2 {
    width: 340px; height: 240px;
    bottom: -80px; right: -40px;
    background: rgba(167,139,250,0.08);
    animation-delay: -6s;
  }
  .lp-orb-3 {
    width: 200px; height: 200px;
    top: 40%; left: 30%;
    background: rgba(96,165,250,0.05);
    animation-delay: -3s;
  }

  @keyframes orb-drift {
    from { transform: translate(0, 0) scale(1); }
    to   { transform: translate(20px, 30px) scale(1.08); }
  }

  /* Grid texture overlay */
  .lp-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(34,211,238,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34,211,238,0.03) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
  }

  /* ── Card ── */
  .lp-card {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 440px;
    background: rgba(13,22,38,0.85);
    border: 1px solid rgba(34,211,238,0.18);
    border-radius: 24px;
    padding: 40px 36px 32px;
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.04) inset,
      0 32px 80px rgba(0,0,0,0.50),
      0 0 60px rgba(34,211,238,0.06);
    animation: card-in 0.5s cubic-bezier(.2,.8,.2,1) both;
  }

  @keyframes card-in {
    from { opacity: 0; transform: translateY(20px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)    scale(1); }
  }

  /* Shimmer top edge */
  .lp-card::before {
    content: '';
    position: absolute;
    top: 0; left: 24px; right: 24px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(34,211,238,0.55), transparent);
    border-radius: 99px;
  }

  /* ── Brand ── */
  .lp-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 32px;
  }

  .lp-brand-logo {
    width: 44px;
    height: 44px;
    border-radius: 13px;
    background: rgba(34,211,238,0.10);
    border: 1px solid rgba(34,211,238,0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    box-shadow: 0 0 20px rgba(34,211,238,0.12);
    flex-shrink: 0;
  }

  .lp-brand-logo img {
    width: 100%; height: 100%; object-fit: contain;
  }

  .lp-brand-logo-fallback {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 18px;
    font-weight: 700;
    color: #22d3ee;
  }

  .lp-brand-dot-grid {
    display: grid;
    grid-template-columns: repeat(3, 3px);
    gap: 3px;
    flex-shrink: 0;
  }

  .lp-brand-dot-grid span {
    width: 3px; height: 3px;
    border-radius: 99px;
    background: rgba(34,211,238,0.55);
  }

  .lp-brand-text h2 {
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 0.18em;
    color: #f0f6ff;
  }

  .lp-brand-text p {
    font-size: 9px;
    letter-spacing: 0.14em;
    color: rgba(34,211,238,0.55);
    margin-top: 3px;
    text-transform: uppercase;
  }

  /* ── Heading ── */
  .lp-heading {
    margin-bottom: 28px;
  }

  .lp-heading h1 {
    font-size: 26px;
    font-weight: 900;
    color: #f0f6ff;
    letter-spacing: -0.02em;
    line-height: 1.1;
    margin-bottom: 6px;
  }

  .lp-heading p {
    font-size: 13px;
    color: rgba(240,246,255,0.45);
  }

  /* ── Form ── */
  .lp-form { display: flex; flex-direction: column; gap: 16px; }

  .lp-field-label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(240,246,255,0.50);
    margin-bottom: 7px;
  }

  .lp-input-wrap { position: relative; }

  .lp-input-icon {
    position: absolute;
    left: 13px;
    top: 50%;
    transform: translateY(-50%);
    width: 17px;
    height: 17px;
    color: rgba(240,246,255,0.35);
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lp-input-icon svg { width: 17px; height: 17px; }

  .lp-input {
    width: 100%;
    height: 48px;
    padding: 0 14px 0 40px;
    border-radius: 12px;
    border: 1px solid rgba(148,163,184,0.14);
    background: rgba(255,255,255,0.04);
    color: #f0f6ff;
    font-size: 14px;
    font-family: 'IBM Plex Sans', sans-serif;
    outline: none;
    transition: border-color .2s, box-shadow .2s, background .2s;
    -webkit-appearance: none;
  }

  .lp-input::placeholder { color: rgba(240,246,255,0.28); }

  .lp-input:focus {
    border-color: rgba(34,211,238,0.50);
    background: rgba(34,211,238,0.04);
    box-shadow: 0 0 0 3px rgba(34,211,238,0.08), 0 0 20px rgba(34,211,238,0.08);
  }

  .lp-input:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .lp-input.error {
    border-color: rgba(248,113,113,0.45);
    box-shadow: 0 0 0 3px rgba(248,113,113,0.08);
  }

  /* Field error */
  .lp-field-error {
    margin-top: 5px;
    font-size: 11px;
    color: #f87171;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* Alert box */
  .lp-alert {
    padding: 12px 14px;
    border-radius: 11px;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    line-height: 1.5;
  }

  .lp-alert.error {
    background: rgba(248,113,113,0.10);
    border: 1px solid rgba(248,113,113,0.25);
    color: #fca5a5;
  }

  .lp-alert.warning {
    background: rgba(251,191,36,0.10);
    border: 1px solid rgba(251,191,36,0.25);
    color: #fde68a;
  }

  /* ── Submit button ── */
  .lp-btn-submit {
    height: 50px;
    width: 100%;
    border: none;
    border-radius: 13px;
    background: linear-gradient(135deg, #22d3ee, #60a5fa);
    color: #001018;
    font-size: 14px;
    font-weight: 900;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: transform .2s, box-shadow .2s, filter .2s, opacity .2s;
    box-shadow: 0 0 24px rgba(34,211,238,0.25);
    font-family: 'IBM Plex Sans', sans-serif;
    margin-top: 4px;
  }

  .lp-btn-submit:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 0 36px rgba(34,211,238,0.35);
    filter: brightness(1.06);
  }

  .lp-btn-submit:active:not(:disabled) {
    transform: translateY(0);
  }

  .lp-btn-submit:disabled {
    opacity: 0.60;
    cursor: not-allowed;
    transform: none;
  }

  /* Spinner inside button */
  .lp-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(0,16,24,0.3);
    border-top-color: #001018;
    border-radius: 50%;
    animation: spin .7s linear infinite;
    vertical-align: middle;
    margin-right: 8px;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Footer links ── */
  .lp-links {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin-top: 4px;
  }

  .lp-link-btn {
    background: none;
    border: none;
    color: rgba(240,246,255,0.50);
    font-size: 12px;
    cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
    transition: color .15s;
    padding: 4px 0;
  }

  .lp-link-btn:hover:not(:disabled) { color: #22d3ee; }
  .lp-link-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .lp-divider {
    width: 100%;
    height: 1px;
    background: rgba(148,163,184,0.10);
    margin: 4px 0;
  }

  .lp-signup-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: rgba(240,246,255,0.45);
  }

  .lp-signup-row .lp-link-btn {
    color: #22d3ee;
    font-weight: 700;
    font-size: 12px;
  }

  /* ── Loading screen ── */
  .lp-loading {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background: #070e18;
    color: rgba(240,246,255,0.50);
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px;
  }

  .lp-loading-ring {
    width: 48px;
    height: 48px;
    border: 2px solid rgba(34,211,238,0.15);
    border-top-color: #22d3ee;
    border-radius: 50%;
    animation: spin .9s linear infinite;
    box-shadow: 0 0 24px rgba(34,211,238,0.15);
  }

  /* ── Responsive ── */
  @media (max-width: 480px) {
    .lp-card {
      padding: 32px 22px 26px;
      border-radius: 20px;
    }

    .lp-heading h1 { font-size: 22px; }
    .lp-brand-text h2 { font-size: 13px; }
  }

  @media (max-height: 640px) {
    .lp-root { align-items: flex-start; padding-top: 20px; }
    .lp-brand { margin-bottom: 20px; }
    .lp-heading { margin-bottom: 20px; }
  }
`;

/* ─── Component ─────────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [emailErr,     setEmailErr]     = useState("");
  const [passwordErr,  setPasswordErr]  = useState("");
  const [submitErr,    setSubmitErr]    = useState("");
  const [loading,      setLoading]      = useState(false);
  const [checking,     setChecking]     = useState(true);

  const { isLocked, secondsLeft, recordAttempt, recordSuccess } = useRateLimit();

  /* Redirect if already logged in */
  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) { router.replace("/dashboard"); return; }
      } catch { /* ignore */ }
      finally { if (mounted) setChecking(false); }
    }
    check();
    return () => { mounted = false; };
  }, [router]);

  /* Live validation — only show errors after first blur */
  const handleEmailBlur = useCallback(() => {
    setEmailErr(validateEmail(sanitiseEmail(email)) || "");
  }, [email]);

  const handlePasswordBlur = useCallback(() => {
    setPasswordErr(validatePassword(password) || "");
  }, [password]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitErr("");

    if (isLocked) return;

    /* Sanitise */
    const cleanEmail    = sanitiseEmail(email);
    const cleanPassword = sanitisePassword(password);

    /* Validate */
    const eErr = validateEmail(cleanEmail);
    const pErr = validatePassword(cleanPassword);
    if (eErr) { setEmailErr(eErr); return; }
    if (pErr) { setPasswordErr(pErr); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email:    cleanEmail,
        password: cleanPassword,
      });

      if (error) {
        recordAttempt();
        /* Generic message — don't reveal whether email or password is wrong */
        setSubmitErr("Invalid credentials. Please try again.");
        return;
      }

      if (data?.user) {
        recordSuccess();
        router.replace("/dashboard");
        return;
      }

      recordAttempt();
      setSubmitErr("Login failed. Please try again.");
    } catch (err) {
      recordAttempt();
      setSubmitErr("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ── Loading screen ── */
  if (checking) {
    return (
      <>
        <style>{CSS}</style>
        <div className="lp-loading">
          <div className="lp-loading-ring" />
          <span>Loading workspace…</span>
        </div>
      </>
    );
  }

  const isDisabled = loading || isLocked;

  return (
    <>
      <style>{CSS}</style>

      <div className="lp-root">
        {/* Background layers */}
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />
        <div className="lp-orb lp-orb-3" />
        <div className="lp-grid" />

        {/* Card */}
        <div className="lp-card">

          {/* Brand */}
          <div className="lp-brand">
            <div className="lp-brand-dot-grid">
              {Array.from({ length: 9 }).map((_, i) => <span key={i} />)}
            </div>
            <div className="lp-brand-logo">
              <img
                src="/logo.png"
                alt="Monroy"
                onError={e => { e.currentTarget.style.display = "none"; }}
              />
              <span className="lp-brand-logo-fallback">M</span>
            </div>
            <div className="lp-brand-text">
              <h2>MONROY</h2>
              <p>QMS Workspace</p>
            </div>
          </div>

          {/* Heading */}
          <div className="lp-heading">
            <h1>Sign in</h1>
            <p>Enter your credentials to access the workspace</p>
          </div>

          {/* Lockout warning */}
          {isLocked && (
            <div className="lp-alert warning" style={{ marginBottom: 16 }}>
              <span>⚠</span>
              <span>Too many failed attempts. Please wait {secondsLeft}s before trying again.</span>
            </div>
          )}

          {/* Submit error */}
          {submitErr && (
            <div className="lp-alert error" style={{ marginBottom: 16 }}>
              <span>⚠</span>
              <span>{submitErr}</span>
            </div>
          )}

          {/* Form */}
          <form className="lp-form" onSubmit={handleSubmit} noValidate autoComplete="on">

            {/* Email */}
            <div>
              <label className="lp-field-label" htmlFor="lp-email">Email address</label>
              <div className="lp-input-wrap">
                <div className="lp-input-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M20 21a8 8 0 0 0-16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
                  </svg>
                </div>
                <input
                  id="lp-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailErr(""); setSubmitErr(""); }}
                  onBlur={handleEmailBlur}
                  disabled={isDisabled}
                  maxLength={MAX_EMAIL_LEN}
                  className={`lp-input${emailErr ? " error" : ""}`}
                  required
                />
              </div>
              {emailErr && <div className="lp-field-error"><span>⚠</span>{emailErr}</div>}
            </div>

            {/* Password */}
            <div>
              <label className="lp-field-label" htmlFor="lp-password">Password</label>
              <div className="lp-input-wrap">
                <div className="lp-input-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="10" width="16" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
                    <path d="M8 10V7.8A4 4 0 0 1 12 4a4 4 0 0 1 4 3.8V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <input
                  id="lp-password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordErr(""); setSubmitErr(""); }}
                  onBlur={handlePasswordBlur}
                  disabled={isDisabled}
                  maxLength={MAX_PASSWORD_LEN}
                  className={`lp-input${passwordErr ? " error" : ""}`}
                  required
                />
              </div>
              {passwordErr && <div className="lp-field-error"><span>⚠</span>{passwordErr}</div>}
            </div>

            {/* Submit */}
            <button type="submit" className="lp-btn-submit" disabled={isDisabled}>
              {loading && <span className="lp-spinner" />}
              {loading ? "Signing in…" : isLocked ? `Locked (${secondsLeft}s)` : "Sign In"}
            </button>

          </form>

          {/* Footer links */}
          <div className="lp-links" style={{ marginTop: 20 }}>
            <button
              type="button"
              className="lp-link-btn"
              disabled={isDisabled}
              onClick={() => router.push("/forgot-password")}
            >
              Forgot password?
            </button>
            <div className="lp-divider" />
            <div className="lp-signup-row">
              <span>Don&apos;t have an account?</span>
              <button
                type="button"
                className="lp-link-btn"
                disabled={isDisabled}
                onClick={() => router.push("/signup")}
              >
                Sign up
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
