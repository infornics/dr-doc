"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { DropzoneProps } from "../types/dropzone.types";

export function useDropzone({
  onFilesSelected,
  disabled,
  allowedExtensions,
}: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filterFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!allowedExtensions || allowedExtensions.length === 0) {
      return files;
    }

    const filtered = files.filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ext && allowedExtensions.includes(ext);
    });

    if (filtered.length < files.length) {
      alert(`Only image files (${allowedExtensions.join(", ")}) are supported in Image Tools.`);
    }

    return filtered;
  };

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
      const valid = filterFiles(e.dataTransfer.files);
      if (valid.length > 0) onFilesSelected(valid);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const valid = filterFiles(e.target.files);
      if (valid.length > 0) onFilesSelected(valid);
      e.target.value = "";
    }
  };

  const openFileDialog = () => {
    inputRef.current?.click();
  };

  return {
    isDragOver,
    inputRef,
    openFileDialog,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInputChange,
  };
}

