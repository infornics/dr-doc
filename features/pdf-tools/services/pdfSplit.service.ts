import axios from "axios";
import { PDFDocument } from "pdf-lib";

export interface SplitPdfParams {
  file: File;
  mode?: "all" | "range" | "chunks";
  range?: string;
  chunkSize?: number;
}

export async function splitPdfApi({
  file,
  mode = "all",
  range = "",
  chunkSize = 2,
}: SplitPdfParams): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", mode);
  if (range) formData.append("range", range);
  formData.append("chunkSize", chunkSize.toString());

  const res = await axios.post("/api/pdf/split", formData, {
    responseType: "blob",
  });

  const disposition = res.headers["content-disposition"] || "";
  let filename = `${file.name.replace(/\.[^/.]+$/, "")}-split-pages.zip`;
  const match = disposition.match(/filename="?([^"]+)"?/);
  if (match && match[1]) {
    filename = decodeURIComponent(match[1]);
  }

  return { blob: res.data, filename };
}

/**
 * Splits a multi-page PDF into separate single-page File objects in memory
 */
export async function splitPdfToSinglePageFiles(file: File): Promise<File[]> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = sourcePdf.getPageCount();

  if (totalPages <= 1) {
    return [file];
  }

  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const singlePageFiles: File[] = [];

  for (let i = 0; i < totalPages; i++) {
    const singleDoc = await PDFDocument.create();
    const [copiedPage] = await singleDoc.copyPages(sourcePdf, [i]);
    singleDoc.addPage(copiedPage);

    const pdfBytes = await singleDoc.save();
    const pageFile = new File(
      [new Uint8Array(pdfBytes) as unknown as BlobPart],
      `${baseName} (Page ${i + 1}).pdf`,
      { type: "application/pdf" }
    );
    singlePageFiles.push(pageFile);
  }

  return singlePageFiles;
}
