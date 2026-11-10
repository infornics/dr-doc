import { apiClient } from "@/lib/api-client";

export interface ConvertFileResponse {
  blob: Blob;
  filename: string;
}

export async function convertFileApi(
  file: File,
  targetFormat: string,
  onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void
): Promise<ConvertFileResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("targetFormat", targetFormat);

  const response = await apiClient.post("/api/convert", formData, {
    responseType: "blob",
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress && progressEvent.total) {
        onUploadProgress({
          loaded: progressEvent.loaded,
          total: progressEvent.total,
        });
      }
    },
  });

  const contentDisposition = response.headers["content-disposition"];
  let filename = `${file.name.replace(/\.[^/.]+$/, "")}.${targetFormat}`;
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/);
    if (filenameMatch && filenameMatch[1]) {
      try {
        filename = decodeURIComponent(filenameMatch[1]);
      } catch {
        filename = filenameMatch[1];
      }
    }
  }

  return {
    blob: response.data,
    filename,
  };
}

// Retain backward compatibility helper if needed
export const convertImageToPdfApi = (
  file: File,
  onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void
) => convertFileApi(file, "pdf", onUploadProgress);
