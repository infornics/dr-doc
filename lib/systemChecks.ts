import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

let libreOfficeAvailable: boolean | null = null;
let popplerAvailable: boolean | null = null;

/**
 * Checks if the libreoffice CLI binary is installed and executable on the host
 */
export async function hasLibreOffice(): Promise<boolean> {
  if (libreOfficeAvailable !== null) return libreOfficeAvailable;
  try {
    await execAsync("libreoffice --version");
    libreOfficeAvailable = true;
  } catch {
    libreOfficeAvailable = false;
  }
  return libreOfficeAvailable;
}

/**
 * Checks if poppler-utils (pdftoppm) is installed on the host
 */
export async function hasPoppler(): Promise<boolean> {
  if (popplerAvailable !== null) return popplerAvailable;
  try {
    await execAsync("pdftoppm -v");
    popplerAvailable = true;
  } catch {
    popplerAvailable = false;
  }
  return popplerAvailable;
}

