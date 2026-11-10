export interface DropzoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  disabled?: boolean;
}
