"use client";

import { Button } from "@/components/ui/button";
import {
  CloudUploadIcon,
  Folder01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChangeEvent, DragEvent, useRef, useState } from "react";

interface DropzoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  disabled?: boolean;
}

export default function Dropzone({ onFilesSelected, disabled }: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      // Reset input so re-selecting same file works
      e.target.value = "";
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 md:p-12 text-center transition-all cursor-pointer select-none ${
        isDragOver
          ? "border-primary bg-primary/5 ring-4 ring-primary/10 scale-[1.008]"
          : "border-border/80 bg-card/60 hover:border-primary/50 hover:bg-muted/30"
      } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Upload icon circle */}
      <div className="relative mb-5 flex size-16 md:size-20 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
        <HugeiconsIcon icon={CloudUploadIcon} className="size-8 md:size-10" />
        <span className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-foreground text-[10px] text-background shadow-xs">
          <HugeiconsIcon icon={SparklesIcon} className="size-3.5" />
        </span>
      </div>

      <div className="max-w-md space-y-1.5">
        <h3 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">
          Drag & drop your files here
        </h3>
        <p className="text-sm text-muted-foreground">
          Supports Images (PNG, JPG, WEBP), Documents (PDF, DOCX, TXT), E-books
          and more.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          size="lg"
          className="pointer-events-none gap-2 shadow-xs group-hover:shadow-md transition-shadow"
        >
          <HugeiconsIcon icon={Folder01Icon} className="size-4" />
          <span>Browse Files</span>
        </Button>
      </div>

      <p className="mt-4 text-xs text-muted-foreground/75">
        Up to 100 MB per file • End-to-end encrypted & deleted automatically
      </p>
    </div>
  );
}
