import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const leftStr = formData.get("left");
    const topStr = formData.get("top");
    const widthStr = formData.get("width");
    const heightStr = formData.get("height");
    const format = (formData.get("format") as string) || "png";

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    const left = Math.max(0, Math.round(Number(leftStr) || 0));
    const top = Math.max(0, Math.round(Number(topStr) || 0));
    const width = Math.round(Number(widthStr));
    const height = Math.round(Number(heightStr));

    if (!width || !height || width <= 0 || height <= 0) {
      return NextResponse.json({ error: "Invalid crop dimensions." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get input image metadata
    const image = sharp(buffer, { failOn: "none" }).rotate();
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ error: "Invalid image format." }, { status: 400 });
    }

    // Clamp crop boundaries to image dimensions
    const safeLeft = Math.min(left, metadata.width - 1);
    const safeTop = Math.min(top, metadata.height - 1);
    const safeWidth = Math.min(width, metadata.width - safeLeft);
    const safeHeight = Math.min(height, metadata.height - safeTop);

    let pipeline = image.extract({
      left: safeLeft,
      top: safeTop,
      width: safeWidth,
      height: safeHeight,
    });

    const targetFormat = format.toLowerCase();
    let contentType = "image/png";
    let ext = "png";

    if (targetFormat === "jpeg" || targetFormat === "jpg") {
      pipeline = pipeline.jpeg({ quality: 90 });
      contentType = "image/jpeg";
      ext = "jpg";
    } else if (targetFormat === "webp") {
      pipeline = pipeline.webp({ quality: 90 });
      contentType = "image/webp";
      ext = "webp";
    } else {
      pipeline = pipeline.png();
      contentType = "image/png";
      ext = "png";
    }

    const croppedBuffer = await pipeline.toBuffer();
    const originalName = file.name.replace(/\.[^/.]+$/, "");
    const outputFilename = `${originalName}-cropped.${ext}`;

    return new NextResponse(new Uint8Array(croppedBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(outputFilename)}"`,
        "Content-Length": croppedBuffer.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error cropping image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

