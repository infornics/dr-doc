import axios from "axios";

export interface RemovePdfPagesParams {
  file: File;
  pages: string; // e.g. "2, 4-6"
}

export async function removePdfPagesApi(params: RemovePdfPagesParams): Promise<{ blob: Blob; filename: string }> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("pages", params.pages);

  const res = await axios.post("/api/pdf/remove-pages", formData, {
    responseType: "blob",
  });

  const disposition = res.headers["content-disposition"] || "";
  let filename = "document-pages-removed.pdf";
  const match = disposition.match(/filename="?([^"]+)"?/);
  if (match && match[1]) {
    filename = decodeURIComponent(match[1]);
  }

  return { blob: res.data, filename };
}

