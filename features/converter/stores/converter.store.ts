import { create } from "zustand";
import { ConverterItem } from "../types/converter.types";
import { getDefaultTargetFormat, getFileExtension } from "../utils";
import { convertFileApi } from "../services/converter.service";

interface ConverterStoreState {
  items: ConverterItem[];
  isProcessing: boolean;

  // Actions
  addFiles: (files: FileList | File[]) => void;
  removeFile: (id: string) => void;
  clearAll: () => void;
  updateTargetFormat: (id: string, targetFormat: string) => void;
  setGlobalTargetFormat: (targetFormat: string) => void;
  convertItem: (id: string) => Promise<void>;
  convertAll: () => Promise<void>;
}

export const useConverterStore = create<ConverterStoreState>((set, get) => ({
  items: [],
  isProcessing: false,

  addFiles: (files) => {
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

    set((state) => ({ items: [...state.items, ...newItems] }));
  },

  removeFile: (id) => {
    set((state) => ({
      items: state.items.filter((item) => {
        if (item.id === id && item.downloadUrl) {
          URL.revokeObjectURL(item.downloadUrl);
        }
        return item.id !== id;
      }),
    }));
  },

  clearAll: () => {
    get().items.forEach((item) => {
      if (item.downloadUrl) {
        URL.revokeObjectURL(item.downloadUrl);
      }
    });
    set({ items: [] });
  },

  updateTargetFormat: (id, targetFormat) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, targetFormat } : item
      ),
    }));
  },

  setGlobalTargetFormat: (targetFormat) => {
    set((state) => ({
      items: state.items.map((item) => ({ ...item, targetFormat })),
    }));
  },

  convertItem: async (id) => {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;

    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, status: "converting", progress: 15, error: undefined } : i
      ),
    }));

    try {
      const result = await convertFileApi(item.file, item.targetFormat, (progress) => {
        if (progress.total) {
          const calculated = Math.round((progress.loaded / progress.total) * 75);
          set((state) => ({
            items: state.items.map((i) =>
              i.id === id ? { ...i, progress: Math.min(80, 15 + calculated) } : i
            ),
          }));
        }
      });

      const downloadUrl = URL.createObjectURL(result.blob);

      set((state) => ({
        items: state.items.map((i) =>
          i.id === id
            ? {
                ...i,
                status: "completed",
                progress: 100,
                downloadUrl,
              }
            : i
        ),
      }));
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to convert file";

      set((state) => ({
        items: state.items.map((i) =>
          i.id === id
            ? { ...i, status: "error", progress: 0, error: errorMessage }
            : i
        ),
      }));
    }
  },

  convertAll: async () => {
    const idleItems = get().items.filter(
      (item) => item.status === "idle" || item.status === "error"
    );
    if (idleItems.length === 0) return;

    set({ isProcessing: true });
    await Promise.all(idleItems.map((item) => get().convertItem(item.id)));
    set({ isProcessing: false });
  },
}));
