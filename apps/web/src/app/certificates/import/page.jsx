// ─────────────────────────────────────────────────────────────────────────────
// PATCH for src/app/certificates/import/page.jsx
//
// The import page is large — this patch shows ONLY the changes needed.
// The rest of the file (CSS, BackfillMode, ListMode table rendering, etc.)
// stays exactly as-is.
//
// ── CHANGES SUMMARY ──────────────────────────────────────────────────────────
//
// 1. Add import at the top (with other imports):
//    import { autoRaiseNcr } from "@/lib/autoNcr";
//
// 2. In DocumentMode — replace the saveOne function with the version below.
//    The only addition is the autoRaiseNcr call at the end, after the cert
//    is confirmed saved and we have a certId.
//
// 3. In ListMode — replace the saveOne function with the version below.
//    Same pattern — auto-raise after successful save.
//
// ─────────────────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
// DOCUMENT MODE — saveOne (REPLACEMENT)
// ══════════════════════════════════════════════════════════════
async function saveOne_DocumentMode(idx) {
  const row = results[idx];
  if (!row?.ok || row.saved || row.saving) return;
  setResults(prev => prev.map((it, i) => i === idx ? { ...it, saving: true, saveError: null } : it));
  try {
    const certNumber = genCert(row.data, row.fileName);
    if (!row.data.serial_number || !row.data.serial_number.trim()) {
      const clientForSerial = overrides.client_name?.trim() || row.data.client_name || "";
      row.data.serial_number = generateSerialNumber(clientForSerial, row.data.equipment_type);
    }
    const effectiveClient = overrides.client_name?.trim() || row.data.client_name;
    const effectiveCity   = overrides.location?.trim()  || row.data.location || "";
    const clientResult    = await ensureClient(effectiveClient, effectiveCity);
    if (clientResult?.error) console.warn("Client auto-register failed:", clientResult.error);

    const payload = {
      certificate_number:  certNumber,
      inspection_number:   row.data.inspection_number || null,
      result:              row.manualResult || row.data.result || "UNKNOWN",
      issue_date:          row.data.inspection_date || null,
      inspection_date:     row.data.inspection_date || null,
      expiry_date:         row.data.expiry_date || null,
      next_inspection_due: row.data.next_inspection_due || null,
      equipment_description: row.data.equipment_description || row.data.equipment_type || null,
      equipment_type:      row.data.equipment_type || null,
      asset_name:          row.data.equipment_description || row.data.equipment_type || null,
      asset_type:          row.data.equipment_type || null,
      client_name:         row.data.client_name || null,
      status:              "active",
      manufacturer:        row.data.manufacturer || null,
      model:               row.data.model || null,
      serial_number:       row.data.serial_number || null,
      year_built:          row.data.year_built || null,
      capacity_volume:     row.data.capacity_volume || null,
      swl:                 row.data.swl || null,
      working_pressure:    row.data.working_pressure || null,
      design_pressure:     row.data.design_pressure || null,
      test_pressure:       row.data.test_pressure || null,
      pressure_unit:       row.data.pressure_unit || null,
      material:            row.data.material || null,
      standard_code:       row.data.standard_code || null,
      location:            row.data.location || null,
      inspector_name:      row.data.inspector_name || null,
      inspection_body:     row.data.inspection_body || null,
      defects_found:       row.manualDefects || row.data.defects_found || null,
      recommendations:     row.data.recommendations || null,
      comments:            row.data.comments || null,
      nameplate_data:      row.data.nameplate_data || null,
      raw_text_summary:    row.data.raw_text_summary || null,
      asset_tag:           row.data.asset_tag || null,
    };

    const res  = await fetch("/api/certificates", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || `Save failed: ${res.status}`);

    const certId = json?.id || json?.data?.id || null;

    // Upload PDF to Supabase Storage
    let pdfUrl = null;
    const fileEntry = files.find(f => f.file.name === row.fileName);
    if (fileEntry?.file && fileEntry.file.type === "application/pdf") {
      pdfUrl = await uploadPdfToStorage(fileEntry.file, certId, certNumber);
      if (pdfUrl && certId) {
        await supabase.from("certificates").update({ pdf_url: pdfUrl }).eq("id", certId);
      }
    }

    setResults(prev => prev.map((it, i) => i === idx ? { ...it, saving:false, saved:true, certNumber, savedId:certId, saveError:null, pdfUrl } : it));

    // ── AUTO-RAISE NCR + CAPA if result is non-pass ───────────────────────
    const resultNorm = String(row.manualResult || row.data.result || "").toUpperCase().replace(/\s+/g, "_");
    const NON_PASS   = ["FAIL","REPAIR_REQUIRED","OUT_OF_SERVICE","CONDITIONAL"];

    if (NON_PASS.includes(resultNorm) && certId) {
      // Fetch the freshly saved cert so autoRaiseNcr has the full row including id
      const { data: savedCert } = await supabase
        .from("certificates").select("*").eq("id", certId).maybeSingle();

      if (savedCert) {
        autoRaiseNcr(savedCert, { createCapa: true }).then(({ ncr, capa, skipped, error: ncrErr }) => {
          if (ncrErr) { console.warn("Auto NCR failed for import cert:", ncrErr); return; }
          if (ncr) {
            // Update the result row with NCR/CAPA links so the UI can show them
            setResults(prev => prev.map((it, i) => i === idx
              ? { ...it, ncrId: ncr.id, ncrNumber: ncr.ncr_number, capaId: capa?.id, capaNumber: capa?.capa_number, ncrSkipped: skipped }
              : it
            ));
          }
        }).catch(err => console.warn("Auto NCR error:", err.message));
      }
    }

  } catch (e) {
    setResults(prev => prev.map((it, i) => i === idx ? { ...it, saving:false, saved:false, saveError:e.message||"Save failed." } : it));
  }
}

// ══════════════════════════════════════════════════════════════
// DOCUMENT MODE — result card footer (REPLACEMENT for rfoot section)
// Add NCR/CAPA links below the existing foot-actions div.
// Replace the existing <div className="rfoot"> block with this:
// ══════════════════════════════════════════════════════════════
function ResultCardFooter_DocumentMode({ item, idx, toggleExpanded, saveOne }) {
  return (
    <>
      <div className="rfoot">
        <button className="expand-btn" type="button" onClick={() => toggleExpanded(idx)}>
          {item.expanded ? "Hide all fields ↑" : "Show all fields ↓"}
        </button>
        <div className="foot-actions">
          {item.saved && item.savedId && (
            <>
              <a href={`/certificates/${item.savedId}`} className="view-btn">View →</a>
              <a href={`/certificates/${item.savedId}/edit`} className="edit-btn">Edit</a>
            </>
          )}
          <button className="btn-save" type="button" disabled={item.saved || item.saving} onClick={() => saveOne(idx)}>
            {item.saved ? "Saved ✓" : item.saving ? <><span className="spinner"/>Saving...</> : "Save to register"}
          </button>
        </div>
      </div>
      {/* NCR/CAPA auto-raise indicator */}
      {item.ncrNumber && (
        <div style={{ padding:"8px 14px", borderBottom:"1px solid rgba(248,113,113,0.15)", background:"rgba(248,113,113,0.06)", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <span style={{ fontSize:12 }}>🚨</span>
          <span style={{ fontSize:11, fontWeight:700, color:"#f87171" }}>
            {item.ncrSkipped ? "NCR already existed:" : "NCR auto-raised:"}
            {" "}
            <a href={`/ncr/${item.ncrId}`} target="_blank" rel="noreferrer" style={{ color:"#f87171", textDecoration:"underline" }}>
              {item.ncrNumber}
            </a>
          </span>
          {item.capaNumber && (
            <span style={{ fontSize:11, fontWeight:700, color:"#a78bfa" }}>
              CAPA:{" "}
              <a href={`/capa/${item.capaId}`} target="_blank" rel="noreferrer" style={{ color:"#a78bfa", textDecoration:"underline" }}>
                {item.capaNumber}
              </a>
            </span>
          )}
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// LIST MODE — saveOne (REPLACEMENT)
// ══════════════════════════════════════════════════════════════
async function saveOne_ListMode(id) {
  const row = items.find(x => x.id === id);
  if (!row || row.saved || row.saving) return;
  setItems(prev => prev.map(it => it.id === id ? { ...it, saving: true, saveError: null } : it));
  try {
    if (overrides.client_name) {
      const cr = await ensureClient(overrides.client_name, overrides.location || "");
      if (cr?.error) console.warn("Client auto-register failed:", cr.error);
    }
    let rowSerial  = row.serial_number?.trim() || generateSerialNumber(overrides.client_name || "", row.equipment_type || "");
    const certNumber = `CERT-${slugify(rowSerial || String(certSeqRef.current))}-${String(certSeqRef.current++).padStart(2, "0")}`;

    const payload = {
      certificate_number: certNumber,
      result:             row.result || "PASS",
      equipment_type:     row.equipment_type || null,
      equipment_description: row.equipment_description || null,
      asset_name:         row.equipment_description || null,
      asset_type:         row.equipment_type || null,
      serial_number:      rowSerial || null,
      swl:                row.swl || null,
      client_name:        overrides.client_name || null,
      location:           overrides.location || null,
      issue_date:         normalizeDate(overrides.inspection_date) || null,
      inspection_date:    normalizeDate(overrides.inspection_date) || null,
      expiry_date:        normalizeDate(overrides.expiry_date) || null,
      defects_found:      row.defects_found || null,
      status:             "active",
    };

    const res  = await fetch("/api/certificates", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || `Save failed: ${res.status}`);

    const certId = json?.id || json?.data?.id || null;

    setItems(prev => prev.map(it => it.id === id
      ? { ...it, saving:false, saved:true, certNumber, savedId:certId, saveError:null }
      : it
    ));

    // ── AUTO-RAISE NCR + CAPA if result is non-pass ───────────────────────
    const resultNorm = String(row.result || "").toUpperCase().replace(/\s+/g, "_");
    const NON_PASS   = ["FAIL","REPAIR_REQUIRED","OUT_OF_SERVICE","CONDITIONAL"];

    if (NON_PASS.includes(resultNorm) && certId) {
      const { data: savedCert } = await supabase
        .from("certificates").select("*").eq("id", certId).maybeSingle();

      if (savedCert) {
        autoRaiseNcr(savedCert, { createCapa: true }).then(({ ncr, capa, skipped, error: ncrErr }) => {
          if (ncrErr) { console.warn("Auto NCR failed for list import cert:", ncrErr); return; }
          if (ncr) {
            setItems(prev => prev.map(it => it.id === id
              ? { ...it, ncrId: ncr.id, ncrNumber: ncr.ncr_number, capaId: capa?.id, capaNumber: capa?.capa_number, ncrSkipped: skipped }
              : it
            ));
          }
        }).catch(err => console.warn("Auto NCR error:", err.message));
      }
    }

  } catch (e) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, saving:false, saved:false, saveError:e.message } : it));
  }
}

// ══════════════════════════════════════════════════════════════
// LIST MODE — table row status cell addition
// In the list-table tbody, after the Status <td>, the Action <td>
// already has a View link. Below the table (or in a separate row)
// show the NCR badge when item.ncrNumber is set.
//
// Add this inside the <tr> render, after the last <td>:
// ══════════════════════════════════════════════════════════════
function ListModeNcrCell({ item }) {
  if (!item.ncrNumber) return null;
  return (
    <td style={{ padding:"8px 12px" }}>
      <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
        <a href={`/ncr/${item.ncrId}`} target="_blank" rel="noreferrer"
          style={{ fontSize:10, fontWeight:800, color:"#f87171", fontFamily:"'IBM Plex Mono',monospace", textDecoration:"none", whiteSpace:"nowrap" }}>
          🚨 {item.ncrNumber}
        </a>
        {item.capaNumber && (
          <a href={`/capa/${item.capaId}`} target="_blank" rel="noreferrer"
            style={{ fontSize:10, fontWeight:700, color:"#a78bfa", fontFamily:"'IBM Plex Mono',monospace", textDecoration:"none", whiteSpace:"nowrap" }}>
            🔧 {item.capaNumber}
          </a>
        )}
      </div>
    </td>
  );
}

// ══════════════════════════════════════════════════════════════
// HOW TO APPLY THIS PATCH
// ══════════════════════════════════════════════════════════════
//
// 1. Add at the top of import/page.jsx:
//    import { autoRaiseNcr } from "@/lib/autoNcr";
//
// 2. In DocumentMode():
//    - Replace the entire saveOne function with saveOne_DocumentMode above.
//    - In the result card JSX, replace the <div className="rfoot">...</div>
//      block with <ResultCardFooter_DocumentMode item={item} idx={idx} toggleExpanded={toggleExpanded} saveOne={saveOne}/>
//      Note: also add "ncrId","ncrNumber","capaId","capaNumber","ncrSkipped"
//      to the initial mapped result state (all null/undefined is fine — they're
//      set dynamically by the NCR callback).
//
// 3. In ListMode():
//    - Replace the entire saveOne function with saveOne_ListMode above.
//    - In the list-table <thead>, add a final <th>NCR/CAPA</th> column.
//    - In the list-table <tbody> <tr>, add <ListModeNcrCell item={item}/>
//      as the last <td> after the Action <td>.
//    - Add "ncrId","ncrNumber","capaId","capaNumber","ncrSkipped" to
//      the initial item state in handleExtract and addBlankItem (all null).
//
// ══════════════════════════════════════════════════════════════
