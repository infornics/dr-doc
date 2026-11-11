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

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (isPdf) {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-thumb-"));
      const inputPdf = path.join(tempDir, "input.pdf");
      const outPrefix = path.join(tempDir, "page");

      await fs.writeFile(inputPdf, buffer);

      // Render 1st page at 72 DPI using system pdftoppm
      await execAsync(`pdftoppm -png -r 72 -f 1 -l 1 "${inputPdf}" "${outPrefix}"`);

      // @ts-expect-error Turbopack dynamic tracing hint
      const files = await fs.readdir(/*turbopackIgnore: true*/ tempDir);
      const generated = files.find((f: string) => f.startsWith("page-") && f.endsWith(".png"));

      if (!generated) {
        throw new Error("Could not render PDF preview.");
      }

      const generatedPath = path.join(tempDir, generated);
      const thumbBuffer = await sharp(generatedPath)
        .resize({ width: 300, height: 400, fit: "inside" })
        .webp({ quality: 80 })
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
        .resize({ width: 300, height: 400, fit: "inside" })
        .webp({ quality: 80 })
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
