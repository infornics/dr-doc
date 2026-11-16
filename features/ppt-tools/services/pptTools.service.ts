import axios from "axios";
import JSZip from "jszip";

export interface MergePptParams {
  files: File[];
  filename?: string;
  onProgress?: (progress: number) => void;
}

export async function mergePptApi({
  files,
  filename = "merged-presentation.pptx",
  onProgress,
}: MergePptParams): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  formData.append("filename", filename);

  const res = await axios.post("/api/ppt/merge", formData, {
    responseType: "blob",
    onUploadProgress: (evt) => {
      if (evt.total && onProgress) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    },
  });

  const disposition = res.headers["content-disposition"] || "";
  let finalFilename = filename;
  const match = disposition.match(/filename="?([^"]+)"?/);
  if (match && match[1]) {
    finalFilename = decodeURIComponent(match[1]);
  }

  return { blob: res.data, filename: finalFilename };
}

/**
 * Expands a DOCX, DOC, PPTX, or PPT document into individual single-page File objects
 * so every page/slide has its own card, thumbnail, and reordering capability in the gallery.
 */
export async function expandOfficeDocumentPages(file: File): Promise<File[]> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await axios.post("/api/office/expand-pages", formData, {
    responseType: "arraybuffer",
  });

  const zip = await JSZip.loadAsync(res.data);
  const fileNames = Object.keys(zip.files)
    .filter((name) => name.toLowerCase().endsWith(".pdf"))
    .sort();

  if (fileNames.length === 0) {
    return [file];
  }

  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const pageFiles: File[] = [];

  for (let i = 0; i < fileNames.length; i++) {
    const entry = zip.files[fileNames[i]];
    const buffer = await entry.async("uint8array");
    const pageFile = new File(
      [buffer as unknown as BlobPart],
      `${baseName} (Page ${i + 1}).pdf`,
      { type: "application/pdf" }
    );
    pageFiles.push(pageFile);
  }

  return pageFiles;
}
