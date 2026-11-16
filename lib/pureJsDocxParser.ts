import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import JSZip from "jszip";
import mammoth from "mammoth";

export interface ParsedDocxSection {
  title?: string;
  paragraphs: string[];
}

/**
 * Parses a DOCX file buffer into page sections using explicit page breaks or headings.
 * Pure JavaScript, zero system binary dependencies.
 */
export async function parseDocxIntoSections(buffer: Buffer): Promise<ParsedDocxSection[]> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.files["word/document.xml"]?.async("text");

    if (!docXml) {
      const raw = await mammoth.extractRawText({ buffer });
      const paragraphs = raw.value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      return [{ paragraphs: paragraphs.length > 0 ? paragraphs : ["Document"] }];
    }

    // Split on explicit page breaks: <w:br w:type="page"/> or <w:lastRenderedPageBreak/>
    const pageBreakRegex = /<w:(?:br\s+[^>]*w:type="page"|lastRenderedPageBreak)\s*\/?>/i;
    const rawSegments = docXml.split(pageBreakRegex);

    const sections: ParsedDocxSection[] = [];

    for (const segment of rawSegments) {
      // Extract text content from each <w:p> paragraph in this segment
      const pMatches = segment.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi) || [];
      const paragraphs: string[] = [];
      let sectionTitle = "";

      for (const pXml of pMatches) {
        // Extract all <w:t> tags
        const tMatches = pXml.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi);
        if (tMatches) {
          const text = tMatches
            .map((t) => t.replace(/<[^>]*>/g, ""))
            .join("")
            .trim();
          if (text) {
            if (!sectionTitle && text.length < 80) {
              sectionTitle = text;
            }
            paragraphs.push(text);
          }
        }
      }

      if (paragraphs.length > 0) {
        sections.push({
          title: sectionTitle || `Page ${sections.length + 1}`,
          paragraphs,
        });
      }
    }

    if (sections.length > 0) {
      return sections;
    }

    // Fallback if no page breaks were found: chunk paragraphs by 4-5 paragraphs per slide
    const raw = await mammoth.extractRawText({ buffer });
    const allParas = raw.value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

    if (allParas.length === 0) {
      return [{ paragraphs: ["Document"] }];
    }

    const CHUNK_SIZE = 4;
    for (let i = 0; i < allParas.length; i += CHUNK_SIZE) {
      const chunk = allParas.slice(i, i + CHUNK_SIZE);
      sections.push({
        title: chunk[0].length < 60 ? chunk[0] : `Page ${sections.length + 1}`,
        paragraphs: chunk,
      });
    }

    return sections;
  } catch {
    return [{ paragraphs: ["Document"] }];
  }
}

/**
 * Creates visual single-page PDFs for each DOCX section using pdf-lib in pure JS.
 */
export async function createPdfsFromDocxSections(
  baseName: string,
  sections: ParsedDocxSection[]
): Promise<{ fileName: string; buffer: Buffer }[]> {
  const results: { fileName: string; buffer: Buffer }[] = [];
  const padLength = Math.max(2, String(sections.length).length);

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    // Standard presentation landscape page: 960 x 540 (16:9 ratio)
    const page = pdf.addPage([960, 540]);

    // Draw background card
    page.drawRectangle({
      x: 0,
      y: 0,
      width: 960,
      height: 540,
      color: rgb(0.97, 0.97, 0.98),
    });

    let currentY = 480;

    // Header Title
    const headerTitle = sec.title || `Slide ${i + 1}`;
    page.drawText(headerTitle.slice(0, 70), {
      x: 60,
      y: currentY,
      size: 26,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.15),
    });

    currentY -= 45;

    // Content Paragraphs
    const parasToRender = sec.paragraphs.slice(sec.title ? 1 : 0, 7);
    for (const para of parasToRender) {
      if (currentY < 60) break;
      // Word wrap approx 90 chars
      const words = para.split(/\s+/);
      let line = "";
      for (const w of words) {
        if ((line + " " + w).length > 85) {
          page.drawText(line, {
            x: 60,
            y: currentY,
            size: 15,
            font,
            color: rgb(0.25, 0.25, 0.3),
          });
          currentY -= 24;
          line = w;
          if (currentY < 60) break;
        } else {
          line = line ? line + " " + w : w;
        }
      }
      if (line && currentY >= 60) {
        page.drawText(line, {
          x: 60,
          y: currentY,
          size: 15,
          font,
          color: rgb(0.25, 0.25, 0.3),
        });
        currentY -= 32;
      }
    }

    // Page badge at footer
    page.drawText(`${baseName} • Page ${i + 1} of ${sections.length}`, {
      x: 60,
      y: 30,
      size: 11,
      font,
      color: rgb(0.5, 0.5, 0.55),
    });

    const pdfBytes = await pdf.save();
    const pageNum = String(i + 1).padStart(padLength, "0");
    results.push({
      fileName: `${baseName}-page-${pageNum}.pdf`,
      buffer: Buffer.from(pdfBytes),
    });
  }

  return results;
}

