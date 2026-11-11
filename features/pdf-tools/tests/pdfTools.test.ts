import { NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";
import { POST as mergePdfHandler } from "@/app/api/pdf/merge/route";
import { POST as splitPdfHandler } from "@/app/api/pdf/split/route";
import { POST as cropPdfHandler } from "@/app/api/pdf/crop/route";

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
      expect(data.error).toContain("No files provided");
    });

    it("should merge a PDF and an image into one combined PDF document", async () => {
      const pdf1 = await PDFDocument.create();
      pdf1.addPage([400, 400]);
      const pdf1Bytes = await pdf1.save();

      const imageBytes = await (await import("sharp"))
        .default({
          create: { width: 120, height: 120, channels: 4, background: { r: 50, g: 150, b: 250, alpha: 1 } },
        })
        .png()
        .toBuffer();

      const formData = new FormData();
      formData.append(
        "files",
        new File([Buffer.from(pdf1Bytes)], "statement.pdf", { type: "application/pdf" })
      );
      formData.append(
        "files",
        new File([Buffer.from(imageBytes)], "receipt.png", { type: "image/png" })
      );
      formData.append("filename", "combined-records.pdf");

      const req = new NextRequest("http://localhost:3000/api/pdf/merge", {
        method: "POST",
        body: formData,
      });

      const res = await mergePdfHandler(req);
      expect(res.status).toBe(200);

      const arrayBuf = await res.arrayBuffer();
      const loaded = await PDFDocument.load(arrayBuf);
      expect(loaded.getPageCount()).toBe(2);
    });
  });

  describe("PDF Split API (/api/pdf/split)", () => {
    it("should split a multi-page PDF by range", async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage([400, 400]); // Page 1
      pdf.addPage([400, 400]); // Page 2
      pdf.addPage([400, 400]); // Page 3
      const pdfBytes = await pdf.save();

      const formData = new FormData();
      formData.append(
        "file",
        new File([Buffer.from(pdfBytes)], "three-pages.pdf", { type: "application/pdf" })
      );
      formData.append("mode", "range");
      formData.append("range", "1, 3");

      const req = new NextRequest("http://localhost:3000/api/pdf/split", {
        method: "POST",
        body: formData,
      });

      const res = await splitPdfHandler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/pdf");

      const arrayBuf = await res.arrayBuffer();
      const loaded = await PDFDocument.load(arrayBuf);
      expect(loaded.getPageCount()).toBe(2);
    });

    it("should split a multi-page PDF into zip in 'all' mode", async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage([400, 400]);
      pdf.addPage([400, 400]);
      const pdfBytes = await pdf.save();

      const formData = new FormData();
      formData.append(
        "file",
        new File([Buffer.from(pdfBytes)], "two-pages.pdf", { type: "application/pdf" })
      );
      formData.append("mode", "all");

      const req = new NextRequest("http://localhost:3000/api/pdf/split", {
        method: "POST",
        body: formData,
      });

      const res = await splitPdfHandler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/zip");
    });
  });

  describe("PDF Crop API (/api/pdf/crop)", () => {
    it("should crop a PDF page according to given coordinate bounds", async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage([500, 800]);
      const pdfBytes = await pdf.save();

      const formData = new FormData();
      formData.append(
        "file",
        new File([Buffer.from(pdfBytes)], "document.pdf", { type: "application/pdf" })
      );
      formData.append("cropX", "50");
      formData.append("cropY", "100");
      formData.append("cropWidth", "300");
      formData.append("cropHeight", "400");
      formData.append("originalWidth", "500");
      formData.append("originalHeight", "800");
      formData.append("pageIndex", "0");

      const req = new NextRequest("http://localhost:3000/api/pdf/crop", {
        method: "POST",
        body: formData,
      });

      const res = await cropPdfHandler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/pdf");

      const arrayBuf = await res.arrayBuffer();
      const loaded = await PDFDocument.load(arrayBuf);
      const page = loaded.getPage(0);
      expect(page.getWidth()).toBe(300);
      expect(page.getHeight()).toBe(400);
    });
  });
});
