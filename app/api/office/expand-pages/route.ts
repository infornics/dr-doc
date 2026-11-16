import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { hasLibreOffice } from "@/lib/systemChecks";
import { parseDocxIntoSections, createPdfsFromDocxSections } from "@/lib/pureJsDocxParser";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  let tmpDir = "";
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const fileName = file.name;
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const isLibreOfficeSupported = await hasLibreOffice();

    // If LibreOffice is not installed (e.g. on Netlify / Serverless) or if processing DOCX:
    if (!isLibreOfficeSupported) {
      if (ext === "docx" || ext === "doc" || ext === "txt") {
        const sections = await parseDocxIntoSections(buffer);
        const generatedPdfs = await createPdfsFromDocxSections(baseName, sections);

        const zip = new JSZip();
        for (const item of generatedPdfs) {
          zip.file(item.fileName, item.buffer);
        }

        const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
        return new NextResponse(new Uint8Array(zipBuffer), {
          status: 200,
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${encodeURIComponent(`${baseName}-pages.zip`)}"`,
            "X-Total-Pages": sections.length.toString(),
          },
        });
      }
    }

    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "office-expand-"));
    const profileDir = path.join(tmpDir, "lo-profile");
    await fs.mkdir(profileDir, { recursive: true });

    const inputDoc = path.join(tmpDir, `input.${ext}`);
    await fs.writeFile(inputDoc, buffer);

    try {
      // Convert DOCX, DOC, PPTX, or PPT into PDF via LibreOffice
      await execAsync(
        `libreoffice -env:UserInstallation="file://${profileDir}" --headless --convert-to pdf "${inputDoc}" --outdir "${tmpDir}"`
      );

      const generatedPdfPath = path.join(tmpDir, "input.pdf");
      const pdfBytes = await fs.readFile(generatedPdfPath);
      const sourcePdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const totalPages = sourcePdf.getPageCount();

      if (totalPages === 0) {
        throw new Error("No pages found in document.");
      }

      // Split each page into an individual PDF file and zip them
      const zip = new JSZip();
      const padLength = Math.max(2, String(totalPages).length);

      for (let i = 0; i < totalPages; i++) {
        const singleDoc = await PDFDocument.create();
        const [copiedPage] = await singleDoc.copyPages(sourcePdf, [i]);
        singleDoc.addPage(copiedPage);

        const singlePdfBytes = await singleDoc.save();
        const pageNumber = String(i + 1).padStart(padLength, "0");
        zip.file(`${baseName}-page-${pageNumber}.pdf`, singlePdfBytes);
      }

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

      return new NextResponse(new Uint8Array(zipBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(`${baseName}-pages.zip`)}"`,
          "X-Total-Pages": totalPages.toString(),
        },
      });
    } catch {
      // Fallback: If LibreOffice execution fails during runtime, use pure JS parser
      const sections = await parseDocxIntoSections(buffer);
      const generatedPdfs = await createPdfsFromDocxSections(baseName, sections);

      const zip = new JSZip();
      for (const item of generatedPdfs) {
        zip.file(item.fileName, item.buffer);
      }

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
      return new NextResponse(new Uint8Array(zipBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(`${baseName}-pages.zip`)}"`,
          "X-Total-Pages": sections.length.toString(),
        },
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to expand document pages.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

