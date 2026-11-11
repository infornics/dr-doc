import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No PDF file provided." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verify PDF magic bytes (%PDF)
    const isRealPdf =
      buffer.length >= 4 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46;

    if (!isRealPdf) {
      return NextResponse.json({ error: "Provided file is not a valid PDF document." }, { status: 400 });
    }

    const sourcePdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = sourcePdf.getPageCount();

    if (totalPages === 0) {
      return NextResponse.json({ error: "The provided PDF has no pages." }, { status: 400 });
    }

    const zip = new JSZip();
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const padLength = String(totalPages).length;

    // Split EVERY page into its own individual PDF document
    for (let i = 0; i < totalPages; i++) {
      const singleDoc = await PDFDocument.create();
      const [copiedPage] = await singleDoc.copyPages(sourcePdf, [i]);
      singleDoc.addPage(copiedPage);

      const pageBytes = await singleDoc.save();
      const pageNumber = String(i + 1).padStart(padLength, "0");
      zip.file(`${baseName}-page-${pageNumber}.pdf`, pageBytes);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          `${baseName}-split-pages.zip`
        )}"`,
        "Content-Length": zipBuffer.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error splitting PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
