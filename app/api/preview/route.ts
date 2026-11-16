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
    } else if (isPdf && !popplerReady) {
      // PDF without pdftoppm (e.g. serverless) - return styled PDF preview card
      const svg = `
        <svg width="800" height="1000" viewBox="0 0 800 1000" xmlns="http://www.w3.org/2000/svg">
          <rect width="800" height="1000" rx="20" fill="#18181b"/>
          <rect x="30" y="30" width="740" height="940" rx="16" fill="#27272a" stroke="#3f3f46" stroke-width="2"/>
          <rect x="60" y="60" width="120" height="36" rx="8" fill="#e11d48"/>
          <text x="120" y="85" font-family="system-ui, sans-serif" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="middle">PDF DOC</text>
          <text x="60" y="150" font-family="system-ui, sans-serif" font-size="28" font-weight="bold" fill="#ffffff">${escapeXml(file.name)}</text>
          <text x="60" y="190" font-family="system-ui, sans-serif" font-size="16" fill="#a1a1aa">PDF Document ready for merging</text>
          <rect x="60" y="240" width="680" height="2" fill="#3f3f46"/>
          <rect x="60" y="280" width="540" height="14" rx="4" fill="#3f3f46"/>
          <rect x="60" y="310" width="600" height="14" rx="4" fill="#3f3f46"/>
          <rect x="60" y="340" width="480" height="14" rx="4" fill="#3f3f46"/>
        </svg>
      `;
      const thumbBuffer = await sharp(Buffer.from(svg)).webp({ quality: 85 }).toBuffer();
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
    } else if (isDocx || isPptx) {
      // Pure JavaScript preview generation for Office documents (Netlify / Serverless fallback)
      let docTitle = file.name;
      let snippet = "Slide Document Page";
      if (isDocx) {
        try {
          const sections = await parseDocxIntoSections(buffer);
          if (sections[0]?.title) docTitle = sections[0].title;
          if (sections[0]?.paragraphs[0]) snippet = sections[0].paragraphs[0];
        } catch {}
      }

      const svg = `
        <svg width="800" height="500" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
          <rect width="800" height="500" rx="20" fill="#18181b"/>
          <rect x="30" y="30" width="740" height="440" rx="16" fill="#27272a" stroke="#3f3f46" stroke-width="2"/>
          <rect x="60" y="60" width="130" height="34" rx="8" fill="#2563eb"/>
          <text x="125" y="83" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">OFFICE DOC</text>
          <text x="60" y="145" font-family="system-ui, sans-serif" font-size="24" font-weight="bold" fill="#ffffff">${escapeXml(docTitle.slice(0, 50))}</text>
          <text x="60" y="185" font-family="system-ui, sans-serif" font-size="15" fill="#a1a1aa">${escapeXml(snippet.slice(0, 90))}</text>
          <rect x="60" y="230" width="680" height="2" fill="#3f3f46"/>
          <rect x="60" y="270" width="560" height="12" rx="4" fill="#3f3f46"/>
          <rect x="60" y="295" width="620" height="12" rx="4" fill="#3f3f46"/>
          <rect x="60" y="320" width="480" height="12" rx="4" fill="#3f3f46"/>
        </svg>
      `;
      const thumbBuffer = await sharp(Buffer.from(svg)).webp({ quality: 85 }).toBuffer();
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
