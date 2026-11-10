import { ConversionFormat, PresetConversion } from "./types/converter.types";

export const SUPPORTED_FORMATS: ConversionFormat[] = [
  // Documents
  { extension: "pdf", label: "PDF Document (.pdf)", category: "document" },
  { extension: "docx", label: "Word Document (.docx)", category: "document" },
  { extension: "doc", label: "Legacy Word (.doc)", category: "document" },
  { extension: "txt", label: "Plain Text (.txt)", category: "document" },
  { extension: "rtf", label: "Rich Text (.rtf)", category: "document" },
  { extension: "odt", label: "OpenDocument (.odt)", category: "document" },
  {
    extension: "xlsx",
    label: "Excel Spreadsheet (.xlsx)",
    category: "document",
  },
  { extension: "pptx", label: "PowerPoint (.pptx)", category: "document" },

  // Images
  { extension: "png", label: "PNG Image (.png)", category: "image" },
  { extension: "jpg", label: "JPEG Image (.jpg)", category: "image" },
  { extension: "jpeg", label: "JPEG Image (.jpeg)", category: "image" },
  { extension: "webp", label: "WebP Image (.webp)", category: "image" },
  { extension: "svg", label: "SVG Vector (.svg)", category: "image" },
  { extension: "heic", label: "HEIC Image (.heic)", category: "image" },

  // E-Books
  { extension: "epub", label: "EPUB E-Book (.epub)", category: "ebook" },
  { extension: "mobi", label: "MOBI E-Book (.mobi)", category: "ebook" },
];

export const FORMAT_CONVERSION_MAP: Record<string, string[]> = {
  // Images to...
  png: ["pdf", "jpg", "webp", "svg"],
  jpg: ["pdf", "png", "webp"],
  jpeg: ["pdf", "png", "webp"],
  webp: ["png", "jpg", "pdf"],
  svg: ["png", "pdf", "jpg"],
  heic: ["jpg", "png", "pdf"],

  // Documents to...
  pdf: ["docx", "doc", "txt", "png", "jpg", "epub", "pptx", "xlsx"],
  docx: ["pdf", "doc", "txt", "rtf", "odt", "epub"],
  doc: ["docx", "pdf", "txt", "rtf"],
  txt: ["pdf", "docx", "epub"],
  rtf: ["pdf", "docx", "txt"],
  odt: ["pdf", "docx"],
  xlsx: ["pdf", "csv"],
  pptx: ["pdf"],
  epub: ["pdf", "mobi", "txt"],
};

export const DEFAULT_TARGET_BY_SOURCE: Record<string, string> = {
  png: "pdf",
  jpg: "pdf",
  jpeg: "pdf",
  webp: "png",
  heic: "jpg",
  svg: "png",
  pdf: "docx",
  docx: "pdf",
  doc: "docx",
  txt: "pdf",
  rtf: "docx",
  epub: "pdf",
  pptx: "pdf",
  xlsx: "pdf",
};

export const POPULAR_PRESETS: PresetConversion[] = [
  {
    id: "img-to-pdf",
    title: "Image to PDF",
    description: "Convert JPG, PNG, WEBP, or HEIC into high-quality PDFs",
    sourceFormat: "png",
    targetFormat: "pdf",
    iconType: "image",
  },
  {
    id: "pdf-to-word",
    title: "PDF to Word (DOCX)",
    description: "Turn non-editable PDFs into fully editable Word documents",
    sourceFormat: "pdf",
    targetFormat: "docx",
    iconType: "pdf",
  },
  {
    id: "word-to-pdf",
    title: "Word to PDF",
    description: "Preserve layout, formatting, and fonts into reliable PDFs",
    sourceFormat: "docx",
    targetFormat: "pdf",
    iconType: "doc",
  },
  {
    id: "pdf-to-img",
    title: "PDF to Images",
    description: "Extract PDF pages as individual high-res PNG or JPG files",
    sourceFormat: "pdf",
    targetFormat: "png",
    iconType: "pdf",
  },
];
