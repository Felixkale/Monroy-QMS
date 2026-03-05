"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const router = useRouter();

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUser(data.user);
      setLoading(false);
    }
    getUser();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading)
    return <div className={styles.loading}>Loading Dashboard...</div>;

  const kpiMetrics = [
    { label: "Total Clients", value: "24", change: "+2 this month", trend: "positive" },
    { label: "Total Equipment", value: "186", change: "+12 new", trend: "positive" },
    { label: "Inspections", value: "38", change: "+5 completed", trend: "positive" },
    { label: "Pending Tasks", value: "7", change: "-1 overdue", trend: "negative" },
    { label: "Open NCRs", value: "3", change: "→ No change", trend: "neutral" },
    { label: "Certificates", value: "156", change: "+4 issued", trend: "positive" },
  ];

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "clients", label: "Clients", icon: "🏢" },
    { id: "equipment", label: "Equipment", icon: "⚙️" },
    { id: "inspections", label: "Inspections", icon: "🔍" },
    { id: "ncr", label: "NCR", icon: "⚠️" },
    { id: "certificates", label: "Certificates", icon: "📜" },
    { id: "reports", label: "Reports", icon: "📈" },
    { id: "admin", label: "Admin", icon: "⚡" },
  ];

  const recentInspections = [
    { equipment: "Pressure Vessel PV-001", inspector: "John Smith", date: "2026-03-05", status: "Completed" },
    { equipment: "Boiler BL-042", inspector: "Sarah Johnson", date: "2026-03-04", status: "In Progress" },
    { equipment: "Air Receiver AR-156", inspector: "Michael Chen", date: "2026-03-03", status: "Pending Review" },
    { equipment: "Compressor CP-089", inspector: "Emily Davis", date: "2026-02-28", status: "Completed" },
  ];

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <h2>Monroy QMS</h2>
          <p>Enterprise Platform</p>
        </div>

        <nav className={styles.nav}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`${styles.navItem} ${
                activeMenu === item.id ? styles.active : ""
              }`}
              onClick={() => setActiveMenu(item.id)}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.user}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {user?.email?.[0].toUpperCase()}
            </div>
            <div>
              <p className={styles.userEmail}>{user?.email}</p>
              <p className={styles.userRole}>Admin</p>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.header}>
          <h1>Dashboard</h1>
          <p>Real-time overview of enterprise inspection operations</p>
        </div>

        {/* KPI Cards */}
        <div className={styles.kpiGrid}>
          {kpiMetrics.map((metric, idx) => (
            <div key={idx} className={styles.kpiCard}>
              <p className={styles.kpiLabel}>{metric.label}</p>
              <div className={styles.kpiValue}>{metric.value}</div>
              <p className={`${styles.kpiChange} ${styles[metric.trend]}`}>
                {metric.change}
              </p>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <h3>Inspection Trends</h3>
            <p className={styles.chartDescription}>Last 6 months performance</p>
          </div>
          <div className={styles.chartCard}>
            <h3>Equipment Distribution</h3>
            <p className={styles.chartDescription}>By equipment type</p>
          </div>
          <div className={styles.chartCard}>
            <h3>Monthly Performance</h3>
            <p className={styles.chartDescription}>Week by week breakdown</p>
          </div>
          <div className={styles.chartCard}>
            <h3>License Status</h3>
            <p className={styles.chartDescription}>Compliance overview</p>
          </div>
          <div className={styles.chartCard}>
            <h3>NCR Distribution</h3>
            <p className={styles.chartDescription}>Severity analysis</p>
          </div>
          <div className={styles.chartCard}>
            <h3>Client Compliance</h3>
            <p className={styles.chartDescription}>Compliance by client</p>
          </div>
        </div>

        {/* Recent Inspections Table */}
        <div className={styles.tableSection}>
          <h3>Recent Inspections</h3>
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <div>Equipment</div>
              <div>Inspector</div>
              <div>Last Inspection</div>
              <div>Status</div>
            </div>
            {recentInspections.map((inspection, idx) => (
              <div key={idx} className={styles.tableRow}>
                <div>{inspection.equipment}</div>
                <div>{inspection.inspector}</div>
                <div>{inspection.date}</div>
                <div>
                  <span
                    className={`${styles.statusBadge} ${styles[
                      `badge-${inspection.status.toLowerCase().replace(" ", "-")}`
                    ]}`}
                  >
                    {inspection.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className={styles.actionSection}>
          <button className={styles.actionBtn}>📝 Create Inspection</button>
          <button className={styles.actionBtn}>🏷️ Generate QR Code</button>
          <button className={styles.actionBtn}>➕ Register Equipment</button>
          <button className={styles.actionBtn}>📄 Export Report</button>
        </div>
      </main>
    </div>
  );
}
