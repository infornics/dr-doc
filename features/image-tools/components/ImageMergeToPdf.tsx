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
import { mergeImagesToPdfApi } from "../services/imageTools.service";

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
}

export default function ImageMergeToPdf() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<"a4" | "fit" | "letter">("a4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFilename, setResultFilename] = useState<string>("merged-images.pdf");

  const addFiles = (fileList: FileList | File[]) => {
    const newItems: ImageItem[] = Array.from(fileList)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
      }));

    setImages((prev) => [...prev, ...newItems]);
    setResultUrl(null);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const moveImage = (index: number, direction: "up" | "down") => {
    setImages((prev) => {
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
    if (images.length === 0) return;
    setIsProcessing(true);

    try {
      const res = await mergeImagesToPdfApi({
        files: images.map((i) => i.file),
        pageSize,
        orientation,
        filename: "merged-images.pdf",
      });

      const url = URL.createObjectURL(res.blob);
      setResultUrl(url);
      setResultFilename(res.filename);
    } catch (err) {
      console.error(err);
      alert("Failed to merge images into PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
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
        className="relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/80 bg-muted/20 p-10 text-center transition-all hover:border-primary/50 hover:bg-muted/40 cursor-pointer"
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.accept = "image/*";
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
        <h3 className="text-lg font-semibold text-foreground">Select Images to Merge</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload multiple images (PNG, JPG, WEBP) to combine into a single PDF
        </p>
        <Button variant="secondary" size="sm" className="mt-4 gap-2">
          <HugeiconsIcon icon={Upload01Icon} className="size-4" />
          <span>Add Images</span>
        </Button>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Images List & Reordering */}
          <div className="lg:col-span-2 bg-card rounded-3xl border border-border/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <span className="font-semibold text-foreground">
                Page Order ({images.length} {images.length === 1 ? "page" : "pages"})
              </span>
              <Button size="sm" variant="ghost" onClick={clearAll} className="text-xs text-destructive">
                Clear all
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className="relative group rounded-2xl border border-border/80 bg-background p-2.5 shadow-2xs hover:border-primary/50 transition-all flex flex-col items-center"
                >
                  <div className="relative w-full h-32 rounded-xl overflow-hidden bg-muted/30 flex items-center justify-center">
                    <img
                      src={img.previewUrl}
                      alt={img.file.name}
                      className="w-full h-full object-contain"
                    />
                    <span className="absolute top-2 left-2 size-6 rounded-full bg-foreground/80 text-background text-xs font-bold flex items-center justify-center shadow-xs">
                      {idx + 1}
                    </span>
                  </div>

                  <p className="w-full truncate text-xs font-medium text-foreground mt-2 text-center">
                    {img.file.name}
                  </p>

                  <div className="flex items-center gap-1 mt-2">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveImage(idx, "up");
                      }}
                      title="Move earlier"
                    >
                      <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      disabled={idx === images.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveImage(idx, "down");
                      }}
                      title="Move later"
                    >
                      <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(img.id);
                      }}
                      className="text-destructive"
                      title="Remove"
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
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
                PDF Layout Settings
              </span>

              {/* Page Format */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Page Sizing
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["a4", "letter", "fit"] as const).map((size) => (
                    <Button
                      key={size}
                      size="sm"
                      variant={pageSize === size ? "default" : "outline"}
                      className="text-xs font-semibold uppercase"
                      onClick={() => setPageSize(size)}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Orientation */}
              {pageSize !== "fit" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Orientation
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["portrait", "landscape"] as const).map((ori) => (
                      <Button
                        key={ori}
                        size="sm"
                        variant={orientation === ori ? "default" : "outline"}
                        className="text-xs font-semibold capitalize"
                        onClick={() => setOrientation(ori)}
                      >
                        {ori}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Merge Actions */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <Button
                className="w-full gap-2 font-semibold shadow-sm"
                onClick={handleMerge}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
                    <span>Merging to PDF...</span>
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={File01Icon} className="size-4" />
                    <span>Merge {images.length} Images to PDF</span>
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
                  <span>Download Combined PDF</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

