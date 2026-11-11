"use client";

import { useState, useRef } from "react";
import ReactCrop, {
  type Crop,
  type PixelCrop,
  makeAspectCrop,
  centerCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

import { Button } from "@/components/ui/button";
import {
  CropIcon,
  Download01Icon,
  Upload01Icon,
  Delete02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cropImageApi } from "../services/imageTools.service";

export default function ImageCropper() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspectPreset, setAspectPreset] = useState<string>("free");
  const [aspect, setAspect] = useState<number | undefined>(undefined);

  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFilename, setResultFilename] = useState<string>("");

  const imgRef = useRef<HTMLImageElement>(null);

  const handleFileChange = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) return;
    setFile(selectedFile);
    setResultUrl(null);
    setCrop(undefined);
    setCompletedCrop(undefined);

    const url = URL.createObjectURL(selectedFile);
    setImageSrc(url);
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: nw, naturalHeight: nh, width, height } = e.currentTarget;
    setNaturalSize({ width: nw, height: nh });

    // Initial crop: centered 80% box
    const initialCrop = centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: 80,
        },
        aspect || nw / nh,
        width,
        height
      ),
      width,
      height
    );

    setCrop(initialCrop);
  };

  const applyPreset = (preset: string) => {
    setAspectPreset(preset);
    let targetRatio: number | undefined = undefined;

    if (preset === "original" && naturalSize.width && naturalSize.height) {
      targetRatio = naturalSize.width / naturalSize.height;
    } else if (preset === "1:1") {
      targetRatio = 1;
    } else if (preset === "16:9") {
      targetRatio = 16 / 9;
    } else if (preset === "4:3") {
      targetRatio = 4 / 3;
    } else if (preset === "9:16") {
      targetRatio = 9 / 16;
    }

    setAspect(targetRatio);

    if (imgRef.current) {
      const { width, height } = imgRef.current;
      if (targetRatio) {
        const newCrop = centerCrop(
          makeAspectCrop(
            {
              unit: "%",
              width: 80,
            },
            targetRatio,
            width,
            height
          ),
          width,
          height
        );
        setCrop(newCrop);
      }
    }
  };

  const executeCrop = async () => {
    if (!file || !completedCrop || !imgRef.current) return;
    setIsProcessing(true);

    try {
      // Scale from displayed image size to actual natural image coordinates
      const scaleX = naturalSize.width / imgRef.current.width;
      const scaleY = naturalSize.height / imgRef.current.height;

      const realLeft = Math.round(completedCrop.x * scaleX);
      const realTop = Math.round(completedCrop.y * scaleY);
      const realWidth = Math.round(completedCrop.width * scaleX);
      const realHeight = Math.round(completedCrop.height * scaleY);

      if (realWidth <= 0 || realHeight <= 0) {
        alert("Please select a crop region.");
        return;
      }

      const res = await cropImageApi({
        file,
        left: realLeft,
        top: realTop,
        width: realWidth,
        height: realHeight,
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
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  // Dimensions in natural image pixels for the info display & input readouts
  const scaleX = imgRef.current ? naturalSize.width / imgRef.current.width : 1;
  const scaleY = imgRef.current ? naturalSize.height / imgRef.current.height : 1;
  const displayWidth = completedCrop ? Math.round(completedCrop.width * scaleX) : 0;
  const displayHeight = completedCrop ? Math.round(completedCrop.height * scaleY) : 0;
  const displayLeft = completedCrop ? Math.round(completedCrop.x * scaleX) : 0;
  const displayTop = completedCrop ? Math.round(completedCrop.y * scaleY) : 0;

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
          {/* Main Visual Cropping Area with Draggable Corner & Edge Handles */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center bg-card rounded-3xl border border-border/80 p-6 shadow-xs overflow-hidden">
            <div className="relative max-h-[540px] w-full flex items-center justify-center select-none overflow-hidden">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                className="max-h-[540px] rounded-xl overflow-hidden"
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  className="max-h-[540px] max-w-full rounded-xl object-contain shadow-sm"
                />
              </ReactCrop>
            </div>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              Original: {naturalSize.width} × {naturalSize.height} px • Selected Crop: {displayWidth} × {displayHeight} px
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
                  {[
                    { id: "free", label: "Free" },
                    { id: "original", label: "Original" },
                    { id: "1:1", label: "1:1" },
                    { id: "16:9", label: "16:9" },
                    { id: "4:3", label: "4:3" },
                    { id: "9:16", label: "9:16" },
                  ].map((p) => (
                    <Button
                      key={p.id}
                      size="sm"
                      variant={aspectPreset === p.id ? "default" : "outline"}
                      className="text-xs font-semibold"
                      onClick={() => applyPreset(p.id)}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Live Crop Coordinates & Dimensions Readout */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Dimensions (px)
                </label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block mb-1">Width</span>
                    <input
                      type="number"
                      readOnly
                      value={displayWidth || ""}
                      placeholder="0"
                      className="w-full h-8 px-2.5 rounded-lg border border-input bg-muted/40 font-mono text-foreground"
                    />
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Height</span>
                    <input
                      type="number"
                      readOnly
                      value={displayHeight || ""}
                      placeholder="0"
                      className="w-full h-8 px-2.5 rounded-lg border border-input bg-muted/40 font-mono text-foreground"
                    />
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Offset X (Left)</span>
                    <input
                      type="number"
                      readOnly
                      value={displayLeft || ""}
                      placeholder="0"
                      className="w-full h-8 px-2.5 rounded-lg border border-input bg-muted/40 font-mono text-foreground"
                    />
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Offset Y (Top)</span>
                    <input
                      type="number"
                      readOnly
                      value={displayTop || ""}
                      placeholder="0"
                      className="w-full h-8 px-2.5 rounded-lg border border-input bg-muted/40 font-mono text-foreground"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground italic">
                  Drag the corners, edges, or move the box directly on the image to crop.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <Button
                className="w-full gap-2 shadow-sm font-semibold"
                onClick={executeCrop}
                disabled={isProcessing || !completedCrop?.width || !completedCrop?.height}
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
