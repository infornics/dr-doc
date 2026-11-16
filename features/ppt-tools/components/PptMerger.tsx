"use client";

import { useState, useRef, useEffect } from "react";
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
  Maximize01Icon,
  Cancel01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Presentation01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import axios from "axios";
import { mergePptApi, expandOfficeDocumentPages } from "../services/pptTools.service";
import { splitPdfToSinglePageFiles } from "@/features/pdf-tools/services/pdfSplit.service";

interface PptMergeItem {
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

const SUPPORTED_EXTS = [
  "pdf",
  "docx",
  "doc",
  "pptx",
  "ppt",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "svg",
  "avif",
  "tiff",
  "gif",
  "bmp",
];

export default function PptMerger() {
  const [mergeItems, setMergeItems] = useState<PptMergeItem[]>([]);
  const [outputFilename, setOutputFilename] = useState("merged-presentation.pptx");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [expandingCount, setExpandingCount] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFilename, setResultFilename] = useState<string>("");

  // Drag and drop reordering states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Full-page preview / inspection state
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
  const [isModalFullscreen, setIsModalFullscreen] = useState(false);

  // Keep selected preview synchronized if items are deleted or added
  useEffect(() => {
    if (mergeItems.length > 0) {
      if (!selectedPreviewId || !mergeItems.some((item) => item.id === selectedPreviewId)) {
        setSelectedPreviewId(mergeItems[0].id);
      }
    } else {
      setSelectedPreviewId(null);
    }
  }, [mergeItems, selectedPreviewId]);

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

    // For PDFs, DOCX, PPTX: fetch server-generated preview thumbnail
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
        description: "Supported formats: Images (PNG, JPG, WEBP), DOCX, PDF, and PPT/PPTX files.",
      });
    }

    if (validFiles.length === 0) return;

    setIsExpanding(true);
    setExpandingCount(validFiles.length);

    try {
      // Expand multi-page PDFs, DOCX, DOC, PPTX, and PPT documents into separate single-page files
      // so every individual page or slide gets its own card and preview in the presentation gallery
      const expandedFiles: File[] = [];

      for (const f of validFiles) {
        const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
        const ext = f.name.split(".").pop()?.toLowerCase();
        const isOfficeDoc = ext === "docx" || ext === "doc" || ext === "pptx" || ext === "ppt";

        if (isPdf) {
          try {
            const singlePages = await splitPdfToSinglePageFiles(f);
            expandedFiles.push(...singlePages);
          } catch {
            expandedFiles.push(f);
          }
        } else if (isOfficeDoc) {
          try {
            const singlePages = await expandOfficeDocumentPages(f);
            expandedFiles.push(...singlePages);
          } catch {
            expandedFiles.push(f);
          }
        } else {
          expandedFiles.push(f);
        }
      }

      const newItems: PptMergeItem[] = expandedFiles.map((f) => {
        const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
        const isImg = f.type.startsWith("image/");
        const id = `${f.name}-${Date.now()}-${Math.random()}`;

        let initialThumbUrl: string | undefined = undefined;
        let shouldLoadServerThumb = false;

        if (isImg) {
          initialThumbUrl = URL.createObjectURL(f);
        } else {
          shouldLoadServerThumb = true;
          fetchThumbnail(id, f, false);
        }

        return {
          id,
          file: f,
          formattedSize: formatFileSize(f.size),
          isImage: isImg,
          thumbnailUrl: initialThumbUrl,
          isLoadingThumb: shouldLoadServerThumb,
        };
      });

      setMergeItems((prev) => [...prev, ...newItems]);
      setResultUrl(null);
    } finally {
      setIsExpanding(false);
      setExpandingCount(0);
    }
  };

  const removeFile = (id: string) => {
    setMergeItems((prev) => {
      const targetIndex = prev.findIndex((i) => i.id === id);
      const target = prev[targetIndex];
      if (target?.thumbnailUrl) URL.revokeObjectURL(target.thumbnailUrl);
      const nextList = prev.filter((i) => i.id !== id);

      // Adjust selected preview to next closest item
      if (selectedPreviewId === id) {
        if (nextList.length > 0) {
          const nextIndex = Math.min(targetIndex, nextList.length - 1);
          setSelectedPreviewId(nextList[nextIndex].id);
        } else {
          setSelectedPreviewId(null);
        }
      }

      return nextList;
    });
  };

  const selectedItem =
    mergeItems.find((item) => item.id === selectedPreviewId) || mergeItems[0] || null;
  const selectedIndex = selectedItem
    ? mergeItems.findIndex((item) => item.id === selectedItem.id)
    : -1;

  // Keyboard shortcut: Delete, Backspace, Arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === "input" || targetTag === "textarea") return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedPreviewId) {
          e.preventDefault();
          removeFile(selectedPreviewId);
        }
      } else if (e.key === "ArrowLeft") {
        if (selectedIndex > 0) {
          e.preventDefault();
          setSelectedPreviewId(mergeItems[selectedIndex - 1].id);
        }
      } else if (e.key === "ArrowRight") {
        if (selectedIndex < mergeItems.length - 1) {
          e.preventDefault();
          setSelectedPreviewId(mergeItems[selectedIndex + 1].id);
        }
      } else if (e.key === "Escape" && isModalFullscreen) {
        setIsModalFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPreviewId, selectedIndex, mergeItems, isModalFullscreen]);

  const moveFile = (fromIndex: number, toIndex: number) => {
    setMergeItems((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  // HTML5 Drag and Drop Handlers with Auto-Scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollRafRef = useRef<number | null>(null);

  const startAutoScroll = (direction: "up" | "down", speed: number) => {
    stopAutoScroll();
    const scroll = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop += direction === "down" ? speed : -speed;
      }
      autoScrollRafRef.current = requestAnimationFrame(scroll);
    };
    autoScrollRafRef.current = requestAnimationFrame(scroll);
  };

  const stopAutoScroll = () => {
    if (autoScrollRafRef.current) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  };

  const handleContainerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!scrollContainerRef.current) return;

    const rect = scrollContainerRef.current.getBoundingClientRect();
    const threshold = 60;
    const clientY = e.clientY;

    if (clientY - rect.top < threshold) {
      const factor = Math.max(1, (threshold - (clientY - rect.top)) / 5);
      startAutoScroll("up", factor * 6);
    } else if (rect.bottom - clientY < threshold) {
      const factor = Math.max(1, (threshold - (rect.bottom - clientY)) / 5);
      startAutoScroll("down", factor * 6);
    } else {
      stopAutoScroll();
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOverCard = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null || draggedIndex === index) {
      setDragOverIndex(null);
      return;
    }
    setDragOverIndex(index);
  };

  const handleDropOnCard = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    stopAutoScroll();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDragOverIndex(null);
      setDraggedIndex(null);
      return;
    }
    moveFile(draggedIndex, targetIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    stopAutoScroll();
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const clearAll = () => {
    mergeItems.forEach((i) => {
      if (i.thumbnailUrl) URL.revokeObjectURL(i.thumbnailUrl);
    });
    setMergeItems([]);
    setSelectedPreviewId(null);
    setResultUrl(null);
  };

  const handleMerge = async () => {
    if (mergeItems.length === 0) return;

    setIsProcessing(true);
    setProgressPercent(0);
    setResultUrl(null);

    // Simulate progress animation during server processing
    const progressInterval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 90) return prev;
        return prev + 5;
      });
    }, 200);

    try {
      const filesToMerge = mergeItems.map((item) => item.file);
      const res = await mergePptApi({
        files: filesToMerge,
        filename: outputFilename,
        onProgress: (p) => {
          if (p < 90) setProgressPercent(p);
        },
      });

      clearInterval(progressInterval);
      setProgressPercent(100);

      const url = URL.createObjectURL(res.blob);
      setResultUrl(url);
      setResultFilename(res.filename);
      toast.success("PowerPoint presentation generated successfully!");
    } catch (err: unknown) {
      clearInterval(progressInterval);
      const message = err instanceof Error ? err.message : "Failed to merge presentation.";
      toast.error("Merge error", { description: message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = resultFilename || outputFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-8">
      {/* Upload Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
        }}
        className={`relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/80 bg-muted/20 hover:bg-muted/30 transition-all p-8 sm:p-12 text-center cursor-pointer shadow-xs ${
          isExpanding ? "pointer-events-none opacity-80" : ""
        }`}
        onClick={() => {
          if (isExpanding) return;
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.accept =
            "application/pdf,image/*,.docx,.doc,.pptx,.ppt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation";
          input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) addFiles(files);
          };
          input.click();
        }}
      >
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 shadow-xs">
          {isExpanding ? (
            <HugeiconsIcon icon={Loading03Icon} className="size-7 animate-spin" />
          ) : (
            <HugeiconsIcon icon={Upload01Icon} className="size-7" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          {isExpanding
            ? `Processing & expanding ${expandingCount} document${expandingCount > 1 ? "s" : ""}...`
            : "Select Images, DOCX, PDFs, or PPTs to Merge"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {isExpanding
            ? "Extracting individual pages and slides for the presentation gallery..."
            : "Drag & drop or click to upload images, Word docs, PDFs, or PPT files into one slide deck"}
        </p>
        <Button variant="secondary" size="sm" disabled={isExpanding} className="mt-4 gap-2">
          {isExpanding ? (
            <>
              <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <HugeiconsIcon icon={Upload01Icon} className="size-4" />
              <span>Add Files</span>
            </>
          )}
        </Button>
      </div>

      {/* Loading Skeleton Grid when documents are expanding */}
      {isExpanding && (
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-4 animate-pulse">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="space-y-1">
              <div className="h-5 w-48 bg-muted rounded-md" />
              <div className="h-3 w-64 bg-muted/60 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: Math.min(8, Math.max(3, expandingCount * 2)) }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border/60 bg-muted/20 p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-12 bg-muted rounded-md" />
                  <div className="h-4 w-10 bg-muted rounded-md" />
                </div>
                <div className="aspect-video w-full rounded-xl bg-muted/50 flex items-center justify-center">
                  <HugeiconsIcon icon={Loading03Icon} className="size-6 text-muted-foreground animate-spin" />
                </div>
                <div className="h-3 w-3/4 bg-muted rounded-md" />
              </div>
            ))}
          </div>
        </div>
      )}

      {mergeItems.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* LEFT SECTION (7 cols): Mini Preview Gallery & Drag and Drop Reordering */}
          <div className="lg:col-span-7 bg-card rounded-3xl border border-border/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between h-[calc(100vh-14rem)] min-h-[680px]">
            <div className="flex items-center justify-between pb-3 border-b border-border/60 shrink-0">
              <div>
                <span className="font-semibold text-foreground block">
                  Reorder Slides ({mergeItems.length} {mergeItems.length === 1 ? "slide" : "slides"})
                </span>
                <span className="text-xs text-muted-foreground">
                  Drag and drop cards or click to inspect on the right panel
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearAll}
                className="text-xs text-destructive hover:bg-destructive/10"
              >
                Clear all
              </Button>
            </div>

            {/* Grid of Preview Cards */}
            <div
              ref={scrollContainerRef}
              onDragOver={handleContainerDragOver}
              onDragLeave={stopAutoScroll}
              className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 flex-1 overflow-y-auto pr-1 my-3 scroll-smooth"
            >
              {mergeItems.map((item, idx) => {
                const isBeingDragged = draggedIndex === idx;
                const isDropTarget = dragOverIndex === idx;
                const isSelected = selectedItem?.id === item.id;

                return (
                  <div
                    key={item.id}
                    draggable
                    onClick={() => setSelectedPreviewId(item.id)}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOverCard(e, idx)}
                    onDrop={(e) => handleDropOnCard(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`relative group rounded-2xl border p-2.5 bg-background shadow-2xs transition-all flex flex-col justify-between cursor-pointer select-none ${
                      isBeingDragged ? "opacity-30 border-dashed border-primary" : "border-border/80"
                    } ${
                      isSelected
                        ? "ring-2 ring-primary border-primary shadow-xs"
                        : "hover:border-primary/60"
                    } ${isDropTarget ? "border-primary ring-2 ring-primary/20 scale-[1.02]" : ""}`}
                  >
                    {/* Top Header: Slide Number Badge & Type indicator */}
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                          {idx + 1}
                        </span>
                        <span className="truncate text-xs font-medium text-foreground">
                          {item.file.name}
                        </span>
                      </div>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground shrink-0">
                        {item.isImage ? "IMAGE" : "DOC"}
                      </span>
                    </div>

                    {/* Thumbnail Render Container (16:9 aspect) */}
                    <div className="relative aspect-video w-full rounded-xl bg-muted/40 border border-border/40 overflow-hidden flex items-center justify-center mb-2">
                      {item.isLoadingThumb ? (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <HugeiconsIcon icon={Loading03Icon} className="size-5 animate-spin" />
                          <span className="text-[10px]">Rendering...</span>
                        </div>
                      ) : item.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.thumbnailUrl}
                          alt={item.file.name}
                          className="h-full w-full object-contain pointer-events-none"
                        />
                      ) : (
                        <HugeiconsIcon
                          icon={item.isImage ? Image01Icon : Presentation01Icon}
                          className="size-8 text-muted-foreground/60"
                        />
                      )}
                    </div>

                    {/* Bottom Metadata & Reorder Controls */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-[11px] font-medium text-foreground">
                          {item.file.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{item.formattedSize}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveFile(idx, idx - 1);
                          }}
                          className="size-6 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground disabled:opacity-20"
                        >
                          <HugeiconsIcon icon={ArrowUp01Icon} className="size-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === mergeItems.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveFile(idx, idx + 1);
                          }}
                          className="size-6 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground disabled:opacity-20"
                        >
                          <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(item.id);
                          }}
                          className="size-6 flex items-center justify-center rounded-md hover:bg-destructive/10 text-destructive"
                        >
                          <HugeiconsIcon icon={Delete02Icon} className="size-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/60 shrink-0">
              <input
                type="text"
                value={outputFilename}
                onChange={(e) => setOutputFilename(e.target.value)}
                placeholder="merged-presentation.pptx"
                className="w-full sm:w-72 rounded-xl border border-border/80 bg-background px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  onClick={handleMerge}
                  disabled={isProcessing}
                  className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold relative overflow-hidden"
                >
                  {isProcessing && (
                    <div
                      className="absolute inset-0 bg-primary/25 transition-all duration-300 pointer-events-none"
                      style={{ width: `${progressPercent}%` }}
                    />
                  )}
                  {isProcessing ? (
                    <>
                      <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin relative z-10" />
                      <span className="relative z-10">
                        Merging {progressPercent > 0 ? `${progressPercent}%` : "..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={Presentation01Icon} className="size-4 relative z-10" />
                      <span className="relative z-10">
                        Merge {mergeItems.length} {mergeItems.length === 1 ? "Slide" : "Slides"}
                      </span>
                    </>
                  )}
                </Button>

                {resultUrl && (
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    className="w-full sm:w-auto gap-2 border-border/80 font-medium"
                  >
                    <HugeiconsIcon icon={Download01Icon} className="size-4" />
                    <span>Download</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SECTION (5 cols): Live Slide Inspector & Preview */}
          <div className="lg:col-span-5 bg-card rounded-3xl border border-border/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between h-[calc(100vh-14rem)] min-h-[680px]">
            {selectedItem ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-border/60 shrink-0">
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-foreground truncate block">
                      {selectedItem.file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Slide {selectedIndex + 1} of {mergeItems.length} • Press Del to remove
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsModalFullscreen(true)}
                      className="gap-1.5 text-xs h-8"
                    >
                      <HugeiconsIcon icon={Maximize01Icon} className="size-3.5" />
                      <span>Full Screen</span>
                    </Button>
                  </div>
                </div>

                {/* Main Full-Height Slide Inspection Area */}
                <div className="relative flex-1 rounded-2xl bg-muted/20 border border-border/40 overflow-hidden flex items-center justify-center p-3 my-3">
                  {selectedItem.isLoadingThumb ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <HugeiconsIcon icon={Loading03Icon} className="size-8 animate-spin" />
                      <span className="text-sm font-medium">Rendering Slide Preview...</span>
                    </div>
                  ) : selectedItem.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedItem.thumbnailUrl}
                      alt={selectedItem.file.name}
                      className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <HugeiconsIcon icon={Presentation01Icon} className="size-12 opacity-60" />
                      <span className="text-sm font-medium">Slide preview ready</span>
                    </div>
                  )}
                </div>

                {/* Bottom Navigation Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-border/60 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={selectedIndex <= 0}
                    onClick={() => setSelectedPreviewId(mergeItems[selectedIndex - 1].id)}
                    className="gap-1.5 text-xs"
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                    <span>Previous Slide</span>
                  </Button>

                  <span className="text-xs font-semibold text-muted-foreground">
                    {selectedIndex + 1} / {mergeItems.length}
                  </span>

                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={selectedIndex >= mergeItems.length - 1}
                    onClick={() => setSelectedPreviewId(mergeItems[selectedIndex + 1].id)}
                    className="gap-1.5 text-xs"
                  >
                    <span>Next Slide</span>
                    <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <HugeiconsIcon icon={Presentation01Icon} className="size-12 opacity-40 mb-3" />
                <p className="text-sm font-medium">No slide selected</p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Upload files or select a slide from the left gallery to inspect.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FULLSCREEN PREVIEW MODAL */}
      {isModalFullscreen && selectedItem && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalFullscreen(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-8"
        >
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsModalFullscreen(false);
              }
            }}
            className="relative flex flex-col w-full h-full max-w-6xl max-h-[92vh] bg-card rounded-3xl border border-border/80 shadow-2xl overflow-hidden p-6"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border/60 shrink-0">
              <div>
                <h3 className="font-semibold text-lg text-foreground">{selectedItem.file.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Slide {selectedIndex + 1} of {mergeItems.length} • {selectedItem.formattedSize}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsModalFullscreen(false)}
                className="size-8 rounded-full"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
              </Button>
            </div>

            {/* Modal Image Area */}
            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setIsModalFullscreen(false);
                }
              }}
              className="relative flex-1 overflow-hidden flex items-center justify-center p-4 my-2"
            >
              {selectedItem.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedItem.thumbnailUrl}
                  alt={selectedItem.file.name}
                  className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
                />
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-border/60 shrink-0">
              <Button
                variant="outline"
                size="sm"
                disabled={selectedIndex <= 0}
                onClick={() => setSelectedPreviewId(mergeItems[selectedIndex - 1].id)}
                className="gap-1.5"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                <span>Previous Slide</span>
              </Button>

              <span className="text-sm font-semibold text-muted-foreground">
                {selectedIndex + 1} of {mergeItems.length}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={selectedIndex >= mergeItems.length - 1}
                onClick={() => setSelectedPreviewId(mergeItems[selectedIndex + 1].id)}
                className="gap-1.5"
              >
                <span>Next Slide</span>
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

