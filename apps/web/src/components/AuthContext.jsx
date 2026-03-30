// src/components/AuthContext.jsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext({});

// Pages that never require authentication
const PUBLIC_ROUTES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
];

export function AuthProvider({ children }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    // Never redirect public routes
    const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r));
    if (isPublic) return;

    // Never redirect if URL hash contains auth tokens (invite/reset links)
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) return;
    }

    if (!user) router.replace("/login");
  }, [user, loading, pathname]);

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    router.replace("/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
