import { useConverterStore } from "../stores/converter.store";

export function useConverter() {
  const items = useConverterStore((state) => state.items);
  const isProcessing = useConverterStore((state) => state.isProcessing);
  const addFiles = useConverterStore((state) => state.addFiles);
  const removeFile = useConverterStore((state) => state.removeFile);
  const clearAll = useConverterStore((state) => state.clearAll);
  const updateTargetFormat = useConverterStore(
    (state) => state.updateTargetFormat
  );
  const setGlobalTargetFormat = useConverterStore(
    (state) => state.setGlobalTargetFormat
  );
  const convertItem = useConverterStore((state) => state.convertItem);
  const convertAll = useConverterStore((state) => state.convertAll);

  return {
    items,
    isProcessing,
    addFiles,
    removeFile,
    clearAll,
    updateTargetFormat,
    setGlobalTargetFormat,
    convertItem,
    convertAll,
  };
}
