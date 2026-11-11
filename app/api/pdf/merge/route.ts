import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 36; // 0.5 inch margins

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files");
    const outputFilename = (formData.get("filename") as string) || "merged-document.pdf";

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided." },
        { status: 400 }
      );
    }

    const mergedPdf = await PDFDocument.create();

    for (const item of files) {
      if (!(item instanceof File)) continue;

      const arrayBuffer = await item.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const isPdf =
        item.type === "application/pdf" || item.name.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        try {
          const loadedPdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
          const pageIndices = loadedPdf.getPageIndices();
          const copiedPages = await mergedPdf.copyPages(loadedPdf, pageIndices);
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } catch (err) {
          console.error(`Error loading PDF file: ${item.name}`, err);
        }
      } else {
        // Attempt to process as an image (PNG, JPG, WEBP, SVG, TIFF, AVIF, etc.)
        try {
          const image = sharp(buffer, { failOn: "none" }).rotate();
          const metadata = await image.metadata();

          if (metadata.width && metadata.height) {
            const pngBuffer = await image.png().toBuffer();
            const embedded = await mergedPdf.embedPng(pngBuffer);

            const maxW = A4_WIDTH - MARGIN * 2;
            const maxH = A4_HEIGHT - MARGIN * 2;
            const scale = Math.min(maxW / embedded.width, maxH / embedded.height, 1);
            const w = embedded.width * scale;
            const h = embedded.height * scale;
            const x = (A4_WIDTH - w) / 2;
            const y = (A4_HEIGHT - h) / 2;

            const page = mergedPdf.addPage([A4_WIDTH, A4_HEIGHT]);
            page.drawImage(embedded, { x, y, width: w, height: h });
          }
        } catch (imgErr) {
          console.error(`Error processing image ${item.name}:`, imgErr);
        }
      }
    }

    if (mergedPdf.getPageCount() === 0) {
      return NextResponse.json(
        { error: "Could not read any valid pages from the provided PDF or image files." },
        { status: 400 }
      );
    }

    const pdfBytes = await mergedPdf.save();
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
    const message = error instanceof Error ? error.message : "Error merging PDFs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

