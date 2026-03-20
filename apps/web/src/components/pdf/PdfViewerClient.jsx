"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfViewerClient({ file }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);

  return (
    <div className="p-4 bg-white rounded-xl shadow">
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
          className="px-3 py-2 border rounded"
        >
          Previous
        </button>

        <button
          type="button"
          onClick={() => setPageNumber((p) => Math.min(numPages || 1, p + 1))}
          className="px-3 py-2 border rounded"
        >
          Next
        </button>

        <span className="px-3 py-2 text-sm">
          Page {pageNumber} of {numPages || "-"}
        </span>
      </div>

      <Document
        file={file}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        onLoadError={(error) => console.error("PDF load error:", error)}
        loading={<p>Loading PDF...</p>}
        error={<p>Failed to load PDF.</p>}
      >
        <Page pageNumber={pageNumber} />
      </Document>
    </div>
  );
}
