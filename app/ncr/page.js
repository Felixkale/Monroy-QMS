"use client";

import { useEffect, useState } from "react";

export default function NCRPage() {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    client_id: "",
    site_id: "",
    asset_id: "",
    title: "",
    description: "",
    severity: "medium"
  });

  async function load() {
    const res = await fetch("/api/ncr");
    const data = await res.json();
    setRows(data);
  }

  useEffect(() => { load(); }, []);

  async function createNCR(e) {
    e.preventDefault();
    setMsg("Saving...");
    const res = await fetch("/api/ncr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (!res.ok) {
      setMsg(await res.text());
      return;
    }
    setMsg("Saved.");
    setForm({ ...form, title: "", description: "" });
    load();
  }

  return (
    <div>
      <h2>NCR</h2>

      <form onSubmit={createNCR} style={{ maxWidth: 520, marginBottom: 16 }}>
        <Field label="client_id" value={form.client_id} onChange={(v) => setForm({ ...form, client_id: v })} />
        <Field label="site_id" value={form.site_id} onChange={(v) => setForm({ ...form, site_id: v })} />
        <Field label="asset_id" value={form.asset_id} onChange={(v) => setForm({ ...form, asset_id: v })} />
        <Field label="title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <div style={{ marginBottom: 8 }}>
          <label>description</label>
          <textarea style={{ width: "100%", padding: 8 }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>severity</label>
          <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} style={{ width: "100%", padding: 8 }}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
        </div>
        <button style={{ padding: 10 }}>Create NCR</button>
        <span style={{ marginLeft: 10 }}>{msg}</span>
      </form>

      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>ncr_number</th>
            <th>title</th>
            <th>severity</th>
            <th>status</th>
            <th>created_at</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.ncr_number}</td>
              <td>{r.title}</td>
              <td>{r.severity}</td>
              <td>{r.status}</td>
              <td style={{ fontSize: 12 }}>{r.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
