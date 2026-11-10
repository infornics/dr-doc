import { NextRequest, NextResponse } from "next/server";
import sharp, { FormatEnum } from "sharp";
import { PDFDocument } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { ZipArchive } from "archiver";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const targetFormat = (formData.get("targetFormat") as string | null)?.toLowerCase()?.trim();

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided." },
        { status: 400 }
      );
    }

    if (!targetFormat) {
      return NextResponse.json(
        { error: "Target format is required." },
        { status: 400 }
      );
    }

    const originalName = file.name;
    const baseName = originalName.replace(/\.[^/.]+$/, "");
    const ext = originalName.split(".").pop()?.toLowerCase() || "";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const imageExtensions = ["png", "jpg", "jpeg", "webp", "svg", "heic", "avif", "tiff", "gif"];
    const isSourceImage = imageExtensions.includes(ext);
    const isTargetImage = imageExtensions.includes(targetFormat);

    // -------------------------------------------------------------
    // CASE 1: IMAGE TO PDF
    // -------------------------------------------------------------
    if (isSourceImage && targetFormat === "pdf") {
      const img = sharp(buffer, { failOn: "none" }).rotate();
      const meta = await img.metadata();
      if (!meta.width || !meta.height) {
        return NextResponse.json({ error: "Invalid image file." }, { status: 400 });
      }

      const pngBuffer = await img.png().toBuffer();
      const pdfDoc = await PDFDocument.create();
      const embedded = await pdfDoc.embedPng(pngBuffer);

      const A4_WIDTH = 595.28;
      const A4_HEIGHT = 841.89;
      const MARGIN = 36;
      const maxW = A4_WIDTH - MARGIN * 2;
      const maxH = A4_HEIGHT - MARGIN * 2;
      const scale = Math.min(maxW / embedded.width, maxH / embedded.height, 1);
      const w = embedded.width * scale;
      const h = embedded.height * scale;

      const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      page.drawImage(embedded, {
        x: (A4_WIDTH - w) / 2,
        y: (A4_HEIGHT - h) / 2,
        width: w,
        height: h,
      });

      const pdfBytes = await pdfDoc.save();
      const outBuffer = Buffer.from(pdfBytes);
      return createBinaryResponse(outBuffer, `${baseName}.pdf`, "application/pdf");
    }

    // -------------------------------------------------------------
    // CASE 2: IMAGE TO IMAGE (PNG, JPG, WEBP, AVIF, TIFF)
    // -------------------------------------------------------------
    if (isSourceImage && isTargetImage) {
      const img = sharp(buffer, { failOn: "none" }).rotate();
      let format = targetFormat;
      if (format === "jpg") format = "jpeg";

      let convertedBuffer: Buffer;
      const contentType = `image/${format}`;

      if (format === "png") {
        convertedBuffer = await img.png().toBuffer();
      } else if (format === "jpeg") {
        convertedBuffer = await img.jpeg({ quality: 90 }).toBuffer();
      } else if (format === "webp") {
        convertedBuffer = await img.webp({ quality: 90 }).toBuffer();
      } else if (format === "avif") {
        convertedBuffer = await img.avif().toBuffer();
      } else if (format === "tiff") {
        convertedBuffer = await img.tiff().toBuffer();
      } else {
        convertedBuffer = await img.toFormat(format as keyof FormatEnum).toBuffer();
      }

      return createBinaryResponse(convertedBuffer, `${baseName}.${targetFormat}`, contentType);
    }

    // -------------------------------------------------------------
    // CASE 3: PDF TO IMAGE(S) (PDF -> PNG, JPG, WEBP)
    // -------------------------------------------------------------
    if (ext === "pdf" && isTargetImage) {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "drdoc-pdftoimg-"));
      try {
        const inputPdfPath = path.join(tmpDir, "input.pdf");
        await fs.writeFile(inputPdfPath, buffer);

        const imgExt = targetFormat === "jpg" ? "jpg" : targetFormat === "jpeg" ? "jpeg" : "png";
        const prefix = path.join(tmpDir, "page");

        // Render PDF pages at 150 DPI
        if (imgExt === "png") {
          await execAsync(`pdftoppm -png -r 150 "${inputPdfPath}" "${prefix}"`);
        } else {
          await execAsync(`pdftoppm -jpeg -r 150 "${inputPdfPath}" "${prefix}"`);
        }

        const files = (await fs.readdir(tmpDir))
          .filter((f) => f.startsWith("page-") && (f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".jpeg")))
          .sort();

        if (files.length === 0) {
          throw new Error("Could not extract images from PDF.");
        }

        // If single page, return that direct image
        if (files.length === 1) {
          const singleImg = await fs.readFile(path.join(tmpDir, files[0]));
          return createBinaryResponse(singleImg, `${baseName}.${imgExt}`, `image/${imgExt}`);
        }

        // If multiple pages, zip them together using ZipArchive
        const archive = new ZipArchive({ zlib: { level: 9 } });
        const zipChunks: Buffer[] = [];
        archive.on("data", (chunk: Buffer) => zipChunks.push(chunk));

        for (let i = 0; i < files.length; i++) {
          const pageFile = files[i];
          const pageBuffer = await fs.readFile(path.join(tmpDir, pageFile));
          archive.append(pageBuffer, { name: `${baseName}-page-${i + 1}.${imgExt}` });
        }

        await archive.finalize();
        const zipBuffer = Buffer.concat(zipChunks);
        return createBinaryResponse(zipBuffer, `${baseName}-images.zip`, "application/zip");
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }

    // -------------------------------------------------------------
    // CASE 4: PDF TO TEXT / DOCX
    // -------------------------------------------------------------
    if (ext === "pdf" && (targetFormat === "txt" || targetFormat === "docx")) {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "drdoc-pdftotext-"));
      try {
        const inputPdfPath = path.join(tmpDir, "input.pdf");
        const outTxtPath = path.join(tmpDir, "out.txt");
        await fs.writeFile(inputPdfPath, buffer);

        await execAsync(`pdftotext "${inputPdfPath}" "${outTxtPath}"`);
        const extractedText = (await fs.readFile(outTxtPath, "utf8")) || "No text found in PDF.";

        if (targetFormat === "txt") {
          return createBinaryResponse(Buffer.from(extractedText, "utf8"), `${baseName}.txt`, "text/plain");
        }

        // Create formatted DOCX from extracted paragraphs
        const paragraphs = extractedText
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0)
          .map(
            (p) =>
              new Paragraph({
                spacing: { after: 120 },
                children: [new TextRun({ text: p, font: "Arial", size: 24 })],
              })
          );

        const docx = new Document({
          sections: [
            {
              properties: {},
              children:
                paragraphs.length > 0
                  ? paragraphs
                  : [new Paragraph({ children: [new TextRun("Empty Document")] })],
            },
          ],
        });

        const docxBuffer = await Packer.toBuffer(docx);
        return createBinaryResponse(
          docxBuffer,
          `${baseName}.docx`,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }

    // -------------------------------------------------------------
    // CASE 5: DOCUMENTS TO PDF / DOCX / TXT VIA LIBREOFFICE
    // Supports docx, doc, txt, rtf, odt, xlsx, pptx -> pdf
    // -------------------------------------------------------------
    const libreOfficeSources = ["docx", "doc", "txt", "rtf", "odt", "xlsx", "pptx", "csv"];
    if (libreOfficeSources.includes(ext) || targetFormat === "pdf") {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "drdoc-libreoffice-"));
      try {
        const inputFilePath = path.join(tmpDir, `input.${ext}`);
        await fs.writeFile(inputFilePath, buffer);

        // Run LibreOffice conversion
        await execAsync(
          `libreoffice --headless --convert-to ${targetFormat} "${inputFilePath}" --outdir "${tmpDir}"`
        );

        const generatedFiles = (await fs.readdir(tmpDir)).filter(
          (f) => f.toLowerCase().endsWith(`.${targetFormat}`) && f !== `input.${ext}`
        );

        if (generatedFiles.length > 0) {
          const outputFile = path.join(tmpDir, generatedFiles[0]);
          const resultBuffer = await fs.readFile(outputFile);
          const mime = getMimeType(targetFormat);
          return createBinaryResponse(resultBuffer, `${baseName}.${targetFormat}`, mime);
        }

        throw new Error(`Conversion to ${targetFormat.toUpperCase()} failed.`);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }

    return NextResponse.json(
      { error: `Conversion from .${ext} to .${targetFormat} is not currently supported.` },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error processing file conversion.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function createBinaryResponse(buffer: Buffer, filename: string, contentType: string) {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Content-Length": buffer.byteLength.toString(),
    },
  });
}

function getMimeType(format: string): string {
  switch (format.toLowerCase()) {
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "doc":
      return "application/msword";
    case "txt":
      return "text/plain";
    case "rtf":
      return "application/rtf";
    case "odt":
      return "application/vnd.oasis.opendocument.text";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
}
