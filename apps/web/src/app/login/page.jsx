"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };

const demoUsers = [
  { email: "superadmin@monroy.com", password: "superadmin123", role: "Super Admin", description: "Full system access" },
  { email: "admin@monroy.com", password: "admin123", role: "Admin", description: "User & module management" },
  { email: "inspector@monroy.com", password: "inspector123", role: "Inspector", description: "Inspection management" },
  { email: "supervisor@monroy.com", password: "supervisor123", role: "Supervisor", description: "Team oversight" },
  { email: "client@acme.com", password: "client123", role: "Client Manager", description: "Compliance view" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    fetchAvailableUsers();
  }, []);

  async function fetchAvailableUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('email, full_name, role')
        .order('role');

      if (!error && data) {
        setAllUsers(data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Fetch user role from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        setError("Error fetching user details");
        setLoading(false);
        return;
      }

      const role = userData?.role || 'user';
      
      setTimeout(() => {
        router.push(getRoleDashboard(role));
      }, 500);
    } catch (error) {
      setError("Login failed. Please try again.");
      setLoading(false);
    }
  }

  function getRoleDashboard(role) {
    switch(role) {
      case "superadmin": return "/superadmin/dashboard";
      case "admin": return "/admin/dashboard";
      case "inspector": return "/inspector/dashboard";
      case "supervisor": return "/supervisor/dashboard";
      case "client": return "/client/dashboard";
      default: return "/dashboard";
    }
  }

  function quickLogin(demoEmail, demoPassword) {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setTimeout(() => {
      document.getElementById("login-form")?.dispatchEvent(
        new Event("submit", { bubbles: true })
      );
    }, 100);
  }

  return (
    <div style={{
      minHeight:"100vh", background:"linear-gradient(135deg, #0f1419 0%, #1a1f2e 100%)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:"20px",
    }}>
      <div style={{
        width:"100%", maxWidth:"900px", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(350px,1fr))", gap:24
      }}>
        {/* Login Form */}
        <div style={{
          background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
          border:"1px solid rgba(79,195,247,0.2)", borderRadius:16, padding:28,
        }}>
          <div style={{ marginBottom:24 }}>
            <div style={{ width:50, height:50, marginBottom:12 }}>
              <img src="/logo.png" alt="Logo" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
            </div>
            <h1 style={{
              fontSize:24, fontWeight:900, margin:"0 0 4px",
              background:`linear-gradient(135deg,#fff 30%,${C.green})`,
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            }}>Monroy QMS</h1>
            <p style={{ color:"#64748b", fontSize:13, margin:0 }}>Quality Management System</p>
          </div>

          {error && (
            <div style={{
              background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)",
              borderRadius:10, padding:12, marginBottom:16, color:C.pink, fontSize:13,
            }}>
              {error}
            </div>
          )}

          <form id="login-form" onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                style={{
                  width:"100%", padding:"12px 14px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
                }}
              />
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{
                  width:"100%", padding:"12px 14px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{
                width:"100%", padding:"12px", borderRadius:10,
                background:`linear-gradient(135deg,${C.purple},${C.blue})`,
                border:"none", color:"#fff", fontWeight:700, fontSize:14,
                cursor:loading || !email || !password ? "not-allowed" : "pointer",
                fontFamily:"inherit", opacity:loading || !email || !password ? 0.6 : 1,
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid rgba(255,255,255,0.04)", fontSize:12, color:"#64748b" }}>
            Demo credentials provided below. Use them to explore different roles.
          </div>
        </div>

        {/* Demo Users */}
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(0,245,196,0.2)",
          borderRadius:16, padding:24, display:"flex", flexDirection:"column", gap:12,
        }}>
          <h3 style={{ color:"#fff", fontSize:14, fontWeight:700, margin:0, marginBottom:12 }}>
            🔐 Demo Users
          </h3>
          {demoUsers.map((demoUser, idx) => (
            <button
              key={idx}
              onClick={() => quickLogin(demoUser.email, demoUser.password)}
              style={{
                padding:12, borderRadius:10, cursor:"pointer", textAlign:"left",
                background:"rgba(255,255,255,0.03)", border:"1px solid rgba(0,245,196,0.2)",
                color:"#e2e8f0", fontFamily:"inherit", transition:"all 0.25s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0,245,196,0.1)";
                e.currentTarget.style.borderColor = "rgba(0,245,196,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = "rgba(0,245,196,0.2)";
              }}
            >
              <div style={{ fontWeight:600, fontSize:13, marginBottom:3 }}>
                {demoUser.role}
              </div>
              <div style={{ fontSize:11, color:"#94a3b8", marginBottom:4 }}>
                {demoUser.email}
              </div>
              <div style={{ fontSize:10, color:"#64748b" }}>
                {demoUser.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
