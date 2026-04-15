// ─────────────────────────────────────────────────────────────────────────────
// PATCH for src/app/certificates/machine-inspection/page.jsx
//
// Replace ONLY the handleGenerate function and the "SAVED" render block.
// Everything else in the file stays identical.
//
// 1. Add this import at the top of the file (with the other imports):
//    import { autoRaiseNcrBatch } from "@/lib/autoNcr";
//
// 2. Add this state variable inside MachineInspectionPage():
//    const [ncrResults, setNcrResults] = useState([]);
//    const [ncrRunning, setNcrRunning] = useState(false);
//
// 3. Replace handleGenerate with the version below.
// 4. Replace the "if (saved)" render block with the version below.
// ─────────────────────────────────────────────────────────────────────────────

// ── REPLACEMENT handleGenerate ────────────────────────────────────────────────
async function handleGenerate() {
  if (!machineType || !equip.client_id || !equip.serial_number) {
    setError("Missing required fields.");
    return;
  }
  setSaving(true);
  setError("");

  await ensureClient(equip.client_name, equip.client_location);

  const equipRef = { ...equip };
  if (!equipRef.serial_number?.trim()) {
    const cc = (equipRef.client_name || "UNK").split(/\s+/).map(w => w[0]?.toUpperCase() || "").join("").slice(0, 3).padEnd(3, "X");
    const ec = (machineType.label || "EQP").split(/[\s/—-]+/).filter(Boolean).map(w => w[0]?.toUpperCase() || "").join("").slice(0, 3).padEnd(3, "X");
    equipRef.serial_number = `${cc}-${ec}-${String(Date.now()).slice(-6)}`;
  }

  const folderId   = crypto.randomUUID();
  const folderName = `${machineType.label}-${equipRef.serial_number}-${equip.inspection_date}`;
  const iDate      = equip.inspection_date;
  const expiryDate = addMonths(iDate, machineType.expiry);
  const certs      = [];

  const { count } = await supabase.from("certificates").select("*", { count: "exact", head: true });
  let seq = (count || 0) + 1;
  const pad    = n => String(n).padStart(5, "0");
  const prefix = machineType.id.slice(0, 2).toUpperCase();
  const nextNo = () => `CERT-${prefix}${pad(seq++)}`;
  const swl    = insp.swl || "";

  // ── BUILD CERT ROWS (identical logic as original, condensed) ──────────────
  if (machineType.isServiceTruck || machineType.isMixerTruck) {
    const truckLabel = machineType.id === "diesel_bowser" ? "Diesel Bowser"
      : machineType.isMixerTruck ? "Mixer Truck" : "Service Truck";
    const truckDesc = `${truckLabel} ${svcTruck.make} ${svcTruck.model} Reg ${svcTruck.reg}`.trim();
    certs.push({
      certificate_number: nextNo(), equipment_type: truckLabel, equipment_description: truckDesc,
      serial_number: svcTruck.vin || equipRef.serial_number, fleet_number: svcTruck.fleet,
      registration_number: svcTruck.reg, model: svcTruck.model, manufacturer: svcTruck.make,
      swl: svcTruck.gvm ? `GVM ${svcTruck.gvm}` : "", client_name: equip.client_name,
      client_id: equip.client_id, location: equip.client_location,
      issue_date: iDate, inspection_date: iDate, expiry_date: expiryDate, next_inspection_due: expiryDate,
      result: svcTruck.result, defects_found: svcTruck.notes || "",
      inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID,
      certificate_type: "Vehicle Inspection Certificate",
      folder_id: folderId, folder_name: folderName, folder_position: 1,
      notes: JSON.stringify({ truck: svcTruck }),
    });
    svcPVs.forEach((pv, i) => {
      if (!pv.sn && !pv.description) return;
      certs.push({
        certificate_number: nextNo(), equipment_type: "Pressure Vessel",
        equipment_description: pv.description || `Air Receiver ${i + 1}`,
        serial_number: pv.sn, manufacturer: pv.manufacturer, capacity_volume: pv.capacity,
        working_pressure: pv.working_pressure,
        test_pressure: pv.test_pressure || String(((parseFloat(pv.working_pressure) || 0) * 1.5).toFixed(2)).replace(/\.?0+$/, ""),
        design_pressure: pv.working_pressure, pressure_unit: pv.pressure_unit,
        fleet_number: svcTruck.fleet, registration_number: svcTruck.reg,
        client_name: equip.client_name, client_id: equip.client_id, location: equip.client_location,
        issue_date: iDate, inspection_date: iDate,
        expiry_date: addMonths(iDate, 12), next_inspection_due: addMonths(iDate, 12),
        result: pv.result, defects_found: pv.notes || "",
        inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID,
        certificate_type: "Pressure Test Certificate",
        folder_id: folderId, folder_name: folderName, folder_position: 10 + i,
        notes: JSON.stringify({ parent_reg: svcTruck.reg, parent_fleet: svcTruck.fleet, parent_make: svcTruck.make, parent_model: svcTruck.model }),
      });
    });
    if (machineType.isServiceTruck) {
      svcTools.forEach((tool, i) => {
        if (!tool.include) return;
        const toolMeta = SVC_TOOL_TYPES.find(t => t.id === tool.type);
        certs.push({
          certificate_number: nextNo(), equipment_type: toolMeta?.label || tool.type,
          equipment_description: tool.description || `${toolMeta?.label || tool.type} — SN ${tool.sn || "—"}`,
          serial_number: tool.sn, manufacturer: tool.manufacturer, swl: tool.swl,
          client_name: equip.client_name, client_id: equip.client_id, location: equip.client_location,
          issue_date: iDate, inspection_date: iDate, expiry_date: expiryDate, next_inspection_due: expiryDate,
          result: tool.result, defects_found: tool.defects || "",
          inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID,
          certificate_type: "Load Test Certificate",
          folder_id: folderId, folder_name: folderName, folder_position: 20 + i,
          notes: JSON.stringify({ parent_reg: svcTruck.reg, parent_fleet: svcTruck.fleet }),
        });
      });
    }
  } else if (machineType.id === "horse_trailer") {
    const htNotes = JSON.stringify({
      horse:   { reg: ht.horse_reg,   make: ht.horse_make,   model: ht.horse_model,   vin: ht.horse_vin,   year: ht.horse_year,   fleet: ht.horse_fleet,   gvm: ht.horse_gvm,   result: ht.horse_result,   notes: ht.horse_notes },
      trailer: ht.has_trailer ? { reg: ht.trailer_reg, make: ht.trailer_make, model: ht.trailer_model, vin: ht.trailer_vin, year: ht.trailer_year, fleet: ht.trailer_fleet, gvm: ht.trailer_gvm, result: ht.trailer_result, notes: ht.trailer_notes } : null,
    });
    certs.push({ certificate_number: nextNo(), equipment_type: "Horse / Prime Mover", equipment_description: `Horse ${ht.horse_make} ${ht.horse_model} Reg ${ht.horse_reg}`.trim(), serial_number: ht.horse_vin, fleet_number: ht.horse_fleet, registration_number: ht.horse_reg, model: ht.horse_model, manufacturer: ht.horse_make, swl: ht.horse_gvm ? `GVM ${ht.horse_gvm}` : "", client_name: equip.client_name, client_id: equip.client_id, location: equip.client_location, issue_date: iDate, inspection_date: iDate, expiry_date: expiryDate, next_inspection_due: expiryDate, result: ht.horse_result, defects_found: ht.horse_notes, inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID, certificate_type: "Vehicle Registration Certificate", folder_id: folderId, folder_name: folderName, folder_position: 1, notes: htNotes });
    if (ht.has_trailer) certs.push({ certificate_number: nextNo(), equipment_type: "Trailer", equipment_description: `Trailer ${ht.trailer_make} ${ht.trailer_model} Reg ${ht.trailer_reg}`.trim(), serial_number: ht.trailer_vin, fleet_number: ht.trailer_fleet, registration_number: ht.trailer_reg, model: ht.trailer_model, manufacturer: ht.trailer_make, swl: ht.trailer_gvm ? `GVM ${ht.trailer_gvm}` : "", client_name: equip.client_name, client_id: equip.client_id, location: equip.client_location, issue_date: iDate, inspection_date: iDate, expiry_date: expiryDate, next_inspection_due: expiryDate, result: ht.trailer_result, defects_found: ht.trailer_notes, inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID, certificate_type: "Trailer Registration Certificate", folder_id: folderId, folder_name: folderName, folder_position: 2, notes: htNotes });
  } else {
    const desc = [machineType.label, equip.model ? `(${equip.model})` : "", swl ? `SWL ${swl}` : "", equip.fleet_number ? `Fleet ${equip.fleet_number}` : "", equip.registration_number ? `Reg ${equip.registration_number}` : ""].filter(Boolean).join(" ");
    certs.push({
      certificate_number: nextNo(), equipment_type: machineType.label, equipment_description: desc,
      serial_number: equipRef.serial_number, fleet_number: equipRef.fleet_number,
      registration_number: equip.registration_number, model: equip.model, manufacturer: equip.manufacturer,
      swl, client_name: equip.client_name, client_id: equip.client_id, location: equip.client_location,
      issue_date: iDate, inspection_date: iDate, expiry_date: expiryDate, next_inspection_due: expiryDate,
      result: insp.overall_result || "PASS", defects_found: insp.defects || "", recommendations: insp.recommendations || "",
      inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID,
      certificate_type: machineType.certType, folder_id: folderId, folder_name: folderName, folder_position: 1,
      notes: buildNotes(),
    });
  }

  // Fork arms
  if (machineType.baseSteps.includes(4)) {
    forks.forEach((fk, i) => {
      if (!fk.length && !fk.swl) return;
      certs.push({ certificate_number: nextNo(), equipment_type: "Fork Arm", equipment_description: `Fork Arm ${i + 1} — ${machineType.label} SN ${equipRef.serial_number}`, serial_number: fk.fork_number || `FORK-${equipRef.serial_number}-${i + 1}`, swl: fk.swl || "", client_name: equip.client_name, client_id: equip.client_id, location: equip.client_location, issue_date: iDate, inspection_date: iDate, expiry_date: expiryDate, next_inspection_due: expiryDate, result: fk.result, defects_found: fk.notes || "", inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID, certificate_type: "Fork Arm Inspection Certificate", folder_id: folderId, folder_name: folderName, folder_position: 10 + i, notes: [fk.length ? `L:${fk.length}mm` : "", fk.thickness_heel ? `Heel:${fk.thickness_heel}mm` : "", fk.thickness_blade ? `Blade:${fk.thickness_blade}mm` : "", fk.wear_pct ? `Wear:${fk.wear_pct}%` : "", fk.cracks === "yes" ? "CRACKS" : "", fk.bending === "yes" ? "BENDING" : ""].filter(Boolean).join(" | ") });
    });
  }

  // General PVs
  if (hasPVs && !machineType.isServiceTruck && !machineType.isMixerTruck) {
    pvs.forEach((pv, i) => {
      if (!pv.sn && !pv.description) return;
      certs.push({ certificate_number: nextNo(), equipment_type: "Pressure Vessel", equipment_description: pv.description || `Pressure Vessel ${i + 1} — SN ${equip.serial_number}`, serial_number: pv.sn, manufacturer: pv.manufacturer, year_built: pv.year_manufacture, country_of_origin: pv.country_origin, capacity_volume: pv.capacity, working_pressure: pv.working_pressure, test_pressure: pv.test_pressure || String(((parseFloat(pv.working_pressure) || 0) * 1.5).toFixed(2)).replace(/\.?0+$/, ""), design_pressure: pv.working_pressure, pressure_unit: pv.pressure_unit, fleet_number: equipRef.fleet_number || "", registration_number: equip.registration_number || "", client_name: equip.client_name, client_id: equip.client_id, location: equip.client_location, issue_date: iDate, inspection_date: iDate, expiry_date: addMonths(iDate, 12), next_inspection_due: addMonths(iDate, 12), result: pv.result, defects_found: pv.notes || "", inspector_name: INSPECTOR_NAME, inspector_id: INSPECTOR_ID, certificate_type: "Pressure Test Certificate", folder_id: folderId, folder_name: folderName, folder_position: 20 + i });
    });
  }

  // ── INSERT CERTS ──────────────────────────────────────────────────────────
  const { data, error: dbErr } = await supabase
    .from("certificates").insert(certs).select("id,certificate_number,equipment_type,result,expiry_date");

  if (dbErr) {
    setError("Failed to save: " + dbErr.message);
    setSaving(false);
    return;
  }

  setSaved({ folderName, certs: data });
  setSaving(false);

  // ── AUTO-RAISE NCR + CAPA for any non-pass certs ─────────────────────────
  const nonPassCerts = (data || []).filter(c => {
    const r = String(c.result || "").toUpperCase().replace(/\s+/g, "_");
    return ["FAIL", "REPAIR_REQUIRED", "OUT_OF_SERVICE", "CONDITIONAL"].includes(r);
  });

  if (nonPassCerts.length > 0) {
    setNcrRunning(true);
    try {
      const results = await autoRaiseNcrBatch(nonPassCerts, { createCapa: true });
      setNcrResults(results);
    } catch (err) {
      console.warn("Auto NCR batch failed:", err.message);
    } finally {
      setNcrRunning(false);
    }
  }
}

// ── REPLACEMENT "saved" render block ─────────────────────────────────────────
// Replace the entire  if (saved) return (...)  block with this:
if (saved) return (
  <AppLayout title="Inspection Complete">
    <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", color: T.text, padding: 20, maxWidth: 820, margin: "0 auto" }}>

      {/* Success hero */}
      <div style={{ background: T.greenDim, border: `1px solid ${T.greenBrd}`, borderRadius: 18, padding: 28, textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: T.green, marginBottom: 6 }}>Inspection Complete</div>
        <div style={{ fontSize: 14, color: T.textMid, marginBottom: 4 }}>{saved.certs.length} certificate{saved.certs.length > 1 ? "s" : ""} generated</div>
        <div style={{ fontSize: 12, color: T.textDim }}>{saved.folderName}</div>
      </div>

      {/* NCR/CAPA auto-raise status */}
      {(ncrRunning || ncrResults.length > 0) && (
        <div style={{ marginBottom: 20, background: ncrRunning ? T.accentDim : T.redDim, border: `1px solid ${ncrRunning ? T.accentBrd : T.redBrd}`, borderRadius: 14, padding: 16 }}>
          {ncrRunning ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* spinner */}
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2.5px solid rgba(34,211,238,0.2)`, borderTopColor: T.accent, animation: "spin .7s linear infinite", flexShrink: 0 }}/>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: T.accent }}>Raising NCR &amp; CAPA reports…</div>
                <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>Non-compliant results detected — creating compliance records automatically</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>🚨</span>
                <div style={{ fontSize: 14, fontWeight: 900, color: T.red }}>
                  {ncrResults.filter(r => !r.skipped && r.ncr).length} NCR{ncrResults.filter(r => !r.skipped && r.ncr).length !== 1 ? "s" : ""} &amp; CAPA{ncrResults.filter(r => !r.skipped && r.capa).length !== 1 ? "s" : ""} auto-raised
                </div>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {ncrResults.map((r, i) => {
                  if (!r.ncr) return null;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(0,0,0,0.15)", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", color: T.red, fontWeight: 800 }}>{r.ncr.ncr_number}</div>
                        {r.capa && <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", color: T.purple, marginTop: 2 }}>{r.capa.capa_number}</div>}
                        {r.skipped && <div style={{ fontSize: 10, color: T.amber, marginTop: 2 }}>Already existed</div>}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <a href={`/ncr/${r.ncr.id}`} target="_blank" rel="noreferrer"
                          style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${T.redBrd}`, background: T.redDim, color: T.red, fontWeight: 800, fontSize: 11, textDecoration: "none" }}>
                          NCR →
                        </a>
                        {r.capa && (
                          <a href={`/capa/${r.capa.id}`} target="_blank" rel="noreferrer"
                            style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${T.purpleBrd}`, background: T.purpleDim, color: T.purple, fontWeight: 800, fontSize: 11, textDecoration: "none" }}>
                            CAPA →
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Certificate list */}
      <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
        {saved.certs.map(c => (
          <div key={c.id} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.accent, fontFamily: "'IBM Plex Mono',monospace" }}>{c.certificate_number}</div>
              <div style={{ fontSize: 12, color: T.textDim, marginTop: 2 }}>{c.equipment_type} · Expires {fmt(c.expiry_date)}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <ResultBadge result={c.result} />
              <button type="button" onClick={() => window.open(`/certificates/${c.id}`, "_blank")}
                style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.accentBrd}`, background: T.accentDim, color: T.accent, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                View →
              </button>
              <button type="button" onClick={() => window.open(`/certificates/print/${c.id}`, "_blank")}
                style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.textMid, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Print
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom actions */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="button"
          onClick={() => { setSaved(null); setNcrResults([]); setNcrRunning(false); setCurrentStep(1); setMachineTypeId(""); setEquip(p => ({ ...p, serial_number: "", fleet_number: "", registration_number: "", model: "", manufacturer: "" })); }}
          style={{ padding: "11px 20px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          New Inspection
        </button>
        <button type="button"
          onClick={() => { const ids = saved.certs.map(c => c.id).join(","); window.open(`/bulk-print?ids=${ids}`, "_blank"); }}
          style={{ padding: "11px 20px", borderRadius: 10, border: `1px solid ${T.greenBrd}`, background: T.greenDim, color: T.green, fontWeight: 900, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          🖨 Generate &amp; Store PDFs
        </button>
        <button type="button" onClick={() => router.push("/certificates")}
          style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#22d3ee,#0891b2)", color: "#052e16", fontWeight: 900, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
          View All Certificates →
        </button>
      </div>
    </div>
  </AppLayout>
);
