import { apiClient } from "@/lib/api-client";

export interface ConvertImageToPdfResponse {
  blob: Blob;
  filename: string;
}

export async function convertImageToPdfApi(
  file: File,
  onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void
): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post("/api/convert/image-to-pdf", formData, {
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
  let filename = `${file.name.replace(/\.[^/.]+$/, "")}.pdf`;
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1];
    }
  }

  return {
    blob: response.data,
    filename,
  };
}

