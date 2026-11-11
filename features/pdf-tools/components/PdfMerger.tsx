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
      const targetIndex = prev.findIndex((i) => i.id === id);
      const target = prev[targetIndex];
      if (target?.thumbnailUrl) URL.revokeObjectURL(target.thumbnailUrl);
      const nextList = prev.filter((i) => i.id !== id);

      // Adjust selected preview to the next closest item if the current one was deleted
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

  // Keyboard shortcut: Delete or Backspace to remove currently selected page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing inside an input or textarea
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === "input" || targetTag === "textarea") {
        return;
      }

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

  // HTML5 Drag and Drop Card Reordering Handlers with Auto-Scroll
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
    if (autoScrollRafRef.current !== null) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex === null || !scrollContainerRef.current) return;

    const rect = scrollContainerRef.current.getBoundingClientRect();
    const mouseY = e.clientY;
    const edgeThreshold = 90; // pixels from top or bottom edge to start scrolling
    const distanceFromTop = mouseY - rect.top;
    const distanceFromBottom = rect.bottom - mouseY;

    if (distanceFromTop < edgeThreshold && distanceFromTop > 0) {
      // Near top edge: scroll up, speed scales with proximity
      const intensity = Math.max(2, Math.round((1 - distanceFromTop / edgeThreshold) * 14));
      startAutoScroll("up", intensity);
    } else if (distanceFromBottom < edgeThreshold && distanceFromBottom > 0) {
      // Near bottom edge: scroll down, speed scales with proximity
      const intensity = Math.max(2, Math.round((1 - distanceFromBottom / edgeThreshold) * 14));
      startAutoScroll("down", intensity);
    } else {
      stopAutoScroll();
    }
  };

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
    stopAutoScroll();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      moveFile(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    stopAutoScroll();
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
    setSelectedPreviewId(null);
    setIsModalFullscreen(false);
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* LEFT SECTION (7 cols): Mini Preview Gallery & Drag and Drop Reordering */}
          <div className="lg:col-span-7 bg-card rounded-3xl border border-border/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between h-[calc(100vh-14rem)] min-h-[680px]">
            <div className="flex items-center justify-between pb-3 border-b border-border/60 shrink-0">
              <div>
                <span className="font-semibold text-foreground block">
                  Reorder Document Pages ({mergeItems.length} {mergeItems.length === 1 ? "page" : "pages"})
                </span>
                <span className="text-xs text-muted-foreground">
                  Drag and drop cards or click to inspect on the right panel
                </span>
              </div>
              <Button size="sm" variant="ghost" onClick={clearAll} className="text-xs text-destructive hover:bg-destructive/10">
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
                    {/* Visual Thumbnail Window */}
                    <div className="relative w-full aspect-3/4 rounded-xl overflow-hidden bg-muted/40 border border-border/40 flex items-center justify-center p-1">
                      {item.isLoadingThumb ? (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin text-primary" />
                          <span className="text-[9px] font-medium">Generating...</span>
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
                            className="size-7 text-muted-foreground/60"
                          />
                          <span className="text-[9px] uppercase font-bold tracking-wider">
                            {item.isImage ? "Image" : "PDF"}
                          </span>
                        </div>
                      )}

                      {/* Sequence Number Badge */}
                      <span className="absolute top-1.5 left-1.5 size-5 rounded-full bg-foreground/90 text-background text-[11px] font-bold flex items-center justify-center shadow-xs">
                        {idx + 1}
                      </span>

                      {/* Type Badge */}
                      <span className="absolute top-1.5 right-1.5 px-1 py-0.2 rounded-md bg-background/80 backdrop-blur-xs text-[9px] font-semibold text-foreground uppercase shadow-2xs border border-border/50">
                        {item.isImage ? "Image" : "PDF"}
                      </span>
                    </div>

                    {/* Metadata & Controls */}
                    <div className="mt-2 space-y-1.5">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold text-foreground" title={item.file.name}>
                          {item.file.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{item.formattedSize}</p>
                      </div>

                      {/* Reorder Buttons & Quick View */}
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
                            <HugeiconsIcon icon={ArrowUp01Icon} className="size-3" />
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
                            <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" />
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
                          <HugeiconsIcon icon={Delete02Icon} className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Merge Actions Card under Left Gallery */}
            <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="w-full sm:w-auto flex-1 max-w-xs">
                <input
                  type="text"
                  value={outputFilename}
                  onChange={(e) => setOutputFilename(e.target.value)}
                  placeholder="merged-document.pdf"
                  className="w-full h-8.5 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="w-full sm:w-auto flex items-center gap-2">
                <Button
                  className="w-full sm:w-auto gap-2 font-semibold shadow-sm text-xs h-8.5"
                  onClick={handleMerge}
                  disabled={isProcessing || mergeItems.length < 2}
                >
                  {isProcessing ? (
                    <>
                      <HugeiconsIcon icon={Loading03Icon} className="size-3.5 animate-spin" />
                      <span>Merging...</span>
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={File01Icon} className="size-3.5" />
                      <span>Merge {mergeItems.length} Pages</span>
                    </>
                  )}
                </Button>

                {resultUrl && (
                  <a
                    href={resultUrl}
                    download={resultFilename}
                    className="inline-flex items-center justify-center gap-1.5 h-8.5 px-3 rounded-xl bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-700 shadow-sm transition-all whitespace-nowrap"
                  >
                    <HugeiconsIcon icon={Download01Icon} className="size-3.5" />
                    <span>Download</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SECTION (5 cols): Full Page Preview with Full Screen Option */}
          <div className="lg:col-span-5 bg-card rounded-3xl border border-border/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between h-[calc(100vh-14rem)] min-h-[680px]">
            {/* Header info */}
            <div className="flex items-center justify-between pb-3 border-b border-border/60 shrink-0">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground text-sm truncate">
                    {selectedItem ? selectedItem.file.name : "Page Preview"}
                  </span>
                  {selectedItem && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-bold text-muted-foreground uppercase border border-border/60">
                      Page {selectedIndex + 1} of {mergeItems.length}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground block truncate mt-0.5">
                  Full-height page preview • Press <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Del</kbd> to remove
                </span>
              </div>

              {/* View Full Screen Height Button */}
              {selectedItem?.thumbnailUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsModalFullscreen(true)}
                  className="gap-1.5 text-xs shrink-0 rounded-xl hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all"
                  title="Expand to Full Screen Height"
                >
                  <HugeiconsIcon icon={Maximize01Icon} className="size-3.5" />
                  <span className="hidden sm:inline">Full Screen</span>
                </Button>
              )}
            </div>

            {/* High-res / Full-height Page Preview Canvas */}
            <div
              onClick={() => {
                if (selectedItem?.thumbnailUrl) setIsModalFullscreen(true);
              }}
              className={`my-3 relative flex-1 min-h-0 rounded-2xl bg-muted/20 border border-border/60 overflow-hidden flex items-center justify-center p-2 ${
                selectedItem?.thumbnailUrl ? "cursor-zoom-in group" : ""
              }`}
            >
              {selectedItem?.isLoadingThumb ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <HugeiconsIcon icon={Loading03Icon} className="size-8 animate-spin text-primary" />
                  <span className="text-xs font-medium">Rendering preview...</span>
                </div>
              ) : selectedItem?.thumbnailUrl ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={selectedItem.thumbnailUrl}
                    alt={selectedItem.file.name}
                    className="w-full h-full object-contain rounded-lg shadow-sm"
                  />
                  {/* Hover Overlay indicator for Fullscreen */}
                  <div className="absolute inset-0 bg-background/30 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/90 text-foreground text-xs font-semibold shadow-md border border-border/60">
                      <HugeiconsIcon icon={Maximize01Icon} className="size-4" />
                      <span>Click anywhere to view full height</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground text-center p-6">
                  <HugeiconsIcon icon={File01Icon} className="size-10 text-muted-foreground/40" />
                  <p className="text-xs">Select any page card from the left sequence to inspect its preview.</p>
                </div>
              )}
            </div>

            {/* Page Navigation Controls (Previous / Next Page) */}
            <div className="pt-3 border-t border-border/60 flex items-center justify-between shrink-0">
              <Button
                size="sm"
                variant="ghost"
                disabled={selectedIndex <= 0}
                onClick={() => {
                  if (selectedIndex > 0) {
                    setSelectedPreviewId(mergeItems[selectedIndex - 1].id);
                  }
                }}
                className="gap-1.5 text-xs"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
                <span>Previous Page</span>
              </Button>

              <span className="text-xs font-semibold text-muted-foreground">
                {selectedIndex + 1} / {mergeItems.length}
              </span>

              <Button
                size="sm"
                variant="ghost"
                disabled={selectedIndex >= mergeItems.length - 1}
                onClick={() => {
                  if (selectedIndex < mergeItems.length - 1) {
                    setSelectedPreviewId(mergeItems[selectedIndex + 1].id);
                  }
                }}
                className="gap-1.5 text-xs"
              >
                <span>Next Page</span>
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* FULL SCREEN MODAL VIEWER */}
      {isModalFullscreen && selectedItem?.thumbnailUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-md animate-in fade-in duration-200"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-card/80">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-bold text-foreground text-base truncate">
                {selectedItem.file.name}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                Page {selectedIndex + 1} of {mergeItems.length}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {selectedItem.formattedSize}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsModalFullscreen(false)}
                className="rounded-full size-9 hover:bg-muted"
                title="Close fullscreen view (Esc)"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
              </Button>
            </div>
          </div>

          {/* Full Height Viewer Body */}
          <div className="relative flex-1 flex items-center justify-center p-4 sm:p-8 overflow-auto">
            {/* Prev button */}
            <Button
              size="icon"
              variant="secondary"
              disabled={selectedIndex <= 0}
              onClick={() => {
                if (selectedIndex > 0) {
                  setSelectedPreviewId(mergeItems[selectedIndex - 1].id);
                }
              }}
              className="absolute left-4 z-10 size-11 rounded-full shadow-lg opacity-80 hover:opacity-100 disabled:opacity-30"
              title="Previous Page"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" />
            </Button>

            <img
              src={selectedItem.thumbnailUrl}
              alt={selectedItem.file.name}
              className="h-[calc(100vh-7rem)] w-auto max-w-[85vw] object-contain rounded-xl shadow-2xl border border-border/60 bg-white"
            />

            {/* Next button */}
            <Button
              size="icon"
              variant="secondary"
              disabled={selectedIndex >= mergeItems.length - 1}
              onClick={() => {
                if (selectedIndex < mergeItems.length - 1) {
                  setSelectedPreviewId(mergeItems[selectedIndex + 1].id);
                }
              }}
              className="absolute right-4 z-10 size-11 rounded-full shadow-lg opacity-80 hover:opacity-100 disabled:opacity-30"
              title="Next Page"
            >
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
