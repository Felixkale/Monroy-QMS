"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const C = {
  green: "#00f5c4",
  purple: "#7c5cfc",
  blue: "#4fc3f7",
  pink: "#f472b6",
  yellow: "#fbbf24",
  red: "#f87171",
};

const rgbaMap = {
  [C.green]: "0,245,196",
  [C.blue]: "79,195,247",
  [C.purple]: "124,92,252",
  [C.pink]: "244,114,182",
  [C.yellow]: "251,191,36",
  [C.red]: "248,113,113",
};

function formatNumber(value) {
  if (value === null || value === undefined) return "0";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString();
}

function formatRelativeTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function statusChipStyle(color) {
  return {
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
    background: `rgba(${rgbaMap[color]},0.15)`,
    color,
    border: `1px solid rgba(${rgbaMap[color]},0.30)`,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    textTransform: "capitalize",
  };
}

function cardStyle(color) {
  return {
    background: `rgba(${rgbaMap[color]},0.07)`,
    border: `1px solid rgba(${rgbaMap[color]},0.25)`,
    borderRadius: 14,
    padding: 20,
  };
}

function panelStyle() {
  return {
    background: "linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
    border: "1px solid rgba(124,92,252,0.2)",
    borderRadius: 16,
    padding: 20,
  };
}

export default function SuperAdminDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [user, setUser] = useState(null);

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeClients: 0,
    activeAssets: 0,
    activeCertificates: 0,
    openNcrs: 0,
    activeAlerts: 0,
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    label: "Healthy",
    value: "Online",
    color: C.green,
  });

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setPageError("");

      try {
        const [
          authRes,
          usersRes,
          clientsRes,
          assetsRes,
          certsRes,
          ncrsRes,
          alertsRes,
          recentUsersRes,
          recentCertsRes,
          recentNcrsRes,
        ] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from("users").select("id", { count: "exact", head: true }),
          supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("assets").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("certificates").select("id", { count: "exact", head: true }).neq("status", "revoked"),
          supabase.from("ncrs").select("id", { count: "exact", head: true }).neq("status", "closed"),
          supabase.from("alerts").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase
            .from("users")
            .select("email, full_name, created_at, status")
            .order("created_at", { ascending: false })
            .limit(4),
          supabase
            .from("certificates")
            .select("certificate_number, company, status, created_at")
            .order("created_at", { ascending: false })
            .limit(4),
          supabase
            .from("ncrs")
            .select("ncr_number, description, status, created_at")
            .order("created_at", { ascending: false })
            .limit(4),
        ]);

        const authUser = authRes?.data?.user || null;
        setUser({
          name:
            authUser?.user_metadata?.full_name ||
            authUser?.email ||
            "Super Admin",
          email: authUser?.email || "",
        });

        const totalUsers = usersRes.count || 0;
        const activeClients = clientsRes.count || 0;
        const activeAssets = assetsRes.count || 0;
        const activeCertificates = certsRes.count || 0;
        const openNcrs = ncrsRes.count || 0;
        const activeAlerts = alertsRes.count || 0;

        setStats({
          totalUsers,
          activeClients,
          activeAssets,
          activeCertificates,
          openNcrs,
          activeAlerts,
        });

        const healthScore =
          100 -
          Math.min(20, openNcrs * 2) -
          Math.min(15, activeAlerts) -
          (activeClients === 0 ? 25 : 0);

        if (healthScore >= 85) {
          setSystemHealth({ label: "Healthy", value: `${healthScore}%`, color: C.green });
        } else if (healthScore >= 65) {
          setSystemHealth({ label: "Attention", value: `${healthScore}%`, color: C.yellow });
        } else {
          setSystemHealth({ label: "Critical", value: `${healthScore}%`, color: C.red });
        }

        const activity = [];

        for (const row of recentUsersRes.data || []) {
          activity.push({
            action: "User registered",
            detail: row.full_name || row.email || "User account",
            time: row.created_at,
            status: row.status === "active" ? "success" : "warning",
            sortTime: row.created_at,
          });
        }

        for (const row of recentCertsRes.data || []) {
          activity.push({
            action: "Certificate saved",
            detail: row.certificate_number || row.company || "Certificate record",
            time: row.created_at,
            status: row.status === "issued" ? "success" : "warning",
            sortTime: row.created_at,
          });
        }

        for (const row of recentNcrsRes.data || []) {
          activity.push({
            action: "NCR logged",
            detail: row.ncr_number || row.description || "NCR record",
            time: row.created_at,
            status: row.status === "closed" ? "success" : "warning",
            sortTime: row.created_at,
          });
        }

        activity.sort((a, b) => new Date(b.sortTime) - new Date(a.sortTime));
        setRecentActivity(activity.slice(0, 8));
      } catch (err) {
        setPageError(err?.message || "Failed to load super admin dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const statCards = useMemo(
    () => [
      { label: "Total Users", value: formatNumber(stats.totalUsers), color: C.blue, icon: "👥" },
      { label: "Active Clients", value: formatNumber(stats.activeClients), color: C.green, icon: "🏢" },
      { label: "Registered Assets", value: formatNumber(stats.activeAssets), color: C.purple, icon: "🛠️" },
      { label: "Certificates", value: formatNumber(stats.activeCertificates), color: C.yellow, icon: "📜" },
      { label: "Open NCRs", value: formatNumber(stats.openNcrs), color: stats.openNcrs > 0 ? C.pink : C.green, icon: "⚠️" },
      { label: "Active Alerts", value: formatNumber(stats.activeAlerts), color: stats.activeAlerts > 0 ? C.red : C.green, icon: "🔔" },
      { label: "System Health", value: systemHealth.value, color: systemHealth.color, icon: "💚" },
      { label: "Platform Status", value: systemHealth.label, color: systemHealth.color, icon: "🖥️" },
    ],
    [stats, systemHealth]
  );

  const quickActions = [
    { label: "Manage Users", detail: "Roles, access, activation", href: "/superadmin/users", color: C.blue, icon: "👤" },
    { label: "Manage Clients", detail: "Client accounts and status", href: "/clients", color: C.green, icon: "🏢" },
    { label: "Equipment Register", detail: "Assets and certification records", href: "/equipment", color: C.purple, icon: "🛠️" },
    { label: "Certificates", detail: "View and edit issued certificates", href: "/certificates", color: C.yellow, icon: "📄" },
  ];

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#0f1419",
        color: "#e2e8f0",
        flexDirection: "column",
      }}
    >
      <main style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontSize: "clamp(22px,4vw,32px)",
              fontWeight: 900,
              margin: 0,
              background: `linear-gradient(90deg,#fff 30%,${C.purple})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Super Admin Dashboard
          </h1>
          <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>
            Welcome back, {user?.name || "Admin"}
            {user?.email ? ` · ${user.email}` : ""}
          </p>
        </div>

        {pageError ? (
          <div
            style={{
              marginBottom: 18,
              padding: "12px 14px",
              borderRadius: 12,
              background: "rgba(244,114,182,0.10)",
              border: "1px solid rgba(244,114,182,0.30)",
              color: C.pink,
              fontSize: 13,
            }}
          >
            ⚠️ {pageError}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
            gap: 16,
            marginBottom: 22,
          }}
        >
          {statCards.map((stat) => (
            <div key={stat.label} style={cardStyle(stat.color)}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                  }}
                >
                  {stat.label}
                </span>
                <span style={{ fontSize: 18 }}>{stat.icon}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: stat.color }}>
                {loading ? "..." : stat.value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div style={panelStyle()}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 14 }}>
              System Activity
            </h2>

            {loading ? (
              <div style={{ color: "#64748b", fontSize: 13 }}>Loading activity...</div>
            ) : recentActivity.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: 13 }}>No recent activity found.</div>
            ) : (
              recentActivity.map((log, i) => (
                <div
                  key={`${log.action}-${log.sortTime}-${i}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom:
                      i < recentActivity.length - 1
                        ? "1px solid rgba(255,255,255,0.04)"
                        : "none",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>
                      {log.action}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#64748b",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {log.detail}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span style={statusChipStyle(log.status === "success" ? C.green : C.yellow)}>
                      {log.status === "success" ? "✓" : "⚠"} {log.status}
                    </span>
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>
                      {formatRelativeTime(log.time)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            <div style={panelStyle()}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 14 }}>
                Quick Actions
              </h2>

              <div style={{ display: "grid", gap: 12 }}>
                {quickActions.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => router.push(item.href)}
                    style={{
                      textAlign: "left",
                      padding: 14,
                      borderRadius: 12,
                      border: `1px solid rgba(${rgbaMap[item.color]},0.25)`,
                      background: `rgba(${rgbaMap[item.color]},0.08)`,
                      cursor: "pointer",
                      color: "#e2e8f0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ fontWeight: 800, fontSize: 13 }}>{item.label}</span>
                      <span>{item.icon}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{item.detail}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={panelStyle()}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 14 }}>
                Oversight Summary
              </h2>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "#94a3b8" }}>User accounts</span>
                  <span style={{ color: "#fff", fontWeight: 700 }}>{formatNumber(stats.totalUsers)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "#94a3b8" }}>Client base</span>
                  <span style={{ color: "#fff", fontWeight: 700 }}>{formatNumber(stats.activeClients)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "#94a3b8" }}>Assets monitored</span>
                  <span style={{ color: "#fff", fontWeight: 700 }}>{formatNumber(stats.activeAssets)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "#94a3b8" }}>Open NCRs</span>
                  <span style={{ color: stats.openNcrs > 0 ? C.pink : "#fff", fontWeight: 700 }}>
                    {formatNumber(stats.openNcrs)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "#94a3b8" }}>Active alerts</span>
                  <span style={{ color: stats.activeAlerts > 0 ? C.red : "#fff", fontWeight: 700 }}>
                    {formatNumber(stats.activeAlerts)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
