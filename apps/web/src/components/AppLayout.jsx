// src/components/AppLayout.jsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthContext";

const navItems = [
  { id:"dashboard",            label:"Dashboard",            icon:"▦",  href:"/dashboard" },
  { id:"clients",              label:"Clients",              icon:"🏢", href:"/clients" },
  { id:"register-client",      label:"Register Client",      icon:"＋", href:"/clients/register" },
  { id:"equipment",            label:"Equipment",            icon:"⚙",  href:"/equipment" },
  { id:"certificates",         label:"Certificates",         icon:"📜", href:"/certificates" },
  { id:"crane-inspection",     label:"Crane Inspection",     icon:"🏗", href:"/certificates/crane-inspection" },
  { id:"machine-inspection",   label:"Machine Inspection",   icon:"⚙️", href:"/certificates/machine-inspection" },
  { id:"inspection-templates", label:"Insp. Templates",      icon:"📋", href:"/inspection-templates" },
  { id:"ncr",                  label:"NCR",                  icon:"⚠",  href:"/ncr" },
  { id:"capa",                 label:"CAPA",                 icon:"🔧", href:"/capa" },
  { id:"reports",              label:"Reports",              icon:"📈", href:"/reports" },
  { id:"admin",                label:"Admin",                icon:"⚡", href:"/admin" },
  { id:"users",                label:"Users",                icon:"👥", href:"/admin/users" },
];

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    background: #040b14;
    font-family: 'IBM Plex Sans', -apple-system, sans-serif;
    color: #f0f6ff;
    -webkit-font-smoothing: antialiased;
  }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.20); border-radius: 99px; }

  .qms-root {
    min-height: 100vh;
    background:
      radial-gradient(ellipse 60% 40% at 0% 0%,   rgba(34,211,238,0.07), transparent),
      radial-gradient(ellipse 50% 40% at 100% 100%,rgba(167,139,250,0.06), transparent),
      #070e18;
    display: flex;
  }

  /* ── SIDEBAR ── */
  .qms-sidebar {
    width: 252px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, rgba(13,22,38,0.97), rgba(7,14,24,0.99));
    border-right: 1px solid rgba(34,211,238,0.08);
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
    z-index: 40;
    padding: 18px 12px 16px;
    transition: transform 0.26s cubic-bezier(.4,0,.2,1);
  }

  .qms-brand {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 4px 4px 18px;
    border-bottom: 1px solid rgba(148,163,184,0.09);
    margin-bottom: 14px;
    cursor: pointer;
    background: none;
    border-top: none; border-left: none; border-right: none;
    width: 100%;
    text-align: left;
    color: #f0f6ff;
  }
  .qms-brand-logo {
    width: 40px; height: 40px;
    border-radius: 12px;
    border: 1px solid rgba(34,211,238,0.22);
    background: rgba(34,211,238,0.08);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; flex-shrink: 0;
    box-shadow: 0 0 18px rgba(34,211,238,0.10);
  }
  .qms-brand-logo img { width: 100%; height: 100%; object-fit: contain; }
  .qms-brand-fallback { font-size: 17px; font-weight: 900; color: #22d3ee; font-family: 'IBM Plex Mono', monospace; }
  .qms-brand-dot-grid { display: grid; grid-template-columns: repeat(3, 3px); gap: 3px; flex-shrink: 0; }
  .qms-brand-dot-grid span { width: 3px; height: 3px; border-radius: 99px; background: rgba(34,211,238,0.55); }
  .qms-brand-text h2 { font-size: 14px; font-weight: 900; letter-spacing: 0.18em; color: #f0f6ff; line-height: 1; }
  .qms-brand-text p  { font-size: 9px; letter-spacing: 0.15em; color: rgba(34,211,238,0.50); margin-top: 4px; text-transform: uppercase; }

  .qms-nav { display: flex; flex-direction: column; gap: 2px; flex: 1; overflow-y: auto; padding-bottom: 10px; }

  .qms-nav-btn {
    width: 100%; border: 1px solid transparent; border-radius: 10px;
    background: transparent; color: rgba(240,246,255,0.55);
    padding: 10px 12px;
    display: flex; align-items: center; gap: 10px;
    font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.16s ease;
    text-align: left; font-family: 'IBM Plex Sans', sans-serif;
    min-height: 44px; position: relative;
  }
  .qms-nav-btn:hover {
    background: rgba(34,211,238,0.06);
    border-color: rgba(34,211,238,0.11);
    color: rgba(240,246,255,0.88);
    transform: translateX(2px);
  }
  .qms-nav-btn.active {
    background: rgba(34,211,238,0.10);
    border-color: rgba(34,211,238,0.22);
    color: #22d3ee;
    box-shadow: 0 0 14px rgba(34,211,238,0.07);
  }
  .qms-nav-btn.active::before {
    content: '';
    position: absolute; left: 0; top: 50%; transform: translateY(-50%);
    width: 3px; height: 58%; border-radius: 0 3px 3px 0;
    background: #22d3ee; box-shadow: 0 0 9px rgba(34,211,238,0.55);
  }
  .qms-nav-btn.active .qms-nav-icon { filter: drop-shadow(0 0 5px rgba(34,211,238,0.45)); }
  .qms-nav-icon { width: 20px; min-width: 20px; display: inline-flex; justify-content: center; font-size: 14px; line-height: 1; }
  .qms-nav-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Nav divider */
  .qms-nav-divider { height: 1px; background: rgba(148,163,184,0.08); margin: 8px 4px; }

  .qms-sidebar-footer {
    padding-top: 12px;
    border-top: 1px solid rgba(148,163,184,0.09);
    display: flex; flex-direction: column; gap: 9px;
  }
  .qms-profile-card {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 11px; border-radius: 11px;
    border: 1px solid rgba(148,163,184,0.10);
    background: rgba(255,255,255,0.025);
  }
  .qms-avatar {
    width: 34px; height: 34px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 800; color: #001018;
    background: linear-gradient(135deg, #22d3ee, #60a5fa);
    flex-shrink: 0; font-family: 'IBM Plex Mono', monospace;
    box-shadow: 0 0 12px rgba(34,211,238,0.22);
  }
  .qms-profile-info { min-width: 0; }
  .qms-profile-name  { font-size: 13px; font-weight: 700; color: #f0f6ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .qms-profile-email { font-size: 11px; color: rgba(240,246,255,0.38); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
  .qms-logout-btn {
    width: 100%; height: 38px;
    border: 1px solid rgba(148,163,184,0.13); border-radius: 9px;
    background: rgba(255,255,255,0.03); color: rgba(240,246,255,0.60);
    font-size: 12px; font-weight: 700; cursor: pointer;
    transition: all 0.16s; font-family: 'IBM Plex Sans', sans-serif;
    letter-spacing: 0.04em;
  }
  .qms-logout-btn:hover { background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.22); color: #f87171; }

  /* ── MAIN ── */
  .qms-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

  .qms-topbar {
    position: sticky; top: 0; z-index: 30;
    display: flex; align-items: center; justify-content: space-between;
    gap: 14px; padding: 13px 22px;
    background: rgba(7,14,24,0.84);
    border-bottom: 1px solid rgba(148,163,184,0.09);
    backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    flex-wrap: wrap; min-height: 62px;
  }
  .qms-topbar-left  { display: flex; align-items: center; gap: 12px; }
  .qms-topbar-right { display: flex; align-items: center; gap: 10px; }

  .qms-hamburger {
    display: none; width: 40px; height: 40px; border-radius: 10px;
    border: 1px solid rgba(148,163,184,0.13);
    background: rgba(255,255,255,0.04); color: rgba(240,246,255,0.80);
    font-size: 18px; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0;
  }

  .qms-welcome h1 { font-size: clamp(17px, 2.6vw, 24px); font-weight: 900; color: #f0f6ff; letter-spacing: -0.02em; line-height: 1.1; }
  .qms-welcome p  { font-size: 11px; color: rgba(240,246,255,0.38); margin-top: 3px; }

  .qms-notify-btn {
    width: 40px; height: 40px; border-radius: 10px;
    border: 1px solid rgba(148,163,184,0.11);
    background: rgba(255,255,255,0.03); color: rgba(240,246,255,0.75);
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer; position: relative; flex-shrink: 0; transition: all 0.14s;
  }
  .qms-notify-btn:hover { background: rgba(34,211,238,0.06); border-color: rgba(34,211,238,0.16); }
  .qms-notify-btn svg { width: 17px; height: 17px; }
  .qms-notify-dot {
    position: absolute; top: 9px; right: 9px;
    width: 7px; height: 7px; border-radius: 99px;
    background: #f87171; box-shadow: 0 0 7px rgba(248,113,113,0.55);
    border: 1.5px solid #070e18;
  }

  .qms-top-chip {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 11px 6px 6px; border-radius: 11px;
    border: 1px solid rgba(148,163,184,0.11);
    background: rgba(255,255,255,0.03);
    min-width: 0; max-width: 210px;
  }
  .qms-top-avatar {
    width: 30px; height: 30px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 800; color: #001018;
    background: linear-gradient(135deg, #22d3ee, #60a5fa);
    flex-shrink: 0; font-family: 'IBM Plex Mono', monospace;
  }
  .qms-top-chip-text { display: flex; flex-direction: column; min-width: 0; }
  .qms-top-name { font-size: 12px; font-weight: 700; color: #f0f6ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 110px; }
  .qms-top-role { font-size: 10px; color: rgba(34,211,238,0.55); margin-top: 1px; letter-spacing: 0.06em; text-transform: uppercase; }

  .qms-page-title-bar { padding: 16px 22px 0; }
  .qms-page-title-inner {
    padding: 14px 18px; border-radius: 15px;
    border: 1px solid rgba(148,163,184,0.09);
    background: rgba(13,22,38,0.60); backdrop-filter: blur(12px);
    display: flex; align-items: center; gap: 13px;
  }
  .qms-page-title-bar h2 { font-size: clamp(17px, 2.2vw, 22px); font-weight: 900; color: #f0f6ff; letter-spacing: -0.02em; }
  .qms-page-title-accent { display: flex; align-items: center; gap: 3px; }
  .qms-page-title-accent span { display: block; width: 4px; border-radius: 99px; background: linear-gradient(to bottom, #22d3ee, rgba(34,211,238,0.22)); }
  .qms-page-title-accent span:nth-child(1) { height: 26px; }
  .qms-page-title-accent span:nth-child(2) { height: 18px; opacity: .55; }
  .qms-page-title-accent span:nth-child(3) { height: 11px; opacity: .28; }

  .qms-page-body { flex: 1; min-width: 0; padding: 18px 22px 40px; }

  /* ── MOBILE OVERLAY ── */
  .qms-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(2,6,14,0.55); z-index: 39;
    opacity: 0; pointer-events: none;
    transition: opacity 0.22s ease; backdrop-filter: blur(2px);
  }
  .qms-overlay.show { opacity: 1; pointer-events: auto; }

  /* ── TABLET ≤ 1100px ── */
  @media (max-width: 1100px) {
    .qms-sidebar { width: 220px; padding: 16px 10px; }
    .qms-brand-text h2 { font-size: 13px; }
    .qms-topbar { padding: 11px 16px; }
    .qms-page-title-bar { padding: 13px 16px 0; }
    .qms-page-body { padding: 14px 16px 22px; }
  }

  /* ── MOBILE ≤ 900px ── */
  @media (max-width: 900px) {
    .qms-sidebar {
      position: fixed; top: 0; left: 0; bottom: 0; height: 100%;
      width: min(272px, calc(100vw - 52px));
      transform: translateX(-105%);
      box-shadow: 8px 0 36px rgba(0,0,0,0.40);
      border-right: 1px solid rgba(34,211,238,0.10);
    }
    .qms-sidebar.open { transform: translateX(0); }
    .qms-overlay { display: block; }
    .qms-hamburger { display: inline-flex; }
    .qms-main { width: 100%; }
    .qms-topbar { padding: 11px 14px; min-height: 56px; }
    .qms-page-title-bar { padding: 11px 13px 0; }
    .qms-page-body { padding: 13px 13px 22px; }
  }

  /* ── SMALL MOBILE ≤ 640px ── */
  @media (max-width: 640px) {
    .qms-topbar { padding: 10px 12px; gap: 8px; }
    .qms-topbar-right { gap: 7px; }
    .qms-top-chip { padding: 5px 9px 5px 5px; max-width: 150px; }
    .qms-top-name { max-width: 80px; }
    .qms-welcome h1 { font-size: 16px; }
    .qms-welcome p  { display: none; }
    .qms-page-title-bar { padding: 9px 11px 0; }
    .qms-page-title-inner { padding: 12px 14px; border-radius: 12px; }
    .qms-page-title-bar h2 { font-size: 16px; }
    .qms-page-body { padding: 11px 11px 18px; }
  }

  /* ── VERY SMALL ≤ 400px ── */
  @media (max-width: 400px) {
    .qms-top-chip { display: none; }
    .qms-welcome h1 { font-size: 14px; }
    .qms-page-title-bar h2 { font-size: 14px; }
    .qms-page-body { padding: 10px 10px 14px; }
  }
`;

export default function AppLayout({ children, title = "Monroy QMS" }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const goTo = (href) => { router.push(href); setMenuOpen(false); };

  const handleLogout = async () => {
    try { await logout(); } finally { router.push("/login"); }
  };

  const userInitial = user?.email?.charAt(0)?.toUpperCase() || "U";
  const userName    = user?.email?.split("@")[0] || "User";

  const mainNav  = navItems.filter(i => i.id !== "admin" && i.id !== "users");
  const adminNav = navItems.filter(i => i.id === "admin" || i.id === "users");

  return (
    <>
      <style>{CSS}</style>
      <div className="qms-root">

        {/* ── SIDEBAR ── */}
        <aside className={`qms-sidebar${menuOpen ? " open" : ""}`}>

          <button type="button" className="qms-brand" onClick={() => goTo("/dashboard")}>
            <div className="qms-brand-dot-grid">
              {Array.from({ length: 9 }).map((_, i) => <span key={i} />)}
            </div>
            <div className="qms-brand-logo">
              <img src="/logo.png" alt="Monroy" onError={e => { e.currentTarget.style.display = "none"; }} />
              <span className="qms-brand-fallback">M</span>
            </div>
            <div className="qms-brand-text">
              <h2>MONROY</h2>
              <p>QMS Workspace</p>
            </div>
          </button>

          <nav className="qms-nav">
            {mainNav.map(item => (
              <button key={item.id} type="button" onClick={() => goTo(item.href)}
                className={`qms-nav-btn${isActive(item.href) ? " active" : ""}`}>
                <span className="qms-nav-icon">{item.icon}</span>
                <span className="qms-nav-label">{item.label}</span>
              </button>
            ))}

            <div className="qms-nav-divider" />

            {adminNav.map(item => (
              <button key={item.id} type="button" onClick={() => goTo(item.href)}
                className={`qms-nav-btn${isActive(item.href) ? " active" : ""}`}>
                <span className="qms-nav-icon">{item.icon}</span>
                <span className="qms-nav-label">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="qms-sidebar-footer">
            <div className="qms-profile-card">
              <div className="qms-avatar">{userInitial}</div>
              <div className="qms-profile-info">
                <div className="qms-profile-name">{userName}</div>
                <div className="qms-profile-email">{user?.email || "No email"}</div>
              </div>
            </div>
            <button type="button" className="qms-logout-btn" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </aside>

        {/* Mobile overlay */}
        <div className={`qms-overlay${menuOpen ? " show" : ""}`} onClick={() => setMenuOpen(false)} />

        {/* ── MAIN ── */}
        <div className="qms-main">

          <header className="qms-topbar">
            <div className="qms-topbar-left">
              <button type="button" className="qms-hamburger" onClick={() => setMenuOpen(true)} aria-label="Open navigation">
                ☰
              </button>
              <div className="qms-welcome">
                <h1>Hi, {userName}!</h1>
                <p>Welcome to your Workspace</p>
              </div>
            </div>

            <div className="qms-topbar-right">
              <button type="button" className="qms-notify-btn" aria-label="Notifications">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M6.5 16.5h11l-1.1-1.2a3 3 0 0 1-.8-2.05V10a4.6 4.6 0 1 0-9.2 0v3.25c0 .77-.29 1.5-.8 2.05L4.5 16.5h2Z"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <span className="qms-notify-dot" />
              </button>

              <div className="qms-top-chip">
                <div className="qms-top-avatar">{userInitial}</div>
                <div className="qms-top-chip-text">
                  <span className="qms-top-name">{userName}</span>
                  <span className="qms-top-role">Admin</span>
                </div>
              </div>
            </div>
          </header>

          {title !== "Dashboard" && (
            <div className="qms-page-title-bar">
              <div className="qms-page-title-inner">
                <div className="qms-page-title-accent">
                  <span /><span /><span />
                </div>
                <h2>{title}</h2>
              </div>
            </div>
          )}

          <main className="qms-page-body">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
