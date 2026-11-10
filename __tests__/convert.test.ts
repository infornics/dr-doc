import { POST } from "@/app/api/convert/route";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";

// Helper to create a NextRequest with FormData
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

describe("Document & Media Conversion API (/api/convert)", () => {
  // Test 1: Validation
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

  // Test 2: Image to PDF conversion
  it("should convert PNG to PDF", async () => {
    const pngBuffer = await sharp({
      create: {
        width: 150,
        height: 150,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const req = createMockRequest(pngBuffer, "avatar.png", "pdf");
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain('filename="avatar.pdf"');

    const arrayBuf = await res.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuf);
    expect(pdf.getPageCount()).toBe(1);
  }, 15000);

  // Test 3: Image to Image conversion (PNG -> WEBP, JPG -> PNG)
  it("should convert PNG to WEBP", async () => {
    const pngBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const req = createMockRequest(pngBuffer, "picture.png", "webp");
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/webp");
    expect(res.headers.get("Content-Disposition")).toContain('filename="picture.webp"');

    const arrayBuf = await res.arrayBuffer();
    const meta = await sharp(Buffer.from(arrayBuf)).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(100);
    expect(meta.height).toBe(100);
  }, 15000);

  it("should convert JPEG to PNG", async () => {
    const jpegBuffer = await sharp({
      create: {
        width: 80,
        height: 80,
        channels: 3,
        background: { r: 0, g: 0, b: 255 },
      },
    })
      .jpeg()
      .toBuffer();

    const req = createMockRequest(jpegBuffer, "photo.jpg", "png");
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Content-Disposition")).toContain('filename="photo.png"');

    const arrayBuf = await res.arrayBuffer();
    const meta = await sharp(Buffer.from(arrayBuf)).metadata();
    expect(meta.format).toBe("png");
  }, 15000);

  // Test 4: PDF to Image conversion
  it("should convert PDF to PNG image", async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([400, 400]);
    const pdfBytes = await pdfDoc.save();

    const req = createMockRequest(Buffer.from(pdfBytes), "sample.pdf", "png");
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Content-Disposition")).toContain('filename="sample.png"');
  }, 15000);

  // Test 5: PDF to Text (TXT)
  it("should convert PDF to TXT", async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([400, 400]);
    const pdfBytes = await pdfDoc.save();

    const req = createMockRequest(Buffer.from(pdfBytes), "sample.pdf", "txt");
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/plain");
    expect(res.headers.get("Content-Disposition")).toContain('filename="sample.txt"');
  }, 15000);

  // Test 6: PDF to DOCX
  it("should convert PDF to DOCX", async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([400, 400]);
    const pdfBytes = await pdfDoc.save();

    const req = createMockRequest(Buffer.from(pdfBytes), "sample.pdf", "docx");
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(res.headers.get("Content-Disposition")).toContain('filename="sample.docx"');

    const arrayBuf = await res.arrayBuffer();
    expect(arrayBuf.byteLength).toBeGreaterThan(1000);
  }, 15000);

  // Test 7: TXT to PDF via LibreOffice
  it("should convert TXT to PDF via LibreOffice", async () => {
    const textBuffer = Buffer.from("Hello Dr. Doc! Testing headless conversion.\nPage 2 content.");

    const req = createMockRequest(textBuffer, "notes.txt", "pdf");
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain('filename="notes.pdf"');

    const arrayBuf = await res.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuf);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
  }, 20000);
});

