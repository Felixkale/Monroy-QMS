async function getJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default async function Dashboard() {
  const assets = await getJSON(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/assets`);
  const inspections = await getJSON(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/inspections`);
  const ncrs = await getJSON(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/ncr`);

  return (
    <div>
      <h2>Dashboard</h2>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Card title="Assets" value={assets.length} />
        <Card title="Inspections" value={inspections.length} />
        <Card title="NCRs" value={ncrs.length} />
      </div>
      <p style={{ marginTop: 12 }}>
        Next: add due-soon + overdue logic, alerts, certificates, approvals.
      </p>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={{ border: "1px solid #eee", padding: 16, borderRadius: 10, minWidth: 180 }}>
      <div style={{ fontSize: 14, color: "#666" }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
