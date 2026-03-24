"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthContext";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "📊", href: "/dashboard" },
  { id: "clients", label: "Clients", icon: "🏢", href: "/clients" },
  { id: "register-client", label: "Register Client", icon: "➕", href: "/clients/register" },
  { id: "equipment", label: "Equipment", icon: "⚙️", href: "/equipment" },
  { id: "inspections", label: "Inspections", icon: "🔍", href: "/inspections" },
  { id: "ncr", label: "NCR", icon: "⚠️", href: "/ncr" },
  { id: "certificates", label: "Certificates", icon: "📜", href: "/certificates" },
  { id: "reports", label: "Reports", icon: "📈", href: "/reports" },
  { id: "admin", label: "Admin", icon: "⚡", href: "/admin" },
];

export default function AppLayout({ children, title = "Monroy QMS" }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const goTo = (href) => {
    router.push(href);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      router.push("/login");
    }
  };

  const handleDashboardClick = () => {
    router.push("/dashboard");
    setMobileMenuOpen(false);
  };

  const userInitial = user?.email?.charAt(0)?.toUpperCase() || "U";
  const userName = user?.email?.split("@")[0] || "User";

  return (
    <>
      <div className="layout-root">
        <div className="ambient ambient-1" />
        <div className="ambient ambient-2" />
        <div className="ambient ambient-3" />

        <div className="bg-screen bg-left" />
        <div className="bg-screen bg-right" />
        <div className="bg-screen bg-center" />
        <div className="desk-line" />
        <div className="plant">
          <span className="leaf leaf-1" />
          <span className="leaf leaf-2" />
          <span className="leaf leaf-3" />
          <span className="pot" />
        </div>

        <div className="workspace-board">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
          >
            ☰
          </button>

          <aside className={`sidebar ${mobileMenuOpen ? "open" : ""}`}>
            <div className="sidebar-top">
              <button
                type="button"
                className="brand"
                onClick={handleDashboardClick}
              >
                <div className="brand-mark">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>

                <div className="brand-logo-wrap">
                  <img
                    src="/logo.png"
                    alt="Monroy Logo"
                    className="brand-logo"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <span className="brand-logo-fallback">M</span>
                </div>

                <div className="brand-text-wrap">
                  <h2 className="brand-title">MONROY</h2>
                  <p className="brand-subtitle">QMS WORKSPACE</p>
                </div>
              </button>
            </div>

            <nav className="nav-list">
              {navItems.map((item) => {
                const active = isActive(item.href);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goTo(item.href)}
                    className={`nav-btn ${active ? "active" : ""}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="sidebar-footer">
              <div className="profile-card">
                <div className="avatar">{userInitial}</div>

                <div className="profile-text">
                  <p className="profile-name">{userName}</p>
                  <p className="profile-email">{user?.email || "No email"}</p>
                </div>
              </div>

              <button
                type="button"
                className="logout-btn"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </aside>

          <div
            className={`mobile-overlay ${mobileMenuOpen ? "show" : ""}`}
            onClick={() => setMobileMenuOpen(false)}
          />

          <section className="content-shell">
            <header className="topbar">
              <div className="welcome-wrap">
                <h1 className="welcome-title">Hi, {userName}!</h1>
                <p className="welcome-subtitle">Welcome to your Workspace</p>
              </div>

              <div className="topbar-right">
                <button type="button" className="notify-btn" aria-label="Notifications">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6.5 16.5h11l-1.1-1.2a3 3 0 0 1-.8-2.05V10a4.6 4.6 0 1 0-9.2 0v3.25c0 .77-.29 1.5-.8 2.05L4.5 16.5h2Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 19a2 2 0 0 0 4 0"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="notify-dot" />
                </button>

                <div className="top-profile-chip">
                  <div className="top-avatar">{userInitial}</div>
                  <div className="top-profile-text">
                    <span className="top-profile-name">{userName}</span>
                    <span className="top-profile-role">Admin</span>
                  </div>
                  <span className="top-profile-caret">▾</span>
                </div>
              </div>
            </header>

            {title !== "Dashboard" ? (
              <div className="page-title-card">
                <h2>{title}</h2>
                <div className="page-title-line" />
              </div>
            ) : null}

            <main className="page-content">{children}</main>
          </section>
        </div>
      </div>

      <style jsx>{`
        :global(html, body) {
          margin: 0;
          padding: 0;
          background: #5e6975;
        }

        :global(*) {
          box-sizing: border-box;
        }

        .layout-root {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          padding: 20px;
          background:
            radial-gradient(circle at 50% 8%, rgba(173, 247, 255, 0.18), transparent 26%),
            radial-gradient(circle at 5% 100%, rgba(79, 195, 247, 0.11), transparent 30%),
            linear-gradient(180deg, #68727d 0%, #535d68 34%, #3f4852 68%, #313943 100%);
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #f4fbff;
        }

        .ambient {
          position: absolute;
          border-radius: 999px;
          filter: blur(80px);
          pointer-events: none;
        }

        .ambient-1 {
          top: -80px;
          left: -20px;
          width: 320px;
          height: 180px;
          background: rgba(146, 255, 255, 0.12);
        }

        .ambient-2 {
          right: 8%;
          top: 12%;
          width: 260px;
          height: 180px;
          background: rgba(96, 165, 250, 0.08);
        }

        .ambient-3 {
          left: 25%;
          bottom: -40px;
          width: 260px;
          height: 180px;
          background: rgba(255, 255, 255, 0.05);
        }

        .bg-screen {
          position: absolute;
          width: 220px;
          height: 220px;
          top: 28%;
          border-radius: 12px;
          background:
            linear-gradient(180deg, rgba(11, 20, 30, 0.92), rgba(5, 12, 20, 0.92)),
            radial-gradient(circle at 50% 50%, rgba(154, 249, 255, 0.08), transparent 45%);
          border: 1px solid rgba(180, 240, 255, 0.12);
          box-shadow:
            0 20px 40px rgba(0, 0, 0, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
          opacity: 0.78;
          pointer-events: none;
        }

        .bg-left {
          left: max(0px, calc(50% - 620px));
        }

        .bg-right {
          right: max(0px, calc(50% - 620px));
        }

        .bg-center {
          width: 320px;
          height: 180px;
          left: 50%;
          bottom: 100px;
          top: auto;
          transform: translateX(-50%);
          opacity: 0.56;
        }

        .desk-line {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 96px;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.01));
          pointer-events: none;
        }

        .plant {
          position: absolute;
          right: max(10px, calc(50% - 640px));
          bottom: 70px;
          width: 100px;
          height: 150px;
          pointer-events: none;
        }

        .leaf {
          position: absolute;
          display: block;
          background: linear-gradient(180deg, #7edfa2, #3da56c);
          border-radius: 100% 0;
          transform-origin: bottom center;
          opacity: 0.9;
        }

        .leaf-1 {
          width: 34px;
          height: 74px;
          left: 28px;
          top: 8px;
          transform: rotate(-14deg);
        }

        .leaf-2 {
          width: 30px;
          height: 66px;
          left: 48px;
          top: 18px;
          transform: rotate(14deg);
        }

        .leaf-3 {
          width: 26px;
          height: 58px;
          left: 16px;
          top: 28px;
          transform: rotate(-28deg);
        }

        .pot {
          position: absolute;
          left: 18px;
          bottom: 0;
          width: 58px;
          height: 54px;
          background: linear-gradient(180deg, #f8fbfd, #d9e4ea);
          border-radius: 10px 10px 16px 16px;
          box-shadow: 0 18px 22px rgba(0, 0, 0, 0.12);
        }

        .workspace-board {
          position: relative;
          z-index: 2;
          min-height: calc(100vh - 40px);
          border-radius: 34px;
          border: 1px solid rgba(173, 251, 255, 0.36);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05)),
            rgba(255,255,255,0.05);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.18),
            inset 0 0 0 1px rgba(255,255,255,0.03),
            0 24px 90px rgba(7, 15, 24, 0.22);
          backdrop-filter: blur(18px) saturate(150%);
          -webkit-backdrop-filter: blur(18px) saturate(150%);
          overflow: hidden;
          display: grid;
          grid-template-columns: 280px minmax(0, 1fr);
        }

        .workspace-board::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.20), transparent 14%),
            linear-gradient(90deg, rgba(255,255,255,0.04), transparent 18%, transparent 82%, rgba(255,255,255,0.04));
        }

        .mobile-menu-btn {
          display: none;
        }

        .sidebar {
          position: relative;
          z-index: 3;
          padding: 18px 14px 16px;
          border-right: 1px solid rgba(180, 240, 255, 0.10);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03)),
            rgba(255,255,255,0.02);
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 40px);
        }

        .sidebar-top {
          padding: 4px 2px 18px;
        }

        .brand {
          width: 100%;
          border: 0;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          color: #f2feff;
          text-align: left;
          padding: 0;
        }

        .brand-mark {
          display: grid;
          grid-template-columns: repeat(3, 4px);
          gap: 3px;
          flex-shrink: 0;
        }

        .brand-mark span {
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: rgba(213, 250, 255, 0.88);
          box-shadow: 0 0 8px rgba(156, 244, 255, 0.45);
        }

        .brand-logo-wrap {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05)),
            rgba(255,255,255,0.04);
          border: 1px solid rgba(169, 251, 255, 0.18);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.16),
            0 10px 24px rgba(0,0,0,0.08);
          flex-shrink: 0;
        }

        .brand-logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .brand-logo-fallback {
          font-size: 18px;
          font-weight: 900;
          color: #ffffff;
        }

        .brand-text-wrap {
          min-width: 0;
        }

        .brand-title {
          margin: 0;
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 0.16em;
          color: #ecfdff;
          text-shadow: 0 0 10px rgba(156, 244, 255, 0.18);
        }

        .brand-subtitle {
          margin: 3px 0 0;
          font-size: 10px;
          letter-spacing: 0.16em;
          color: rgba(236, 253, 255, 0.56);
        }

        .nav-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 6px 0 12px;
          flex: 1;
          overflow-y: auto;
        }

        .nav-btn {
          width: 100%;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 18px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04)),
            rgba(255,255,255,0.03);
          color: rgba(244, 251, 255, 0.78);
          padding: 13px 15px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition:
            transform 0.22s ease,
            background 0.22s ease,
            border-color 0.22s ease,
            box-shadow 0.22s ease,
            color 0.22s ease;
          text-align: left;
          font-family: inherit;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .nav-btn:hover {
          transform: translateY(-1px);
          color: #ffffff;
          border-color: rgba(164, 250, 255, 0.24);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05)),
            rgba(143, 244, 255, 0.06);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.12),
            0 0 20px rgba(116, 243, 255, 0.06);
        }

        .nav-btn.active {
          color: #ffffff;
          border-color: rgba(145, 227, 255, 0.42);
          background:
            linear-gradient(180deg, rgba(153,224,255,0.36), rgba(90,177,255,0.22)),
            rgba(108,196,255,0.10);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.20),
            0 0 24px rgba(103, 193, 255, 0.18);
        }

        .nav-icon {
          width: 22px;
          min-width: 22px;
          display: inline-flex;
          justify-content: center;
          font-size: 16px;
          line-height: 1;
        }

        .nav-label {
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-footer {
          margin-top: auto;
          padding-top: 14px;
          border-top: 1px solid rgba(180, 240, 255, 0.10);
        }

        .profile-card {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          padding: 12px;
          border-radius: 18px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03)),
            rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.10);
        }

        .avatar,
        .top-avatar {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 800;
          color: #ffffff;
          background:
            linear-gradient(135deg, rgba(111,230,255,0.60), rgba(102,126,234,0.52)),
            rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.18),
            0 10px 22px rgba(0,0,0,0.12);
          flex-shrink: 0;
        }

        .profile-text,
        .top-profile-text {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .profile-name,
        .top-profile-name {
          margin: 0;
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .profile-email,
        .top-profile-role {
          margin: 3px 0 0;
          font-size: 11px;
          color: rgba(244, 251, 255, 0.56);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .logout-btn {
          width: 100%;
          height: 44px;
          border: 1px solid rgba(164, 250, 255, 0.18);
          border-radius: 16px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03)),
            rgba(255,255,255,0.02);
          color: rgba(244, 251, 255, 0.90);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.22s ease;
          font-family: inherit;
        }

        .logout-btn:hover {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04)),
            rgba(143, 244, 255, 0.06);
          border-color: rgba(164, 250, 255, 0.28);
          transform: translateY(-1px);
        }

        .mobile-overlay {
          display: none;
        }

        .content-shell {
          position: relative;
          z-index: 2;
          padding: 18px 18px 20px;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .topbar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 6px 2px 4px;
          flex-wrap: wrap;
        }

        .welcome-wrap {
          min-width: 0;
        }

        .welcome-title {
          margin: 0;
          font-size: clamp(24px, 3.4vw, 34px);
          font-weight: 900;
          line-height: 1.05;
          color: #f7feff;
          text-shadow: 0 0 12px rgba(112, 235, 255, 0.16);
        }

        .welcome-subtitle {
          margin: 6px 0 0;
          font-size: 14px;
          color: rgba(238, 251, 255, 0.70);
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .notify-btn {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.10);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03)),
            rgba(255,255,255,0.02);
          color: rgba(244, 251, 255, 0.90);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.10);
        }

        .notify-btn svg {
          width: 18px;
          height: 18px;
        }

        .notify-dot {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #ff5b6b;
          box-shadow: 0 0 10px rgba(255, 91, 107, 0.58);
        }

        .top-profile-chip {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          padding: 8px 12px 8px 8px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.12);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04)),
            rgba(255,255,255,0.03);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.12),
            0 12px 24px rgba(0,0,0,0.08);
        }

        .top-profile-role {
          color: rgba(244, 251, 255, 0.56);
        }

        .top-profile-caret {
          color: rgba(244, 251, 255, 0.58);
          font-size: 12px;
          margin-left: 2px;
        }

        .page-title-card {
          padding: 18px 18px 16px;
          border-radius: 24px;
          border: 1px solid rgba(180, 240, 255, 0.12);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03)),
            rgba(255,255,255,0.03);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.10),
            0 14px 34px rgba(0,0,0,0.08);
        }

        .page-title-card h2 {
          margin: 0;
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 900;
          color: #ffffff;
          letter-spacing: -0.02em;
        }

        .page-title-line {
          margin-top: 12px;
          width: 84px;
          height: 4px;
          border-radius: 999px;
          background: linear-gradient(90deg, #94ffff 0%, #60a5fa 55%, #a78bfa 100%);
          box-shadow: 0 0 14px rgba(148, 255, 255, 0.24);
        }

        .page-content {
          min-width: 0;
          flex: 1;
          position: relative;
        }

        @media (max-width: 1100px) {
          .workspace-board {
            grid-template-columns: 250px minmax(0, 1fr);
          }

          .sidebar {
            padding-inline: 12px;
          }

          .brand-title {
            font-size: 14px;
          }
        }

        @media (max-width: 900px) {
          .layout-root {
            padding: 14px;
          }

          .workspace-board {
            min-height: calc(100vh - 28px);
            grid-template-columns: 1fr;
            border-radius: 28px;
          }

          .mobile-menu-btn {
            position: absolute;
            top: 16px;
            left: 16px;
            z-index: 8;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            border-radius: 14px;
            border: 1px solid rgba(255,255,255,0.12);
            background:
              linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04)),
              rgba(255,255,255,0.04);
            color: #ffffff;
            font-size: 20px;
            cursor: pointer;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.10);
          }

          .sidebar {
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            width: min(300px, calc(100% - 42px));
            transform: translateX(-104%);
            transition: transform 0.26s ease;
            border-right: 1px solid rgba(180, 240, 255, 0.14);
            background:
              linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04)),
              rgba(32, 40, 50, 0.76);
            backdrop-filter: blur(22px) saturate(150%);
            -webkit-backdrop-filter: blur(22px) saturate(150%);
            z-index: 9;
            min-height: 100%;
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .mobile-overlay {
            display: block;
            position: absolute;
            inset: 0;
            background: rgba(5, 11, 18, 0.28);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.22s ease;
            z-index: 7;
          }

          .mobile-overlay.show {
            opacity: 1;
            pointer-events: auto;
          }

          .content-shell {
            padding: 72px 14px 16px;
          }

          .topbar {
            padding-top: 0;
          }

          .bg-left,
          .bg-right,
          .bg-center,
          .plant {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .layout-root {
            padding: 10px;
          }

          .workspace-board {
            min-height: calc(100vh - 20px);
            border-radius: 22px;
          }

          .content-shell {
            padding: 68px 12px 14px;
            gap: 14px;
          }

          .topbar {
            gap: 12px;
          }

          .topbar-right {
            width: 100%;
            justify-content: space-between;
          }

          .top-profile-chip {
            min-width: 0;
            max-width: 100%;
          }

          .top-profile-name {
            max-width: 120px;
          }

          .page-title-card {
            padding: 16px 14px 14px;
            border-radius: 18px;
          }

          .page-title-card h2 {
            font-size: 22px;
          }
        }
      `}</style>
    </>
  );
}
