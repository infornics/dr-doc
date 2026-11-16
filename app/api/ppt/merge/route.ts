import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import sharp from "sharp";
import pptxgen from "pptxgenjs";

const execAsync = promisify(exec);

const SLIDE_WIDTH = 10;
const SLIDE_HEIGHT = 5.625; // Standard 16:9 widescreen layout

const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "svg", "heic", "avif", "tiff", "gif", "bmp"];

export async function POST(req: NextRequest) {
  let tmpDir = "";
  try {
    const formData = await req.formData();
    const files = formData.getAll("files");
    const outputFilename = (formData.get("filename") as string) || "merged-presentation.pptx";

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided." },
        { status: 400 }
      );
    }

    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "drdoc-ppt-merge-"));
    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_16x9";

    let totalSlidesAdded = 0;

    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      if (!(item instanceof File)) continue;

      const fileName = item.name;
      const ext = fileName.split(".").pop()?.toLowerCase() || "";
      const arrayBuffer = await item.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Check for PDF magic bytes: %PDF (0x25, 0x50, 0x44, 0x46)
      const isPdf =
        (buffer.length >= 4 &&
          buffer[0] === 0x25 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x44 &&
          buffer[3] === 0x46) ||
        ext === "pdf";

      const isImage = IMAGE_EXTS.includes(ext);
      const isDocx = ext === "docx" || ext === "doc";
      const isPptx = ext === "pptx" || ext === "ppt";

      if (isImage) {
        // Direct single image -> 1 presentation slide
        try {
          const img = sharp(buffer, { failOn: "none" }).rotate();
          const meta = await img.metadata();
          if (meta.width && meta.height) {
            const pngBuf = await img.png().toBuffer();
            const imgRatio = meta.width / meta.height;
            const slideRatio = SLIDE_WIDTH / SLIDE_HEIGHT;

            let w: number;
            let h: number;
            if (imgRatio > slideRatio) {
              w = SLIDE_WIDTH;
              h = SLIDE_WIDTH / imgRatio;
            } else {
              h = SLIDE_HEIGHT;
              w = SLIDE_HEIGHT * imgRatio;
            }
            const x = (SLIDE_WIDTH - w) / 2;
            const y = (SLIDE_HEIGHT - h) / 2;

            const slide = pptx.addSlide();
            slide.addImage({
              data: `image/png;base64,${pngBuf.toString("base64")}`,
              x,
              y,
              w,
              h,
            });
            totalSlidesAdded++;
          }
        } catch (imgErr) {
          console.error(`Failed to process image file ${fileName}:`, imgErr);
        }
      } else if (isPdf) {
        // PDF -> render all pages at 150 DPI and add each as a slide
        const subDir = path.join(tmpDir, `item-${i}`);
        await fs.mkdir(subDir, { recursive: true });
        const pdfPath = path.join(subDir, "doc.pdf");
        await fs.writeFile(pdfPath, buffer);

        try {
          const prefix = path.join(subDir, "page");
          await execAsync(`pdftoppm -png -r 150 "${pdfPath}" "${prefix}"`);
          const renderedPages = (await fs.readdir(subDir))
            .filter((f) => f.startsWith("page-") && f.endsWith(".png"))
            .sort();

          for (const pageName of renderedPages) {
            const pagePath = path.join(subDir, pageName);
            const pageBuf = await fs.readFile(pagePath);
            const meta = await sharp(pageBuf).metadata();
            if (!meta.width || !meta.height) continue;

            const imgRatio = meta.width / meta.height;
            const slideRatio = SLIDE_WIDTH / SLIDE_HEIGHT;
            let w: number;
            let h: number;
            if (imgRatio > slideRatio) {
              w = SLIDE_WIDTH;
              h = SLIDE_WIDTH / imgRatio;
            } else {
              h = SLIDE_HEIGHT;
              w = SLIDE_HEIGHT * imgRatio;
            }
            const x = (SLIDE_WIDTH - w) / 2;
            const y = (SLIDE_HEIGHT - h) / 2;

            const slide = pptx.addSlide();
            slide.addImage({
              data: `image/png;base64,${pageBuf.toString("base64")}`,
              x,
              y,
              w,
              h,
            });
            totalSlidesAdded++;
          }
        } catch (pdfErr) {
          console.error(`Failed to render PDF ${fileName}:`, pdfErr);
        }
      } else if (isDocx || isPptx) {
        // Convert docx or pptx to pdf via LibreOffice first, then render pages as slides
        const subDir = path.join(tmpDir, `item-${i}`);
        const profileDir = path.join(subDir, "lo-profile");
        await fs.mkdir(profileDir, { recursive: true });
        const inputFilePath = path.join(subDir, `input.${ext}`);
        await fs.writeFile(inputFilePath, buffer);

        try {
          await execAsync(
            `libreoffice -env:UserInstallation="file://${profileDir}" --headless --convert-to pdf "${inputFilePath}" --outdir "${subDir}"`
          );
          const pdfPath = path.join(subDir, "input.pdf");
          const prefix = path.join(subDir, "page");
          await execAsync(`pdftoppm -png -r 150 "${pdfPath}" "${prefix}"`);

          const renderedPages = (await fs.readdir(subDir))
            .filter((f) => f.startsWith("page-") && f.endsWith(".png"))
            .sort();

          for (const pageName of renderedPages) {
            const pagePath = path.join(subDir, pageName);
            const pageBuf = await fs.readFile(pagePath);
            const meta = await sharp(pageBuf).metadata();
            if (!meta.width || !meta.height) continue;

            const imgRatio = meta.width / meta.height;
            const slideRatio = SLIDE_WIDTH / SLIDE_HEIGHT;
            let w: number;
            let h: number;
            if (imgRatio > slideRatio) {
              w = SLIDE_WIDTH;
              h = SLIDE_WIDTH / imgRatio;
            } else {
              h = SLIDE_HEIGHT;
              w = SLIDE_HEIGHT * imgRatio;
            }
            const x = (SLIDE_WIDTH - w) / 2;
            const y = (SLIDE_HEIGHT - h) / 2;

            const slide = pptx.addSlide();
            slide.addImage({
              data: `image/png;base64,${pageBuf.toString("base64")}`,
              x,
              y,
              w,
              h,
            });
            totalSlidesAdded++;
          }
        } catch (officeErr) {
          console.error(`Failed to convert office doc ${fileName}:`, officeErr);
        }
      }
    }

    if (totalSlidesAdded === 0) {
      return NextResponse.json(
        { error: "Could not generate any presentation slides from the provided files." },
        { status: 400 }
      );
    }

    const pptxBuffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
    const safeFilename = outputFilename.toLowerCase().endsWith(".pptx")
      ? outputFilename
      : `${outputFilename.replace(/\.[^/.]+$/, "")}.pptx`;

    return new NextResponse(new Uint8Array(pptxBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(safeFilename)}"`,
        "Content-Length": pptxBuffer.byteLength.toString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error merging into PPT presentation.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

