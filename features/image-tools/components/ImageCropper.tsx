"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  CropIcon,
  Download01Icon,
  Upload01Icon,
  Delete02Icon,
  Loading03Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cropImageApi } from "../services/imageTools.service";

export default function ImageCropper() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  
  // Crop box in image coordinates
  const [cropBox, setCropBox] = useState<{ left: number; top: number; width: number; height: number }>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  const [aspectPreset, setAspectPreset] = useState<string>("free");
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFilename, setResultFilename] = useState<string>("");

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [initialBox, setInitialBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const handleFileChange = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) return;
    setFile(selectedFile);
    setResultUrl(null);

    const url = URL.createObjectURL(selectedFile);
    setImageSrc(url);
  };

  const onImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    setNaturalSize({ width: nw, height: nh });

    // Initial crop: center 70% of image
    const initialW = Math.round(nw * 0.7);
    const initialH = Math.round(nh * 0.7);
    setCropBox({
      left: Math.round((nw - initialW) / 2),
      top: Math.round((nh - initialH) / 2),
      width: initialW,
      height: initialH,
    });
  };

  const applyPreset = (preset: string) => {
    setAspectPreset(preset);
    if (!naturalSize.width || !naturalSize.height) return;

    const { width: nw, height: nh } = naturalSize;
    let targetRatio: number | null = null;

    if (preset === "1:1") targetRatio = 1;
    else if (preset === "16:9") targetRatio = 16 / 9;
    else if (preset === "4:3") targetRatio = 4 / 3;
    else if (preset === "9:16") targetRatio = 9 / 16;

    if (targetRatio) {
      let w = nw * 0.8;
      let h = w / targetRatio;
      if (h > nh * 0.8) {
        h = nh * 0.8;
        w = h * targetRatio;
      }
      w = Math.round(w);
      h = Math.round(h);
      setCropBox({
        left: Math.round((nw - w) / 2),
        top: Math.round((nh - h) / 2),
        width: w,
        height: h,
      });
    }
  };

  const executeCrop = async () => {
    if (!file || cropBox.width <= 0 || cropBox.height <= 0) return;
    setIsProcessing(true);

    try {
      const res = await cropImageApi({
        file,
        left: cropBox.left,
        top: cropBox.top,
        width: cropBox.width,
        height: cropBox.height,
        format: "png",
      });

      const url = URL.createObjectURL(res.blob);
      setResultUrl(url);
      setResultFilename(res.filename);
    } catch (err) {
      console.error(err);
      alert("Failed to crop image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setImageSrc(null);
    setResultUrl(null);
  };

  return (
    <div className="space-y-6">
      {!imageSrc ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
          }}
          className="relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/80 bg-muted/20 p-12 text-center transition-all hover:border-primary/50 hover:bg-muted/40 cursor-pointer"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = (e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f) handleFileChange(f);
            };
            input.click();
          }}
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 shadow-xs">
            <HugeiconsIcon icon={CropIcon} className="size-7" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Select an image to crop</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag & drop or click to upload PNG, JPEG, WEBP
          </p>
          <Button variant="secondary" size="sm" className="mt-4 gap-2">
            <HugeiconsIcon icon={Upload01Icon} className="size-4" />
            <span>Choose Image</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Visual Cropping Area */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center bg-card rounded-3xl border border-border/80 p-6 shadow-xs overflow-hidden">
            <div
              ref={containerRef}
              className="relative max-h-[500px] w-full flex items-center justify-center select-none"
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Image to crop"
                onLoad={onImageLoaded}
                className="max-h-[500px] max-w-full rounded-xl object-contain shadow-sm pointer-events-none"
              />
            </div>
            
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Original: {naturalSize.width} × {naturalSize.height} px • Selected Crop: {cropBox.width} × {cropBox.height} px
            </p>
          </div>

          {/* Controls Sidebar */}
          <div className="flex flex-col justify-between bg-card rounded-3xl border border-border/80 p-6 shadow-xs space-y-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <span className="font-semibold text-foreground">Crop Settings</span>
                <Button size="icon-xs" variant="ghost" onClick={reset} title="Remove image">
                  <HugeiconsIcon icon={Delete02Icon} className="size-4 text-destructive" />
                </Button>
              </div>

              {/* Aspect Ratio Presets */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["free", "1:1", "16:9", "4:3", "9:16"].map((preset) => (
                    <Button
                      key={preset}
                      size="sm"
                      variant={aspectPreset === preset ? "default" : "outline"}
                      className="text-xs font-semibold capitalize"
                      onClick={() => applyPreset(preset)}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Manual Crop Dimension Inputs */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Dimensions (px)
                </label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block mb-1">Width</span>
                    <input
                      type="number"
                      value={cropBox.width}
                      onChange={(e) =>
                        setCropBox((prev) => ({ ...prev, width: Math.max(1, Number(e.target.value)) }))
                      }
                      className="w-full h-8 px-2 rounded-lg border border-input bg-background font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Height</span>
                    <input
                      type="number"
                      value={cropBox.height}
                      onChange={(e) =>
                        setCropBox((prev) => ({ ...prev, height: Math.max(1, Number(e.target.value)) }))
                      }
                      className="w-full h-8 px-2 rounded-lg border border-input bg-background font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Offset X (Left)</span>
                    <input
                      type="number"
                      value={cropBox.left}
                      onChange={(e) =>
                        setCropBox((prev) => ({ ...prev, left: Math.max(0, Number(e.target.value)) }))
                      }
                      className="w-full h-8 px-2 rounded-lg border border-input bg-background font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Offset Y (Top)</span>
                    <input
                      type="number"
                      value={cropBox.top}
                      onChange={(e) =>
                        setCropBox((prev) => ({ ...prev, top: Math.max(0, Number(e.target.value)) }))
                      }
                      className="w-full h-8 px-2 rounded-lg border border-input bg-background font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <Button
                className="w-full gap-2 shadow-sm font-semibold"
                onClick={executeCrop}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
                    <span>Cropping...</span>
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={CropIcon} className="size-4" />
                    <span>Apply Crop</span>
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
                  <span>Download Cropped Image</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

