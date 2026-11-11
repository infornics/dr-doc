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
});
