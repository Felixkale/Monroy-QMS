// ── STEP 1: Add this goBack function inside your component ────────
// Place it just before your handleSave function

function goBack() {
  const tag = assetTag || form.asset_tag;
  if (tag) router.push(`/equipment/${tag}`);
  else router.push("/equipment");
}

// ── STEP 2: Find this line in your JSX ───────────────────────────
//   <h1 style={{ color: "#fff", marginBottom: 24, marginTop: 0 }}>
//     Edit Equipment
//   </h1>
//
// Replace it with this (adds back button ABOVE the h1):

<>
  <button
    onClick={goBack}
    style={{
      marginBottom: 20,
      padding: "9px 18px",
      borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.05)",
      color: "#fff",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
    }}
  >
    ← Back to Equipment
  </button>

  <h1 style={{ color: "#fff", marginBottom: 24, marginTop: 0 }}>
    Edit Equipment
  </h1>
</>

// ── STEP 3: Also update your Cancel button at the bottom ──────────
// Find:   onClick={() => router.push(`/equipment/${assetTag}`)}
// Replace with:
            onClick={goBack}

// ── STEP 4: Make sure assetTag state is set from fetchEquipment ───
// Inside your fetchEquipment function, after setAssetId(data.id), add:
            setAssetTag(data.asset_tag);
// And make sure you have this state declared at the top:
  const [assetTag, setAssetTag] = useState(params?.id || "");
