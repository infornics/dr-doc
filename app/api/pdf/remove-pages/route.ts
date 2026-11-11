import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const pagesToRemoveStr = (formData.get("pages") as string) || ""; // e.g. "2, 4-6"

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No PDF file provided." }, { status: 400 });
    }

    if (!pagesToRemoveStr.trim()) {
      return NextResponse.json(
        { error: "Please specify which pages to remove (e.g. '2' or '2-4, 7')." },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "Provided file is not a valid PDF document." },
        { status: 400 }
      );
    }

    const sourcePdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = sourcePdf.getPageCount();

    if (totalPages === 0) {
      return NextResponse.json({ error: "The provided PDF has no pages." }, { status: 400 });
    }

    const removeSet = new Set(parsePageRanges(pagesToRemoveStr, totalPages));

    if (removeSet.size >= totalPages) {
      return NextResponse.json(
        { error: "Cannot remove all pages from the document." },
        { status: 400 }
      );
    }

    // Retain only pages NOT in removeSet
    const remainingIndices: number[] = [];
    for (let i = 0; i < totalPages; i++) {
      if (!removeSet.has(i)) {
        remainingIndices.push(i);
      }
    }

    const resultPdf = await PDFDocument.create();
    const copiedPages = await resultPdf.copyPages(sourcePdf, remainingIndices);
    copiedPages.forEach((p) => resultPdf.addPage(p));

    const resultBytes = await resultPdf.save();
    const baseName = file.name.replace(/\.[^/.]+$/, "");

    return new NextResponse(new Uint8Array(resultBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          `${baseName}-pages-removed.pdf`
        )}"`,
        "Content-Length": resultBytes.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error removing pages.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parsePageRanges(rangeStr: string, maxPages: number): number[] {
  const indices = new Set<number>();
  const parts = rangeStr.split(",");

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes("-")) {
      const [startStr, endStr] = trimmed.split("-").map((s) => s.trim());
      const start = Math.max(1, parseInt(startStr, 10) || 1);
      const end = Math.min(maxPages, parseInt(endStr, 10) || maxPages);

      for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
        indices.add(i - 1);
      }
    } else {
      const pageNum = parseInt(trimmed, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPages) {
        indices.add(pageNum - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

