"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Download01Icon,
  Upload01Icon,
  Delete02Icon,
  Loading03Icon,
  File01Icon,
  Image01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import axios from "axios";
import { mergePdfsApi } from "../services/pdfTools.service";
import { splitPdfToSinglePageFiles } from "../services/pdfSplit.service";

interface MergeItem {
  id: string;
  file: File;
  formattedSize: string;
  isImage: boolean;
  thumbnailUrl?: string;
  isLoadingThumb?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const SUPPORTED_EXTS = ["pdf", "png", "jpg", "jpeg", "webp", "svg", "avif", "tiff", "bmp"];

export default function PdfMerger() {
  const [mergeItems, setMergeItems] = useState<MergeItem[]>([]);
  const [outputFilename, setOutputFilename] = useState("merged-document.pdf");
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFilename, setResultFilename] = useState<string>("");

  // Drag and drop reordering states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const fetchThumbnail = async (id: string, file: File, isImage: boolean) => {
    if (isImage) {
      const localUrl = URL.createObjectURL(file);
      setMergeItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, thumbnailUrl: localUrl, isLoadingThumb: false } : item
        )
      );
      return;
    }

    // For PDFs: fetch server-generated preview thumbnail
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post("/api/preview", formData, { responseType: "blob" });
      const thumbUrl = URL.createObjectURL(res.data);
      setMergeItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, thumbnailUrl: thumbUrl, isLoadingThumb: false } : item
        )
      );
    } catch {
      setMergeItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isLoadingThumb: false } : item))
      );
    }
  };

  const addFiles = async (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    const validFiles = rawFiles.filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return (
        f.type === "application/pdf" ||
        f.type.startsWith("image/") ||
        (ext && SUPPORTED_EXTS.includes(ext))
      );
    });

    if (validFiles.length < rawFiles.length) {
      toast.error("Unsupported file type", {
        description: "Only PDF documents and images (PNG, JPG, WEBP, SVG) can be merged.",
      });
    }

    if (validFiles.length === 0) return;

    // Expand any multi-page PDF into separate single-page files
    // so every individual page gets its own card and preview in the gallery
    const expandedFiles: File[] = [];

    for (const f of validFiles) {
      const isPdf =
        f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        try {
          const singlePages = await splitPdfToSinglePageFiles(f);
          expandedFiles.push(...singlePages);
        } catch {
          expandedFiles.push(f);
        }
      } else {
        expandedFiles.push(f);
      }
    }

    const newItems: MergeItem[] = expandedFiles.map((f) => {
      const isPdf =
        f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
      const id = `${f.name}-${Date.now()}-${Math.random()}`;

      let initialThumbUrl: string | undefined = undefined;
      let shouldLoadServerThumb = false;

      if (!isPdf) {
        initialThumbUrl = URL.createObjectURL(f);
      } else {
        shouldLoadServerThumb = true;
        fetchThumbnail(id, f, false);
      }

      return {
        id,
        file: f,
        formattedSize: formatFileSize(f.size),
        isImage: !isPdf,
        thumbnailUrl: initialThumbUrl,
        isLoadingThumb: shouldLoadServerThumb,
      };
    });

    setMergeItems((prev) => [...prev, ...newItems]);
    setResultUrl(null);
  };

  const removeFile = (id: string) => {
    setMergeItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.thumbnailUrl) URL.revokeObjectURL(target.thumbnailUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const moveFile = (fromIndex: number, toIndex: number) => {
    setMergeItems((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  // HTML5 Drag and Drop Card Reordering Handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOverCard = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDropOnCard = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      moveFile(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleMerge = async () => {
    if (mergeItems.length < 2) {
      toast.error("Please add at least 2 files (PDFs or images) to merge.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await mergePdfsApi({
        files: mergeItems.map((i) => i.file),
        filename: outputFilename || "merged-document.pdf",
      });

      const url = URL.createObjectURL(res.blob);
      setResultUrl(url);
      setResultFilename(res.filename);
      toast.success("Files merged into PDF successfully!");
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to merge files into PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    mergeItems.forEach((item) => {
      if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
    });
    setMergeItems([]);
    setResultUrl(null);
  };

  return (
    <div className="space-y-6">
      {/* Upload Dropzone */}
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
          input.accept = "application/pdf,image/*";
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
        <h3 className="text-lg font-semibold text-foreground">Select PDFs or Images to Merge</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag & drop or click to upload PDF files or images (PNG, JPG, WEBP)
        </p>
        <Button variant="secondary" size="sm" className="mt-4 gap-2">
          <HugeiconsIcon icon={Upload01Icon} className="size-4" />
          <span>Add Files</span>
        </Button>
      </div>

      {mergeItems.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Visual Interactive Thumbnail Gallery for Reordering */}
          <div className="lg:col-span-2 bg-card rounded-3xl border border-border/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <span className="font-semibold text-foreground block">
                  Reorder Document Pages ({mergeItems.length} {mergeItems.length === 1 ? "page" : "pages"})
                </span>
                <span className="text-xs text-muted-foreground">
                  Drag and drop cards or use the arrows to set page order
                </span>
              </div>
              <Button size="sm" variant="ghost" onClick={clearAll} className="text-xs text-destructive">
                Clear all
              </Button>
            </div>

            {/* Grid of Preview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {mergeItems.map((item, idx) => {
                const isBeingDragged = draggedIndex === idx;
                const isDropTarget = dragOverIndex === idx;

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOverCard(e, idx)}
                    onDrop={(e) => handleDropOnCard(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`relative group rounded-2xl border p-3 bg-background shadow-2xs transition-all flex flex-col justify-between cursor-grab active:cursor-grabbing ${
                      isBeingDragged ? "opacity-30 border-dashed border-primary" : "border-border/80"
                    } ${isDropTarget ? "border-primary ring-2 ring-primary/20 scale-105" : "hover:border-primary/50"}`}
                  >
                    {/* Visual Thumbnail Window */}
                    <div className="relative w-full aspect-3/4 rounded-xl overflow-hidden bg-muted/40 border border-border/40 flex items-center justify-center p-1">
                      {item.isLoadingThumb ? (
                        <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                          <HugeiconsIcon icon={Loading03Icon} className="size-5 animate-spin text-primary" />
                          <span className="text-[10px] font-medium">Generating preview...</span>
                        </div>
                      ) : item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.file.name}
                          className="w-full h-full object-contain pointer-events-none rounded-md"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <HugeiconsIcon
                            icon={item.isImage ? Image01Icon : File01Icon}
                            className="size-8 text-muted-foreground/60"
                          />
                          <span className="text-[10px] uppercase font-bold tracking-wider">
                            {item.isImage ? "Image" : "PDF"}
                          </span>
                        </div>
                      )}

                      {/* Sequence Number Badge */}
                      <span className="absolute top-2 left-2 size-6 rounded-full bg-foreground/90 text-background text-xs font-bold flex items-center justify-center shadow-xs">
                        {idx + 1}
                      </span>

                      {/* Type Badge */}
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-background/80 backdrop-blur-xs text-[10px] font-semibold text-foreground uppercase shadow-2xs border border-border/50">
                        {item.isImage ? "Image" : "PDF"}
                      </span>
                    </div>

                    {/* Metadata & Controls */}
                    <div className="mt-2.5 space-y-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground" title={item.file.name}>
                          {item.file.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{item.formattedSize}</p>
                      </div>

                      {/* Reorder Buttons */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/40">
                        <div className="flex items-center gap-0.5">
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveFile(idx, idx - 1);
                            }}
                            title="Move earlier"
                          >
                            <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" />
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            disabled={idx === mergeItems.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveFile(idx, idx + 1);
                            }}
                            title="Move later"
                          >
                            <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5" />
                          </Button>
                        </div>

                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(item.id);
                          }}
                          className="text-destructive hover:bg-destructive/10"
                          title="Remove item"
                        >
                          <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Merge Settings & Actions Sidebar */}
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

              <div className="rounded-2xl bg-muted/30 p-3.5 border border-border/60 space-y-1.5 text-xs text-muted-foreground leading-relaxed">
                <p className="font-semibold text-foreground">💡 How it works</p>
                <p>
                  Drag any card to change its position in the final document, or click the arrows.
                  Images are rendered into standard full-page PDF layouts and merged seamlessly with your documents.
                </p>
              </div>
            </div>

            {/* Merge Actions */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <Button
                className="w-full gap-2 font-semibold shadow-sm"
                onClick={handleMerge}
                disabled={isProcessing || mergeItems.length < 2}
              >
                {isProcessing ? (
                  <>
                    <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
                    <span>Merging to PDF...</span>
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={File01Icon} className="size-4" />
                    <span>Merge {mergeItems.length} Files</span>
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
