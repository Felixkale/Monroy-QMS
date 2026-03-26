"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthContext";

/* ─── Nav items ─────────────────────────────────────────────── */
const navItems = [
  { id: "dashboard",        label: "Dashboard",        icon: "▦",  href: "/dashboard" },
  { id: "clients",          label: "Clients",           icon: "🏢", href: "/clients" },
  { id: "register-client",  label: "Register Client",   icon: "＋", href: "/clients/register" },
  { id: "equipment",        label: "Equipment",         icon: "⚙",  href: "/equipment" },
  { id: "inspections",      label: "Inspections",       icon: "🔍", href: "/inspections" },
  { id: "ncr",              label: "NCR",               icon: "⚠",  href: "/ncr" },
  { id: "certificates",     label: "Certificates",      icon: "📜", href: "/certificates" },
  { id: "reports",          label: "Reports",           icon: "📈", href: "/reports" },
  { id: "admin",            label: "Admin",             icon: "⚡", href: "/admin" },
];

/* ─── Global CSS ─────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap');

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

  /* ── Root shell ── */
  .qms-root {
    min-height: 100vh;
    background:
      radial-gradient(ellipse 60% 40% at 0% 0%,   rgba(34,211,238,0.07), transparent),
      radial-gradient(ellipse 50% 40% at 100% 100%,rgba(167,139,250,0.06), transparent),
      #070e18;
    display: flex;
  }

  /* ══════════════════════════════════════
     SIDEBAR
  ══════════════════════════════════════ */
  .qms-sidebar {
    width: 260px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background:
      linear-gradient(180deg, rgba(13,22,38,0.96), rgba(7,14,24,0.98));
    border-right: 1px solid rgba(34,211,238,0.08);
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
    z-index: 40;
    padding: 20px 14px 18px;
    transition: transform 0.28s cubic-bezier(.4,0,.2,1);
  }

  /* Brand */
  .qms-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px 4px 22px;
    border-bottom: 1px solid rgba(148,163,184,0.10);
    margin-bottom: 16px;
    cursor: pointer;
    background: none;
    border-top: none;
    border-left: none;
    border-right: none;
    width: 100%;
    text-align: left;
    color: #f0f6ff;
  }

  .qms-brand-logo {
    width: 42px;
    height: 42px;
    border-radius: 13px;
    border: 1px solid rgba(34,211,238,0.22);
    background: rgba(34,211,238,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: 0 0 20px rgba(34,211,238,0.10);
  }

  .qms-brand-logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .qms-brand-fallback {
    font-size: 18px;
    font-weight: 900;
    color: #22d3ee;
    font-family: 'IBM Plex Mono', monospace;
  }

  .qms-brand-dot-grid {
    display: grid;
    grid-template-columns: repeat(3, 3px);
    gap: 3px;
    flex-shrink: 0;
  }

  .qms-brand-dot-grid span {
    width: 3px;
    height: 3px;
    border-radius: 99px;
    background: rgba(34,211,238,0.60);
  }

  .qms-brand-text h2 {
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 0.18em;
    color: #f0f6ff;
    line-height: 1;
  }

  .qms-brand-text p {
    font-size: 9px;
    letter-spacing: 0.16em;
    color: rgba(34,211,238,0.55);
    margin-top: 4px;
    text-transform: uppercase;
  }

  /* Nav */
  .qms-nav {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    overflow-y: auto;
    padding-bottom: 12px;
  }

  .qms-nav-btn {
    width: 100%;
    border: 1px solid transparent;
    border-radius: 11px;
    background: transparent;
    color: rgba(240,246,255,0.58);
    padding: 11px 13px;
    display: flex;
    align-items: center;
    gap: 11px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.18s ease;
    text-align: left;
    font-family: 'IBM Plex Sans', sans-serif;
    min-height: 44px;
  }

  .qms-nav-btn:hover {
    background: rgba(34,211,238,0.06);
    border-color: rgba(34,211,238,0.12);
    color: rgba(240,246,255,0.88);
    transform: translateX(2px);
  }

  .qms-nav-btn.active {
    background: rgba(34,211,238,0.10);
    border-color: rgba(34,211,238,0.22);
    color: #22d3ee;
    box-shadow: 0 0 16px rgba(34,211,238,0.08);
  }

  .qms-nav-btn.active .qms-nav-icon {
    filter: drop-shadow(0 0 6px rgba(34,211,238,0.50));
  }

  .qms-nav-icon {
    width: 20px;
    min-width: 20px;
    display: inline-flex;
    justify-content: center;
    font-size: 15px;
    line-height: 1;
  }

  .qms-nav-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Active indicator bar */
  .qms-nav-btn.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 60%;
    border-radius: 0 3px 3px 0;
    background: #22d3ee;
    box-shadow: 0 0 10px rgba(34,211,238,0.60);
  }

  .qms-nav-btn { position: relative; }

  /* Sidebar footer */
  .qms-sidebar-footer {
    padding-top: 14px;
    border-top: 1px solid rgba(148,163,184,0.10);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .qms-profile-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 12px;
    border-radius: 12px;
    border: 1px solid rgba(148,163,184,0.10);
    background: rgba(255,255,255,0.025);
  }

  .qms-avatar {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 800;
    color: #001018;
    background: linear-gradient(135deg, #22d3ee, #60a5fa);
    flex-shrink: 0;
    box-shadow: 0 0 14px rgba(34,211,238,0.25);
    font-family: 'IBM Plex Mono', monospace;
  }

  .qms-profile-info { min-width: 0; }

  .qms-profile-name {
    font-size: 13px;
    font-weight: 700;
    color: #f0f6ff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .qms-profile-email {
    font-size: 11px;
    color: rgba(240,246,255,0.40);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
  }

  .qms-logout-btn {
    width: 100%;
    height: 40px;
    border: 1px solid rgba(148,163,184,0.14);
    border-radius: 10px;
    background: rgba(255,255,255,0.03);
    color: rgba(240,246,255,0.65);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.18s ease;
    font-family: 'IBM Plex Sans', sans-serif;
    letter-spacing: 0.04em;
  }

  .qms-logout-btn:hover {
    background: rgba(248,113,113,0.08);
    border-color: rgba(248,113,113,0.22);
    color: #f87171;
  }

  /* ══════════════════════════════════════
     MAIN CONTENT
  ══════════════════════════════════════ */
  .qms-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  /* Topbar */
  .qms-topbar {
    position: sticky;
    top: 0;
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 14px 24px;
    background: rgba(7,14,24,0.82);
    border-bottom: 1px solid rgba(148,163,184,0.10);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    flex-wrap: wrap;
    min-height: 64px;
  }

  .qms-topbar-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  /* Hamburger — hidden on desktop */
  .qms-hamburger {
    display: none;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    border: 1px solid rgba(148,163,184,0.14);
    background: rgba(255,255,255,0.04);
    color: rgba(240,246,255,0.80);
    font-size: 18px;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
  }

  .qms-welcome h1 {
    font-size: clamp(18px, 2.8vw, 26px);
    font-weight: 900;
    color: #f0f6ff;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }

  .qms-welcome p {
    font-size: 12px;
    color: rgba(240,246,255,0.42);
    margin-top: 3px;
  }

  .qms-topbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .qms-notify-btn {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    border: 1px solid rgba(148,163,184,0.12);
    background: rgba(255,255,255,0.03);
    color: rgba(240,246,255,0.80);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;
    flex-shrink: 0;
    transition: all 0.15s;
  }

  .qms-notify-btn:hover {
    background: rgba(34,211,238,0.06);
    border-color: rgba(34,211,238,0.18);
  }

  .qms-notify-btn svg {
    width: 17px;
    height: 17px;
  }

  .qms-notify-dot {
    position: absolute;
    top: 9px;
    right: 9px;
    width: 7px;
    height: 7px;
    border-radius: 99px;
    background: #f87171;
    box-shadow: 0 0 8px rgba(248,113,113,0.60);
    border: 1.5px solid #070e18;
  }

  .qms-top-chip {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 7px 12px 7px 7px;
    border-radius: 12px;
    border: 1px solid rgba(148,163,184,0.12);
    background: rgba(255,255,255,0.03);
    cursor: default;
    min-width: 0;
    max-width: 220px;
  }

  .qms-top-avatar {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 800;
    color: #001018;
    background: linear-gradient(135deg, #22d3ee, #60a5fa);
    flex-shrink: 0;
    font-family: 'IBM Plex Mono', monospace;
  }

  .qms-top-chip-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .qms-top-name {
    font-size: 12px;
    font-weight: 700;
    color: #f0f6ff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
  }

  .qms-top-role {
    font-size: 10px;
    color: rgba(34,211,238,0.60);
    margin-top: 1px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  /* Page title bar */
  .qms-page-title-bar {
    padding: 16px 24px 0;
  }

  .qms-page-title-inner {
    padding: 16px 20px;
    border-radius: 16px;
    border: 1px solid rgba(148,163,184,0.10);
    background: rgba(13,22,38,0.60);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .qms-page-title-bar h2 {
    font-size: clamp(18px, 2.4vw, 24px);
    font-weight: 900;
    color: #f0f6ff;
    letter-spacing: -0.02em;
  }

  .qms-page-title-accent {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .qms-page-title-accent span {
    display: block;
    width: 4px;
    border-radius: 99px;
    background: linear-gradient(to bottom, #22d3ee, rgba(34,211,238,0.25));
  }

  .qms-page-title-accent span:nth-child(1) { height: 28px; }
  .qms-page-title-accent span:nth-child(2) { height: 20px; opacity: .6; }
  .qms-page-title-accent span:nth-child(3) { height: 12px; opacity: .3; }

  /* Page content */
  .qms-page-body {
    flex: 1;
    min-width: 0;
    padding: 20px 24px 28px;
  }

  /* ══════════════════════════════════════
     MOBILE OVERLAY
  ══════════════════════════════════════ */
  .qms-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(2,6,14,0.55);
    z-index: 39;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.24s ease;
    backdrop-filter: blur(2px);
  }

  .qms-overlay.show {
    opacity: 1;
    pointer-events: auto;
  }

  /* ══════════════════════════════════════
     TABLET  ≤ 1100px
  ══════════════════════════════════════ */
  @media (max-width: 1100px) {
    .qms-sidebar { width: 230px; padding: 18px 12px; }
    .qms-brand-text h2 { font-size: 14px; }
    .qms-topbar { padding: 12px 18px; }
    .qms-page-title-bar { padding: 14px 18px 0; }
    .qms-page-body { padding: 16px 18px 24px; }
  }

  /* ══════════════════════════════════════
     MOBILE  ≤ 900px  — sidebar slides in
  ══════════════════════════════════════ */
  @media (max-width: 900px) {
    /* Sidebar becomes an offcanvas drawer */
    .qms-sidebar {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      height: 100%;
      width: min(280px, calc(100vw - 56px));
      transform: translateX(-105%);
      box-shadow: 8px 0 40px rgba(0,0,0,0.40);
      border-right: 1px solid rgba(34,211,238,0.10);
    }

    .qms-sidebar.open {
      transform: translateX(0);
    }

    .qms-overlay { display: block; }

    /* Hamburger visible */
    .qms-hamburger { display: inline-flex; }

    .qms-main { width: 100%; }

    .qms-topbar {
      padding: 12px 16px;
      min-height: 58px;
    }

    .qms-page-title-bar { padding: 12px 14px 0; }
    .qms-page-body { padding: 14px 14px 24px; }
  }

  /* ══════════════════════════════════════
     SMALL MOBILE  ≤ 640px
  ══════════════════════════════════════ */
  @media (max-width: 640px) {
    .qms-topbar { padding: 10px 13px; gap: 10px; }
    .qms-topbar-right { gap: 8px; }

    /* Shrink chip on very small screens */
    .qms-top-chip { padding: 6px 10px 6px 6px; max-width: 160px; }
    .qms-top-name { max-width: 90px; }

    .qms-welcome h1 { font-size: 17px; }
    .qms-welcome p  { display: none; }

    .qms-page-title-bar { padding: 10px 12px 0; }
    .qms-page-title-inner { padding: 13px 15px; border-radius: 13px; }
    .qms-page-title-bar h2 { font-size: 17px; }

    .qms-page-body { padding: 12px 12px 20px; }
  }

  /* ══════════════════════════════════════
     VERY SMALL  ≤ 400px
  ══════════════════════════════════════ */
  @media (max-width: 400px) {
    .qms-top-chip { display: none; }
    .qms-welcome h1 { font-size: 15px; }
    .qms-page-title-bar h2 { font-size: 15px; }
    .qms-page-body { padding: 10px 10px 16px; }
  }
`;

/* ══════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════ */
export default function AppLayout({ children, title = "Monroy QMS" }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const goTo = (href) => {
    router.push(href);
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    try { await logout(); } finally { router.push("/login"); }
  };

  const userInitial = user?.email?.charAt(0)?.toUpperCase() || "U";
  const userName    = user?.email?.split("@")[0] || "User";

  return (
    <>
      <style>{CSS}</style>

      <div className="qms-root">

        {/* ── SIDEBAR ── */}
        <aside className={`qms-sidebar${menuOpen ? " open" : ""}`}>

          {/* Brand */}
          <button type="button" className="qms-brand" onClick={() => goTo("/dashboard")}>
            <div className="qms-brand-dot-grid">
              {Array.from({ length: 9 }).map((_, i) => <span key={i} />)}
            </div>
            <div className="qms-brand-logo">
              <img
                src="/logo.png"
                alt="Monroy"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
              <span className="qms-brand-fallback">M</span>
            </div>
            <div className="qms-brand-text">
              <h2>MONROY</h2>
              <p>QMS Workspace</p>
            </div>
          </button>

          {/* Nav */}
          <nav className="qms-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(item.href)}
                className={`qms-nav-btn${isActive(item.href) ? " active" : ""}`}
              >
                <span className="qms-nav-icon">{item.icon}</span>
                <span className="qms-nav-label">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Footer */}
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
        <div
          className={`qms-overlay${menuOpen ? " show" : ""}`}
          onClick={() => setMenuOpen(false)}
        />

        {/* ── MAIN ── */}
        <div className="qms-main">

          {/* Topbar */}
          <header className="qms-topbar">
            <div className="qms-topbar-left">
              {/* Hamburger */}
              <button
                type="button"
                className="qms-hamburger"
                onClick={() => setMenuOpen(true)}
                aria-label="Open navigation"
              >
                ☰
              </button>

              <div className="qms-welcome">
                <h1>Hi, {userName}!</h1>
                <p>Welcome to your Workspace</p>
              </div>
            </div>

            <div className="qms-topbar-right">
              {/* Notification bell */}
              <button type="button" className="qms-notify-btn" aria-label="Notifications">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6.5 16.5h11l-1.1-1.2a3 3 0 0 1-.8-2.05V10a4.6 4.6 0 1 0-9.2 0v3.25c0 .77-.29 1.5-.8 2.05L4.5 16.5h2Z"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  />
                  <path
                    d="M10 19a2 2 0 0 0 4 0"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                  />
                </svg>
                <span className="qms-notify-dot" />
              </button>

              {/* Profile chip */}
              <div className="qms-top-chip">
                <div className="qms-top-avatar">{userInitial}</div>
                <div className="qms-top-chip-text">
                  <span className="qms-top-name">{userName}</span>
                  <span className="qms-top-role">Admin</span>
                </div>
              </div>
            </div>
          </header>

          {/* Page title */}
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

          {/* Content */}
          <main className="qms-page-body">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
