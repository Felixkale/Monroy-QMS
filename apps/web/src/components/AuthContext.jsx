"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    const checkUser = async () => {
      try {
        if (!supabase) {
          console.warn("Supabase client not initialized. Check your environment variables.");
          setLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error("Auth error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes - only if supabase is available
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChanged((session) => {
        setUser(session?.user || null);
      });

      return () => {
        subscription?.unsubscribe();
      };
    } catch (error) {
      console.error("Failed to subscribe to auth changes:", error);
      setLoading(false);
    }
  }, []);

  const logout = async () => {
    if (!supabase) {
      console.warn("Supabase not available for logout");
      return;
    }
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
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
