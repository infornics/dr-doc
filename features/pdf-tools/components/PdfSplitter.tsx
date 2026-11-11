"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Download01Icon,
  Upload01Icon,
  Delete02Icon,
  Loading03Icon,
  File01Icon,
  ScissorIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { splitPdfApi } from "../services/pdfSplit.service";

export default function PdfSplitter() {
  const [file, setFile] = useState<File | null>(null);
  const [splitMode, setSplitMode] = useState<"all" | "range" | "chunks">("all");
  const [pageRange, setPageRange] = useState("1-3");
  const [chunkSize, setChunkSize] = useState(2);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFilename, setResultFilename] = useState<string>("");

  const handleFileChange = (selectedFile: File) => {
    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      toast.error("Invalid file format", {
        description: "Please upload a valid PDF document to split.",
      });
      return;
    }
    setFile(selectedFile);
    setResultUrl(null);
  };

  const handleSplit = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const res = await splitPdfApi({
        file,
        mode: splitMode,
        range: pageRange,
        chunkSize,
      });

      const url = URL.createObjectURL(res.blob);
      setResultUrl(url);
      setResultFilename(res.filename);
      toast.success("PDF split completed!");
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to split PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResultUrl(null);
  };

  return (
    <div className="space-y-6">
      {!file ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
          }}
          className="relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/80 bg-muted/20 p-12 text-center transition-all hover:border-primary/50 hover:bg-muted/40 cursor-pointer select-none"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "application/pdf";
            input.onchange = (e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f) handleFileChange(f);
            };
            input.click();
          }}
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 shadow-xs">
            <HugeiconsIcon icon={ScissorIcon} className="size-7" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Select a PDF to Split</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Extract individual pages, custom page ranges, or split into equal-sized chunks
          </p>
          <Button variant="secondary" size="sm" className="mt-4 gap-2">
            <HugeiconsIcon icon={Upload01Icon} className="size-4" />
            <span>Choose PDF File</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File Selected Card */}
          <div className="lg:col-span-2 bg-card rounded-3xl border border-border/80 p-6 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <span className="font-semibold text-foreground">Selected Document</span>
                <Button size="icon-xs" variant="ghost" onClick={reset} title="Remove file">
                  <HugeiconsIcon icon={Delete02Icon} className="size-4 text-destructive" />
                </Button>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/60">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                  <HugeiconsIcon icon={File01Icon} className="size-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to split
                  </p>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Split Method
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "all", title: "Extract All Pages", desc: "Every page into separate PDF" },
                    { id: "range", title: "Page Range", desc: "e.g. 1-3, 5" },
                    { id: "chunks", title: "Equal Chunks", desc: "Split every N pages" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSplitMode(m.id as "all" | "range" | "chunks")}
                      className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all ${
                        splitMode === m.id
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                          : "border-border/80 bg-background hover:border-primary/40"
                      }`}
                    >
                      <span className="text-xs font-semibold text-foreground">{m.title}</span>
                      <span className="text-[11px] text-muted-foreground mt-1 leading-snug">
                        {m.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40">
              💡 Split files are compressed into a clean zip archive for convenient single-click download.
            </div>
          </div>

          {/* Settings Sidebar */}
          <div className="flex flex-col justify-between bg-card rounded-3xl border border-border/80 p-6 shadow-xs space-y-6">
            <div className="space-y-5">
              <span className="font-semibold text-foreground block pb-3 border-b border-border/60">
                Split Configuration
              </span>

              {splitMode === "all" && (
                <div className="rounded-2xl bg-muted/30 p-4 border border-border/60 text-xs text-muted-foreground space-y-1.5">
                  <p className="font-semibold text-foreground">Extract All Pages</p>
                  <p>
                    Every page from <strong>{file.name}</strong> will be split into an individual single-page PDF document.
                  </p>
                </div>
              )}

              {splitMode === "range" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Page Numbers / Ranges
                  </label>
                  <input
                    type="text"
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    placeholder="1-3, 5"
                    className="w-full h-9 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Example: <span className="font-mono">1-4</span> or <span className="font-mono">1, 3, 5-8</span>
                  </p>
                </div>
              )}

              {splitMode === "chunks" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Pages per chunk
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={chunkSize}
                    onChange={(e) => setChunkSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full h-9 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Document will be cut into parts containing {chunkSize} pages each.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <Button
                className="w-full gap-2 font-semibold shadow-sm"
                onClick={handleSplit}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
                    <span>Splitting PDF...</span>
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={ScissorIcon} className="size-4" />
                    <span>Split PDF</span>
                  </>
                )}
              </Button>

              {resultUrl && (
                <a
                  href={resultUrl}
                  download={resultFilename}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 shadow-sm transition-all"
                >
                  <HugeiconsIcon icon={Download01Icon} className="size-4" />
                  <span>Download Split Output</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

