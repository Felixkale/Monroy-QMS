"use client";

import { useEffect, useState } from "react";

const defaultUT = ["P01","P02","P03","P04","P05","P06","P07","P08"].map(p => ({ point_code: p, value: "" }));

export default function InspectionsPage() {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    client_id: "",
    site_id: "",
    asset_id: "",
    inspection_type: "ut_thickness",
    inspector_id: "",
    result: "pass",
    summary: "",
    ut: defaultUT
  });

  async function load() {
    const res = await fetch("/api/inspections");
    const data = await res.json();
    setRows(data);
  }

  useEffect(() => { load(); }, []);

  async function createInspection(e) {
    e.preventDefault();
    setMsg("Saving...");
    const payload = {
      client_id: form.client_id,
      site_id: form.site_id,
      asset_id: form.asset_id,
      inspection_type: form.inspection_type,
      inspector_id: form.inspector_id || null,
      overall_result: form.result,
      summary: form.summary,
      measurements: form.ut
        .filter(x => x.value !== "")
        .map(x => ({
          measurement_type: "ut_thickness",
          point_code: x.point_code,
          value: Number(x.value),
          unit: "mm"
        }))
    };

    const res = await fetch("/api/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      setMsg(await res.text());
      return;
    }

    setMsg("Saved.");
    setForm({ ...form, summary: "", ut: defaultUT });
    load();
  }

  function setUT(i, v) {
    const next = [...form.ut];
    next[i] = { ...next[i], value: v };
    setForm({ ...form, ut: next });
  }

  return (
    <div>
      <h2>Inspections</h2>

      <form onSubmit={createInspection} style={{ maxWidth: 700, marginBottom: 16 }}>
        <Field label="client_id" value={form.client_id} onChange={(v) => setForm({ ...form, client_id: v })} />
        <Field label="site_id" value={form.site_id} onChange={(v) => setForm({ ...form, site_id: v })} />
        <Field label="asset_id" value={form.asset_id} onChange={(v) => setForm({ ...form, asset_id: v })} />
        <Field label="inspector_id (optional)" value={form.inspector_id} onChange={(v) => setForm({ ...form, inspector_id: v })} />

        <div style={{ marginBottom: 8 }}>
          <label>Result</label>
          <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} style={{ width: "100%", padding: 8 }}>
            <option value="pass">pass</option>
            <option value="conditional">conditional</option>
            <option value="fail">fail</option>
          </select>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>Summary</label>
          <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} style={{ width: "100%", padding: 8 }} />
        </div>

        <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 10, marginBottom: 12 }}>
          <b>UT Thickness (mm)</b>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 8 }}>
            {form.ut.map((p, i) => (
              <div key={p.point_code}>
                <label>{p.point_code}</label>
                <input
                  value={p.value}
                  onChange={(e) => setUT(i, e.target.value)}
                  style={{ width: "100%", padding: 8 }}
                  placeholder="mm"
                />
              </div>
            ))}
          </div>
        </div>

        <button style={{ padding: 10 }}>Create Inspection</button>
        <span style={{ marginLeft: 10 }}>{msg}</span>
      </form>

      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>inspection_type</th>
            <th>status</th>
            <th>asset_id</th>
            <th>inspected_at</th>
            <th>result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.inspection_type}</td>
              <td>{r.status}</td>
              <td style={{ fontSize: 12 }}>{r.asset_id}</td>
              <td style={{ fontSize: 12 }}>{r.inspected_at}</td>
              <td>{r.overall_result}</td>
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
