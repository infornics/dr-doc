import { NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";
import { POST as mergePdfHandler } from "@/app/api/pdf/merge/route";

describe("PDF Tools API Endpoints", () => {
  describe("PDF Merge API (/api/pdf/merge)", () => {
    it("should return 400 when no files are provided", async () => {
      const formData = new FormData();
      const req = new NextRequest("http://localhost:3000/api/pdf/merge", {
        method: "POST",
        body: formData,
      });

      const res = await mergePdfHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("No PDF files");
    });

    it("should merge two PDFs into one valid document", async () => {
      const pdf1 = await PDFDocument.create();
      pdf1.addPage([400, 400]);
      const pdf1Bytes = await pdf1.save();

      const pdf2 = await PDFDocument.create();
      pdf2.addPage([500, 500]);
      const pdf2Bytes = await pdf2.save();

      const formData = new FormData();
      formData.append(
        "files",
        new File([Buffer.from(pdf1Bytes)], "doc1.pdf", { type: "application/pdf" })
      );
      formData.append(
        "files",
        new File([Buffer.from(pdf2Bytes)], "doc2.pdf", { type: "application/pdf" })
      );
      formData.append("filename", "my-merged.pdf");

      const req = new NextRequest("http://localhost:3000/api/pdf/merge", {
        method: "POST",
        body: formData,
      });

      const res = await mergePdfHandler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      expect(res.headers.get("Content-Disposition")).toContain("my-merged.pdf");

      const arrayBuf = await res.arrayBuffer();
      const loaded = await PDFDocument.load(arrayBuf);
      expect(loaded.getPageCount()).toBe(2);
    });
  });
});
