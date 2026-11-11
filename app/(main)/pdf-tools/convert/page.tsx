import { Metadata } from "next";
import { PdfToolsView } from "@/features/pdf-tools/components";

export const metadata: Metadata = {
  title: "Convert PDF Documents | Dr. Doc",
  description:
    "Transform PDFs into editable Word (.docx, .doc), text, images, or convert documents to PDF.",
};

export default function ConvertPdfPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] px-4 py-10 sm:px-6 lg:px-8 space-y-10">
      <div className="mx-auto max-w-2xl text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          All-in-One PDF Toolkit
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
          Online PDF Tools
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Convert PDF files to editable documents or merge multiple PDF files together in seconds.
        </p>
      </div>

      <div className="mx-auto max-w-5xl">
        <PdfToolsView currentTool="convert" />
      </div>
    </main>
  );
}

