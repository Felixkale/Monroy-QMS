"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function BulkExportPage() {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [preview, setPreview] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [previewLoaded, setPreviewLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from("clients")
      .select("id, name")
      .order("name")
      .then(({ data }) => setClients(data || []));
  }, []);

  async function handlePreview() {
    setError("");
    setLoadingPreview(true);
    setPreviewLoaded(false);

    let query = supabase
      .from("certificates")
      .select(
        "id, certificate_number, inspection_date, expiry_date, status, equipment_type, serial_number, client_id, clients(name)"
      )
      .order("inspection_date", { ascending: false })
      .limit(200);

    if (clientId) query = query.eq("client_id", clientId);
    if (dateFrom) query = query.gte("inspection_date", dateFrom);
    if (dateTo) query = query.lte("inspection_date", dateTo);

    const { data, error: qErr } = await query;
    setLoadingPreview(false);

    if (qErr) {
      setError(qErr.message);
      return;
    }
    setPreview(data || []);
    setPreviewLoaded(true);
  }

  async function handleExport() {
    if (preview.length === 0) return;
    setExporting(true);
    setError("");

    try {
      const res = await fetch("/api/certificates/bulk-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, dateFrom, dateTo }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Export failed.");
        setExporting(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+?)"/);
      a.download = match ? match[1] : "certificates.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Unexpected error.");
    }
    setExporting(false);
  }

  const statusBadge = (status) => {
    const map = {
      active: "bg-green-100 text-green-800",
      expired: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-gray-100 text-gray-700"}`}
      >
        {status || "—"}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Bulk Export Certificates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Filter by client and inspection date, preview matching certificates, then download as a ZIP.
          </p>
        </div>

        {/* Filter Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Filters
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Client */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Client</label>
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setPreviewLoaded(false);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Inspection Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPreviewLoaded(false);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Inspection Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPreviewLoaded(false);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={handlePreview}
              disabled={loadingPreview}
              className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition"
            >
              {loadingPreview ? "Loading…" : "Preview Matches"}
            </button>

            {previewLoaded && preview.length > 0 && (
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2"
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Exporting…
                  </>
                ) : (
                  <>
                    ⬇ Export {preview.length} Certificate{preview.length !== 1 ? "s" : ""} as ZIP
                  </>
                )}
              </button>
            )}
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Preview Table */}
        {previewLoaded && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">
                Preview —{" "}
                <span className="text-blue-600">
                  {preview.length} certificate{preview.length !== 1 ? "s" : ""}
                </span>
              </h2>
              {preview.length === 0 && (
                <span className="text-xs text-gray-400">No results for selected filters.</span>
              )}
            </div>

            {preview.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Certificate #</th>
                      <th className="px-4 py-3 text-left">Client</th>
                      <th className="px-4 py-3 text-left">Equipment</th>
                      <th className="px-4 py-3 text-left">Inspection Date</th>
                      <th className="px-4 py-3 text-left">Expiry Date</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.map((cert) => (
                      <tr key={cert.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">
                          {cert.certificate_number || cert.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {cert.clients?.name || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {cert.equipment_type || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {cert.inspection_date || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {cert.expiry_date || "—"}
                        </td>
                        <td className="px-4 py-3">{statusBadge(cert.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
