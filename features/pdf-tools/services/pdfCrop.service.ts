import axios from "axios";

export interface CropPdfParams {
  file: File;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  originalWidth: number;
  originalHeight: number;
  pageIndex?: number;
}

export async function cropPdfApi(params: CropPdfParams): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("cropX", params.cropX.toString());
  formData.append("cropY", params.cropY.toString());
  formData.append("cropWidth", params.cropWidth.toString());
  formData.append("cropHeight", params.cropHeight.toString());
  formData.append("originalWidth", params.originalWidth.toString());
  formData.append("originalHeight", params.originalHeight.toString());
  formData.append("pageIndex", (params.pageIndex || 0).toString());

  const res = await axios.post("/api/pdf/crop", formData, {
    responseType: "blob",
  });

  const disposition = res.headers["content-disposition"] || "";
  let filename = "cropped-document.pdf";
  const match = disposition.match(/filename="?([^"]+)"?/);
  if (match && match[1]) {
    filename = decodeURIComponent(match[1]);
  }

  return { blob: res.data, filename };
}

