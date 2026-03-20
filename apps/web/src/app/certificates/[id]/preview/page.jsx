"use client";

import { useParams } from "next/navigation";
import PdfViewer from "@/components/pdf/PdfViewer";

export default function CertificatePreviewPage() {
  const params = useParams();
  const id = params?.id;

  const pdfUrl = `/api/certificates/${id}/pdf`;

  return (
    <main className="p-6">
      <PdfViewer file={pdfUrl} />
    </main>
  );
}
