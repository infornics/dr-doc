export type FileCategory = "document" | "image" | "ebook" | "archive";

export type ConversionFormat = {
  extension: string;
  label: string;
  category: FileCategory;
  mimeType?: string;
};

export type FileStatus = "idle" | "converting" | "completed" | "error";

export type ConverterItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  sourceFormat: string;
  targetFormat: string;
  status: FileStatus;
  progress: number;
  downloadUrl?: string;
  downloadFilename?: string;
  error?: string;
};

export type PresetConversion = {
  id: string;
  title: string;
  description: string;
  sourceFormat: string;
  targetFormat: string;
  iconType: "doc" | "image" | "pdf";
};

