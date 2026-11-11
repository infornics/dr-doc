"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowReloadVerticalIcon,
  File01Icon,
  ScissorIcon,
  CropIcon,
  FileRemoveIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import PdfMerger from "./PdfMerger";
import PdfSplitter from "./PdfSplitter";
import PdfCropper from "./PdfCropper";
import PdfPageRemover from "./PdfPageRemover";
import ConverterSection from "@/features/converter/components/ConverterSection";

export type PdfToolType = "convert" | "merge" | "split" | "crop" | "remove-pages";

interface PdfToolsViewProps {
  currentTool: PdfToolType;
}

const TOOLS = [
  {
    id: "convert" as const,
    label: "Convert PDF",
    href: "/pdf-tools/convert",
    icon: ArrowReloadVerticalIcon,
    title: "Convert PDF Documents",
    subtitle:
      "Transform PDFs into editable Word (.docx, .doc), text, images, or convert documents to PDF.",
  },
  {
    id: "merge" as const,
    label: "Merge PDFs & Images",
    href: "/pdf-tools/merge",
    icon: File01Icon,
    title: "Merge PDFs & Images into PDF",
    subtitle:
      "Combine PDF documents and images (PNG, JPG, WEBP) into a single continuous, organized PDF document.",
  },
  {
    id: "split" as const,
    label: "Split PDF",
    href: "/pdf-tools/split",
    icon: ScissorIcon,
    title: "Split PDF into Single Pages",
    subtitle:
      "Split every page of a PDF into individual documents bundled inside a single zip archive.",
  },
  {
    id: "remove-pages" as const,
    label: "Remove Pages",
    href: "/pdf-tools/remove-pages",
    icon: FileRemoveIcon,
    title: "Remove PDF Pages",
    subtitle:
      "Delete unwanted pages or page ranges from a PDF and download the clean output document.",
  },
  {
    id: "crop" as const,
    label: "Crop PDF",
    href: "/pdf-tools/crop",
    icon: CropIcon,
    title: "Crop PDF Pages",
    subtitle:
      "Trim margins, isolate sections, and adjust dimensions of PDF pages with precise aspect ratios.",
  },
];

export default function PdfToolsView({ currentTool }: PdfToolsViewProps) {
  const pathname = usePathname();

  const activeToolConfig =
    TOOLS.find((t) => t.id === currentTool) || TOOLS[0];

  return (
    <div className="space-y-8">
      {/* Navigation Pills */}
      <div className="flex justify-center">
        <div className="inline-flex items-center rounded-2xl border border-border/80 bg-muted/30 p-1.5 shadow-2xs">
          {TOOLS.map((tool) => {
            const isActive =
              currentTool === tool.id ||
              pathname === tool.href ||
              (tool.id === "convert" && pathname === "/pdf-tools");

            return (
              <Link
                key={tool.id}
                href={tool.href}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-background text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <HugeiconsIcon
                  icon={tool.icon}
                  className={`size-4 ${isActive ? "text-primary" : ""}`}
                />
                <span>{tool.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Dynamic Tool Content */}
      <div className="transition-all">
        <div className="text-center max-w-xl mx-auto mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            {activeToolConfig.title}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeToolConfig.subtitle}
          </p>
        </div>

        {currentTool === "convert" && (
          <ConverterSection
            dropzoneTitle="Drag & drop your PDF or document here"
            dropzoneSubtitle="Supports PDF, DOCX, TXT, EPUB, RTF, images, and more."
          />
        )}
        {currentTool === "merge" && <PdfMerger />}
        {currentTool === "split" && <PdfSplitter />}
        {currentTool === "remove-pages" && <PdfPageRemover />}
        {currentTool === "crop" && <PdfCropper />}
      </div>
    </div>
  );
}

