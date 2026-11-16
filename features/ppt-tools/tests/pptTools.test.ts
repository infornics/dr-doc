/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST as mergePptHandler } from "@/app/api/ppt/merge/route";
import { POST as convertHandler } from "@/app/api/convert/route";
import { POST as previewHandler } from "@/app/api/preview/route";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import JSZip from "jszip";

describe("PowerPoint (PPT) Tools Endpoints", () => {
  describe("Convert to PPTX API (/api/convert with targetFormat=pptx)", () => {
    it("converts an image (PNG) into a valid PPTX presentation", async () => {
      // 100x100 PNG image
      const imgBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 50, g: 150, b: 250, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const formData = new FormData();
      formData.append(
        "file",
        new File([imgBuffer], "slide-image.png", { type: "image/png" })
      );
      formData.append("targetFormat", "pptx");

      const req = new NextRequest("http://localhost:3000/api/convert", {
        method: "POST",
        body: formData,
      });

      const res = await convertHandler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain(
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      );

      const arrayBuf = await res.arrayBuffer();
      // Validate PPTX ZIP archive structure
      const zip = await JSZip.loadAsync(arrayBuf);
      const fileNames = Object.keys(zip.files);
      expect(fileNames.some((f) => f.includes("ppt/presentation.xml"))).toBe(true);
      expect(fileNames.some((f) => f.includes("ppt/slides/slide1.xml"))).toBe(true);
    });

    it("converts a PDF into a valid PPTX presentation with slide per page", async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage([600, 400]);
      pdf.addPage([600, 400]);
      const pdfBytes = await pdf.save();

      const formData = new FormData();
      formData.append(
        "file",
        new File([Buffer.from(pdfBytes)], "doc.pdf", { type: "application/pdf" })
      );
      formData.append("targetFormat", "pptx");

      const req = new NextRequest("http://localhost:3000/api/convert", {
        method: "POST",
        body: formData,
      });

      const res = await convertHandler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain(
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      );

      const arrayBuf = await res.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuf);
      const fileNames = Object.keys(zip.files);
      expect(fileNames.some((f) => f.includes("ppt/slides/slide1.xml"))).toBe(true);
      expect(fileNames.some((f) => f.includes("ppt/slides/slide2.xml"))).toBe(true);
    });
  });

  describe("Merge to PPT API (/api/ppt/merge)", () => {
    it("should return 400 when no files are provided", async () => {
      const formData = new FormData();
      const req = new NextRequest("http://localhost:3000/api/ppt/merge", {
        method: "POST",
        body: formData,
      });

      const res = await mergePptHandler(req);
      expect(res.status).toBe(400);
    });

    it("combines multiple images and PDF pages into a single PPTX slide deck", async () => {
      // 1. Create an image
      const imgBuffer = await sharp({
        create: {
          width: 80,
          height: 80,
          channels: 4,
          background: { r: 255, g: 100, b: 50, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      // 2. Create a single-page PDF
      const pdf = await PDFDocument.create();
      pdf.addPage([500, 500]);
      const pdfBytes = await pdf.save();

      const formData = new FormData();
      formData.append(
        "files",
        new File([imgBuffer], "photo.png", { type: "image/png" })
      );
      formData.append(
        "files",
        new File([Buffer.from(pdfBytes)], "report.pdf", { type: "application/pdf" })
      );
      formData.append("filename", "my-presentation.pptx");

      const req = new NextRequest("http://localhost:3000/api/ppt/merge", {
        method: "POST",
        body: formData,
      });

      const res = await mergePptHandler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain(
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      );

      const arrayBuf = await res.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuf);
      const fileNames = Object.keys(zip.files);
      // Photo is 1 slide, PDF is 1 slide = 2 slides total
      expect(fileNames.some((f) => f.includes("ppt/slides/slide1.xml"))).toBe(true);
      expect(fileNames.some((f) => f.includes("ppt/slides/slide2.xml"))).toBe(true);
    });
  });

  describe("DOCX & PPTX Previews (/api/preview)", () => {
    it("renders a crystal-clear preview for DOCX files without LibreOffice profile conflicts", async () => {
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [new TextRun("Project Document Title")],
              }),
            ],
          },
        ],
      });
      const docxBytes = await Packer.toBuffer(doc);

      const formData = new FormData();
      formData.append(
        "file",
        new File([new Uint8Array(docxBytes)], "Project 1.docx", {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        })
      );

      const req = new NextRequest("http://localhost:3000/api/preview", {
        method: "POST",
        body: formData,
      });

      const res = await previewHandler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("image/webp");

      const arrayBuf = await res.arrayBuffer();
      const meta = await sharp(Buffer.from(arrayBuf)).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBeGreaterThan(0);
      expect(meta.height).toBeGreaterThan(0);
    });
  });
});

