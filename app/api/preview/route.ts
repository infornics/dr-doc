import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import sharp from "sharp";

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

    if (isPdf) {
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
