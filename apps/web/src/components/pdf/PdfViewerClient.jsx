"use client";

import { useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// IMPORTANT:
// React-PDF recommends setting workerSrc in the same module
// where <Document> / <Page> are used.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function PdfViewerClient({
  file,
  title = "PDF Preview",
  initialPage = 1,
  height = "80vh",
}) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [scale, setScale] = useState(1.1);
  const [error, setError] = useState("");

  const resolvedFile = useMemo(() => {
    if (!file) return null;

    // Supports:
    // 1. URL string
    // 2. { url: "..." }
    // 3. File / Blob object
    if (typeof file === "string") return file;
    if (file?.url) return file.url;
    return file;
  }, [file]);

  function onDocumentLoadSuccess({ numPages: loadedPages }) {
    setNumPages(loadedPages);
    setError("");
    if (pageNumber > loadedPages) {
      setPageNumber(1);
    }
  }

  function onDocumentLoadError(err) {
    console.error("PDF load error:", err);
    setError(err?.message || "Failed to load PDF.");
  }

  function prevPage() {
    setPageNumber((p) => Math.max(1, p - 1));
  }

  function nextPage() {
    setPageNumber((p) => Math.min(numPages || 1, p + 1));
  }

  function zoomOut() {
    setScale((s) => Math.max(0.6, Number((s - 0.1).toFixed(2))));
  }

  function zoomIn() {
    setScale((s) => Math.min(2.5, Number((s + 0.1).toFixed(2))));
  }

  if (!resolvedFile) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">No PDF selected.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">
            {numPages ? `Page ${pageNumber} of ${numPages}` : "Loading document..."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={prevPage}
            disabled={pageNumber <= 1}
            className="rounded-xl border px-3 py-2 text-sm disabled:opacity-50"
          >
            Previous
          </button>

          <button
            type="button"
            onClick={nextPage}
            disabled={!numPages || pageNumber >= numPages}
            className="rounded-xl border px-3 py-2 text-sm disabled:opacity-50"
          >
            Next
          </button>

          <button
            type="button"
            onClick={zoomOut}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            Zoom -
          </button>

          <button
            type="button"
            onClick={zoomIn}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            Zoom +
          </button>

          {typeof resolvedFile === "string" && (
            <a
              href={resolvedFile}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border px-3 py-2 text-sm"
            >
              Open
            </a>
          )}

          {typeof resolvedFile === "string" && (
            <a
              href={resolvedFile}
              download
              className="rounded-xl border px-3 py-2 text-sm"
            >
              Download
            </a>
          )}
        </div>
      </div>

      <div
        className="overflow-auto bg-gray-100 p-4"
        style={{ height }}
      >
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <div className="flex justify-center">
            <Document
              file={resolvedFile}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="rounded-xl border bg-white p-4 text-sm text-gray-600">
                  Loading PDF...
                </div>
              }
              error={
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  Failed to render PDF.
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer
                renderAnnotationLayer
              />
            </Document>
          </div>
        )}
      </div>
    </div>
  );
}
