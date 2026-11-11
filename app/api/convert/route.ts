import { NextRequest, NextResponse } from "next/server";
import sharp, { FormatEnum } from "sharp";
import { PDFDocument } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import JSZip from "jszip";
import mammoth from "mammoth";
import TurndownService from "turndown";

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
    // CASE 2: IMAGE TO IMAGE (PNG, JPG, WEBP, AVIF, TIFF, SVG)
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
      } else if (format === "svg") {
        // Embed image inside SVG container
        const meta = await img.metadata();
        const w = meta.width || 400;
        const h = meta.height || 400;
        const b64 = (await img.png().toBuffer()).toString("base64");
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <image width="${w}" height="${h}" href="data:image/png;base64,${b64}" />
</svg>`;
        return createBinaryResponse(Buffer.from(svgContent, "utf8"), `${baseName}.svg`, "image/svg+xml");
      } else {
        convertedBuffer = await img.toFormat(format as keyof FormatEnum).toBuffer();
      }

      return createBinaryResponse(convertedBuffer, `${baseName}.${targetFormat}`, contentType);
    }

    // -------------------------------------------------------------
    // CASE 3: WORD (DOCX / DOC) / RTF / ODT TO MARKDOWN (MD / MDX)
    // -------------------------------------------------------------
    if ((ext === "docx" || ext === "doc" || ext === "rtf" || ext === "odt" || ext === "txt") && (targetFormat === "md" || targetFormat === "mdx")) {
      let docxBuffer = buffer;

      // If source is .doc, .rtf, or .odt, normalize it to .docx first via LibreOffice
      if (ext !== "docx") {
        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "drdoc-wordtomd-"));
        try {
          const inputPath = path.join(tmpDir, `input.${ext}`);
          await fs.writeFile(inputPath, buffer);
          await execAsync(`libreoffice --headless --convert-to docx "${inputPath}" --outdir "${tmpDir}"`);
          docxBuffer = await fs.readFile(path.join(tmpDir, "input.docx"));
        } finally {
          await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        }
      }

      // Convert docx buffer to HTML via mammoth
      const { value: html } = await mammoth.convertToHtml({ buffer: docxBuffer });

      // Convert HTML to Markdown via turndown
      const turndownService = new TurndownService({
        headingStyle: "atx",
        hr: "---",
        bulletListMarker: "-",
        codeBlockStyle: "fenced",
        emDelimiter: "_",
      });

      let markdown = turndownService.turndown(html);

      if (targetFormat === "mdx") {
        // MDX formatting: ensure clean line returns and frontmatter-ready structure
        markdown = `export const meta = {\n  title: "${baseName.replace(/"/g, '\\"')}",\n  date: "${new Date().toISOString().split("T")[0]}"\n};\n\n${markdown}`;
      }

      const mimeType = targetFormat === "mdx" ? "text/mdx" : "text/markdown";
      return createBinaryResponse(Buffer.from(markdown, "utf8"), `${baseName}.${targetFormat}`, mimeType);
    }

    // -------------------------------------------------------------
    // CASE 4: PDF TO IMAGE(S) (PDF -> PNG, JPG, WEBP)
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

        // If multiple pages, zip them together using JSZip
        const zip = new JSZip();

        for (let i = 0; i < files.length; i++) {
          const pageFile = files[i];
          const pageBuffer = await fs.readFile(path.join(tmpDir, pageFile));
          zip.file(`${baseName}-page-${i + 1}.${imgExt}`, pageBuffer);
        }

        const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
        return createBinaryResponse(zipBuffer, `${baseName}-images.zip`, "application/zip");
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }

    // -------------------------------------------------------------
    // CASE 5: PDF TO TEXT / DOCX / MD / MDX
    // -------------------------------------------------------------
    if (
      ext === "pdf" &&
      (targetFormat === "txt" || targetFormat === "docx" || targetFormat === "doc" || targetFormat === "md" || targetFormat === "mdx")
    ) {
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

        if (targetFormat === "md" || targetFormat === "mdx") {
          const mdContent = extractedText
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter((p) => p.length > 0)
            .join("\n\n");

          const mimeType = targetFormat === "mdx" ? "text/mdx" : "text/markdown";
          return createBinaryResponse(Buffer.from(mdContent, "utf8"), `${baseName}.${targetFormat}`, mimeType);
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

        if (targetFormat === "doc") {
          // Legacy doc conversion via LibreOffice
          const docxPath = path.join(tmpDir, "out.docx");
          await fs.writeFile(docxPath, docxBuffer);
          await execAsync(`libreoffice --headless --convert-to doc "${docxPath}" --outdir "${tmpDir}"`);
          const docPath = path.join(tmpDir, "out.doc");
          const docData = await fs.readFile(docPath);
          return createBinaryResponse(docData, `${baseName}.doc`, "application/msword");
        }

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
    // CASE 6: EPUB SOURCE HANDLING
    // Extract text from EPUB and convert to PDF or TXT
    // -------------------------------------------------------------
    if (ext === "epub") {
      try {
        const zip = await JSZip.loadAsync(buffer);
        let accumulatedText = "";

        const htmlFiles = Object.keys(zip.files).filter(
          (k) => k.endsWith(".xhtml") || k.endsWith(".html") || k.endsWith(".htm")
        );

        for (const htmlFile of htmlFiles) {
          const raw = await zip.files[htmlFile].async("text");
          const text = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
          if (text) accumulatedText += `${text}\n\n`;
        }

        if (!accumulatedText) {
          accumulatedText = "Empty EPUB Document";
        }

        if (targetFormat === "txt" || targetFormat === "md" || targetFormat === "mdx") {
          const mime = targetFormat === "txt" ? "text/plain" : "text/markdown";
          return createBinaryResponse(Buffer.from(accumulatedText, "utf8"), `${baseName}.${targetFormat}`, mime);
        }

        // EPUB to PDF via text compilation
        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "drdoc-epubtopdf-"));
        try {
          const textPath = path.join(tmpDir, "book.txt");
          await fs.writeFile(textPath, accumulatedText, "utf8");
          await execAsync(`libreoffice --headless --convert-to pdf "${textPath}" --outdir "${tmpDir}"`);
          const pdfPath = path.join(tmpDir, "book.pdf");
          const pdfData = await fs.readFile(pdfPath);
          return createBinaryResponse(pdfData, `${baseName}.pdf`, "application/pdf");
        } finally {
          await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        }
      } catch (err: unknown) {
        throw new Error(err instanceof Error ? err.message : "Failed to process EPUB");
      }
    }

    // -------------------------------------------------------------
    // CASE 7: DOCUMENTS TO PDF / DOCX / DOC / RTF / ODT / EPUB / CSV
    // Via LibreOffice engine
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
    case "md":
    case "markdown":
      return "text/markdown";
    case "mdx":
      return "text/mdx";
    case "rtf":
      return "application/rtf";
    case "odt":
      return "application/vnd.oasis.opendocument.text";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "csv":
      return "text/csv";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "epub":
      return "application/epub+zip";
    case "zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
}
