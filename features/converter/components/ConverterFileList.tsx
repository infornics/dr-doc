"use client";

import { Button } from "@/components/ui/button";
import {
  Delete01Icon,
  Download02Icon,
  Loading03Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ConverterFileListProps } from "../types/converterFileList.types";
import { getFileListSummary } from "../utils/converterFileList.utils";
import ConverterRow from "./ConverterRow";

export default function ConverterFileList(props: ConverterFileListProps) {
  const {
    items,
    isProcessing,
    onRemove,
    onFormatChange,
    onConvert,
    onConvertAll,
    onClearAll,
    onGlobalFormatChange,
  } = props;

  if (items.length === 0) return null;

  const { completedCount, idleCount, allCompleted, downloadAll } =
    getFileListSummary(items);

  return (
    <div className="space-y-4">
      {/* Top Batch Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-muted/40 p-3 sm:px-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Files in Queue
          </span>
          <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {items.length}
          </span>
          {completedCount > 0 && (
            <span className="text-xs text-muted-foreground">
              ({completedCount} converted)
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick convert-all dropdown format */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground hidden sm:inline">
              Convert all to:
            </span>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  onGlobalFormatChange(e.target.value);
                  e.target.value = "";
                }
              }}
              className="h-7 rounded-lg border border-input bg-background px-2 text-xs font-medium text-foreground outline-none cursor-pointer focus:border-primary"
            >
              <option value="" disabled>
                Select format...
              </option>
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
              <option value="png">PNG</option>
              <option value="jpg">JPG</option>
              <option value="webp">WEBP</option>
              <option value="txt">TXT</option>
            </select>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={onClearAll}
            disabled={isProcessing}
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
          >
            <HugeiconsIcon icon={Delete01Icon} className="size-3.5" />
            <span>Clear</span>
          </Button>
        </div>
      </div>

      {/* File Rows */}
      <div className="space-y-2.5">
        {items.map((item) => (
          <ConverterRow
            key={item.id}
            item={item}
            onRemove={onRemove}
            onFormatChange={onFormatChange}
            onConvert={onConvert}
            disabled={isProcessing}
          />
        ))}
      </div>

      {/* Bottom Batch Actions */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        {idleCount > 0 && (
          <Button
            size="lg"
            onClick={onConvertAll}
            disabled={isProcessing}
            className="w-full sm:w-auto gap-2 shadow-sm"
          >
            {isProcessing ? (
              <>
                <HugeiconsIcon
                  icon={Loading03Icon}
                  className="size-4 animate-spin"
                />
                <span>Converting Queue...</span>
              </>
            ) : (
              <>
                <HugeiconsIcon icon={SparklesIcon} className="size-4" />
                <span>Convert All ({idleCount})</span>
              </>
            )}
          </Button>
        )}

        {allCompleted && (
          <Button
            size="lg"
            variant="default"
            className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            onClick={downloadAll}
          >
            <HugeiconsIcon icon={Download02Icon} className="size-4" />
            <span>Download All ({items.length})</span>
          </Button>
        )}
      </div>
    </div>
  );
}
