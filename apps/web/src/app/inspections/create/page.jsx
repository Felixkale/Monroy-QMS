import { Suspense } from "react";
import InspectionCreateClient from "./InspectionCreateClient";

function LoadingFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        color: "#94a3b8",
        fontSize: 14,
      }}
    >
      Loading inspection form...
    </div>
  );
}

export default function InspectionCreatePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <InspectionCreateClient />
    </Suspense>
  );
}
