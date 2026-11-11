import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const mode = (formData.get("mode") as string) || "all"; // 'all', 'range', 'chunks'
    const rangeStr = (formData.get("range") as string) || ""; // e.g. "1-3, 5"
    const chunkSize = Number(formData.get("chunkSize")) || 1;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No PDF file provided." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const totalPages = sourcePdf.getPageCount();

    if (totalPages === 0) {
      return NextResponse.json({ error: "The provided PDF has no pages." }, { status: 400 });
    }

    const zip = new JSZip();
    const baseName = file.name.replace(/\.[^/.]+$/, "");

    if (mode === "range" && rangeStr.trim()) {
      // Parse custom page ranges: e.g. "1-3, 5" (1-based to 0-based)
      const selectedIndices = parsePageRanges(rangeStr, totalPages);
      if (selectedIndices.length === 0) {
        return NextResponse.json({ error: "Invalid page range specified." }, { status: 400 });
      }

      // Create single extracted PDF or zip
      const rangePdf = await PDFDocument.create();
      const copied = await rangePdf.copyPages(sourcePdf, selectedIndices);
      copied.forEach((p) => rangePdf.addPage(p));
      const rangeBytes = await rangePdf.save();

      return new NextResponse(new Uint8Array(rangeBytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            `${baseName}-extracted.pdf`
          )}"`,
        },
      });
    } else if (mode === "chunks" && chunkSize > 1) {
      let chunkNum = 1;
      for (let i = 0; i < totalPages; i += chunkSize) {
        const chunkPdf = await PDFDocument.create();
        const end = Math.min(i + chunkSize, totalPages);
        const indices = Array.from({ length: end - i }, (_, k) => i + k);
        const copied = await chunkPdf.copyPages(sourcePdf, indices);
        copied.forEach((p) => chunkPdf.addPage(p));

        const chunkBytes = await chunkPdf.save();
        zip.file(`${baseName}-part-${chunkNum}.pdf`, chunkBytes);
        chunkNum++;
      }
    } else {
      // Split all pages into individual single-page PDFs
      for (let i = 0; i < totalPages; i++) {
        const singleDoc = await PDFDocument.create();
        const [copiedPage] = await singleDoc.copyPages(sourcePdf, [i]);
        singleDoc.addPage(copiedPage);

        const pageBytes = await singleDoc.save();
        const pad = String(i + 1).padStart(String(totalPages).length, "0");
        zip.file(`${baseName}-page-${pad}.pdf`, pageBytes);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          `${baseName}-split.zip`
        )}"`,
        "Content-Length": zipBuffer.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error splitting PDF.";
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
      const [startStr, endStr] = trimmed.split("-");
      const start = Math.max(1, parseInt(startStr, 10));
      const end = Math.min(maxPages, parseInt(endStr, 10));
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let p = start; p <= end; p++) {
          indices.add(p - 1);
        }
      }
    } else {
      const page = parseInt(trimmed, 10);
      if (!isNaN(page) && page >= 1 && page <= maxPages) {
        indices.add(page - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

