import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files");
    const outputFilename = (formData.get("filename") as string) || "merged-document.pdf";

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No PDF files provided." },
        { status: 400 }
      );
    }

    const mergedPdf = await PDFDocument.create();

    for (const item of files) {
      if (!(item instanceof File)) continue;

      const arrayBuffer = await item.arrayBuffer();
      try {
        const loadedPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const pageIndices = loadedPdf.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(loadedPdf, pageIndices);
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      } catch (err) {
        console.error(`Error loading PDF file: ${item.name}`, err);
      }
    }

    if (mergedPdf.getPageCount() === 0) {
      return NextResponse.json(
        { error: "Could not read any valid pages from the provided PDF files." },
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

