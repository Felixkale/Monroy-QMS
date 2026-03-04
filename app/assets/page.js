"use client";

import { useEffect, useState } from "react";

export default function AssetsPage() {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    client_id: "",
    site_id: "",
    asset_tag: "",
    asset_name: ""
  });

  async function load() {
    const res = await fetch("/api/assets");
    const data = await res.json();
    setRows(data);
  }

  useEffect(() => { load(); }, []);

  async function createAsset(e) {
    e.preventDefault();
    setMsg("Saving...");
    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (!res.ok) {
      setMsg(await res.text());
      return;
    }
    setMsg("Saved.");
    setForm({ client_id: "", site_id: "", asset_tag: "", asset_name: "" });
    load();
  }

  return (
    <div>
      <h2>Assets</h2>

      <form onSubmit={createAsset} style={{ maxWidth: 520, marginBottom: 16 }}>
        <Field label="client_id (uuid)" value={form.client_id} onChange={(v) => setForm({ ...form, client_id: v })} />
        <Field label="site_id (uuid)" value={form.site_id} onChange={(v) => setForm({ ...form, site_id: v })} />
        <Field label="asset_tag" value={form.asset_tag} onChange={(v) => setForm({ ...form, asset_tag: v })} />
        <Field label="asset_name" value={form.asset_name} onChange={(v) => setForm({ ...form, asset_name: v })} />
        <button style={{ padding: 10 }}>Create Asset</button>
        <span style={{ marginLeft: 10 }}>{msg}</span>
      </form>

      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>asset_tag</th>
            <th>asset_name</th>
            <th>client_id</th>
            <th>site_id</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.asset_tag}</td>
              <td>{r.asset_name}</td>
              <td style={{ fontSize: 12 }}>{r.client_id}</td>
              <td style={{ fontSize: 12 }}>{r.site_id}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: 12, color: "#666" }}>
        Tip: create a client + site first, then paste those UUIDs here.
      </p>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label>{label}</label>
      <input style={{ width: "100%", padding: 8 }} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
