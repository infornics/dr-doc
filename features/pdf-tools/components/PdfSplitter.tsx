"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Download01Icon,
  Upload01Icon,
  Delete02Icon,
  Loading03Icon,
  ScissorIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { splitPdfApi } from "../services/pdfSplit.service";

export default function PdfSplitter() {
  const [file, setFile] = useState<File | null>(null);
  const [splitMode, setSplitMode] = useState<"all" | "range" | "chunks">("all");
  const [pageRange, setPageRange] = useState("1-3, 4-6");
  const [chunkSize, setChunkSize] = useState(2);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
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
    setProgressPercent(15);

    const timer = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev < 50) return prev + 15;
        if (prev < 85) return prev + 7;
        if (prev < 95) return prev + 2;
        return prev;
      });
    }, 180);

    try {
      const res = await splitPdfApi({
        file,
        mode: splitMode,
        range: pageRange,
        chunkSize,
      });
      clearInterval(timer);
      setProgressPercent(100);

      const url = URL.createObjectURL(res.blob);
      setResultUrl(url);
      setResultFilename(res.filename);
      toast.success("PDF split completed into separate documents inside ZIP!");
    } catch (err: unknown) {
      clearInterval(timer);
      console.error(err);
      toast.error("Failed to split PDF.");
    } finally {
      clearInterval(timer);
      setIsProcessing(false);
      setTimeout(() => setProgressPercent(0), 1000);
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
            Split every page, extract custom ranges into separate PDFs, or cut into equal-sized chunks
          </p>
          <Button variant="secondary" size="sm" className="mt-4 gap-2">
            <HugeiconsIcon icon={Upload01Icon} className="size-4" />
            <span>Choose PDF File</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Box & Method Selector */}
          <div className="lg:col-span-2 bg-card rounded-3xl border border-border/80 p-6 shadow-xs flex flex-col justify-between space-y-6 min-h-[380px]">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <span className="font-semibold text-foreground">Selected Document</span>
                <Button size="icon-sm" variant="ghost" onClick={reset} title="Remove file">
                  <HugeiconsIcon icon={Delete02Icon} className="size-4 text-destructive" />
                </Button>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-border/80 bg-background p-4 shadow-2xs">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HugeiconsIcon icon={ScissorIcon} className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB • Ready to split into separate PDF documents
                  </p>
                </div>
              </div>

              {/* Split Mode Selector */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Split Method
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: "all" as const,
                      label: "Extract All Pages",
                      desc: "Every page into separate PDF",
                    },
                    {
                      id: "range" as const,
                      label: "Page Ranges",
                      desc: "e.g. 1-3, 4-6",
                    },
                    {
                      id: "chunks" as const,
                      label: "Equal Chunks",
                      desc: "Split every N pages",
                    },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSplitMode(m.id)}
                      className={`text-left p-3.5 rounded-2xl border transition-all ${
                        splitMode === m.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border/80 bg-background hover:border-primary/40"
                      }`}
                    >
                      <span className="block text-xs font-bold text-foreground">
                        {m.label}
                      </span>
                      <span className="block text-[11px] text-muted-foreground mt-0.5">
                        {m.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/20 p-3.5 rounded-xl border border-border/40">
              💡 Split files are saved as individual PDF documents and compressed into a clean zip archive for convenient single-click download.
            </div>
          </div>

          {/* Action & Configuration Sidebar */}
          <div className="flex flex-col justify-between bg-card rounded-3xl border border-border/80 p-6 shadow-xs space-y-6">
            <div className="space-y-5">
              <span className="font-semibold text-foreground block pb-3 border-b border-border/60">
                Split Configuration
              </span>

              {splitMode === "all" && (
                <div className="rounded-2xl bg-muted/30 p-4 border border-border/60 text-xs text-muted-foreground space-y-2">
                  <p className="font-semibold text-foreground">Extract All Pages</p>
                  <p>
                    Every page from <strong>{file.name}</strong> will be split into an individual single-page PDF file.
                  </p>
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-background border border-border text-xs font-mono mt-2">
                    <span>Archive Output</span>
                    <span className="text-primary font-bold">.ZIP</span>
                  </div>
                </div>
              )}

              {splitMode === "range" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Page Ranges
                    </label>
                    <input
                      type="text"
                      value={pageRange}
                      onChange={(e) => setPageRange(e.target.value)}
                      placeholder="1-3, 4-6"
                      className="w-full h-9 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Each comma-separated range will create a separate PDF file inside the ZIP archive.
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/20 p-3 border border-border/50 text-[11px] text-muted-foreground space-y-1">
                    <p><strong>Example:</strong> <span className="font-mono">1-3, 4-6</span> produces 2 separate PDF files: one containing pages 1–3, and another with pages 4–6.</p>
                  </div>
                </div>
              )}

              {splitMode === "chunks" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
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
                      Document will be split into separate PDF files containing {chunkSize} pages each.
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/20 p-3 border border-border/50 text-[11px] text-muted-foreground space-y-1">
                    <p><strong>Example:</strong> Splitting a 10-page document into chunks of 2 pages produces 5 separate PDF files in the ZIP archive.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <Button
                className="relative overflow-hidden w-full gap-2 font-bold shadow-sm h-10 disabled:opacity-100 disabled:cursor-not-allowed"
                onClick={handleSplit}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div
                      className="absolute inset-y-0 left-0 bg-black/15 dark:bg-black/25 transition-all duration-200"
                      style={{ width: `${progressPercent}%` }}
                    />
                    <HugeiconsIcon icon={Loading03Icon} className="relative z-10 size-4 animate-spin text-primary-foreground" />
                    <span className="relative z-10 text-primary-foreground font-bold">
                      Splitting {progressPercent}%
                    </span>
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={ScissorIcon} className="size-4 text-primary-foreground" />
                    <span className="text-primary-foreground font-bold">Split PDF</span>
                  </>
                )}
              </Button>

              {resultUrl && (
                <a
                  href={resultUrl}
                  download={resultFilename}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-semibold text-sm shadow-xs transition-all"
                >
                  <HugeiconsIcon icon={Download01Icon} className="size-4" />
                  <span>Download Split ZIP</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
