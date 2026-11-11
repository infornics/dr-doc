import axios from "axios";

export interface CropImageParams {
  file: File;
  left: number;
  top: number;
  width: number;
  height: number;
  format?: string;
}

export async function cropImageApi({
  file,
  left,
  top,
  width,
  height,
  format = "png",
}: CropImageParams): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("left", left.toString());
  formData.append("top", top.toString());
  formData.append("width", width.toString());
  formData.append("height", height.toString());
  formData.append("format", format);

  const res = await axios.post("/api/image/crop", formData, {
    responseType: "blob",
  });

  const disposition = res.headers["content-disposition"] || "";
  let filename = `${file.name.replace(/\.[^/.]+$/, "")}-cropped.${format}`;
  const match = disposition.match(/filename="?([^"]+)"?/);
  if (match && match[1]) {
    filename = decodeURIComponent(match[1]);
  }

  return { blob: res.data, filename };
}

export interface MergeImagesParams {
  files: File[];
  pageSize?: "a4" | "fit" | "letter";
  orientation?: "portrait" | "landscape";
  filename?: string;
  onProgress?: (progress: number) => void;
}

export async function mergeImagesToPdfApi({
  files,
  pageSize = "a4",
  orientation = "portrait",
  filename = "merged-images.pdf",
  onProgress,
}: MergeImagesParams): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  formData.append("pageSize", pageSize);
  formData.append("orientation", orientation);
  formData.append("filename", filename);

  const res = await axios.post("/api/image/merge-to-pdf", formData, {
    responseType: "blob",
    onUploadProgress: (evt) => {
      if (evt.total && onProgress) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    },
  });

  return { blob: res.data, filename };
}

