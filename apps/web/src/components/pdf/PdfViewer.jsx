import dynamic from "next/dynamic";

const PdfViewerClient = dynamic(
  () => import("./PdfViewerClient"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">Preparing PDF viewer...</p>
      </div>
    ),
  }
);

export default PdfViewerClient;
