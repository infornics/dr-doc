import { NextRequest } from "next/server";
import sharp from "sharp";
import { POST as cropHandler } from "@/app/api/image/crop/route";
import { POST as mergeHandler } from "@/app/api/image/merge-to-pdf/route";

describe("Image Tools API Endpoints", () => {
  describe("Image Crop API (/api/image/crop)", () => {
    it("should return 400 when no file is provided", async () => {
      const formData = new FormData();
      const req = new NextRequest("http://localhost:3000/api/image/crop", {
        method: "POST",
        body: formData,
      });

      const res = await cropHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("No image file");
    });

    it("should crop an image with provided dimensions", async () => {
      const samplePng = await sharp({
        create: { width: 200, height: 200, channels: 4, background: { r: 100, g: 200, b: 50, alpha: 1 } },
      })
        .png()
        .toBuffer();

      const formData = new FormData();
      formData.append("file", new File([samplePng], "test-box.png", { type: "image/png" }));
      formData.append("left", "20");
      formData.append("top", "20");
      formData.append("width", "80");
      formData.append("height", "80");
      formData.append("format", "png");

      const req = new NextRequest("http://localhost:3000/api/image/crop", {
        method: "POST",
        body: formData,
      });

      const res = await cropHandler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/png");

      const arrayBuf = await res.arrayBuffer();
      const meta = await sharp(Buffer.from(arrayBuf)).metadata();
      expect(meta.width).toBe(80);
      expect(meta.height).toBe(80);
    });
  });

  describe("Image Merge to PDF API (/api/image/merge-to-pdf)", () => {
    it("should return 400 when no files are provided", async () => {
      const formData = new FormData();
      const req = new NextRequest("http://localhost:3000/api/image/merge-to-pdf", {
        method: "POST",
        body: formData,
      });

      const res = await mergeHandler(req);
      expect(res.status).toBe(400);
    });

    it("should merge multiple images into a multi-page PDF", async () => {
      const img1 = await sharp({
        create: { width: 100, height: 100, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } },
      }).png().toBuffer();

      const img2 = await sharp({
        create: { width: 150, height: 150, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } },
      }).png().toBuffer();

      const formData = new FormData();
      formData.append("files", new File([img1], "page1.png", { type: "image/png" }));
      formData.append("files", new File([img2], "page2.png", { type: "image/png" }));
      formData.append("pageSize", "a4");

      const req = new NextRequest("http://localhost:3000/api/image/merge-to-pdf", {
        method: "POST",
        body: formData,
      });

      const res = await mergeHandler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");

      const arrayBuf = await res.arrayBuffer();
      expect(arrayBuf.byteLength).toBeGreaterThan(1000);
    });
  });
});

