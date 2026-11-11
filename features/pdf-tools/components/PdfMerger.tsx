"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Download01Icon,
  Upload01Icon,
  Delete02Icon,
  Loading03Icon,
  File01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { mergePdfsApi } from "../services/pdfTools.service";

interface PdfItem {
  id: string;
  file: File;
  formattedSize: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PdfMerger() {
  const [pdfFiles, setPdfFiles] = useState<PdfItem[]>([]);
  const [outputFilename, setOutputFilename] = useState("merged-document.pdf");
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFilename, setResultFilename] = useState<string>("");

  const addFiles = (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    const validPdfs = rawFiles.filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );

    if (validPdfs.length < rawFiles.length) {
      toast.error("Unsupported file type", {
        description: "Only PDF documents (.pdf) can be added to the PDF Merger.",
      });
    }

    if (validPdfs.length === 0) return;

    const newItems: PdfItem[] = validPdfs.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      formattedSize: formatFileSize(f.size),
    }));

    setPdfFiles((prev) => [...prev, ...newItems]);
    setResultUrl(null);
  };

  const removeFile = (id: string) => {
    setPdfFiles((prev) => prev.filter((i) => i.id !== id));
  };

  const moveFile = (index: number, direction: "up" | "down") => {
    setPdfFiles((prev) => {
      const updated = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= updated.length) return prev;
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  const handleMerge = async () => {
    if (pdfFiles.length < 2) {
      toast.error("Please add at least 2 PDF files to merge.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await mergePdfsApi({
        files: pdfFiles.map((i) => i.file),
        filename: outputFilename || "merged-document.pdf",
      });

      const url = URL.createObjectURL(res.blob);
      setResultUrl(url);
      setResultFilename(res.filename);
      toast.success("PDFs merged successfully!");
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to merge PDF files.");
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    setPdfFiles([]);
    setResultUrl(null);
  };

  return (
    <div className="space-y-6">
      {/* Upload Box */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        className="relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/80 bg-muted/20 p-10 text-center transition-all hover:border-primary/50 hover:bg-muted/40 cursor-pointer select-none"
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.accept = "application/pdf";
          input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) addFiles(files);
          };
          input.click();
        }}
      >
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 shadow-xs">
          <HugeiconsIcon icon={Upload01Icon} className="size-7" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Select PDF Files to Merge</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag & drop or click to upload 2 or more PDF documents
        </p>
        <Button variant="secondary" size="sm" className="mt-4 gap-2">
          <HugeiconsIcon icon={Upload01Icon} className="size-4" />
          <span>Add PDF Files</span>
        </Button>
      </div>

      {pdfFiles.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order list */}
          <div className="lg:col-span-2 bg-card rounded-3xl border border-border/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <span className="font-semibold text-foreground">
                Document Sequence ({pdfFiles.length} {pdfFiles.length === 1 ? "file" : "files"})
              </span>
              <Button size="sm" variant="ghost" onClick={clearAll} className="text-xs text-destructive">
                Clear all
              </Button>
            </div>

            <div className="space-y-2.5">
              {pdfFiles.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background p-3.5 shadow-2xs hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                      {idx + 1}
                    </span>
                    <HugeiconsIcon icon={File01Icon} className="size-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {item.file.name}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {item.formattedSize}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      disabled={idx === 0}
                      onClick={() => moveFile(idx, "up")}
                      title="Move up"
                    >
                      <HugeiconsIcon icon={ArrowUp01Icon} className="size-4" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      disabled={idx === pdfFiles.length - 1}
                      onClick={() => moveFile(idx, "down")}
                      title="Move down"
                    >
                      <HugeiconsIcon icon={ArrowDown01Icon} className="size-4" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => removeFile(item.id)}
                      className="text-destructive"
                      title="Remove"
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Merge Settings & Execution */}
          <div className="flex flex-col justify-between bg-card rounded-3xl border border-border/80 p-6 shadow-xs space-y-6">
            <div className="space-y-5">
              <span className="font-semibold text-foreground block pb-3 border-b border-border/60">
                Merge Settings
              </span>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Output Filename
                </label>
                <input
                  type="text"
                  value={outputFilename}
                  onChange={(e) => setOutputFilename(e.target.value)}
                  placeholder="merged-document.pdf"
                  className="w-full h-9 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Pages will be concatenated sequentially from Document 1 to Document{" "}
                {pdfFiles.length}. You can reorder items using the arrow controls.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <Button
                className="w-full gap-2 font-semibold shadow-sm"
                onClick={handleMerge}
                disabled={isProcessing || pdfFiles.length < 2}
              >
                {isProcessing ? (
                  <>
                    <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
                    <span>Merging PDFs...</span>
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={File01Icon} className="size-4" />
                    <span>Merge {pdfFiles.length} PDFs</span>
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
                  <span>Download Merged PDF</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

