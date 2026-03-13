"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6" };

const inputStyle = {
  width:"100%", padding:"11px 14px",
  background:"rgba(255,255,255,0.04)",
  border:"1px solid rgba(124,92,252,0.25)",
  borderRadius:8, color:"#e2e8f0",
  fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box",
};
const labelStyle = {
  fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.5)",
  textTransform:"uppercase", letterSpacing:"0.08em",
  marginBottom:6, display:"block",
};

const REPORT_TYPES = [
  { value:"certificates",  label:"Certificate Report",    desc:"All issued certificates with status, dates and inspector info" },
  { value:"equipment",     label:"Equipment Report",      desc:"Full equipment register with inspection dates and SWL/MAWP"    },
  { value:"expiring",      label:"Expiring Certificates", desc:"Certificates expiring within the selected date range"          },
  { value:"failed",        label:"Failed Inspections",    desc:"All equipment with FAIL or CONDITIONAL status"                 },
  { value:"clients",       label:"Client Summary",        desc:"Per-client equipment and certificate summary"                  },
];

export default function ExportReportPage() {
  const router = useRouter();
  const [clients,   setClients]   = useState([]);
  const [form,      setForm]      = useState({ reportType:"certificates", startDate:"", endDate:"", clientId:"all", format:"CSV" });
  const [loading,   setLoading]   = useState(false);
  const [generating,setGenerating]= useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");

  useEffect(() => {
    supabase.from("clients").select("id, company_name").eq("status","active").order("company_name")
      .then(({ data }) => setClients(data || []));
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setGenerating(true);
    setError("");
    setSuccess("");

    try {
      let query;
      const selectedType = form.reportType;

      if (selectedType === "certificates" || selectedType === "expiring" || selectedType === "failed") {
        let q = supabase.from("certificates").select(
          "certificate_number, certificate_type, company, equipment_description, equipment_location, equipment_id, swl, mawp, capacity, country_of_origin, year_built, manufacturer, model, equipment_status, issued_at, valid_to, inspector_name, inspector_id"
        );
        if (form.clientId !== "all") {
          const client = clients.find(c => c.id === form.clientId);
          if (client) q = q.eq("company", client.company_name);
        }
        if (form.startDate) q = q.gte("issued_at", form.startDate);
        if (form.endDate)   q = q.lte("issued_at", form.endDate + "T23:59:59");
        if (selectedType === "expiring") q = q.lt("valid_to", new Date().toISOString());
        if (selectedType === "failed")   q = q.in("equipment_status", ["FAIL","CONDITIONAL"]);
        q = q.order("issued_at", { ascending:false });
        query = q;

      } else if (selectedType === "equipment") {
        let q = supabase.from("assets").select(
          "asset_tag, asset_name, asset_type, serial_number, manufacturer, model, year_built, country_of_origin, capacity_volume, safe_working_load, working_pressure, location, last_inspection_date, next_inspection_date, license_status, clients(company_name)"
        );
        if (form.clientId !== "all") q = q.eq("client_id", form.clientId);
        q = q.order("asset_tag");
        query = q;

      } else if (selectedType === "clients") {
        let q = supabase.from("clients").select("company_name, company_code, status, created_at");
        q = q.order("company_name");
        query = q;
      }

      const { data, error: err } = await query;
      if (err) throw err;
      if (!data || data.length === 0) throw new Error("No data found for the selected filters.");

      // Flatten nested objects for CSV
      const flat = data.map(row => {
        const out = { ...row };
        if (out.clients) { out.client = out.clients.company_name; delete out.clients; }
        return out;
      });

      if (form.format === "CSV") {
        const headers = Object.keys(flat[0]);
        const csvRows = [
          headers.join(","),
          ...flat.map(row =>
            headers.map(h => {
              const val = row[h] ?? "";
              return `"${String(val).replace(/"/g,'""')}"`;
            }).join(",")
          )
        ];
        const blob = new Blob([csvRows.join("\n")], { type:"text/csv;charset=utf-8;" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `monroy-${selectedType}-report-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setSuccess(`✅ ${data.length} records exported as CSV.`);

      } else if (form.format === "JSON") {
        const blob = new Blob([JSON.stringify(flat, null, 2)], { type:"application/json" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `monroy-${selectedType}-report-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setSuccess(`✅ ${data.length} records exported as JSON.`);

      } else {
        // PDF — open print view
        router.push(`/reports/print?type=${selectedType}&client=${form.clientId}&start=${form.startDate}&end=${form.endDate}`);
      }

    } catch (err) {
      setError(err.message || "Failed to generate report.");
    }
    setGenerating(false);
  }

  const selectedType = REPORT_TYPES.find(r => r.value === form.reportType);

  return (
    <AppLayout title="Export Report">
      <div style={{ maxWidth: 680 }}>

        <button onClick={() => router.push("/reports")} style={{
          marginBottom:20, padding:"9px 18px", borderRadius:8,
          border:"1px solid rgba(255,255,255,0.1)",
          background:"rgba(255,255,255,0.05)",
          color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer",
        }}>
          ← Back to Reports
        </button>

        <h1 style={{ color:"#fff", margin:"0 0 6px", fontSize:26, fontWeight:900 }}>Export Report</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginBottom:28 }}>
          Download live data from the QMS as CSV, JSON, or PDF
        </p>

        {error   && <div style={{ background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)", borderRadius:12, padding:"12px 16px", marginBottom:20, color:C.pink,    fontSize:13 }}>⚠️ {error}</div>}
        {success && <div style={{ background:"rgba(16,185,129,0.12)", border:"1px solid rgba(16,185,129,0.35)", borderRadius:12, padding:"12px 16px", marginBottom:20, color:"#86efac", fontSize:13 }}>{success}</div>}

        <form onSubmit={handleGenerate} style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
          borderRadius:16, padding:28,
        }}>

          {/* Report type cards */}
          <div style={{ marginBottom:24 }}>
            <label style={labelStyle}>Report Type *</label>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
              {REPORT_TYPES.map(rt => (
                <div key={rt.value} onClick={() => setForm(p => ({ ...p, reportType: rt.value }))}
                  style={{
                    padding:"12px 14px", borderRadius:10, cursor:"pointer", transition:"all 0.2s",
                    border: form.reportType === rt.value ? `1px solid ${C.purple}` : "1px solid rgba(255,255,255,0.08)",
                    background: form.reportType === rt.value ? "rgba(124,92,252,0.12)" : "rgba(255,255,255,0.03)",
                  }}>
                  <div style={{ color: form.reportType === rt.value ? C.purple : "#e2e8f0", fontWeight:700, fontSize:13, marginBottom:4 }}>
                    {rt.label}
                  </div>
                  <div style={{ color:"#64748b", fontSize:11, lineHeight:1.4 }}>{rt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:24 }}>
            <div>
              <label style={labelStyle}>Format *</label>
              <select name="format" value={form.format} onChange={handleChange} style={{ ...inputStyle, cursor:"pointer" }}>
                <option value="CSV">CSV (Excel-compatible)</option>
                <option value="JSON">JSON</option>
                <option value="PDF">PDF (Print view)</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Client</label>
              <select name="clientId" value={form.clientId} onChange={handleChange} style={{ ...inputStyle, cursor:"pointer" }}>
                <option value="all">All Clients</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Start Date</label>
              <input type="date" name="startDate" value={form.startDate} onChange={handleChange} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>End Date</label>
              <input type="date" name="endDate" value={form.endDate} onChange={handleChange} style={inputStyle} />
            </div>
          </div>

          <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
            <button type="button" onClick={() => router.push("/reports")} style={{
              padding:"11px 24px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontWeight:700,
              background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#94a3b8",
            }}>Cancel</button>
            <button type="submit" disabled={generating} style={{
              padding:"11px 28px", borderRadius:8, cursor: generating ? "not-allowed" : "pointer",
              fontFamily:"inherit", fontWeight:700,
              background: generating ? "rgba(255,255,255,0.1)" : `linear-gradient(135deg,${C.purple},${C.blue})`,
              border:"none", color:"#fff", opacity: generating ? 0.7 : 1,
              boxShadow:"0 0 20px rgba(124,92,252,0.3)",
            }}>
              {generating ? "Generating…" : "📤 Generate & Download"}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
