import { Metadata } from "next";
import { PptToolsView } from "@/features/ppt-tools/components";

export const metadata: Metadata = {
  title: "Merge to PowerPoint (PPT) | Dr. Doc",
  description:
    "Combine images, Word documents (.docx), PDFs, and PPT slides into a single organized PowerPoint presentation.",
};

export default function MergePptPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] px-4 py-10 sm:px-6 lg:px-8 space-y-10">
      <div className="mx-auto max-w-2xl text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          All-in-One PowerPoint Toolkit
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
          Online PPT Tools
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Convert images, documents, and PDFs into PowerPoint presentations, or combine them into a unified slide deck.
        </p>
      </div>

      <div className="mx-auto max-w-7xl">
        <PptToolsView currentTool="merge" />
      </div>
    </main>
  );
}

