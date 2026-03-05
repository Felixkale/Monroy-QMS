
"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const C = {
  green:  "#00f5c4",
  purple: "#7c5cfc",
  blue:   "#4fc3f7",
  pink:   "#f472b6",
  yellow: "#fbbf24",
};

const navItems = [
  { id: "dashboard",    label: "Dashboard",    icon: "📊", href: "/dashboard"    },
  { id: "clients",      label: "Clients",      icon: "🏢", href: "/clients"      },
  { id: "equipment",    label: "Equipment",    icon: "⚙️", href: "/equipment"    },
  { id: "inspections",  label: "Inspections",  icon: "🔍", href: "/inspections"  },
  { id: "ncr",          label: "NCR",          icon: "⚠️", href: "/ncr"          },
  { id: "certificates", label: "Certificates", icon: "📜", href: "/certificates" },
  { id: "reports",      label: "Reports",      icon: "📈", href: "/reports"      },
  { id: "admin",        label: "Admin",        icon: "⚡", href: "/admin"        },
];

export default function AppLayout({ children }) {
  const [user,        setUser]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pulse,       setPulse]       = useState(false);
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => { checkUser(); }, []);
  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 2000);
    return () => clearInterval(t);
  }, []);

  async function checkUser() {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) { router.push("/login"); return; }
      setUser(data.user);
    } catch { router.push("/login"); }
    finally  { setLoading(false); }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"#0d0d1a", color:C.green, fontFamily:"Sora,sans-serif",
      fontSize:16, fontWeight:700, letterSpacing:"0.1em",
    }}>Loading…</div>
  );

  const SidebarContent = () => (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Logo */}
      <div style={{ padding:"0 20px 28px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
          <div style={{
            width:36, height:36, borderRadius:10,
            background:`linear-gradient(135deg,${C.purple},${C.green})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:18, boxShadow:`0 0 16px rgba(124,92,252,0.5)`, flexShrink:0,
          }}>⚡</div>
          <div>
            <div style={{
              fontSize:16, fontWeight:800, letterSpacing:"0.04em",
              background:`linear-gradient(90deg,${C.green},${C.blue})`,
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            }}>Monroy QMS</div>
            <div style={{ fontSize:9, color:"#64748b", letterSpacing:"0.15em", textTransform:"uppercase" }}>
              Enterprise Platform
            </div>
          </div>
        </div>
        <div style={{
          display:"flex", alignItems:"center", gap:6, marginTop:12,
          padding:"6px 12px", background:"rgba(0,245,196,0.08)",
          border:"1px solid rgba(0,245,196,0.2)", borderRadius:20, width:"fit-content",
        }}>
          <div style={{
            width:7, height:7, borderRadius:"50%", background:C.green,
            boxShadow: pulse ? `0 0 8px ${C.green}` : "none", transition:"box-shadow 0.5s",
          }}/>
          <span style={{ fontSize:10, color:C.green, fontWeight:600, letterSpacing:"0.08em" }}>LIVE</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:"0 10px" }}>
        {navItems.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.id} href={item.href}
              onClick={() => setSidebarOpen(false)}
              style={{
                display:"flex", alignItems:"center", gap:12,
                padding:"11px 14px", borderRadius:10, marginBottom:3,
                cursor:"pointer", textDecoration:"none",
                background: active
                  ? "linear-gradient(90deg,rgba(124,92,252,0.25),rgba(0,245,196,0.1))"
                  : "transparent",
                borderLeft: active ? `3px solid ${C.green}` : "3px solid transparent",
                color: active ? "#fff" : "#64748b",
                fontWeight: active ? 700 : 400,
                fontSize:13, transition:"all 0.2s",
              }}>
              <span style={{ fontSize:15 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding:"16px 16px 0" }}>
        <div style={{
          padding:"12px 14px", borderRadius:12,
          background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)",
          marginBottom:10, display:"flex", alignItems:"center", gap:10,
        }}>
          <div style={{
            width:34, height:34, borderRadius:"50%", flexShrink:0,
            background:`linear-gradient(135deg,${C.purple},${C.green})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:800, fontSize:13,
          }}>{user?.email?.[0].toUpperCase()}</div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:11, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {user?.email}
            </div>
            <div style={{ fontSize:10, color:"#64748b" }}>Admin</div>
          </div>
        </div>
        <button onClick={handleLogout} style={{
          width:"100%", padding:"9px",
          background:"linear-gradient(90deg,rgba(124,92,252,0.3),rgba(0,245,196,0.15))",
          border:"1px solid rgba(124,92,252,0.4)",
          borderRadius:10, color:C.green,
          fontWeight:700, fontSize:12, cursor:"pointer",
          letterSpacing:"0.05em", fontFamily:"inherit",
        }}>Logout</button>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#0d0d1a",
      fontFamily:"'Sora','DM Sans',sans-serif", color:"#e2e8f0" }}>

      {/* Desktop Sidebar */}
      <aside className="desktop-sidebar" style={{
        width:230, flexShrink:0,
        background:"linear-gradient(180deg,#13132a 0%,#0f0f22 100%)",
        borderRight:"1px solid rgba(124,92,252,0.2)",
        padding:"28px 0 20px",
        position:"sticky", top:0, height:"100vh", overflowY:"auto",
      }}>
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.6)",
          zIndex:40, display:"none",
        }} className="mobile-overlay"/>
      )}

      {/* Mobile Drawer */}
      <aside className="mobile-sidebar" style={{
        position:"fixed", left:0, top:0, bottom:0, width:230,
        background:"linear-gradient(180deg,#13132a 0%,#0f0f22 100%)",
        borderRight:"1px solid rgba(124,92,252,0.2)",
        padding:"28px 0 20px",
        zIndex:50, overflowY:"auto",
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition:"transform 0.3s ease",
        display:"none",
      }}>
        <SidebarContent />
      </aside>

      {/* Content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>

        {/* Mobile topbar */}
        <div className="mobile-topbar" style={{
          display:"none", alignItems:"center", justifyContent:"space-between",
          padding:"14px 16px",
          background:"#13132a", borderBottom:"1px solid rgba(124,92,252,0.2)",
          position:"sticky", top:0, zIndex:30,
        }}>
          <button onClick={() => setSidebarOpen(o => !o)} style={{
            background:"rgba(124,92,252,0.15)", border:"1px solid rgba(124,92,252,0.3)",
            borderRadius:8, color:"#fff", padding:"6px 10px", cursor:"pointer",
            fontSize:18, lineHeight:1,
          }}>☰</button>
          <div style={{
            fontSize:15, fontWeight:800,
            background:`linear-gradient(90deg,${C.green},${C.blue})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>Monroy QMS</div>
          <div style={{ width:36 }}/>
        </div>

        <main style={{ flex:1, padding:"32px", overflowY:"auto" }} className="main-content">
          {children}
        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:#0d0d1a; }
        ::-webkit-scrollbar-thumb { background:rgba(124,92,252,0.4); border-radius:4px; }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-sidebar   { display: block !important; }
          .mobile-topbar    { display: flex !important; }
          .mobile-overlay   { display: block !important; }
          .main-content     { padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}
