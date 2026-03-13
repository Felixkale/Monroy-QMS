import { Suspense } from "react";
import ReportPrintClient from "./ReportPrintClient";

function ReportPrintFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#94a3b8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif",
      }}
    >
      Loading report...
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
