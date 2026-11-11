import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const mode = (formData.get("mode") as string) || "all"; // 'all', 'range', 'chunks'
    const rangeStr = (formData.get("range") as string) || ""; // e.g. "1-3, 5-7"
    const chunkSize = Math.max(1, Number(formData.get("chunkSize")) || 1);

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

    if (mode === "range" && rangeStr.trim()) {
      // Each range specification generates its own separate PDF file in the zip
      // e.g. "1-3, 5-8" creates part-1 (pages 1-3).pdf and part-2 (pages 5-8).pdf
      // or "1, 3, 5" creates 3 separate single-page PDFs
      const rangeGroups = parseRangeGroups(rangeStr, totalPages);
      if (rangeGroups.length === 0) {
        return NextResponse.json({ error: "Invalid page range specified." }, { status: 400 });
      }

      for (let i = 0; i < rangeGroups.length; i++) {
        const group = rangeGroups[i];
        const rangeDoc = await PDFDocument.create();
        const copied = await rangeDoc.copyPages(sourcePdf, group.indices);
        copied.forEach((p) => rangeDoc.addPage(p));

        const rangeBytes = await rangeDoc.save();
        const rangeLabel = group.label.replace(/\s+/g, "");
        zip.file(`${baseName}-range-${rangeLabel}.pdf`, rangeBytes);
      }
    } else if (mode === "chunks" && chunkSize >= 1) {
      // Split into equal chunks of N pages each
      let chunkNum = 1;
      for (let i = 0; i < totalPages; i += chunkSize) {
        const chunkPdf = await PDFDocument.create();
        const end = Math.min(i + chunkSize, totalPages);
        const indices = Array.from({ length: end - i }, (_, k) => i + k);
        const copied = await chunkPdf.copyPages(sourcePdf, indices);
        copied.forEach((p) => chunkPdf.addPage(p));

        const chunkBytes = await chunkPdf.save();
        const startPage = i + 1;
        const endPage = end;
        zip.file(
          `${baseName}-chunk-${chunkNum}-pages-${startPage}-to-${endPage}.pdf`,
          chunkBytes
        );
        chunkNum++;
      }
    } else {
      // Mode 'all': Split EVERY page into its own individual PDF document
      for (let i = 0; i < totalPages; i++) {
        const singleDoc = await PDFDocument.create();
        const [copiedPage] = await singleDoc.copyPages(sourcePdf, [i]);
        singleDoc.addPage(copiedPage);

        const pageBytes = await singleDoc.save();
        const pageNumber = String(i + 1).padStart(padLength, "0");
        zip.file(`${baseName}-page-${pageNumber}.pdf`, pageBytes);
      }
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

interface RangeGroup {
  label: string;
  indices: number[];
}

function parseRangeGroups(rangeStr: string, maxPages: number): RangeGroup[] {
  const groups: RangeGroup[] = [];
  const parts = rangeStr.split(",");

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes("-")) {
      const [startStr, endStr] = trimmed.split("-").map((s) => s.trim());
      const start = Math.max(1, parseInt(startStr, 10) || 1);
      const end = Math.min(maxPages, parseInt(endStr, 10) || maxPages);
      const low = Math.min(start, end);
      const high = Math.max(start, end);

      const indices: number[] = [];
      for (let i = low; i <= high; i++) {
        indices.push(i - 1);
      }
      if (indices.length > 0) {
        groups.push({
          label: `${low}-${high}`,
          indices,
        });
      }
    } else {
      const pageNum = parseInt(trimmed, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPages) {
        groups.push({
          label: `${pageNum}`,
          indices: [pageNum - 1],
        });
      }
    }
  }

  return groups;
}
