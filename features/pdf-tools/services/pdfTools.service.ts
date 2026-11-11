import axios from "axios";

export interface MergePdfParams {
  files: File[];
  filename?: string;
  onProgress?: (progress: number) => void;
}

export async function mergePdfsApi({
  files,
  filename = "merged-document.pdf",
  onProgress,
}: MergePdfParams): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  formData.append("filename", filename);

  const res = await axios.post("/api/pdf/merge", formData, {
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

