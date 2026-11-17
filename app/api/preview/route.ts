import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import sharp from "sharp";
import { hasLibreOffice, hasPoppler } from "@/lib/systemChecks";
import { parseDocxIntoSections } from "@/lib/pureJsDocxParser";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  let tempDir = "";
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
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

    const fileNameLower = file.name.toLowerCase();
    const isDocx = fileNameLower.endsWith(".docx") || fileNameLower.endsWith(".doc");
    const isPptx = fileNameLower.endsWith(".pptx") || fileNameLower.endsWith(".ppt");

    const popplerReady = await hasPoppler();
    const libreOfficeReady = await hasLibreOffice();

    if (isPdf && popplerReady) {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-thumb-"));
      const inputPdf = path.join(tempDir, "input.pdf");
      const outPrefix = path.join(tempDir, "page");

      await fs.writeFile(inputPdf, buffer);

      // Render 1st page in crystal-clear high quality (150 DPI) for legible reading in full height and fullscreen
      await execAsync(
        `pdftoppm -jpeg -jpegopt quality=85 -r 150 -f 1 -l 1 "${inputPdf}" "${outPrefix}"`
      );

      const files = await fs.readdir(tempDir);
      const generated = files.find(
        (f: string) =>
          f.startsWith("page-") &&
          (f.endsWith(".jpg") || f.endsWith(".jpeg") || f.endsWith(".png"))
      );

      if (!generated) {
        throw new Error("Could not render PDF preview.");
      }

      const generatedPath = path.join(tempDir, generated);
      const thumbBuffer = await sharp(generatedPath)
        .resize({ width: 1200, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      return new NextResponse(new Uint8Array(thumbBuffer), {
        status: 200,
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=86400",
        },
      });
    } else if ((isDocx || isPptx) && libreOfficeReady && popplerReady) {
      // Office document preview via LibreOffice conversion
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "office-thumb-"));
      const profileDir = path.join(tempDir, "lo-profile");
      await fs.mkdir(profileDir, { recursive: true });

      const ext = isDocx
        ? fileNameLower.endsWith(".doc")
          ? "doc"
          : "docx"
        : fileNameLower.endsWith(".ppt")
        ? "ppt"
        : "pptx";
      const inputDoc = path.join(tempDir, `input.${ext}`);
      const outPrefix = path.join(tempDir, "page");

      await fs.writeFile(inputDoc, buffer);
      await execAsync(
        `libreoffice -env:UserInstallation="file://${profileDir}" --headless --convert-to pdf "${inputDoc}" --outdir "${tempDir}"`
      );

      const pdfPath = path.join(tempDir, "input.pdf");
      await execAsync(
        `pdftoppm -jpeg -jpegopt quality=85 -r 150 -f 1 -l 1 "${pdfPath}" "${outPrefix}"`
      );

      const files = await fs.readdir(tempDir);
      const generated = files.find(
        (f: string) =>
          f.startsWith("page-") &&
          (f.endsWith(".jpg") || f.endsWith(".jpeg") || f.endsWith(".png"))
      );

      if (!generated) {
        throw new Error("Could not render Office document preview.");
      }

      const generatedPath = path.join(tempDir, generated);
      const thumbBuffer = await sharp(generatedPath)
        .resize({ width: 1200, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      return new NextResponse(new Uint8Array(thumbBuffer), {
        status: 200,
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=86400",
        },
      });
    } else if (isDocx || isPptx || isPdf) {
      // Pure JavaScript preview generation for documents with clean typography cards
      let docTitle = file.name.replace(/\.[^/.]+$/, "");
      let paragraphs: string[] = [];

      if (isDocx) {
        try {
          const sections = await parseDocxIntoSections(buffer);
          if (sections[0]?.title) docTitle = sections[0].title;
          if (sections[0]?.paragraphs) {
            paragraphs = sections[0].paragraphs.slice(sections[0].title ? 1 : 0, 7);
          }
        } catch {}
      }

      const badge = isPdf ? "PDF" : isDocx ? "DOCX" : "PPTX";
      const badgeColor = isPdf ? "#dc2626" : isDocx ? "#2563eb" : "#ea580c";

      const width = 1200;
      const height = 800;
      const safeTitle = escapeXml(docTitle.slice(0, 60));
      const safeSubtitle = escapeXml(file.name.slice(0, 80));

      const paragraphLines: string[] = [];
      let currentY = 240;

      for (const p of paragraphs.slice(0, 6)) {
        if (currentY > height - 80) break;
        const text = escapeXml(p.slice(0, 80));
        paragraphLines.push(
          `<text x="80" y="${currentY}" font-family="DejaVu Sans, Arial, Liberation Sans, sans-serif" font-size="20" fill="#334155">${text}</text>`
        );
        currentY += 40;
      }

      const svg = `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="cardBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="100%" stop-color="#f8fafc"/>
            </linearGradient>
          </defs>
          <rect width="${width}" height="${height}" rx="20" fill="url(#cardBg)"/>
          <rect x="15" y="15" width="${width - 30}" height="${height - 30}" rx="18" fill="none" stroke="#e2e8f0" stroke-width="3"/>

          <!-- Badge -->
          <rect x="80" y="60" width="110" height="34" rx="8" fill="${badgeColor}"/>
          <text x="135" y="83" font-family="DejaVu Sans, Arial, Liberation Sans, sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">${badge}</text>

          <!-- Document / Slide Title -->
          <text x="80" y="145" font-family="DejaVu Sans, Arial, Liberation Sans, sans-serif" font-size="32" font-weight="bold" fill="#0f172a">${safeTitle}</text>
          <text x="80" y="175" font-family="DejaVu Sans, Arial, Liberation Sans, sans-serif" font-size="16" fill="#64748b">${safeSubtitle}</text>

          <line x1="80" y1="195" x2="${width - 80}" y2="195" stroke="#e2e8f0" stroke-width="2"/>

          <!-- Content Lines -->
          ${paragraphLines.join("\n")}

          <!-- Footer -->
          <text x="80" y="${height - 40}" font-family="DejaVu Sans, Arial, Liberation Sans, sans-serif" font-size="14" fill="#94a3b8">Dr. Doc • Document Preview</text>
        </svg>
      `;

      const thumbBuffer = await sharp(Buffer.from(svg))
        .webp({ quality: 85 })
        .toBuffer();

      return new NextResponse(new Uint8Array(thumbBuffer), {
        status: 200,
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=86400",
        },
      });
    } else {
      // It is an image (PNG, JPG, WEBP, etc.)
      const thumbBuffer = await sharp(buffer, { failOn: "none" })
        .rotate()
        .resize({ width: 1200, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      return new NextResponse(new Uint8Array(thumbBuffer), {
        status: 200,
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error generating preview.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}
