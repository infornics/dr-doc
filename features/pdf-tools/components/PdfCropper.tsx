"use client";

import { useState, useRef, useEffect } from "react";
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
import axios from "axios";
import { cropPdfApi } from "../services/pdfCrop.service";
import { toast } from "sonner";

interface PdfCropperProps {
  initialFile?: File;
  initialPreviewUrl?: string;
  onCropComplete?: (croppedBlob: Blob, croppedFilename: string) => void;
  onCancel?: () => void;
}

export default function PdfCropper({
  initialFile,
  initialPreviewUrl,
  onCropComplete,
  onCancel,
}: PdfCropperProps) {
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [imageSrc, setImageSrc] = useState<string | null>(initialPreviewUrl || null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
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

  const loadPdfPreview = async (selectedFile: File) => {
    setIsLoadingPreview(true);
    try {
      const isPdf =
        selectedFile.type === "application/pdf" ||
        selectedFile.name.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const res = await axios.post("/api/preview", formData, { responseType: "blob" });
        const thumbUrl = URL.createObjectURL(res.data);
        setImageSrc(thumbUrl);
      } else {
        const thumbUrl = URL.createObjectURL(selectedFile);
        setImageSrc(thumbUrl);
      }
    } catch {
      toast.error("Failed to load PDF preview for cropping.");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleFileChange = (selectedFile: File) => {
    const isPdf =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");
    const isImage = selectedFile.type.startsWith("image/");

    if (!isPdf && !isImage) {
      toast.error("Please upload a PDF or image file.");
      return;
    }

    setFile(selectedFile);
    setResultUrl(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    loadPdfPreview(selectedFile);
  };

  useEffect(() => {
    if (initialFile && !initialPreviewUrl) {
      loadPdfPreview(initialFile);
    }
  }, [initialFile, initialPreviewUrl]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight, width, height } = e.currentTarget;
    setNaturalSize({ width: naturalWidth, height: naturalHeight });

    const initialCrop = centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: 90,
        },
        aspect || naturalWidth / naturalHeight,
        width,
        height
      ),
      width,
      height
    );

    setCrop(initialCrop);
  };

  const handleAspectChange = (preset: string, ratio?: number) => {
    setAspectPreset(preset);
    setAspect(ratio);

    if (imgRef.current) {
      const { width, height } = imgRef.current;
      if (ratio) {
        const newCrop = centerCrop(
          makeAspectCrop(
            {
              unit: "%",
              width: 80,
            },
            ratio,
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

  const handleCrop = async () => {
    if (!completedCrop || !file || !imgRef.current) return;

    const scaleX = naturalSize.width / imgRef.current.width;
    const scaleY = naturalSize.height / imgRef.current.height;

    const actualCrop = {
      x: Math.round(completedCrop.x * scaleX),
      y: Math.round(completedCrop.y * scaleY),
      width: Math.round(completedCrop.width * scaleX),
      height: Math.round(completedCrop.height * scaleY),
    };

    setIsProcessing(true);
    try {
      const { blob, filename } = await cropPdfApi({
        file,
        cropX: actualCrop.x,
        cropY: actualCrop.y,
        cropWidth: actualCrop.width,
        cropHeight: actualCrop.height,
        originalWidth: naturalSize.width,
        originalHeight: naturalSize.height,
        pageIndex: 0,
      });

      if (onCropComplete) {
        onCropComplete(blob, filename);
        return;
      }

      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultFilename(filename);
      toast.success("PDF cropped successfully!");
    } catch {
      toast.error("Failed to crop PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    setFile(null);
    setImageSrc(null);
    setResultUrl(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
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
          className="relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/80 bg-muted/20 p-12 text-center transition-all hover:border-primary/50 hover:bg-muted/40 cursor-pointer select-none"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "application/pdf,image/*";
            input.onchange = (e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f) handleFileChange(f);
            };
            input.click();
          }}
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 shadow-xs">
            <HugeiconsIcon icon={CropIcon} className="size-7" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Select a PDF or document to crop</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag & drop or click to upload PDF pages or images
          </p>
          <Button variant="secondary" size="sm" className="mt-4 gap-2">
            <HugeiconsIcon icon={Upload01Icon} className="size-4" />
            <span>Choose PDF</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Cropper Stage */}
          <div className="lg:col-span-2 bg-card rounded-3xl border border-border/80 p-6 shadow-xs flex flex-col items-center justify-center min-h-[500px]">
            {isLoadingPreview ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <HugeiconsIcon icon={Loading03Icon} className="size-8 animate-spin text-primary" />
                <span className="text-sm font-medium">Rendering PDF for cropping...</span>
              </div>
            ) : (
              <div className="relative max-h-[640px] w-full flex items-center justify-center overflow-auto rounded-xl">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspect}
                  className="max-h-[600px] shadow-sm rounded-lg border border-border/40"
                >
                  <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="PDF Page Crop Target"
                    onLoad={onImageLoad}
                    className="max-h-[600px] w-auto object-contain bg-white"
                  />
                </ReactCrop>
              </div>
            )}

            {naturalSize.width > 0 && (
              <div className="mt-4 text-xs text-muted-foreground flex items-center gap-3">
                <span>Original: {naturalSize.width} × {naturalSize.height} pt</span>
                {completedCrop && (
                  <>
                    <span>•</span>
                    <span className="text-primary font-medium">
                      Selected Crop:{" "}
                      {Math.round(
                        completedCrop.width * (naturalSize.width / (imgRef.current?.width || 1))
                      )}{" "}
                      ×{" "}
                      {Math.round(
                        completedCrop.height * (naturalSize.height / (imgRef.current?.height || 1))
                      )}{" "}
                      pt
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Settings Sidebar */}
          <div className="flex flex-col justify-between bg-card rounded-3xl border border-border/80 p-6 shadow-xs space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <span className="font-semibold text-foreground">Crop Settings</span>
                <Button size="icon-sm" variant="ghost" onClick={handleReset} title="Clear crop">
                  <HugeiconsIcon icon={Delete02Icon} className="size-4 text-destructive" />
                </Button>
              </div>

              {/* Aspect Ratio Presets */}
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "free", label: "Free", ratio: undefined },
                    {
                      id: "original",
                      label: "Original",
                      ratio: naturalSize.width ? naturalSize.width / naturalSize.height : undefined,
                    },
                    { id: "1:1", label: "1:1", ratio: 1 },
                    { id: "4:3", label: "4:3", ratio: 4 / 3 },
                    { id: "16:9", label: "16:9", ratio: 16 / 9 },
                    { id: "A4", label: "A4", ratio: 1 / 1.414 },
                  ].map((preset) => (
                    <Button
                      key={preset.id}
                      size="sm"
                      variant={aspectPreset === preset.id ? "default" : "outline"}
                      onClick={() => handleAspectChange(preset.id, preset.ratio)}
                      className="text-xs"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Pixel/Point Metrics */}
              {completedCrop && imgRef.current && (
                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Dimensions (Points)
                  </label>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Width</span>
                      <div className="h-9 px-3 flex items-center rounded-xl border border-border bg-muted/40 font-mono">
                        {Math.round(
                          completedCrop.width * (naturalSize.width / imgRef.current.width)
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Height</span>
                      <div className="h-9 px-3 flex items-center rounded-xl border border-border bg-muted/40 font-mono">
                        {Math.round(
                          completedCrop.height * (naturalSize.height / imgRef.current.height)
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <Button
                className="w-full gap-2 font-semibold shadow-sm"
                onClick={handleCrop}
                disabled={isProcessing || !completedCrop}
              >
                {isProcessing ? (
                  <>
                    <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
                    <span>Cropping PDF...</span>
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
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-semibold text-sm shadow-xs transition-all"
                >
                  <HugeiconsIcon icon={Download01Icon} className="size-4" />
                  <span>Download Cropped PDF</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

