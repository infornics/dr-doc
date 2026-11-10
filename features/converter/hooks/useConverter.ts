"use client";

import { useState, useCallback } from "react";
import { ConverterItem } from "../types";
import { getDefaultTargetFormat, getFileExtension } from "../utils";

export function useConverter() {
  const [items, setItems] = useState<ConverterItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: ConverterItem[] = Array.from(files).map((file) => {
      const ext = getFileExtension(file.name);
      const target = getDefaultTargetFormat(ext);
      return {
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        sourceFormat: ext || "unknown",
        targetFormat: target,
        status: "idle",
        progress: 0,
      };
    });

    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  const updateTargetFormat = useCallback((id: string, targetFormat: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, targetFormat } : item
      )
    );
  }, []);

  const setGlobalTargetFormat = useCallback((targetFormat: string) => {
    setItems((prev) =>
      prev.map((item) => ({ ...item, targetFormat }))
    );
  }, []);

  const convertItem = useCallback(async (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "converting", progress: 15 } : item
      )
    );

    // Simulated conversion progress with realistic increments
    for (let p = 30; p <= 90; p += 30) {
      await new Promise((res) => setTimeout(res, 350));
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, progress: p } : item
        )
      );
    }

    await new Promise((res) => setTimeout(res, 250));

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const fakeBlobUrl = URL.createObjectURL(
            new Blob([item.file], { type: "application/octet-stream" })
          );
          return {
            ...item,
            status: "completed",
            progress: 100,
            downloadUrl: fakeBlobUrl,
          };
        }
        return item;
      })
    );
  }, []);

  const convertAll = useCallback(async () => {
    const idleItems = items.filter((item) => item.status === "idle" || item.status === "error");
    if (idleItems.length === 0) return;

    setIsProcessing(true);
    await Promise.all(idleItems.map((item) => convertItem(item.id)));
    setIsProcessing(false);
  }, [items, convertItem]);

  return {
    items,
    isProcessing,
    addFiles,
    removeFile,
    clearAll,
    updateTargetFormat,
    setGlobalTargetFormat,
    convertItem,
    convertAll,
  };
}
