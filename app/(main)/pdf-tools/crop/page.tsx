import { Metadata } from "next";
import { PdfToolsView } from "@/features/pdf-tools/components";

export const metadata: Metadata = {
  title: "Crop PDF Pages | Dr. Doc",
  description:
    "Trim margins, isolate sections, and crop PDF pages with custom aspect ratios.",
};

export default function CropPdfPage() {
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
          Convert PDF files to editable documents, merge pages together, split documents, or crop pages with precision.
        </p>
      </div>

      <div className="mx-auto max-w-7xl">
        <PdfToolsView currentTool="crop" />
      </div>
    </main>
  );
}

