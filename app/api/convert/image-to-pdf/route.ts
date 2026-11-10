import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file was provided in the request." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Normalize image using sharp to ensure consistent orientation, dimensions & format
    // Convert to PNG with sharp, handling SVG, WebP, HEIC, TIFF, PNG, JPG, AVIF
    const image = sharp(buffer, { failOn: "none" }).rotate(); // auto-rotate based on EXIF
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return NextResponse.json(
        { error: "Invalid or unsupported image file." },
        { status: 400 }
      );
    }

    // Convert to PNG buffer for pdf-lib embedding
    const pngBuffer = await image.png().toBuffer();

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    // Embed the PNG into PDF
    const embeddedImage = await pdfDoc.embedPng(pngBuffer);

    // Calculate dimensions: Maintain aspect ratio, max bounds around standard A4 (595.28 x 841.89) or natural size
    const imageWidth = embeddedImage.width;
    const imageHeight = embeddedImage.height;

    // A4 dimensions in points
    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;
    const MARGIN = 36; // 0.5 inch margins

    const maxContentWidth = A4_WIDTH - MARGIN * 2;
    const maxContentHeight = A4_HEIGHT - MARGIN * 2;

    const scale = Math.min(
      maxContentWidth / imageWidth,
      maxContentHeight / imageHeight,
      1 // Don't upscale smaller images beyond original size
    );

    const scaledWidth = imageWidth * scale;
    const scaledHeight = imageHeight * scale;

    // Center image on the page
    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    const x = (A4_WIDTH - scaledWidth) / 2;
    const y = (A4_HEIGHT - scaledHeight) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: scaledWidth,
      height: scaledHeight,
    });

    const pdfBytes = await pdfDoc.save();
    const outputBuffer = Buffer.from(pdfBytes);

    const outputFilename = `${file.name.replace(/\.[^/.]+$/, "")}.pdf`;

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(outputFilename)}"`,
        "Content-Length": outputBuffer.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error processing image to PDF conversion.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
