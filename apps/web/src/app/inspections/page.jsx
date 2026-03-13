import { Suspense } from "react";
import InspectionsClient from "./InspectionsClient";

export const dynamic = "force-dynamic";

export default function InspectionsPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "#0f1419",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#64748b",
          }}
        >
          Loading…
        </div>
      }
    >
      <InspectionsClient />
    </Suspense>
  );
}
