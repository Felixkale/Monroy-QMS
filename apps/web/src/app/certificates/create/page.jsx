"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";
import {
  createCertificate,
  uploadCertificateSignature,
  buildCertificateQrValue,
} from "@/services/certificate";

const C = {
  green: "#00f5c4",
  purple: "#7c5cfc",
  blue: "#4fc3f7",
  pink: "#f472b6",
};

const CERTIFICATE_TYPES = [
  "Pressure Test Certificate",
  "Load Test Certificate",
  "Certificate of Statutory Inspection",
  "Compliance Certificate",
  "NDT Certificate",
];

const INSPECTION_RESULTS = ["PASS", "FAIL", "CONDITIONAL"];

const LEGAL_DEFAULT = "Mines, Quarries, Works and Machinery Act Cap 44:02";
const DEFAULT_LOGO_URL = "/monroy-logo.png";

function formatDisplayDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function isMeaningful(value) {
  if (value === undefined || value === null) return false;
  const text = String(value).trim();
  if (!text) return false;
  if (text.toUpperCase() === "N/A") return false;
  return true;
}

function QrCodeSvg({ value, size = 120 }) {
  const cells = useMemo(() => {
    const text = String(value || "certificate");
    const dim = 21;
    const matrix = [];
    let seed = 0;

    for (let i = 0; i < text.length; i += 1) {
      seed = (seed * 31 + text.charCodeAt(i)) >>> 0;
    }

    function rand() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }

    for (let y = 0; y < dim; y += 1) {
      const row = [];
      for (let x = 0; x < dim; x += 1) {
        const inTopLeft = x < 7 && y < 7;
        const inTopRight = x >= dim - 7 && y < 7;
        const inBottomLeft = x < 7 && y >= dim - 7;

        if (inTopLeft || inTopRight || inBottomLeft) {
          const localX = inTopLeft ? x : inTopRight ? x - (dim - 7) : x;
          const localY = inTopLeft ? y : inTopRight ? y : y - (dim - 7);

          const outer = localX === 0 || localX === 6 || localY === 0 || localY === 6;
          const inner = localX >= 2 && localX <= 4 && localY >= 2 && localY <= 4;
          row.push(outer || inner ? 1 : 0);
        } else {
          row.push(rand() > 0.5 ? 1 : 0);
        }
      }
      matrix.push(row);
    }

    return matrix;
  }, [value]);

  const dim = cells.length;
  const cell = size / dim;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      style={{ background: "#fff", border: "1px solid #d1d5db" }}
    >
      <rect width={size} height={size} fill="#fff" />
      {cells.map((row, y) =>
        row.map((filled, x) =>
          filled ? (
            <rect
              key={`${x}-${y}`}
              x={x * cell}
              y={y * cell}
              width={cell}
              height={cell}
              fill="#111827"
            />
          ) : null
        )
      )}
    </svg>
  );
}

function FieldRow({ label, value }) {
  if (!isMeaningful(value)) return null;

  return (
    <li
      style={{
        display: "flex",
        gap: 6,
        alignItems: "baseline",
        padding: "3px 0",
        borderBottom: "1px solid #eef2f7",
        fontSize: 12,
        lineHeight: 1.55,
      }}
    >
      <span style={{ color: "#4b5563", minWidth: 132, flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 700, color: "#111827" }}>{value}</span>
    </li>
  );
}

export default function CreateCertificatePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [loadingEquipment, setLoadingEquipment] = useState(true);
  const [equipmentOptions, setEquipmentOptions] = useState([]);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    asset_id: "",
    certificate_type: "Pressure Test Certificate",
    company: "",
    equipment_description: "",
    equipment_location: "",
    equipment_id: "",
    equipment_type: "",
    manufacturer: "",
    serial_number: "",
    year_built: "",
    design_code: "",
    shell_material: "",
    fluid_type: "",
    design_pressure: "",
    working_pressure: "",
    test_pressure: "",
    design_temperature: "",
    capacity_volume: "",
    safe_working_load: "",
    proof_load: "",
    lifting_height: "",
    sling_length: "",
    chain_size: "",
    rope_diameter: "",
    legal_framework: LEGAL_DEFAULT,
    inspection_result: "PASS",
    inspection_date: new Date().toISOString().slice(0, 10),
    issue_date: new Date().toISOString().slice(0, 10),
    expiry_date: "",
    inspector_name: "",
    inspector_id: "",
    signature_url: "",
    logo_url: DEFAULT_LOGO_URL,
    waiver_start: "",
    waiver_end: "",
    waiver_reference: "",
    waiver_conditions: "",
    waiver_restrictions: "",
  });

  useEffect(() => {
    async function loadEquipment() {
      try {
        setLoadingEquipment(true);

        const { data, error } = await supabase
          .from("assets")
          .select(`
            id,
            asset_name,
            asset_tag,
            asset_type,
            manufacturer,
            model,
            serial_number,
            year_built,
            location,
            design_standard,
            shell_material,
            fluid_type,
            design_pressure,
            working_pressure,
            test_pressure,
            design_temperature,
            capacity_volume,
            safe_working_load,
            proof_load,
            lifting_height,
            sling_length,
            chain_size,
            rope_diameter,
            next_inspection_date,
            client_id,
            clients (
              company_name
            )
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setEquipmentOptions(data || []);
      } catch (err) {
        setEquipmentOptions([]);
        setError(err?.message || "Failed to load equipment.");
      } finally {
        setLoadingEquipment(false);
      }
    }

    loadEquipment();
  }, []);

  const selectedEquipment = useMemo(() => {
    return equipmentOptions.find((item) => item.id === form.asset_id) || null;
  }, [equipmentOptions, form.asset_id]);

  useEffect(() => {
    if (!selectedEquipment) return;

    const companyName = selectedEquipment.clients?.company_name || "";
    const equipmentType = selectedEquipment.asset_type || "";
    const assetTag = selectedEquipment.asset_tag || "";
    const description = selectedEquipment.asset_name || equipmentType || "";
    const location = selectedEquipment.location || "";

    setForm((prev) => ({
      ...prev,
      company: companyName,
      equipment_description: description,
      equipment_location: location,
      equipment_id: assetTag,
      equipment_type: equipmentType,
      manufacturer: selectedEquipment.manufacturer || "",
      serial_number: selectedEquipment.serial_number || "",
      year_built: selectedEquipment.year_built || "",
      design_code: selectedEquipment.design_standard || "",
      shell_material: selectedEquipment.shell_material || "",
      fluid_type: selectedEquipment.fluid_type || "",
      design_pressure: selectedEquipment.design_pressure || "",
      working_pressure: selectedEquipment.working_pressure || "",
      test_pressure: selectedEquipment.test_pressure || "",
      design_temperature: selectedEquipment.design_temperature || "",
      capacity_volume: selectedEquipment.capacity_volume || "",
      safe_working_load: selectedEquipment.safe_working_load || "",
      proof_load: selectedEquipment.proof_load || "",
      lifting_height: selectedEquipment.lifting_height || "",
      sling_length: selectedEquipment.sling_length || "",
      chain_size: selectedEquipment.chain_size || "",
      rope_diameter: selectedEquipment.rope_diameter || "",
      expiry_date: prev.expiry_date || selectedEquipment.next_inspection_date || "",
      certificate_type:
        prev.certificate_type ||
        (equipmentType?.toLowerCase().includes("pressure")
          ? "Pressure Test Certificate"
          : "Load Test Certificate"),
    }));
  }, [selectedEquipment]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "inspection_result" && value !== "CONDITIONAL") {
        next.waiver_start = "";
        next.waiver_end = "";
        next.waiver_reference = "";
        next.waiver_conditions = "";
        next.waiver_restrictions = "";
      }

      return next;
    });
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");

    const { data, error } = await uploadCertificateSignature(file);

    if (error) {
      setError(error?.message || "Failed to upload signature.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      signature_url: data?.publicUrl || "",
    }));
  };

  const qrValue = useMemo(() => {
    return buildCertificateQrValue({
      certificate_number: "Auto Generated",
      equipment_id: form.equipment_id,
      company: form.company,
      inspector_name: form.inspector_name,
      legal_framework: form.legal_framework,
      asset: {
        asset_tag: form.equipment_id,
      },
    });
  }, [form.equipment_id, form.company, form.inspector_name, form.legal_framework]);

  const previewNameplateRows = useMemo(() => {
    const isLifting =
      form.equipment_type &&
      [
        "Trestle Jack",
        "Lever Hoist",
        "Bottle Jack",
        "Safety Harness",
        "Jack Stand",
        "Chain Block",
        "Bow Shackle",
        "Mobile Crane",
        "Trolley Jack",
        "Step Ladders",
        "Tifor",
        "Crawl Beam",
        "Beam Crawl",
        "Beam Clamp",
        "Webbing Sling",
        "Nylon Sling",
        "Wire Sling",
        "Fall Arrest",
        "Man Cage",
        "Shutter Clamp",
        "Drum Clamp",
      ].includes(form.equipment_type);

    if (isLifting) {
      return [
        ["Design Code:", form.design_code],
        ["Safe Working Load:", isMeaningful(form.safe_working_load) ? `${form.safe_working_load} Tons` : ""],
        ["Proof Load:", isMeaningful(form.proof_load) ? `${form.proof_load} Tons` : ""],
        ["Lift Height:", form.lifting_height],
        ["Sling Length:", form.sling_length],
        ["Chain Size:", form.chain_size],
        ["Wire / Rope Diameter:", form.rope_diameter],
      ];
    }

    return [
      ["Design Code:", form.design_code],
      ["Design Pressure:", isMeaningful(form.design_pressure) ? `${form.design_pressure} kPa` : ""],
      ["Authorized Pressure:", isMeaningful(form.working_pressure) ? `${form.working_pressure} kPa` : ""],
      ["Test Pressure:", isMeaningful(form.test_pressure) ? `${form.test_pressure} kPa` : ""],
      ["Design Temperature:", form.design_temperature],
      ["Capacity / Volume:", form.capacity_volume],
      ["Shell / Body Material:", form.shell_material],
      ["Fluid / Contents:", form.fluid_type],
    ];
  }, [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.asset_id) {
      setError("Please select equipment.");
      return;
    }

    if (!form.inspector_name.trim()) {
      setError("Inspector name is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const swlValue = isMeaningful(form.safe_working_load)
        ? `${form.safe_working_load} Tons`
        : null;

      const mawpValue = isMeaningful(form.working_pressure)
        ? `${form.working_pressure} kPa`
        : null;

      const payload = {
        asset_id: form.asset_id,
        certificate_type: form.certificate_type,
        company: form.company,
        equipment_description: form.equipment_description,
        equipment_location: form.equipment_location,
        equipment_id: form.equipment_id,
        swl: swlValue,
        mawp: mawpValue,
        equipment_status: form.inspection_result,
        legal_framework: form.legal_framework || LEGAL_DEFAULT,
        inspector_name: form.inspector_name,
        inspector_id: form.inspector_id,
        signature_url: form.signature_url || null,
        logo_url: form.logo_url || DEFAULT_LOGO_URL,
        issued_at: form.issue_date ? new Date(form.issue_date).toISOString() : new Date().toISOString(),
        valid_to: form.expiry_date || null,
        status: "issued",
      };

      const { data, error } = await createCertificate(payload);

      if (error) throw error;

      router.push(`/certificates/${data.id}`);
    } catch (err) {
      setError(err?.message || "Failed to create certificate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Create Certificate">
      <div style={{ marginBottom: 24 }}>
