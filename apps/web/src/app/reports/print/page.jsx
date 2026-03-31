// src/app/reports/print/page.jsx
import { Suspense } from "react";
import ReportPrintClient from "./ReportPrintClient";

function ReportPrintFallback() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#070e18",
      color: "rgba(240,246,255,0.40)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'IBM Plex Sans', sans-serif",
      fontSize: 14,
      gap: 10,
    }}>
      <span style={{ opacity: 0.5 }}>⏳</span>
      Loading report…
    </div>
  );
}

export default function ReportPrintPage() {
  return (
    <Suspense fallback={<ReportPrintFallback />}>
      <ReportPrintClient />
    </Suspense>
  );
}
