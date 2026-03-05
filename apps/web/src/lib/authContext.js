"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          checkAuth();
        } else {
          setUser(null);
          setUserProfile(null);
          setRole(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  async function checkAuth() {
    try {
      const { data } = await supabase.auth.getUser();

      if (data?.user) {
        setUser(data.user);

        // Fetch user profile from users table
        const { data: profileData, error } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', data.user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          setRole('user');
        } else {
          setUserProfile(profileData);
          setRole(profileData?.role || 'user');
        }
      } else {
        setRole(null);
      }

      setLoading(false);
    } catch (error) {
      console.error("Auth error:", error);
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    setRole(null);
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, role, loading, checkAuth, logout }}>
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
