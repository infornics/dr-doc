import { NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { POST as mergePdfHandler } from "@/app/api/pdf/merge/route";
import { POST as splitPdfHandler } from "@/app/api/pdf/split/route";
import { POST as removePagesHandler } from "@/app/api/pdf/remove-pages/route";
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
    it("should split a multi-page PDF into a zip containing individual single-page PDFs", async () => {
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
      formData.append("mode", "all");

      const req = new NextRequest("http://localhost:3000/api/pdf/split", {
        method: "POST",
        body: formData,
      });

      const res = await splitPdfHandler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/zip");

      const arrayBuf = await res.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuf);
      const zipFiles = Object.keys(zip.files);
      expect(zipFiles.length).toBe(3);
      expect(zipFiles.some((f) => f.includes("page-1.pdf"))).toBe(true);
    });

    it("should split by custom page ranges into separate PDFs inside a zip", async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage([400, 400]); // Page 1
      pdf.addPage([400, 400]); // Page 2
      pdf.addPage([400, 400]); // Page 3
      pdf.addPage([400, 400]); // Page 4
      const pdfBytes = await pdf.save();

      const formData = new FormData();
      formData.append(
        "file",
        new File([Buffer.from(pdfBytes)], "four-pages.pdf", { type: "application/pdf" })
      );
      formData.append("mode", "range");
      formData.append("range", "1-2, 3-4");

      const req = new NextRequest("http://localhost:3000/api/pdf/split", {
        method: "POST",
        body: formData,
      });

      const res = await splitPdfHandler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/zip");

      const arrayBuf = await res.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuf);
      const zipFiles = Object.keys(zip.files);
      expect(zipFiles.length).toBe(2);
      expect(zipFiles.some((f) => f.includes("-range-1-2.pdf"))).toBe(true);
      expect(zipFiles.some((f) => f.includes("-range-3-4.pdf"))).toBe(true);
    });

    it("should split into equal chunks of N pages into separate PDFs inside a zip", async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage([400, 400]); // Page 1
      pdf.addPage([400, 400]); // Page 2
      pdf.addPage([400, 400]); // Page 3
      pdf.addPage([400, 400]); // Page 4
      pdf.addPage([400, 400]); // Page 5
      const pdfBytes = await pdf.save();

      const formData = new FormData();
      formData.append(
        "file",
        new File([Buffer.from(pdfBytes)], "five-pages.pdf", { type: "application/pdf" })
      );
      formData.append("mode", "chunks");
      formData.append("chunkSize", "2");

      const req = new NextRequest("http://localhost:3000/api/pdf/split", {
        method: "POST",
        body: formData,
      });

      const res = await splitPdfHandler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/zip");

      const arrayBuf = await res.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuf);
      const zipFiles = Object.keys(zip.files);
      // 5 pages with chunk size 2 = 3 files: (1-2, 3-4, 5)
      expect(zipFiles.length).toBe(3);
      expect(zipFiles.some((f) => f.includes("chunk-1-pages-1-to-2.pdf"))).toBe(true);
      expect(zipFiles.some((f) => f.includes("chunk-2-pages-3-to-4.pdf"))).toBe(true);
      expect(zipFiles.some((f) => f.includes("chunk-3-pages-5-to-5.pdf"))).toBe(true);
    });
  });

  describe("PDF Remove Pages API (/api/pdf/remove-pages)", () => {
    it("should remove specified pages and return a continuous PDF", async () => {
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
      formData.append("pages", "2");

      const req = new NextRequest("http://localhost:3000/api/pdf/remove-pages", {
        method: "POST",
        body: formData,
      });

      const res = await removePagesHandler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/pdf");

      const arrayBuf = await res.arrayBuffer();
      const loaded = await PDFDocument.load(arrayBuf);
      expect(loaded.getPageCount()).toBe(2);
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
