"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import PdfViewer from "@/components/pdf/PdfViewer";

export default function CertificatePreviewPage() {
  const params = useParams();
  const certificateId = params?.id;

  const pdfUrl = useMemo(() => {
    if (!certificateId) return "";
    return `/api/certificates/${certificateId}/pdf`;
  }, [certificateId]);

  return (
    <main className="p-6">
      <PdfViewer
        file={pdfUrl}
        title={`Certificate Preview - ${certificateId || ""}`}
        initialPage={1}
        height="85vh"
      />
    </main>
  );
}
