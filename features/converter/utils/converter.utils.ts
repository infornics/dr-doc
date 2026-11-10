import {
  DEFAULT_TARGET_BY_SOURCE,
  FORMAT_CONVERSION_MAP,
  SUPPORTED_FORMATS,
} from "../constants";

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  if (parts.length <= 1) return "";
  return parts.pop()?.toLowerCase() || "";
}

export function getAvailableTargetFormats(sourceFormat: string): string[] {
  const lower = sourceFormat.toLowerCase();
  if (FORMAT_CONVERSION_MAP[lower]) {
    return FORMAT_CONVERSION_MAP[lower];
  }
  // Fallback defaults: all formats except the source
  return SUPPORTED_FORMATS.map((f) => f.extension).filter(
    (ext) => ext !== lower,
  );
}

export function getDefaultTargetFormat(sourceFormat: string): string {
  const lower = sourceFormat.toLowerCase();
  return DEFAULT_TARGET_BY_SOURCE[lower] || (lower === "pdf" ? "docx" : "pdf");
}
