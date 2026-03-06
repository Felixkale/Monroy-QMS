"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7" };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!supabase) {
        setError("Supabase is not configured. Check your environment variables.");
        setLoading(false);
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || "Login failed");
        setLoading(false);
        return;
      }

      if (data?.user) {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

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
              style={{
                width:"100%", padding:"11px 14px",
                background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(124,92,252,0.25)",
                borderRadius:10, color:"#e2e8f0",
                fontSize:13, fontFamily:"inherit", outline:"none",
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
              style={{
                width:"100%", padding:"11px 14px",
                background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(124,92,252,0.25)",
                borderRadius:10, color:"#e2e8f0",
                fontSize:13, fontFamily:"inherit", outline:"none",
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
              {error}
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
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div style={{ marginTop:20, textAlign:"center" }}>
          <p style={{ fontSize:12, color:"#64748b", margin:"0 0 12px" }}>Don't have an account?</p>
          <a href="#" style={{
            fontSize:12, color:C.green, textDecoration:"none", fontWeight:600,
          }}>Contact your administrator</a>
        </div>
      </div>
    </div>
  );
}
