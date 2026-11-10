"use client";

import {
  ArrowRight01Icon,
  File01Icon,
  Image01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { POPULAR_PRESETS } from "../constants";
import { ConversionPresetsProps } from "../types/conversionPresets.types";

export default function ConversionPresets({
  onSelectPreset,
}: ConversionPresetsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Popular Conversions
          </h3>
          <p className="text-xs text-muted-foreground">
            Frequently converted formats across documents & images
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {POPULAR_PRESETS.map((preset) => {
          const isImage = preset.iconType === "image";
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset?.(preset.id)}
              className="group flex flex-col justify-between rounded-2xl border border-border/70 bg-card/60 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <HugeiconsIcon
                    icon={isImage ? Image01Icon : File01Icon}
                    className="size-4"
                  />
                </div>
                <span className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground group-hover:text-foreground">
                  {preset.sourceFormat.toUpperCase()}
                  <HugeiconsIcon icon={ArrowRight01Icon} className="size-2.5" />
                  {preset.targetFormat.toUpperCase()}
                </span>
              </div>

              <div className="mt-3">
                <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {preset.title}
                </h4>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {preset.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
