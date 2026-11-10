"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { DropzoneProps } from "../types/dropzone.types";

export function useDropzone({ onFilesSelected, disabled }: DropzoneProps) {
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

