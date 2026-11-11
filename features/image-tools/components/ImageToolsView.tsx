"use client";

import { useState } from "react";
import {
  ArrowReloadVerticalIcon,
  CropIcon,
  File01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import ImageCropper from "./ImageCropper";
import ImageMergeToPdf from "./ImageMergeToPdf";
import ConverterSection from "@/features/converter/components/ConverterSection";

export type ImageToolTab = "convert" | "crop" | "merge";

interface ImageToolsViewProps {
  initialTab?: ImageToolTab;
}

export default function ImageToolsView({ initialTab = "convert" }: ImageToolsViewProps) {
  const [activeTab, setActiveTab] = useState<ImageToolTab>(initialTab);

  return (
    <div className="space-y-8">
      {/* Navigation Pills */}
      <div className="flex justify-center">
        <div className="inline-flex items-center rounded-2xl border border-border/80 bg-muted/30 p-1.5 shadow-2xs">
          <button
            onClick={() => setActiveTab("convert")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === "convert"
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <HugeiconsIcon icon={ArrowReloadVerticalIcon} className="size-4 text-primary" />
            <span>Convert Image</span>
          </button>

          <button
            onClick={() => setActiveTab("crop")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === "crop"
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <HugeiconsIcon icon={CropIcon} className="size-4 text-primary" />
            <span>Crop Image</span>
          </button>

          <button
            onClick={() => setActiveTab("merge")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === "merge"
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <HugeiconsIcon icon={File01Icon} className="size-4 text-primary" />
            <span>Merge to PDF</span>
          </button>
        </div>
      </div>

      {/* Dynamic Tab Content */}
      <div className="transition-all">
        {activeTab === "convert" && (
          <div className="space-y-4">
            <div className="text-center max-w-xl mx-auto">
              <h2 className="text-lg font-semibold text-foreground">Convert Image Formats</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Convert between PNG, JPG, WEBP, SVG, PDF, and more with zero compression artifacts.
              </p>
            </div>
            <ConverterSection />
          </div>
        )}

        {activeTab === "crop" && (
          <div className="space-y-4">
            <div className="text-center max-w-xl mx-auto">
              <h2 className="text-lg font-semibold text-foreground">Crop Image</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Trim image borders, adjust pixel dimensions, and export with custom aspect ratios.
              </p>
            </div>
            <ImageCropper />
          </div>
        )}

        {activeTab === "merge" && (
          <div className="space-y-4">
            <div className="text-center max-w-xl mx-auto">
              <h2 className="text-lg font-semibold text-foreground">Merge Images into PDF</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Combine multiple photos, receipts, or screenshots into an organized multi-page PDF document.
              </p>
            </div>
            <ImageMergeToPdf />
          </div>
        )}
      </div>
    </div>
  );
}

