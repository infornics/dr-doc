"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert02Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  Download01Icon,
  File01Icon,
  Image01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ConverterRowProps } from "../types/converterRow.types";
import { getConverterRowData } from "../utils/converterRow.utils";

export default function ConverterRow({
  item,
  onRemove,
  onFormatChange,
  onConvert,
  disabled,
}: ConverterRowProps) {
  const { availableFormats, isImage, formattedSize, downloadFileName } =
    getConverterRowData(item);

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
            <span>{formattedSize}</span>
            <span>•</span>
            <span className="uppercase font-mono text-[11px] font-semibold text-primary">
              {item.sourceFormat}
            </span>
          </div>
          {item.error && (
            <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
              <HugeiconsIcon icon={Alert02Icon} className="size-3" />
              <span>{item.error}</span>
            </p>
          )}
        </div>
      </div>

      {/* Target Format selector & Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground hidden md:inline">
            to
          </span>

          {/* Shadcn Select Dropdown */}
          <Select
            value={item.targetFormat}
            disabled={
              item.status === "converting" ||
              item.status === "completed" ||
              disabled
            }
            onValueChange={(val: unknown) => {
              if (typeof val === "string" && val) onFormatChange(item.id, val);
            }}
          >
            <SelectTrigger
              size="sm"
              className="h-8 min-w-24 rounded-xl border border-input/80 bg-background px-2.5 text-xs font-semibold uppercase tracking-wider text-foreground hover:bg-muted/50 focus:border-primary"
            >
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent align="end" className="min-w-28">
              {availableFormats.map((fmt) => (
                <SelectItem
                  key={fmt}
                  value={fmt}
                  className="text-xs uppercase font-medium cursor-pointer"
                >
                  {fmt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status / Convert / Download Button */}
        <div className="flex items-center gap-1.5">
          {(item.status === "idle" || item.status === "error") && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onConvert(item.id)}
              disabled={disabled}
              className="gap-1 h-8 px-3"
            >
              <span>{item.status === "error" ? "Retry" : "Convert"}</span>
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
                download={downloadFileName}
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
