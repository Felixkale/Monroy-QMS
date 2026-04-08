// src/app/certificates/cover-print/page.jsx
// Usage: /certificates/cover-print?client=UNITRANS&title=Statutory+Inspection&year=2026&location=KHOEMACAU+MINE
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import CoverPage from "@/components/certificates/CoverPage";

function CoverPrint() {
  const sp = useSearchParams();

  useEffect(() => {
    const t = setTimeout(() => window.print(), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ background:"#f1f5f9", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <CoverPage
        client           = {sp.get("client")           || "UNITRANS"}
        title            = {sp.get("title")            || "Statutory Inspection"}
        year             = {sp.get("year")             || "2026"}
        location         = {sp.get("location")         || "KHOEMACAU MINE"}
        preparedBy       = {sp.get("preparedBy")       || "Andrew Kale"}
        preparedRole     = {sp.get("preparedRole")     || "Inspector"}
        approvedBy       = {sp.get("approvedBy")       || "Moemedi Masupe"}
        approvedRole     = {sp.get("approvedRole")     || "Competent Person · ID: 700117910"}
        inspectionPeriod = {sp.get("period")           || "2026"}
        totalCerts       = {sp.get("certs")            || ""}
        printMode        = {true}
      />
    </div>
  );
}

export default function CoverPrintPage() {
  return (
    <Suspense fallback={<div style={{ background:"#070e18", minHeight:"100vh" }}/>}>
      <CoverPrint/>
    </Suspense>
  );
}
