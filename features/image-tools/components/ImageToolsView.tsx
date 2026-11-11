"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowReloadVerticalIcon,
  CropIcon,
  File01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import ImageCropper from "./ImageCropper";
import ImageMergeToPdf from "./ImageMergeToPdf";
import ConverterSection from "@/features/converter/components/ConverterSection";

export type ImageToolType = "convert" | "crop" | "merge";

interface ImageToolsViewProps {
  currentTool: ImageToolType;
}

const TOOLS = [
  {
    id: "convert" as const,
    label: "Convert Image",
    href: "/image-tools/convert",
    icon: ArrowReloadVerticalIcon,
    title: "Convert Image Formats",
    subtitle:
      "Convert between PNG, JPG, WEBP, SVG, PDF, and more with zero compression artifacts.",
  },
  {
    id: "crop" as const,
    label: "Crop Image",
    href: "/image-tools/crop",
    icon: CropIcon,
    title: "Crop Image",
    subtitle:
      "Trim image borders, adjust pixel dimensions, and export with custom aspect ratios.",
  },
  {
    id: "merge" as const,
    label: "Merge to PDF",
    href: "/image-tools/merge-to-pdf",
    icon: File01Icon,
    title: "Merge Images into PDF",
    subtitle:
      "Combine multiple photos, receipts, or screenshots into an organized multi-page PDF document.",
  },
];

export default function ImageToolsView({ currentTool }: ImageToolsViewProps) {
  const pathname = usePathname();

  const activeToolConfig =
    TOOLS.find((t) => t.id === currentTool) || TOOLS[0];

  return (
    <div className="space-y-8">
      {/* Navigation Pills (Links to Dedicated URLs) */}
      <div className="flex justify-center">
        <div className="inline-flex items-center rounded-2xl border border-border/80 bg-muted/30 p-1.5 shadow-2xs">
          {TOOLS.map((tool) => {
            const isActive =
              currentTool === tool.id ||
              pathname === tool.href ||
              (tool.id === "convert" && pathname === "/image-tools");

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

        {currentTool === "convert" && <ConverterSection />}
        {currentTool === "crop" && <ImageCropper />}
        {currentTool === "merge" && <ImageMergeToPdf />}
      </div>
    </div>
  );
}
