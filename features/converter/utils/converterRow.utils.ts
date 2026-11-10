import { ConverterRowProps } from "../types/converterRow.types";
import { formatFileSize, getAvailableTargetFormats } from "../utils";

export function getConverterRowData(item: ConverterRowProps["item"]) {
  const availableFormats = getAvailableTargetFormats(item.sourceFormat);
  const isImage = ["png", "jpg", "jpeg", "webp", "svg", "heic"].includes(
    item.sourceFormat.toLowerCase()
  );
  const formattedSize = formatFileSize(item.size);
  const downloadFileName = `${item.name.replace(/\.[^/.]+$/, "")}.${item.targetFormat}`;

  return {
    availableFormats,
    isImage,
    formattedSize,
    downloadFileName,
  };
}

