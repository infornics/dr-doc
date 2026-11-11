import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files");
    const pageSize = (formData.get("pageSize") as string) || "a4"; // a4, fit, letter
    const orientation = (formData.get("orientation") as string) || "portrait"; // portrait, landscape
    const outputFilename = (formData.get("filename") as string) || "merged-images.pdf";

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No image files provided." }, { status: 400 });
    }

    const pdfDoc = await PDFDocument.create();

    // Standard page sizes in points
    const SIZES: Record<string, [number, number]> = {
      a4: [595.28, 841.89],
      letter: [612, 792],
    };

    for (const item of files) {
      if (!(item instanceof File)) continue;

      const arrayBuffer = await item.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Normalize with sharp to standard PNG
      const image = sharp(buffer, { failOn: "none" }).rotate();
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) continue;

      const pngBuffer = await image.png().toBuffer();
      const embedded = await pdfDoc.embedPng(pngBuffer);

      let pageWidth: number;
      let pageHeight: number;

      if (pageSize === "fit") {
        // Match exact image pixel dimensions
        pageWidth = embedded.width;
        pageHeight = embedded.height;
      } else {
        const base = SIZES[pageSize] || SIZES.a4;
        pageWidth = orientation === "landscape" ? base[1] : base[0];
        pageHeight = orientation === "landscape" ? base[0] : base[1];
      }

      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      if (pageSize === "fit") {
        page.drawImage(embedded, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        });
      } else {
        const margin = 24;
        const maxW = pageWidth - margin * 2;
        const maxH = pageHeight - margin * 2;
        const scale = Math.min(maxW / embedded.width, maxH / embedded.height, 1);
        const w = embedded.width * scale;
        const h = embedded.height * scale;
        const x = (pageWidth - w) / 2;
        const y = (pageHeight - h) / 2;

        page.drawImage(embedded, { x, y, width: w, height: h });
      }
    }

    if (pdfDoc.getPageCount() === 0) {
      return NextResponse.json({ error: "No valid images could be merged." }, { status: 400 });
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    const safeFilename = outputFilename.endsWith(".pdf") ? outputFilename : `${outputFilename}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(safeFilename)}"`,
        "Content-Length": pdfBuffer.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error merging images into PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

