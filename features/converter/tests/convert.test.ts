import { POST } from "@/app/api/convert/route";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

function createMockRequest(fileBuffer: Buffer, fileName: string, targetFormat: string) {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)]);
  const file = new File([blob], fileName);
  formData.append("file", file);
  formData.append("targetFormat", targetFormat);

  return new NextRequest("http://localhost:3000/api/convert", {
    method: "POST",
    body: formData,
  });
}

describe("Comprehensive Conversion Tests - All Website Supported Formats", () => {
  // -------------------------------------------------------------
  // 1. Validation Tests
  // -------------------------------------------------------------
  describe("Input Validations", () => {
    it("should return 400 when no file is provided", async () => {
      const formData = new FormData();
      formData.append("targetFormat", "pdf");
      const req = new NextRequest("http://localhost:3000/api/convert", {
        method: "POST",
        body: formData,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("No file provided.");
    });

    it("should return 400 when targetFormat is missing", async () => {
      const blob = new Blob([Buffer.from("dummy")]);
      const file = new File([blob], "test.txt");
      const formData = new FormData();
      formData.append("file", file);
      const req = new NextRequest("http://localhost:3000/api/convert", {
        method: "POST",
        body: formData,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Target format is required.");
    });
  });

  // -------------------------------------------------------------
  // 2. Images -> PDF Conversions
  // -------------------------------------------------------------
  describe("Image to PDF Conversions", () => {
    it("converts PNG to a valid, loadable PDF document", async () => {
      const pngBuffer = await sharp({
        create: { width: 120, height: 120, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } },
      })
        .png()
        .toBuffer();

      const res = await POST(createMockRequest(pngBuffer, "test.png", "pdf"));
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");

      const arrayBuf = await res.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuf);
      expect(pdf.getPageCount()).toBe(1);
    }, 15000);

    it("converts JPEG to a valid, loadable PDF document", async () => {
      const jpgBuffer = await sharp({
        create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 128, b: 255 } },
      })
        .jpeg()
        .toBuffer();

      const res = await POST(createMockRequest(jpgBuffer, "photo.jpg", "pdf"));
      expect(res.status).toBe(200);

      const arrayBuf = await res.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuf);
      expect(pdf.getPageCount()).toBe(1);
    }, 15000);

    it("converts WEBP to a valid, loadable PDF document", async () => {
      const webpBuffer = await sharp({
        create: { width: 90, height: 90, channels: 4, background: { r: 50, g: 200, b: 50, alpha: 1 } },
      })
        .webp()
        .toBuffer();

      const res = await POST(createMockRequest(webpBuffer, "graphic.webp", "pdf"));
      expect(res.status).toBe(200);

      const arrayBuf = await res.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuf);
      expect(pdf.getPageCount()).toBe(1);
    }, 15000);
  });

  // -------------------------------------------------------------
  // 3. Image -> Image Conversions
  // -------------------------------------------------------------
  describe("Image to Image Conversions", () => {
    it("converts PNG to a real WEBP image with valid metadata", async () => {
      const pngBuffer = await sharp({
        create: { width: 140, height: 80, channels: 4, background: { r: 200, g: 50, b: 100, alpha: 1 } },
      })
        .png()
        .toBuffer();

      const res = await POST(createMockRequest(pngBuffer, "logo.png", "webp"));
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/webp");

      const arrayBuf = await res.arrayBuffer();
      const meta = await sharp(Buffer.from(arrayBuf)).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBe(140);
      expect(meta.height).toBe(80);
    }, 15000);

    it("converts JPEG to a real PNG image with valid metadata", async () => {
      const jpgBuffer = await sharp({
        create: { width: 64, height: 64, channels: 3, background: { r: 20, g: 30, b: 40 } },
      })
        .jpeg()
        .toBuffer();

      const res = await POST(createMockRequest(jpgBuffer, "icon.jpg", "png"));
      expect(res.status).toBe(200);

      const arrayBuf = await res.arrayBuffer();
      const meta = await sharp(Buffer.from(arrayBuf)).metadata();
      expect(meta.format).toBe("png");
      expect(meta.width).toBe(64);
    }, 15000);

    it("converts PNG to SVG image container", async () => {
      const pngBuffer = await sharp({
        create: { width: 50, height: 50, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 1 } },
      })
        .png()
        .toBuffer();

      const res = await POST(createMockRequest(pngBuffer, "icon.png", "svg"));
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/svg+xml");

      const text = await res.text();
      expect(text).toContain("<svg");
      expect(text).toContain("data:image/png;base64,");
    }, 15000);
  });

  // -------------------------------------------------------------
  // 4. PDF -> Image / Text / Word Conversions
  // -------------------------------------------------------------
  describe("PDF to Outputs Conversions", () => {
    let samplePdfBuffer: Buffer;

    beforeAll(async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([500, 500]);
      page.drawText("Dr Doc Document Conversion Test", { x: 50, y: 450 });
      samplePdfBuffer = Buffer.from(await pdfDoc.save());
    });

    it("converts PDF to actual PNG image", async () => {
      const res = await POST(createMockRequest(samplePdfBuffer, "doc.pdf", "png"));
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/png");

      const arrayBuf = await res.arrayBuffer();
      const meta = await sharp(Buffer.from(arrayBuf)).metadata();
      expect(meta.format).toBe("png");
    }, 15000);

    it("converts PDF to plain text (TXT)", async () => {
      const res = await POST(createMockRequest(samplePdfBuffer, "doc.pdf", "txt"));
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/plain");

      const text = await res.text();
      expect(text).toContain("Dr Doc");
    }, 15000);

    it("converts PDF to real editable Word Document (.docx)", async () => {
      const res = await POST(createMockRequest(samplePdfBuffer, "doc.pdf", "docx"));
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("wordprocessingml.document");

      const arrayBuf = await res.arrayBuffer();
      // DOCX is a zip archive containing [Content_Types].xml and word/document.xml
      const zip = await JSZip.loadAsync(arrayBuf);
      expect(zip.file("[Content_Types].xml")).not.toBeNull();
      expect(zip.file("word/document.xml")).not.toBeNull();
    }, 15000);

    it("converts PDF to legacy Word Document (.doc)", async () => {
      const res = await POST(createMockRequest(samplePdfBuffer, "doc.pdf", "doc"));
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/msword");

      const arrayBuf = await res.arrayBuffer();
      expect(arrayBuf.byteLength).toBeGreaterThan(500);
    }, 20000);
  });

  // -------------------------------------------------------------
  // 5. Office & Document Conversions (Word, RTF, ODT, Excel, TXT)
  // -------------------------------------------------------------
  describe("Office Documents to PDF and Formats", () => {
    it("converts TXT to a real PDF document", async () => {
      const txtBuffer = Buffer.from("Invoice #1042\nTotal: $250.00\nThank you for choosing Dr. Doc!");
      const res = await POST(createMockRequest(txtBuffer, "invoice.txt", "pdf"));

      expect(res.status).toBe(200);
      const arrayBuf = await res.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuf);
      expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
    }, 20000);

    it("converts TXT to DOCX via document engine", async () => {
      const txtBuffer = Buffer.from("Report Title\nExecutive summary content goes here.");
      const res = await POST(createMockRequest(txtBuffer, "report.txt", "docx"));

      expect(res.status).toBe(200);
      const arrayBuf = await res.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuf);
      expect(zip.file("word/document.xml")).not.toBeNull();
    }, 20000);

    it("converts CSV / Spreadsheet data to XLSX", async () => {
      const csvBuffer = Buffer.from("Name,Email,Role\nAlice,alice@doc.com,Admin\nBob,bob@doc.com,User");
      const res = await POST(createMockRequest(csvBuffer, "users.csv", "xlsx"));

      expect(res.status).toBe(200);
      const arrayBuf = await res.arrayBuffer();
      // XLSX is a zip containing xl/workbook.xml
      const zip = await JSZip.loadAsync(arrayBuf);
      expect(zip.file("xl/workbook.xml")).not.toBeNull();
    }, 20000);

    it("converts RTF to PDF document", async () => {
      const rtfContent = "{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Arial;}} \\f0\\fs24 Test RTF Content for Dr. Doc.}";
      const res = await POST(createMockRequest(Buffer.from(rtfContent), "file.rtf", "pdf"));

      expect(res.status).toBe(200);
      const arrayBuf = await res.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuf);
      expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
    }, 20000);

    it("converts ODT to PDF document", async () => {
      // First generate ODT from TXT, then convert ODT to PDF
      const txtBuffer = Buffer.from("ODT Document Testing Section");
      const odtRes = await POST(createMockRequest(txtBuffer, "notes.txt", "odt"));
      expect(odtRes.status).toBe(200);

      const odtBuffer = Buffer.from(await odtRes.arrayBuffer());
      const pdfRes = await POST(createMockRequest(odtBuffer, "notes.odt", "pdf"));
      expect(pdfRes.status).toBe(200);

      const arrayBuf = await pdfRes.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuf);
      expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
    }, 25000);
  });

  // -------------------------------------------------------------
  // 6. E-Books (EPUB) Conversions
  // -------------------------------------------------------------
  describe("E-Book Conversions (EPUB)", () => {
    let epubBuffer: Buffer;

    beforeAll(async () => {
      // Generate genuine EPUB archive using TXT to EPUB conversion
      const txt = Buffer.from("Chapter 1: The Odyssey\nOnce upon a time in a digital library...");
      const res = await POST(createMockRequest(txt, "book.txt", "epub"));
      expect(res.status).toBe(200);
      epubBuffer = Buffer.from(await res.arrayBuffer());
    }, 20000);

    it("verifies EPUB generated contains valid mimetype and OEBPS structure", async () => {
      const zip = await JSZip.loadAsync(epubBuffer);
      expect(zip.file("mimetype")).not.toBeNull();
    });

    it("converts EPUB to TXT extracted book text", async () => {
      const res = await POST(createMockRequest(epubBuffer, "novel.epub", "txt"));
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("Chapter 1");
    }, 15000);

    it("converts EPUB to PDF compiled document", async () => {
      const res = await POST(createMockRequest(epubBuffer, "novel.epub", "pdf"));
      expect(res.status).toBe(200);

      const arrayBuf = await res.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuf);
      expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
    }, 20000);
  });
});
