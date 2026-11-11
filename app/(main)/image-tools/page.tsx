import { Metadata } from "next";
import { ImageToolsView } from "@/features/image-tools/components";

export const metadata: Metadata = {
  title: "Image Tools | Dr. Doc",
  description:
    "Convert image formats, crop pictures with custom ratios, and merge multiple images into an organized PDF document.",
};

export default function ImageToolsPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] px-4 py-10 sm:px-6 lg:px-8 space-y-10">
      <div className="mx-auto max-w-2xl text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          All-in-One Image Toolkit
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
          Online Image Tools
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Convert between image formats, crop to custom dimensions, and combine multiple
          photos into a polished PDF document.
        </p>
      </div>

      <div className="mx-auto max-w-5xl">
        <ImageToolsView initialTab="convert" />
      </div>
    </main>
  );
}

