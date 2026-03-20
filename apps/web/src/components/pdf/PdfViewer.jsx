import dynamic from "next/dynamic";

const PdfViewer = dynamic(() => import("./PdfViewerClient"), {
  ssr: false,
  loading: () => <p>Preparing PDF viewer...</p>,
});

export default PdfViewer;
