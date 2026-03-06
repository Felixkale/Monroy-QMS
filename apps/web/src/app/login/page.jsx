"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7" };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      try {
        if (!supabase) {
          setCheckingAuth(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkUser();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!supabase) {
        setError("Supabase is not configured. Contact your administrator.");
        setLoading(false);
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || "Login failed. Check your credentials.");
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Redirect to dashboard
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div style={{
        display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0",
        alignItems:"center", justifyContent:"center",
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{
      display:"flex", minHeight:"100vh", backgroundColor:"#0f1419", color:"#e2e8f0",
      alignItems:"center", justifyContent:"center", padding:"20px",
    }}>
      <div style={{
        background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
        border:"1px solid rgba(124,92,252,0.2)", borderRadius:18,
        padding:"40px", maxWidth:420, width:"100%",
      }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🔐</div>
          <h1 style={{ fontSize:28, fontWeight:900, margin:0, color:"#fff" }}>Monroy QMS</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>Quality Management System</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6, display:"block" }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              disabled={loading}
              style={{
                width:"100%", padding:"11px 14px",
                background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(124,92,252,0.25)",
                borderRadius:10, color:"#e2e8f0",
                fontSize:13, fontFamily:"inherit", outline:"none",
                opacity: loading ? 0.6 : 1,
              }}
              required
            />
          </div>

          <div style={{ marginBottom:24 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6, display:"block" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              style={{
                width:"100%", padding:"11px 14px",
                background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(124,92,252,0.25)",
                borderRadius:10, color:"#e2e8f0",
                fontSize:13, fontFamily:"inherit", outline:"none",
                opacity: loading ? 0.6 : 1,
              }}
              required
            />
          </div>

          {error && (
            <div style={{
              padding:"10px 14px", borderRadius:8, marginBottom:16,
              background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)",
              color:"#f472b6", fontSize:12,
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width:"100%", padding:"11px 16px", borderRadius:12,
              background:`linear-gradient(135deg,${C.purple},${C.blue})`,
              border:"none", color:"#fff", fontWeight:700, fontSize:13,
              cursor:loading ? "not-allowed" : "pointer", fontFamily:"inherit",
              opacity:loading ? 0.7 : 1,
              boxShadow:`0 0 20px rgba(124,92,252,0.4)`,
              transition: "all 0.25s",
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div style={{ marginTop:20, textAlign:"center", paddingTop:20, borderTop:"1px solid rgba(102,126,234,0.1)" }}>
          <p style={{ fontSize:12, color:"#64748b", margin:"0 0 8px" }}>Don't have an account?</p>
          <p style={{ fontSize:11, color:"#64748b", margin:0 }}>Contact your administrator to create one</p>
        </div>
      </div>
    </div>
  );
}
