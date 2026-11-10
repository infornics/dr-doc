import { ConverterFileListProps } from "../types/converterFileList.types";

export function getFileListSummary(items: ConverterFileListProps["items"]) {
  const completedCount = items.filter((i) => i.status === "completed").length;
  const idleCount = items.filter((i) => i.status === "idle").length;
  const allCompleted = completedCount === items.length && items.length > 0;

  const downloadAll = () => {
    items.forEach((item) => {
      if (item.downloadUrl) {
        const link = document.createElement("a");
        link.href = item.downloadUrl;
        link.download =
          item.downloadFilename || `${item.name.replace(/\.[^/.]+$/, "")}.${item.targetFormat}`;
        link.click();
      }
    });
  };

  return {
    completedCount,
    idleCount,
    allCompleted,
    downloadAll,
  };
}

