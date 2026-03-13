"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgba = { green:"0,245,196", blue:"79,195,247", purple:"124,92,252", pink:"244,114,182", yellow:"251,191,36" };

function formatDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();

  // This page acts as a dynamic report viewer.
  // It reads query params type/client/start/end and displays a live summary.
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [meta,    setMeta]    = useState({ type:"certificates", start:"", end:"", client:"all" });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const m  = {
        type:   sp.get("type")   || "certificates",
        start:  sp.get("start")  || "",
        end:    sp.get("end")    || "",
        client: sp.get("client") || "all",
      };
      setMeta(m);
      loadData(m);
    }
  }, []);

  async function loadData(m) {
    setLoading(true);
    setError("");
    try {
      let q;
      if (m.type === "certificates" || m.type === "expiring" || m.type === "failed") {
        q = supabase.from("certificates").select(
          "certificate_number, company, equipment_description, equipment_status, issued_at, valid_to, inspector_name"
        );
        if (m.start) q = q.gte("issued_at", m.start);
        if (m.end)   q = q.lte("issued_at", m.end + "T23:59:59");
        if (m.type === "expiring") q = q.lt("valid_to", new Date().toISOString());
        if (m.type === "failed")   q = q.in("equipment_status", ["FAIL","CONDITIONAL"]);
        q = q.order("issued_at", { ascending:false }).limit(100);
      } else {
        q = supabase.from("assets")
          .select("asset_tag, asset_name, asset_type, serial_number, next_inspection_date, license_status, clients(company_name)")
          .order("asset_tag").limit(100);
      }
      const { data: rows, error: err } = await q;
      if (err) throw err;
      setData(rows || []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  const typeLabel = {
    certificates: "Certificate Report",
    expiring:     "Expiring Certificates",
    failed:       "Failed Inspections",
    equipment:    "Equipment Report",
    clients:      "Client Summary",
  }[meta.type] || "Report";

  const pass  = data.filter(d => (d.equipment_status || "PASS").toUpperCase() === "PASS").length;
  const fail  = data.filter(d => ["FAIL","CONDITIONAL"].includes((d.equipment_status || "").toUpperCase())).length;

  return (
    <AppLayout title={typeLabel}>
      <div style={{ maxWidth: 1000 }}>

        <button onClick={() => router.push("/reports")} style={{
          marginBottom:20, padding:"9px 18px", borderRadius:8,
          border:"1px solid rgba(255,255,255,0.1)",
          background:"rgba(255,255,255,0.05)",
          color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer",
        }}>
          ← Back to Reports
        </button>

        <h1 style={{ color:"#fff", margin:"0 0 4px", fontSize:24, fontWeight:900 }}>{typeLabel}</h1>
        <p style={{ color:"#64748b", fontSize:13, margin:"0 0 24px" }}>
          {meta.start && meta.end ? `${formatDate(meta.start)} — ${formatDate(meta.end)}` : "All time"}
          {" · "}{data.length} records
        </p>

        {error && (
          <div style={{ background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)",
            borderRadius:12, padding:"12px 16px", marginBottom:20, color:C.pink, fontSize:13 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Stats */}
        {!loading && data.length > 0 && (meta.type === "certificates" || meta.type === "expiring" || meta.type === "failed") && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:24 }}>
            {[
              { label:"Total",  value:data.length, color:C.blue,   r:rgba.blue   },
              { label:"Passed", value:pass,         color:C.green,  r:rgba.green  },
              { label:"Failed", value:fail,         color:C.pink,   r:rgba.pink   },
              { label:"Pass Rate", value: data.length > 0 ? `${Math.round(pass/data.length*100)}%` : "—", color:C.green, r:rgba.green },
            ].map(s => (
              <div key={s.label} style={{
                background:`rgba(${s.r},0.07)`, border:`1px solid rgba(${s.r},0.25)`,
                borderRadius:12, padding:"14px 16px",
              }}>
                <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>{s.label}</div>
                <div style={{ fontSize:24, fontWeight:900, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Print + Export buttons */}
        <div style={{ display:"flex", gap:10, marginBottom:20 }}>
          <button onClick={() => window.print()} style={{
            padding:"10px 18px", borderRadius:8, border:"1px solid rgba(255,255,255,0.1)",
            background:"rgba(255,255,255,0.05)", color:"#fff", fontWeight:600, fontSize:13, cursor:"pointer",
          }}>🖨️ Print</button>
          <button onClick={() => router.push("/reports/export")} style={{
            padding:"10px 18px", borderRadius:8, border:"none",
            background:`linear-gradient(135deg,${C.purple},${C.blue})`,
            color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer",
          }}>📤 Export as CSV</button>
        </div>

        {loading ? (
          <div style={{ color:"#64748b", padding:"40px 0", textAlign:"center" }}>Loading report data…</div>
        ) : data.length === 0 ? (
          <div style={{ color:"#64748b", padding:"40px 0", textAlign:"center" }}>No data found for this report.</div>
        ) : (
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"rgba(255,255,255,0.03)" }}>
                  {(meta.type === "equipment"
                    ? ["Asset Tag","Name","Type","Client","Next Inspection","Status"]
                    : ["Cert No.","Company","Equipment","Inspector","Issued","Expiry","Status"]
                  ).map(h => (
                    <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:11, color:"#64748b",
                      textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => {
                  if (meta.type === "equipment") {
                    return (
                      <tr key={i} style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding:"12px 16px", color:C.blue, fontWeight:700 }}>{row.asset_tag}</td>
                        <td style={{ padding:"12px 16px", color:"#e2e8f0" }}>{row.asset_name || "—"}</td>
                        <td style={{ padding:"12px 16px", color:"#94a3b8" }}>{row.asset_type || "—"}</td>
                        <td style={{ padding:"12px 16px", color:"#64748b" }}>{row.clients?.company_name || "—"}</td>
                        <td style={{ padding:"12px 16px", color:"#64748b" }}>{formatDate(row.next_inspection_date)}</td>
                        <td style={{ padding:"12px 16px" }}>
                          <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                            background: row.license_status === "expired" ? "rgba(244,114,182,0.1)" : "rgba(0,245,196,0.1)",
                            color:      row.license_status === "expired" ? C.pink : C.green }}>
                            {row.license_status || "valid"}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                  const isPASS = (row.equipment_status || "PASS").toUpperCase() === "PASS";
                  return (
                    <tr key={i} style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding:"12px 16px", color:C.purple, fontWeight:700 }}>{row.certificate_number || "—"}</td>
                      <td style={{ padding:"12px 16px", color:"#e2e8f0" }}>{row.company || "—"}</td>
                      <td style={{ padding:"12px 16px", color:"#94a3b8" }}>{row.equipment_description || "—"}</td>
                      <td style={{ padding:"12px 16px", color:"#64748b" }}>{row.inspector_name || "—"}</td>
                      <td style={{ padding:"12px 16px", color:"#64748b", whiteSpace:"nowrap" }}>{formatDate(row.issued_at)}</td>
                      <td style={{ padding:"12px 16px", color:"#64748b", whiteSpace:"nowrap" }}>{formatDate(row.valid_to)}</td>
                      <td style={{ padding:"12px 16px" }}>
                        <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                          background: isPASS ? "rgba(0,245,196,0.1)" : "rgba(244,114,182,0.1)",
                          color:      isPASS ? C.green : C.pink }}>
                          {row.equipment_status || "PASS"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
