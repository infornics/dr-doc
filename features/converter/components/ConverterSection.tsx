"use client";

import { useConverter } from "../hooks/useConverter";
import Dropzone from "./Dropzone";
import ConverterFileList from "./ConverterFileList";

export default function ConverterSection() {
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
      <Dropzone onFilesSelected={addFiles} disabled={isProcessing} />

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

