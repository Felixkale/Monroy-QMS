// apps/web/src/app/certificates/[id]/edit/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabaseClient";

const C = {
  bg: "#0b1120",
  panel: "#111827",
  panel2: "#182233",
  border: "rgba(255,255,255,0.12)",
  text: "#f8fafc",
  textSoft: "#cbd5e1",
  textDim: "#94a3b8",
  cyan: "#22d3ee",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  purple: "#8b5cf6",
};

const EMPTY_FORM = {
  asset_id: "",
  certificate_type: "",
  company: "",
  equipment_description: "",
  equipment_location: "",
  equipment_id: "",
  identification_number: "",
  inspection_no: "",
  lanyard_serial_no: "",
  swl: "",
  mawp: "",
  design_pressure: "",
  test_pressure: "",
  capacity: "",
  year_built: "",
  manufacturer: "",
  model: "",
  country_of_origin: "",
  equipment_status: "PASS",
  issued_at: "",
  valid_to: "",
  status: "issued",
  legal_framework: "Mines, Quarries, Works and Machinery Act Cap 44:02",
  inspector_name: "",
  inspector_id: "",
  signature_url: "",
  logo_url: "/logo.png",
  pdf_url: "",
  folder_id: "",
  folder_name: "",
  folder_position: 1,
};

function normalizeId(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function sanitizeText(value, max = 250) {
  if (value === undefined || value === null) return "";
  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function normalizeDateForDb(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function toDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function detectEquipmentType(assetType = "") {
  const t = String(assetType).toLowerCase();
  return ["pressure vessel", "boiler", "air receiver", "air compressor", "oil separator"].includes(t)
    ? "pv"
    : "lift";
}

function defaultCertificateType(assetType = "") {
  return detectEquipmentType(assetType) === "pv"
    ? "Pressure Test Certificate"
    : "Load Test Certificate";
}

function Field({ label, name, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select
        name={name}
        value={value ?? ""}
        onChange={onChange}
        style={{ ...inputStyle, background: "#0f172a", cursor: "pointer" }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function EditCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const id = normalizeId(params?.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assets, setAssets] = useState([]);
  const [certificateOptions, setCertificateOptions] = useState([]);
  const [folderMembers, setFolderMembers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [linkTargetId, setLinkTargetId] = useState("");
  const [targetFolderPosition, setTargetFolderPosition] = useState(2);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!id) return;
    loadPage();
  }, [id]);

  const selectedAsset = useMemo(
    () => assets.find((item) => String(item.id) === String(form.asset_id)) || null,
    [assets, form.asset_id]
  );

  const selectableCertificates = useMemo(
    () => certificateOptions.filter((item) => String(item.id) !== String(id)),
    [certificateOptions, id]
  );

  async function loadPage() {
    setLoading(true);
    setError("");
    setSuccess("");

    const [assetsRes, certListRes, certRes] = await Promise.all([
      supabase
        .from("assets")
        .select(`
          id,
          asset_name,
          asset_tag,
          asset_type,
          location,
          serial_number,
          equipment_id,
          identification_number,
          inspection_no,
          lanyard_serial_no,
          safe_working_load,
          working_pressure,
          design_pressure,
          test_pressure,
          next_inspection_date,
          year_built,
          capacity_volume,
          manufacturer,
          model,
          country_of_origin,
          inspector_name,
          inspector_id,
          clients ( company_name )
        `)
        .order("created_at", { ascending: false }),

      supabase
        .from("certificates")
        .select(`
          id,
          certificate_number,
          company,
          client_name,
          equipment_description,
          folder_id,
          folder_name,
          folder_position
        `)
        .order("created_at", { ascending: false }),

      supabase
        .from("certificates")
        .select("*")
        .eq("id", id)
        .maybeSingle(),
    ]);

    if (assetsRes.error) {
      setError(assetsRes.error.message || "Failed to load assets.");
      setLoading(false);
      return;
    }

    if (certListRes.error) {
      setError(certListRes.error.message || "Failed to load certificates.");
      setLoading(false);
      return;
    }

    if (certRes.error || !certRes.data) {
      setError(certRes.error?.message || "Certificate not found.");
      setLoading(false);
      return;
    }

    setAssets(assetsRes.data || []);
    setCertificateOptions(certListRes.data || []);

    const row = certRes.data;

    setForm({
      asset_id: row.asset_id || "",
      certificate_type: row.certificate_type || "",
      company: row.company || row.client_name || "",
      equipment_description: row.equipment_description || "",
      equipment_location: row.equipment_location || "",
      equipment_id: row.equipment_id || "",
      identification_number: row.identification_number || "",
      inspection_no: row.inspection_no || "",
      lanyard_serial_no: row.lanyard_serial_no || "",
      swl: row.swl || "",
      mawp: row.mawp || "",
      design_pressure: row.design_pressure || "",
      test_pressure: row.test_pressure || "",
      capacity: row.capacity || "",
      year_built: row.year_built || "",
      manufacturer: row.manufacturer || "",
      model: row.model || "",
      country_of_origin: row.country_of_origin || "",
      equipment_status: row.equipment_status || row.result || "PASS",
      issued_at: toDateInput(row.issued_at || row.issue_date),
      valid_to: toDateInput(row.valid_to || row.expiry_date),
      status: row.status || "issued",
      legal_framework:
        row.legal_framework || "Mines, Quarries, Works and Machinery Act Cap 44:02",
      inspector_name: row.inspector_name || "",
      inspector_id: row.inspector_id || "",
      signature_url: row.signature_url || "",
      logo_url: row.logo_url || "/logo.png",
      pdf_url: row.pdf_url || "",
      folder_id: row.folder_id || "",
      folder_name: row.folder_name || "",
      folder_position: row.folder_position || 1,
    });

    if (row.folder_id) {
      const { data: members } = await supabase
        .from("certificates")
        .select("id, certificate_number, equipment_description, folder_position")
        .eq("folder_id", row.folder_id)
        .order("folder_position", { ascending: true })
        .order("created_at", { ascending: true });

      setFolderMembers(members || []);
    } else {
      setFolderMembers([]);
    }

    setLoading(false);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleUseEquipmentData() {
    if (!selectedAsset) return;

    const assetType = selectedAsset.asset_type || "";
    const kind = detectEquipmentType(assetType);

    setForm((prev) => ({
      ...prev,
      certificate_type: prev.certificate_type || defaultCertificateType(assetType),
      company: selectedAsset.clients?.company_name || prev.company,
      equipment_description: assetType || selectedAsset.asset_name || prev.equipment_description,
      equipment_location: selectedAsset.location || prev.equipment_location,
      equipment_id:
        selectedAsset.equipment_id ||
        selectedAsset.serial_number ||
        selectedAsset.asset_tag ||
        prev.equipment_id,
      identification_number: selectedAsset.identification_number || prev.identification_number,
      inspection_no: selectedAsset.inspection_no || prev.inspection_no,
      lanyard_serial_no: selectedAsset.lanyard_serial_no || prev.lanyard_serial_no,
      swl: kind === "lift" ? selectedAsset.safe_working_load || prev.swl : prev.swl,
      mawp: kind === "pv" ? selectedAsset.working_pressure || prev.mawp : prev.mawp,
      design_pressure: selectedAsset.design_pressure || prev.design_pressure,
      test_pressure: selectedAsset.test_pressure || prev.test_pressure,
      capacity: selectedAsset.capacity_volume || prev.capacity,
      year_built: selectedAsset.year_built || prev.year_built,
      manufacturer: selectedAsset.manufacturer || prev.manufacturer,
      model: selectedAsset.model || prev.model,
      country_of_origin: selectedAsset.country_of_origin || prev.country_of_origin,
      inspector_name: selectedAsset.inspector_name || prev.inspector_name,
      inspector_id: selectedAsset.inspector_id || prev.inspector_id,
      valid_to: prev.valid_to || toDateInput(selectedAsset.next_inspection_date),
    }));
  }

  async function handleUnlinkFolder() {
    if (!form.folder_id) {
      setError("This certificate is not linked to any folder.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const { error: unlinkError } = await supabase
      .from("certificates")
      .update({
        folder_id: null,
        folder_name: null,
        folder_position: 1,
      })
      .eq("folder_id", form.folder_id);

    if (unlinkError) {
      setError(unlinkError.message || "Failed to unlink folder.");
      setSaving(false);
      return;
    }

    setSuccess("Linked folder removed.");
    setForm((prev) => ({
      ...prev,
      folder_id: "",
      folder_name: "",
      folder_position: 1,
    }));
    setFolderMembers([]);
    setLinkTargetId("");
    setSaving(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!sanitizeText(form.company, 120)) {
        throw new Error("Company is required.");
      }

      if (!sanitizeText(form.equipment_description, 160)) {
        throw new Error("Equipment description is required.");
      }

      if (!sanitizeText(form.equipment_id, 80)) {
        throw new Error("Equipment ID is required.");
      }

      let folderId = form.folder_id || null;
      let folderName = sanitizeText(form.folder_name, 120) || null;
      const folderPosition = Math.max(1, Number(form.folder_position) || 1);

      if (linkTargetId) {
        folderId = folderId || crypto.randomUUID();
        folderName = folderName || `Linked Folder ${id}`;
      }

      const payload = {
        asset_id: form.asset_id || null,
        certificate_type: sanitizeText(form.certificate_type, 100) || null,
        company: sanitizeText(form.company, 120),
        equipment_description: sanitizeText(form.equipment_description, 180),
        equipment_location: sanitizeText(form.equipment_location, 150) || null,
        equipment_id: sanitizeText(form.equipment_id, 80),
        identification_number: sanitizeText(form.identification_number, 80) || null,
        inspection_no: sanitizeText(form.inspection_no, 80) || null,
        lanyard_serial_no: sanitizeText(form.lanyard_serial_no, 80) || null,
        swl: sanitizeText(form.swl, 50) || null,
        mawp: sanitizeText(form.mawp, 50) || null,
        design_pressure: sanitizeText(form.design_pressure, 50) || null,
        test_pressure: sanitizeText(form.test_pressure, 50) || null,
        capacity: sanitizeText(form.capacity, 50) || null,
        year_built: sanitizeText(form.year_built, 20) || null,
        manufacturer: sanitizeText(form.manufacturer, 100) || null,
        model: sanitizeText(form.model, 100) || null,
        country_of_origin: sanitizeText(form.country_of_origin, 80) || null,
        equipment_status: sanitizeText(form.equipment_status, 30) || "PASS",
        issued_at: normalizeDateForDb(form.issued_at),
        valid_to: form.valid_to || null,
        status: sanitizeText(form.status, 40) || "issued",
        legal_framework: sanitizeText(form.legal_framework, 250) || null,
        inspector_name: sanitizeText(form.inspector_name, 100) || null,
        inspector_id: sanitizeText(form.inspector_id, 80) || null,
        signature_url: sanitizeText(form.signature_url, 500) || null,
        logo_url: sanitizeText(form.logo_url, 500) || null,
        pdf_url: sanitizeText(form.pdf_url, 500) || null,
        folder_id: folderId,
        folder_name: folderName,
        folder_position: folderPosition,
      };

      const { error: updateError } = await supabase
        .from("certificates")
        .update(payload)
        .eq("id", id);

      if (updateError) throw updateError;

      if (folderId && folderName) {
        await supabase
          .from("certificates")
          .update({ folder_name: folderName })
          .eq("folder_id", folderId);
      }

      if (linkTargetId) {
        const { error: targetError } = await supabase
          .from("certificates")
          .update({
            folder_id: folderId,
            folder_name: folderName,
            folder_position: Math.max(1, Number(targetFolderPosition) || folderPosition + 1),
          })
          .eq("id", linkTargetId);

        if (targetError) throw targetError;
      }

      if (form.asset_id) {
        await supabase
          .from("assets")
          .update({
            location: sanitizeText(form.equipment_location, 150) || null,
            equipment_id: sanitizeText(form.equipment_id, 80) || null,
            identification_number: sanitizeText(form.identification_number, 80) || null,
            inspection_no: sanitizeText(form.inspection_no, 80) || null,
            lanyard_serial_no: sanitizeText(form.lanyard_serial_no, 80) || null,
            safe_working_load: sanitizeText(form.swl, 50) || null,
            working_pressure: sanitizeText(form.mawp, 50) || null,
            design_pressure: sanitizeText(form.design_pressure, 50) || null,
            test_pressure: sanitizeText(form.test_pressure, 50) || null,
            next_inspection_date: form.valid_to || null,
            year_built: sanitizeText(form.year_built, 20) || null,
            capacity_volume: sanitizeText(form.capacity, 50) || null,
            manufacturer: sanitizeText(form.manufacturer, 100) || null,
            model: sanitizeText(form.model, 100) || null,
            country_of_origin: sanitizeText(form.country_of_origin, 80) || null,
            inspector_name: sanitizeText(form.inspector_name, 100) || null,
            inspector_id: sanitizeText(form.inspector_id, 80) || null,
            cert_type: sanitizeText(form.certificate_type, 100) || null,
            design_standard: sanitizeText(form.legal_framework, 250) || null,
          })
          .eq("id", form.asset_id);
      }

      setSuccess("Certificate saved successfully.");
      router.push(`/certificates/${id}`);
    } catch (saveError) {
      setError(saveError?.message || "Failed to save certificate.");
      setSaving(false);
      return;
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <AppLayout title="Edit Certificate">
        <div style={pageWrap}>
          <div style={panelStyle}>Loading certificate…</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Edit Certificate">
      <div style={pageWrap}>
        <div style={{ maxWidth: 1220, margin: "0 auto", display: "grid", gap: 18 }}>
          <div style={panelStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={eyebrow}>Edit Certificate</div>
                <div style={titleStyle}>Fix fields, link pairs, and print as one folder</div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" onClick={() => router.push(`/certificates/${id}`)} style={ghostBtn}>
                  View Certificate
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`/certificates/print/${id}`, "_blank", "noopener,noreferrer")}
                  style={greenBtn}
                >
                  Print
                </button>
              </div>
            </div>
          </div>

          {error ? <div style={errorBox}>{error}</div> : null}
          {success ? <div style={successBox}>{success}</div> : null}

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18 }}>
            <div style={panelStyle}>
              <div style={sectionTitle}>Link to Equipment</div>

              <div style={{ ...gridStyle, gridTemplateColumns: "1.5fr auto" }}>
                <div>
                  <label style={labelStyle}>Select Equipment (Asset)</label>
                  <select
                    name="asset_id"
                    value={form.asset_id}
                    onChange={handleChange}
                    style={{ ...inputStyle, background: "#0f172a", cursor: "pointer" }}
                  >
                    <option value="">— Select equipment —</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.asset_tag} — {asset.asset_name}
                        {asset.serial_number ? ` (S/N: ${asset.serial_number})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button
                    type="button"
                    onClick={handleUseEquipmentData}
                    disabled={!selectedAsset}
                    style={selectedAsset ? purpleBtn : disabledBtn}
                  >
                    Auto-fill from Equipment
                  </button>
                </div>
              </div>
            </div>

            <div style={panelStyle}>
              <div style={sectionTitle}>Certificate Details</div>

              <div style={gridStyle}>
                <Field label="Certificate Type" name="certificate_type" value={form.certificate_type} onChange={handleChange} />
                <Field label="Company" name="company" value={form.company} onChange={handleChange} />
                <Field label="Equipment Description" name="equipment_description" value={form.equipment_description} onChange={handleChange} />
                <Field label="Equipment Location" name="equipment_location" value={form.equipment_location} onChange={handleChange} />
                <Field label="Equipment ID" name="equipment_id" value={form.equipment_id} onChange={handleChange} />
                <Field label="Identification Number" name="identification_number" value={form.identification_number} onChange={handleChange} />
                <Field label="Inspection Number" name="inspection_no" value={form.inspection_no} onChange={handleChange} />
                <Field label="Lanyard Serial Number" name="lanyard_serial_no" value={form.lanyard_serial_no} onChange={handleChange} />
              </div>
            </div>

            <div style={panelStyle}>
              <div style={sectionTitle}>Technical Fields</div>

              <div style={gridStyle}>
                <Field label="SWL" name="swl" value={form.swl} onChange={handleChange} />
                <Field label="MAWP" name="mawp" value={form.mawp} onChange={handleChange} />
                <Field label="Design Pressure" name="design_pressure" value={form.design_pressure} onChange={handleChange} />
                <Field label="Test Pressure" name="test_pressure" value={form.test_pressure} onChange={handleChange} />
                <Field label="Capacity" name="capacity" value={form.capacity} onChange={handleChange} />
                <Field label="Year Built" name="year_built" value={form.year_built} onChange={handleChange} />
                <Field label="Manufacturer" name="manufacturer" value={form.manufacturer} onChange={handleChange} />
                <Field label="Model" name="model" value={form.model} onChange={handleChange} />
                <Field label="Country of Origin" name="country_of_origin" value={form.country_of_origin} onChange={handleChange} />
              </div>
            </div>

            <div style={panelStyle}>
              <div style={sectionTitle}>Dates, Status, Inspector</div>

              <div style={gridStyle}>
                <SelectField
                  label="Result"
                  name="equipment_status"
                  value={form.equipment_status}
                  onChange={handleChange}
                  options={[
                    { value: "PASS", label: "PASS" },
                    { value: "FAIL", label: "FAIL" },
                    { value: "REPAIR_REQUIRED", label: "REPAIR REQUIRED" },
                    { value: "OUT_OF_SERVICE", label: "OUT OF SERVICE" },
                  ]}
                />

                <SelectField
                  label="Record Status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  options={[
                    { value: "issued", label: "Issued" },
                    { value: "draft", label: "Draft" },
                    { value: "archived", label: "Archived" },
                  ]}
                />

                <Field label="Issue Date" name="issued_at" type="date" value={form.issued_at} onChange={handleChange} />
                <Field label="Expiry Date" name="valid_to" type="date" value={form.valid_to} onChange={handleChange} />
                <Field label="Inspector Name" name="inspector_name" value={form.inspector_name} onChange={handleChange} />
                <Field label="Inspector ID" name="inspector_id" value={form.inspector_id} onChange={handleChange} />
                <Field label="Legal Framework" name="legal_framework" value={form.legal_framework} onChange={handleChange} />
                <Field label="Signature URL" name="signature_url" value={form.signature_url} onChange={handleChange} />
              </div>
            </div>

            <div id="stapler" style={panelStyle}>
              <div style={sectionTitle}>Stapler / Linked Folder</div>

              <div
                style={{
                  border: `1px solid ${C.border}`,
                  background: "rgba(34,211,238,0.06)",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 6 }}>
                  Use this for paired certificates like Safety Harness + Lanyard
                </div>
                <div style={{ color: C.textSoft, fontSize: 13, lineHeight: 1.6 }}>
                  When two certificates share the same folder, the print page will print them as separate pages in one job, and the certificate view will always show them together.
                </div>
              </div>

              <div style={gridStyle}>
                <Field label="Folder Name" name="folder_name" value={form.folder_name} onChange={handleChange} placeholder="Example: Harness + Lanyard Set 01" />
                <Field label="Current Certificate Position" name="folder_position" type="number" value={form.folder_position} onChange={handleChange} />
                <div>
                  <label style={labelStyle}>Link Another Certificate</label>
                  <select
                    value={linkTargetId}
                    onChange={(e) => setLinkTargetId(e.target.value)}
                    style={{ ...inputStyle, background: "#0f172a", cursor: "pointer" }}
                  >
                    <option value="">— Select certificate to staple —</option>
                    {selectableCertificates.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.certificate_number || item.id} — {item.equipment_description || item.company || item.client_name || "Certificate"}
                      </option>
                    ))}
                  </select>
                </div>
                <Field
                  label="Linked Certificate Position"
                  type="number"
                  name="linked_position"
                  value={targetFolderPosition}
                  onChange={(e) => setTargetFolderPosition(e.target.value)}
                />
              </div>

              {folderMembers.length > 0 ? (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>
                    Current linked folder members
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    {folderMembers.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          border: `1px solid ${C.border}`,
                          background: "rgba(255,255,255,0.03)",
                          borderRadius: 12,
                          padding: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800 }}>
                            {item.certificate_number || "—"}
                          </div>
                          <div style={{ color: C.textSoft, fontSize: 13 }}>
                            {item.equipment_description || "Unnamed equipment"}
                          </div>
                        </div>
                        <div style={{ color: C.cyan, fontWeight: 800, fontSize: 13 }}>
                          Position {item.folder_position || 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
                <button type="button" onClick={handleUnlinkFolder} style={redBtn} disabled={saving}>
                  Remove Linked Folder
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button type="submit" disabled={saving} style={greenBtn}>
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button type="button" onClick={() => router.push(`/certificates/${id}`)} style={ghostBtn}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}

const pageWrap = {
  minHeight: "100vh",
  background: C.bg,
  color: C.text,
  padding: 24,
};

const panelStyle = {
  background: C.panel,
  border: `1px solid ${C.border}`,
  borderRadius: 18,
  padding: 18,
};

const eyebrow = {
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: C.cyan,
  marginBottom: 8,
};

const titleStyle = {
  fontSize: 26,
  fontWeight: 900,
  lineHeight: 1.1,
};

const sectionTitle = {
  fontSize: 18,
  fontWeight: 900,
  marginBottom: 16,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 14,
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 800,
  color: C.textSoft,
  marginBottom: 7,
  letterSpacing: "0.02em",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 12,
  border: `1px solid ${C.border}`,
  background: C.panel2,
  color: C.text,
  fontSize: 14,
  fontWeight: 600,
  outline: "none",
};

const ghostBtn = {
  padding: "11px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "#f8fafc",
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
};

const greenBtn = {
  padding: "11px 16px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, #22c55e, #14b8a6)",
  color: "#052e16",
  fontWeight: 900,
  fontSize: 13,
  cursor: "pointer",
};

const purpleBtn = {
  padding: "11px 16px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
  color: "#ecfeff",
  fontWeight: 900,
  fontSize: 13,
  cursor: "pointer",
};

const redBtn = {
  padding: "11px 16px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, #ef4444, #f97316)",
  color: "#fff7ed",
  fontWeight: 900,
  fontSize: 13,
  cursor: "pointer",
};

const disabledBtn = {
  padding: "11px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.05)",
  color: "#64748b",
  fontWeight: 800,
  fontSize: 13,
  cursor: "not-allowed",
};

const errorBox = {
  background: "rgba(239,68,68,0.14)",
  border: "1px solid rgba(239,68,68,0.24)",
  color: "#fecaca",
  borderRadius: 16,
  padding: 14,
  fontWeight: 700,
};

const successBox = {
  background: "rgba(34,197,94,0.14)",
  border: "1px solid rgba(34,197,94,0.24)",
  color: "#bbf7d0",
  borderRadius: 16,
  padding: 14,
  fontWeight: 700,
};
