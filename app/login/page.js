"use client";

import { useState } from "react";
import { supabaseBrowser } from "../../lib/supabaseBrowser";

export default function LoginPage() {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function signIn(e) {
    e.preventDefault();
    setMsg("Signing in...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMsg(error.message);
    setMsg("Logged in. Go to Dashboard.");
  }

  async function signUp(e) {
    e.preventDefault();
    setMsg("Creating account...");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return setMsg(error.message);
    setMsg("Account created. Check your email if confirmation is enabled.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMsg("Signed out.");
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h2>Login</h2>
      <form>
        <div style={{ marginBottom: 8 }}>
          <label>Email</label>
          <input style={{ width: "100%", padding: 8 }} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Password</label>
          <input
            type="password"
            style={{ width: "100%", padding: 8 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button onClick={signIn} style={{ padding: 10, marginRight: 8 }}>Sign In</button>
        <button onClick={signUp} style={{ padding: 10 }}>Sign Up</button>
      </form>

      <div style={{ marginTop: 12 }}>
        <button onClick={signOut} style={{ padding: 10 }}>Sign Out</button>
      </div>

      <p style={{ marginTop: 12 }}>{msg}</p>
    </div>
  );
}
