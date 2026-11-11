import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const cropX = Number(formData.get("cropX"));
    const cropY = Number(formData.get("cropY"));
    const cropWidth = Number(formData.get("cropWidth"));
    const cropHeight = Number(formData.get("cropHeight"));
    const originalWidth = Number(formData.get("originalWidth"));
    const originalHeight = Number(formData.get("originalHeight"));
    const pageIndex = Number(formData.get("pageIndex") || 0);

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!cropWidth || !cropHeight || !originalWidth || !originalHeight) {
      return NextResponse.json({ error: "Invalid crop dimensions." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Detect actual PDF magic bytes: %PDF (0x25, 0x50, 0x44, 0x46)
    const isPdf =
      buffer.length >= 4 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46;

    if (isPdf) {
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();
      if (pageIndex < 0 || pageIndex >= pages.length) {
        return NextResponse.json({ error: "Invalid page index." }, { status: 400 });
      }

      const page = pages[pageIndex];
      const pdfWidth = page.getWidth();
      const pdfHeight = page.getHeight();

      // Scale crop parameters from preview pixel coordinate space to PDF points
      const scaleX = pdfWidth / originalWidth;
      const scaleY = pdfHeight / originalHeight;

      const pdfCropX = cropX * scaleX;
      const pdfCropWidth = cropWidth * scaleX;
      // In PDF coordinates, origin (0,0) is bottom-left
      const pdfCropY = (originalHeight - (cropY + cropHeight)) * scaleY;
      const pdfCropHeight = cropHeight * scaleY;

      // Update cropbox and mediabox
      page.setCropBox(pdfCropX, pdfCropY, pdfCropWidth, pdfCropHeight);
      page.setMediaBox(pdfCropX, pdfCropY, pdfCropWidth, pdfCropHeight);

      const croppedPdfBytes = await pdfDoc.save();
      const baseName = file.name.replace(/\.[^/.]+$/, "");

      return new NextResponse(new Uint8Array(croppedPdfBytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            `${baseName}-cropped.pdf`
          )}"`,
          "Content-Length": croppedPdfBytes.byteLength.toString(),
        },
      });
    } else {
      // Image crop (PNG, JPG, etc.) -> PDF or cropped image
      const buffer = Buffer.from(arrayBuffer);
      const metadata = await sharp(buffer).metadata();
      const imgWidth = metadata.width || originalWidth;
      const imgHeight = metadata.height || originalHeight;

      const scaleX = imgWidth / originalWidth;
      const scaleY = imgHeight / originalHeight;

      const extractLeft = Math.max(0, Math.round(cropX * scaleX));
      const extractTop = Math.max(0, Math.round(cropY * scaleY));
      const extractWidth = Math.min(imgWidth - extractLeft, Math.round(cropWidth * scaleX));
      const extractHeight = Math.min(imgHeight - extractTop, Math.round(cropHeight * scaleY));

      const croppedBuffer = await sharp(buffer)
        .extract({
          left: extractLeft,
          top: extractTop,
          width: extractWidth,
          height: extractHeight,
        })
        .png()
        .toBuffer();

      // Convert cropped image to PDF page
      const pdfDoc = await PDFDocument.create();
      const pngImage = await pdfDoc.embedPng(croppedBuffer);
      const page = pdfDoc.addPage([pngImage.width, pngImage.height]);
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: pngImage.width,
        height: pngImage.height,
      });

      const pdfBytes = await pdfDoc.save();
      const baseName = file.name.replace(/\.[^/.]+$/, "");

      return new NextResponse(new Uint8Array(pdfBytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            `${baseName}-cropped.pdf`
          )}"`,
          "Content-Length": pdfBytes.byteLength.toString(),
        },
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error cropping PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

