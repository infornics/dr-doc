"use client";

import { useConverter } from "../hooks/useConverter";
import Dropzone from "./Dropzone";
import ConverterFileList from "./ConverterFileList";

interface ConverterSectionProps {
  allowedExtensions?: string[];
  accept?: string;
  dropzoneTitle?: string;
  dropzoneSubtitle?: string;
}

export default function ConverterSection({
  allowedExtensions,
  accept,
  dropzoneTitle,
  dropzoneSubtitle,
}: ConverterSectionProps = {}) {
  const {
    items,
    isProcessing,
    addFiles,
    removeFile,
    clearAll,
    updateTargetFormat,
    setGlobalTargetFormat,
    convertItem,
    convertAll,
  } = useConverter();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Dropzone
        onFilesSelected={addFiles}
        disabled={isProcessing}
        allowedExtensions={allowedExtensions}
        accept={accept}
        title={dropzoneTitle}
        subtitle={dropzoneSubtitle}
      />

      <ConverterFileList
        items={items}
        isProcessing={isProcessing}
        onRemove={removeFile}
        onFormatChange={updateTargetFormat}
        onConvert={convertItem}
        onConvertAll={convertAll}
        onClearAll={clearAll}
        onGlobalFormatChange={setGlobalTargetFormat}
      />
    </div>
  );
}

