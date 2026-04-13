// src/lib/generatePDFsInBackground.js
//
// Call this after any certificate insert — fire and forget.
// It generates PDFs server-side and stores them in Supabase Storage.
// The user doesn't wait for it.
//
// Usage:
//   import { generatePDFsInBackground } from "@/lib/generatePDFsInBackground";
//   const ids = savedCerts.map(c => c.id);
//   generatePDFsInBackground(ids); // no await needed

export function generatePDFsInBackground(ids) {
  if (!ids || ids.length === 0) return;
  // Fire and forget — don't block the UI
  fetch("/api/certificates/generate-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  }).catch(err => {
    console.warn("Background PDF generation failed:", err.message);
  });
}
