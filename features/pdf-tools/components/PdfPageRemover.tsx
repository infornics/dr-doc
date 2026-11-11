"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Download01Icon,
  Upload01Icon,
  Delete02Icon,
  Loading03Icon,
  FileRemoveIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { removePdfPagesApi } from "../services/pdfRemovePages.service";

export default function PdfPageRemover() {
  const [file, setFile] = useState<File | null>(null);
  const [pagesToRemove, setPagesToRemove] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFilename, setResultFilename] = useState<string>("");

  const handleFileChange = (selectedFile: File) => {
    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      toast.error("Invalid file format", {
        description: "Please upload a valid PDF document.",
      });
      return;
    }
    setFile(selectedFile);
    setResultUrl(null);
  };

  const handleRemove = async () => {
    if (!file) return;
    if (!pagesToRemove.trim()) {
      toast.error("Please enter the page numbers to remove (e.g. 2, 4-6).");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await removePdfPagesApi({
        file,
        pages: pagesToRemove,
      });

      const url = URL.createObjectURL(res.blob);
      setResultUrl(url);
      setResultFilename(res.filename);
      toast.success("Pages removed and PDF generated!");
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to remove pages from PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPagesToRemove("");
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
            <HugeiconsIcon icon={FileRemoveIcon} className="size-7" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Select a PDF to Remove Pages</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Eliminate unwanted pages or custom page ranges and download the modified PDF
          </p>
          <Button variant="secondary" size="sm" className="mt-4 gap-2">
            <HugeiconsIcon icon={Upload01Icon} className="size-4" />
            <span>Choose PDF File</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Box */}
          <div className="lg:col-span-2 bg-card rounded-3xl border border-border/80 p-6 shadow-xs flex flex-col justify-between space-y-6 min-h-[340px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <span className="font-semibold text-foreground">Selected Document</span>
                <Button size="icon-sm" variant="ghost" onClick={reset} title="Remove file">
                  <HugeiconsIcon icon={Delete02Icon} className="size-4 text-destructive" />
                </Button>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-border/80 bg-background p-4 shadow-2xs">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HugeiconsIcon icon={FileRemoveIcon} className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB • Ready for page removal
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pages to delete
                </label>
                <input
                  type="text"
                  value={pagesToRemove}
                  onChange={(e) => setPagesToRemove(e.target.value)}
                  placeholder="e.g. 2, 4-6"
                  className="w-full h-10 px-3.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-[11px] text-muted-foreground">
                  Specify single pages separated by comma (e.g. <span className="font-mono">3, 5</span>) or ranges (e.g. <span className="font-mono">2-4</span>).
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/20 p-3.5 rounded-xl border border-border/40">
              💡 The deleted pages will be removed from the document, producing a continuous PDF with the remaining pages intact.
            </div>
          </div>

          {/* Action Sidebar */}
          <div className="flex flex-col justify-between bg-card rounded-3xl border border-border/80 p-6 shadow-xs space-y-6">
            <div className="space-y-4">
              <span className="font-semibold text-foreground block pb-3 border-b border-border/60">
                Removal Settings
              </span>

              <div className="rounded-2xl bg-muted/30 p-4 border border-border/60 text-xs text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground">Output Format</p>
                <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-background border border-border text-xs font-mono">
                  <span>Document Type</span>
                  <span className="text-primary font-bold">.PDF</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground pt-1">
                  Exports a single, reorganized PDF file containing only your desired pages.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <Button
                className="w-full gap-2 font-bold shadow-sm h-10"
                onClick={handleRemove}
                disabled={isProcessing || !pagesToRemove.trim()}
              >
                {isProcessing ? (
                  <>
                    <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin text-primary-foreground" />
                    <span className="text-primary-foreground font-bold">Removing Pages...</span>
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={FileRemoveIcon} className="size-4 text-primary-foreground" />
                    <span className="text-primary-foreground font-bold">Remove Selected Pages</span>
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
                  <span>Download Clean PDF</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

