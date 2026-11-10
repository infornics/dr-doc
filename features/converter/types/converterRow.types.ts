import { ConverterItem } from "./converter.types";

export interface ConverterRowProps {
  item: ConverterItem;
  onRemove: (id: string) => void;
  onFormatChange: (id: string, format: string) => void;
  onConvert: (id: string) => void;
  disabled?: boolean;
}
