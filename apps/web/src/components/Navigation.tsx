"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import "./navigation.css";

export default function Navigation() {
  const [showMenu, setShowMenu] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/dashboard/clients", label: "Clients", icon: "👥" },
    { href: "/dashboard/assets", label: "Assets", icon: "⚙️" },
    { href: "/dashboard/sites", label: "Sites", icon: "📍" },
  ];

  return (
    <nav className="navigation">
      <div className="nav-header">
        <h2 className="nav-logo">Monroy QMS</h2>
        <button
          className="nav-toggle"
          onClick={() => setShowMenu(!showMenu)}
        >
          ☰
        </button>
      </div>

      <div className={`nav-menu ${showMenu ? "open" : ""}`}>
        <ul className="nav-items">
          {navItems.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="nav-link">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>

        <button onClick={handleLogout} className="btn-logout">
          Logout
        </button>
      </div>
    </nav>
  );
}
