import axios from "axios";
import { PDFDocument } from "pdf-lib";

export interface SplitPdfParams {
  file: File;
  mode: "all" | "range" | "chunks";
  range?: string;
  chunkSize?: number;
  onProgress?: (progress: number) => void;
}

export async function splitPdfApi({
  file,
  mode,
  range,
  chunkSize,
  onProgress,
}: SplitPdfParams): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", mode);
  if (range) formData.append("range", range);
  if (chunkSize) formData.append("chunkSize", chunkSize.toString());

  const res = await axios.post("/api/pdf/split", formData, {
    responseType: "blob",
    onUploadProgress: (evt) => {
      if (evt.total && onProgress) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    },
  });

  const disposition = res.headers["content-disposition"] || "";
  let filename = mode === "range" ? `${file.name.replace(/\.[^/.]+$/, "")}-extracted.pdf` : `${file.name.replace(/\.[^/.]+$/, "")}-split.zip`;
  const match = disposition.match(/filename="?([^"]+)"?/);
  if (match && match[1]) {
    filename = decodeURIComponent(match[1]);
  }

  return { blob: res.data, filename };
}

/**
 * Split a multi-page PDF into separate single-page PDF Files locally on client in memory.
 */
export async function splitPdfToSinglePageFiles(file: File): Promise<File[]> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = sourcePdf.getPageCount();

  if (totalPages <= 1) {
    return [file];
  }

  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const pageFiles: File[] = [];

  for (let i = 0; i < totalPages; i++) {
    const singleDoc = await PDFDocument.create();
    const [page] = await singleDoc.copyPages(sourcePdf, [i]);
    singleDoc.addPage(page);

    const pageBytes = await singleDoc.save();
    const pageFileName = `${baseName} (Page ${i + 1}).pdf`;
    const singleFile = new File([new Uint8Array(pageBytes)], pageFileName, {
      type: "application/pdf",
    });

    pageFiles.push(singleFile);
  }

  return pageFiles;
}

