"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  Download01Icon,
  File01Icon,
  Image01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ConverterItem } from "../types";
import { formatFileSize, getAvailableTargetFormats } from "../utils";

interface ConverterRowProps {
  item: ConverterItem;
  onRemove: (id: string) => void;
  onFormatChange: (id: string, format: string) => void;
  onConvert: (id: string) => void;
  disabled?: boolean;
}

export default function ConverterRow({
  item,
  onRemove,
  onFormatChange,
  onConvert,
  disabled,
}: ConverterRowProps) {
  const availableFormats = getAvailableTargetFormats(item.sourceFormat);
  const isImage = ["png", "jpg", "jpeg", "webp", "svg", "heic"].includes(
    item.sourceFormat.toLowerCase(),
  );

  return (
    <div className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
      {/* File Info */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          <HugeiconsIcon
            icon={isImage ? Image01Icon : File01Icon}
            className="size-5"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {item.name}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatFileSize(item.size)}</span>
            <span>•</span>
            <span className="uppercase font-mono text-[11px] font-semibold text-primary">
              {item.sourceFormat}
            </span>
          </div>
        </div>
      </div>

      {/* Target Format selector & Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground hidden md:inline">
            to
          </span>
          <div className="relative">
            <select
              value={item.targetFormat}
              disabled={
                item.status === "converting" ||
                item.status === "completed" ||
                disabled
              }
              onChange={(e) => onFormatChange(item.id, e.target.value)}
              className="h-8 rounded-xl border border-input bg-background px-2.5 pr-7 text-xs font-semibold uppercase tracking-wider text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60 cursor-pointer"
            >
              {availableFormats.map((fmt) => (
                <option key={fmt} value={fmt} className="normal-case">
                  {fmt.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status / Convert / Download Button */}
        <div className="flex items-center gap-1.5">
          {item.status === "idle" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onConvert(item.id)}
              disabled={disabled}
              className="gap-1 h-8 px-3"
            >
              <span>Convert</span>
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
            </Button>
          )}

          {item.status === "converting" && (
            <div className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-primary">
              <HugeiconsIcon
                icon={Loading03Icon}
                className="size-4 animate-spin text-primary"
              />
              <span>{item.progress}%</span>
            </div>
          )}

          {item.status === "completed" && (
            <div className="flex items-center gap-2">
              <span className="hidden lg:flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  className="size-4"
                />
                Done
              </span>
              <a
                href={item.downloadUrl || "#"}
                download={`${item.name.replace(/\.[^/.]+$/, "")}.${item.targetFormat}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-medium text-white shadow-xs transition-colors hover:bg-emerald-700"
              >
                <HugeiconsIcon icon={Download01Icon} className="size-3.5" />
                <span>Download</span>
              </a>
            </div>
          )}

          {/* Remove button */}
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => onRemove(item.id)}
            disabled={item.status === "converting" || disabled}
            aria-label="Remove file"
            className="text-muted-foreground hover:text-destructive"
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
