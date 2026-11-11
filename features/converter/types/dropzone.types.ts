export interface DropzoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  disabled?: boolean;
  accept?: string;
  allowedExtensions?: string[];
  title?: string;
  subtitle?: string;
}
