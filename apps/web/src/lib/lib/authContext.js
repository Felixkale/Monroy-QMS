"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { validateEmail } from "@/lib/security";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          verifyUserRole(session.user.id);
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
        // ✅ Validate email format
        if (!validateEmail(data.user.email)) {
          throw new Error("Invalid email format");
        }

        setUser(data.user);
        await verifyUserRole(data.user.id);
      } else {
        setRole(null);
      }

      setLoading(false);
      setError(null);
    } catch (error) {
      console.error("Auth error:", error);
      setError(error.message);
      setLoading(false);
    }
  }

  // ✅ SERVER-SIDE ROLE VERIFICATION
  async function verifyUserRole(userId) {
    try {
      // Always fetch from database, never trust client
      const { data: profileData, error } = await supabase
        .from('users')
        .select('id, email, role, status')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        setRole('user');
        return;
      }

      // ✅ Verify user status (not suspended)
      if (profileData.status === 'suspended') {
        await logout();
        throw new Error("Account suspended");
      }

      // ✅ Validate role is one of allowed values
      const allowedRoles = ['superadmin', 'admin', 'inspector', 'supervisor', 'client', 'user'];
      if (!allowedRoles.includes(profileData.role)) {
        setRole('user');
        setUserProfile(null);
        return;
      }

      setUserProfile(profileData);
      setRole(profileData.role);
      setError(null);
    } catch (error) {
      console.error("Role verification error:", error);
      setError(error.message);
      setRole('user');
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserProfile(null);
      setRole(null);
      setError(null);
    } catch (error) {
      console.error("Logout error:", error);
      setError(error.message);
    }
  }

  // ✅ Check if user has specific role
  function hasRole(requiredRole) {
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(role);
    }
    return role === requiredRole;
  }

  // ✅ Check if user has permission
  function hasPermission(permission) {
    const rolePermissions = {
      superadmin: ['*'], // All permissions
      admin: ['users:manage', 'clients:manage', 'equipment:manage', 'reports:view'],
      inspector: ['equipment:view', 'inspections:create', 'certificates:create'],
      supervisor: ['inspections:view', 'reports:view', 'team:manage'],
      client: ['equipment:view', 'certificates:download', 'reports:download'],
      user: ['profile:view'],
    };

    const permissions = rolePermissions[role] || [];
    return permissions.includes('*') || permissions.includes(permission);
  }

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        userProfile, 
        role, 
        loading, 
        error,
        checkAuth, 
        logout,
        hasRole,
        hasPermission,
      }}
    >
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
