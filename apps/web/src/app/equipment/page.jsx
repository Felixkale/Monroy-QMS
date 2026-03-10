"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const C = {
  green: "#00f5c4",
  purple: "#7c5cfc",
  blue: "#4fc3f7",
  pink: "#f472b6",
};

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");

  useEffect(() => {
    fetchEquipment();
  }, []);

  async function fetchEquipment() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("equipment")
        .select(`
          id,
          asset_tag,
          asset_name,
          equipment_type,
          serial_number,
          manufacturer,
          model,
          location,
          inspection_status,
          certificate_status,
          next_inspection_date,
          client_id,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = data || [];

      const enriched = await Promise.all(
        rows.map(async (item) => {
          const [certificateRes, ncrRes, reportRes] = await Promise.all([
            supabase
              .from("certificates")
              .select("id, certificate_no, status")
              .eq("equipment_id", item.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),

            supabase
              .from("ncr")
              .select("id, ncr_no, status")
              .eq("equipment_id", item.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),

            supabase
              .from("reports")
              .select("id, report_no, status")
              .eq("equipment_id", item.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

          return {
            ...item,
            latest_certificate: certificateRes.data || null,
            latest_ncr: ncrRes.data || null,
            latest_report: reportRes.data || null,
          };
        })
      );

      setEquipment(enriched);
    } catch (err) {
      console.error("Error fetching equipment:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredEquipment = useMemo(() => {
    let rows = [...equipment];

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((item) =>
        [
          item.asset_tag,
          item.asset_name,
          item.serial_number,
          item.manufacturer,
          item.model,
          item.location,
          item.equipment_type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    if (statusFilter === "active") {
      rows = rows.filter(
        (item) =>
          (item.certificate_status || item.inspection_status || "")
            .toLowerCase()
            .includes("active") ||
          (item.certificate_status || item.inspection_status || "")
            .toLowerCase()
            .includes("valid")
      );
    }

    if (statusFilter === "expiring") {
      rows = rows.filter((item) =>
        (item.certificate_status || item.inspection_status || "")
          .toLowerCase()
          .includes("expiring")
      );
    }

    if (statusFilter === "expired") {
      rows = rows.filter((item) =>
        (item.certificate_status || item.inspection_status || "")
          .toLowerCase()
          .includes("expired")
      );
    }

    return rows;
  }, [equipment, search, statusFilter]);

  const counts = useMemo(() => {
    const all = equipment.length;
    const active = equipment.filter((item) => {
      const s = (item.certificate_status || item.inspection_status || "").toLowerCase();
      return s.includes("active") || s.includes("valid");
    }).length;

    const expiring = equipment.filter((item) => {
      const s = (item.certificate_status || item.inspection_status || "").toLowerCase();
      return s.includes("expiring");
    }).length;

    const expired = equipment.filter((item) => {
      const s = (item.certificate_status || item.inspection_status || "").toLowerCase();
      return s.includes("expired");
    }).length;

    return { all, active, expiring, expired };
  }, [equipment]);

  function getStatusBadge(status) {
    const s = (status || "").toLowerCase();

    if (s.includes("expired")) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
          expired
        </span>
      );
    }

    if (s.includes("expiring")) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
          expiring soon
        </span>
      );
    }

    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
        valid
      </span>
    );
  }

  function ActionButton({ href, label, disabled = false, variant = "default" }) {
    const base =
      "px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition border";
    const styles =
      variant === "primary"
        ? "bg-[#7c5cfc] hover:bg-[#6d4ef2] text-white border-[#7c5cfc]"
        : "bg-white/5 hover:bg-white/10 text-white border-white/10";

    if (disabled) {
      return (
        <button
          disabled
          className={`${base} bg-white/5 text-white/40 border-white/10 cursor-not-allowed`}
        >
          {label}
        </button>
      );
    }

    return (
      <Link href={href} className={`${base} ${styles}`}>
        {label}
      </Link>
    );
  }

  function EquipmentCard({ item }) {
    const displayStatus = item.certificate_status || item.inspection_status || "valid";

    return (
      <div className="rounded-2xl border border-white/10 bg-[#0b1220] hover:border-[#7c5cfc]/40 transition shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-extrabold text-white leading-snug truncate">
                {item.asset_name || "Unnamed Equipment"}{" "}
                <span className="text-white/70">
                  - {item.serial_number || item.asset_tag || "N/A"}
                </span>
              </h3>

              <p className="mt-2 text-sm text-white/70">
                {(item.asset_tag || "No Tag")} • {(item.equipment_type || "No Type")} •{" "}
                {(item.manufacturer || "Unknown Manufacturer")}
              </p>

              <p className="mt-1 text-sm text-white/60">
                Serial: {item.serial_number || "N/A"} | Location: {item.location || "N/A"}
              </p>

              {item.model && (
                <p className="mt-1 text-sm text-white/60">
                  Model: {item.model}
                </p>
              )}

              {item.next_inspection_date && (
                <p className="mt-1 text-sm text-white/60">
                  Next Inspection: {item.next_inspection_date}
                </p>
              )}
            </div>

            <div className="shrink-0">
              {getStatusBadge(displayStatus)}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-3">
              <p className="text-xs text-white/50">Certificate</p>
              <p className="mt-1 text-sm font-bold text-white">
                {item.latest_certificate?.certificate_no || "N/A"}
              </p>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-3">
              <p className="text-xs text-white/50">NCR</p>
              <p className="mt-1 text-sm font-bold text-white">
                {item.latest_ncr?.ncr_no || "N/A"}
              </p>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-3">
              <p className="text-xs text-white/50">Report</p>
              <p className="mt-1 text-sm font-bold text-white">
                {item.latest_report?.report_no || "N/A"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-2">
            <ActionButton
              href={`/equipment/${item.id}`}
              label="View Equipment"
              variant="primary"
            />

            <ActionButton
              href={
                item.latest_certificate
                  ? `/certificates/${item.latest_certificate.id}`
                  : "#"
              }
              label="Certificate"
              disabled={!item.latest_certificate}
            />

            <ActionButton
              href={item.latest_ncr ? `/ncr/${item.latest_ncr.id}` : "#"}
              label="NCR"
              disabled={!item.latest_ncr}
            />

            <ActionButton
              href={item.latest_report ? `/reports/${item.latest_report.id}` : "#"}
              label="Report"
              disabled={!item.latest_report}
            />
          </div>
        </div>
      </div>
    );
  }

  function EquipmentRow({ item }) {
    const displayStatus = item.certificate_status || item.inspection_status || "valid";

    return (
      <div className="rounded-2xl border border-white/10 bg-[#0b1220] hover:border-[#7c5cfc]/40 transition p-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-extrabold text-white truncate">
              {item.asset_name || "Unnamed Equipment"} - {item.serial_number || "N/A"}
            </h3>

            <p className="mt-2 text-sm text-white/70">
              {(item.asset_tag || "No Tag")} • {(item.equipment_type || "No Type")} •{" "}
              {(item.manufacturer || "Unknown Manufacturer")}
            </p>

            <p className="mt-1 text-sm text-white/60">
              Serial: {item.serial_number || "N/A"} | Location: {item.location || "N/A"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {getStatusBadge(displayStatus)}

            <ActionButton href={`/equipment/${item.id}`} label="View Equipment" variant="primary" />

            <ActionButton
              href={
                item.latest_certificate
                  ? `/certificates/${item.latest_certificate.id}`
                  : "#"
              }
              label="Certificate"
              disabled={!item.latest_certificate}
            />

            <ActionButton
              href={item.latest_ncr ? `/ncr/${item.latest_ncr.id}` : "#"}
              label="NCR"
              disabled={!item.latest_ncr}
            />

            <ActionButton
              href={item.latest_report ? `/reports/${item.latest_report.id}` : "#"}
              label="Report"
              disabled={!item.latest_report}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#060b16] text-white px-4 md:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-black tracking-tight">Equipment</h1>
          <div
            className="mt-3 h-1.5 w-20 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${C.green}, ${C.purple})`,
            }}
          />

          <h2 className="mt-8 text-3xl font-black">Equipment Register</h2>
          <div
            className="mt-3 h-1.5 w-20 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${C.green}, ${C.purple})`,
            }}
          />

          <div className="mt-8 rounded-2xl border border-white/10 bg-[#0b1220] p-5">
            <div className="flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
              <input
                type="text"
                placeholder="Search by tag, asset name, serial, client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full xl:flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-[#7c5cfc]"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-4 py-3 rounded-xl font-semibold border transition ${
                    statusFilter === "all"
                      ? "bg-[#7c5cfc] text-white border-[#7c5cfc]"
                      : "bg-white/5 text-white border-white/10 hover:bg-white/10"
                  }`}
                >
                  All ({counts.all})
                </button>

                <button
                  onClick={() => setStatusFilter("active")}
                  className={`px-4 py-3 rounded-xl font-semibold border transition ${
                    statusFilter === "active"
                      ? "bg-[#7c5cfc] text-white border-[#7c5cfc]"
                      : "bg-white/5 text-white border-white/10 hover:bg-white/10"
                  }`}
                >
                  Active ({counts.active})
                </button>

                <button
                  onClick={() => setStatusFilter("expiring")}
                  className={`px-4 py-3 rounded-xl font-semibold border transition ${
                    statusFilter === "expiring"
                      ? "bg-[#7c5cfc] text-white border-[#7c5cfc]"
                      : "bg-white/5 text-white border-white/10 hover:bg-white/10"
                  }`}
                >
                  Expiring Soon ({counts.expiring})
                </button>

                <button
                  onClick={() => setStatusFilter("expired")}
                  className={`px-4 py-3 rounded-xl font-semibold border transition ${
                    statusFilter === "expired"
                      ? "bg-[#7c5cfc] text-white border-[#7c5cfc]"
                      : "bg-white/5 text-white border-white/10 hover:bg-white/10"
                  }`}
                >
                  Expired ({counts.expired})
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-white/60">
                Showing {filteredEquipment.length} equipment item(s)
              </p>

              <div className="flex rounded-xl border border-white/10 overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-4 py-2 text-sm font-semibold transition ${
                    viewMode === "grid"
                      ? "bg-[#7c5cfc] text-white"
                      : "bg-white/5 text-white/80 hover:bg-white/10"
                  }`}
                >
                  Grid View
                </button>

                <button
                  onClick={() => setViewMode("list")}
                  className={`px-4 py-2 text-sm font-semibold transition ${
                    viewMode === "list"
                      ? "bg-[#7c5cfc] text-white"
                      : "bg-white/5 text-white/80 hover:bg-white/10"
                  }`}
                >
                  List View
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-8 rounded-2xl border border-white/10 bg-[#0b1220] p-8 text-white/70">
              Loading equipment...
            </div>
          ) : filteredEquipment.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-white/10 bg-[#0b1220] p-8 text-white/70">
              No equipment found.
            </div>
          ) : viewMode === "grid" ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredEquipment.map((item) => (
                <EquipmentCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {filteredEquipment.map((item) => (
                <EquipmentRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
