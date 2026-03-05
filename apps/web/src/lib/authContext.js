"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
        // Get user role from database or use email pattern
        const userRole = getUserRole(data.user.email);
        setRole(userRole);
      }
      setLoading(false);
    } catch (error) {
      console.error("Auth error:", error);
      setLoading(false);
    }
  }

  function getUserRole(email) {
    // Super Admin
    if (email === "superadmin@monroy.com") return "superadmin";
    // Admin
    if (email === "admin@monroy.com") return "admin";
    // Inspector
    if (email?.includes("inspector")) return "inspector";
    // Supervisor
    if (email?.includes("supervisor")) return "supervisor";
    // Client
    if (email?.includes("client")) return "client";
    // Default
    return "user";
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
