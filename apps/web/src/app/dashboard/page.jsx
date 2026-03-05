"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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

  if (loading) return <div style={{ padding: "20px", fontSize: "18px" }}>Loading...</div>;

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1>Dashboard Works! ✅</h1>
      <p>Welcome, {user?.email}</p>
      <button 
        onClick={handleLogout}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          cursor: "pointer",
          backgroundColor: "#667eea",
          color: "white",
          border: "none",
          borderRadius: "5px"
        }}
      >
        Logout
      </button>
    </div>
  );
}
