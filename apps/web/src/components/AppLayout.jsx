"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthContext";

const C = { green: "#00f5c4", purple: "#7c5cfc", blue: "#4fc3f7" };

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

  const handleDashboardClick = () => {
    router.push("/dashboard");
    setMobileMenuOpen(false);
  };

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const goTo = (href) => {
    router.push(href);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Get user initials
  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";
  const userName = user?.email?.split("@")[0] || "User";

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#0f1419",
        color: "#e2e8f0",
      }}
    >
      <aside
        style={{
          width: "280px",
          background: "linear-gradient(180deg, #1a1f2e 0%, #16192b 100%)",
          padding: "24px 0",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid rgba(102, 126, 234, 0.15)",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
        }}
      >
        <div
          onClick={handleDashboardClick}
          style={{
            padding: "0 24px 32px",
            borderBottom: "1px solid rgba(102, 126, 234, 0.1)",
            cursor: "pointer",
            transition: "all 0.25s",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.8";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              position: "relative",
              flexShrink: 0,
              borderRadius: 10,
              overflow: "hidden",
              background: "rgba(255,255,255,0.03)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src="/logo.png"
              alt="Monroy Logo"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <span style={{ fontWeight: 900, fontSize: 18, color: "#fff" }}>M</span>
          </div>

          <div>
            <h2
              style={{
                fontSize: 14,
                fontWeight: 900,
                margin: 0,
                color: "#fff",
                letterSpacing: "-0.5px",
              }}
            >
              Monroy
            </h2>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 10,
                color: "rgba(255,255,255,0.6)",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              QMS Platform
            </p>
          </div>
        </div>

        <nav
          style={{
            flex: 1,
            padding: "16px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {navItems.map((item) => {
            const active = isActive(item.href);

            return (
              <button
                key={item.id}
                onClick={() => goTo(item.href)}
                style={{
                  background: active ? "rgba(102, 126, 234, 0.16)" : "none",
                  border: active ? "1px solid rgba(102, 126, 234, 0.25)" : "1px solid transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.65)",
                  padding: "12px 16px",
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  borderRadius: 8,
                  cursor: "pointer",
                  transition: "all 0.25s",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "rgba(102, 126, 234, 0.12)";
                    e.currentTarget.style.color = "#fff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = "none";
                    e.currentTarget.style.color = "rgba(255,255,255,0.65)";
                  }
                }}
              >
                <span style={{ fontSize: 18, minWidth: 24 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div
          style={{
            padding: "16px 12px",
            borderTop: "1px solid rgba(102, 126, 234, 0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              {userInitial}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: "#fff", margin: 0 }}>{userName}</p>
              <p style={{ fontSize: 11, margin: "2px 0 0", color: "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            type="button"
            style={{
              width: "100%",
              background: "rgba(102, 126, 234, 0.15)",
              border: "1px solid rgba(102, 126, 234, 0.3)",
              color: "#667eea",
              padding: "8px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.25s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(102, 126, 234, 0.25)";
              e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(102, 126, 234, 0.15)";
              e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.3)";
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <main
          style={{
            flex: 1,
            padding: "32px",
            overflowY: "auto",
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(22px,4vw,32px)",
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: "-0.5px",
              }}
            >
              {title}
            </h1>
            <div
              style={{
                marginTop: 8,
                width: 72,
                height: 4,
                borderRadius: 999,
                background: `linear-gradient(90deg, ${C.green} 0%, ${C.purple} 50%, ${C.blue} 100%)`,
              }}
            />
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
