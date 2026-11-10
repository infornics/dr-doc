import { ConverterItem } from "./converter.types";

export interface ConverterFileListProps {
  items: ConverterItem[];
  isProcessing: boolean;
  onRemove: (id: string) => void;
  onFormatChange: (id: string, format: string) => void;
  onConvert: (id: string) => void;
  onConvertAll: () => void;
  onClearAll: () => void;
  onGlobalFormatChange: (format: string) => void;
}
