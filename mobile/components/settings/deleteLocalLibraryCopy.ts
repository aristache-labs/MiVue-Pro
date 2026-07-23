import { formatMediaSizeMbGb } from "@/components/camera/cameraLibraryModel";
import {
  deleteLocalPartialMessage,
  deleteLocalSuccessMessage,
  localFilesNoun,
} from "@/components/local/localCopy";

/** Confirm dialog body for wiping the on-device Local library. */
export function deleteLocalLibraryConfirmMessage(count: number, bytes: number): string {
  const size = formatMediaSizeMbGb(bytes);
  return `This will permanently delete ${count} ${localFilesNoun(count)} using ${size}. Files exported outside Laneory will not be affected. This cannot be undone.`;
}

/** Confirm button label — includes count for singular and plural. */
export function deleteLocalLibraryConfirmButton(count: number): string {
  return count === 1 ? "Delete 1 file" : `Delete ${count} files`;
}

export function deleteLocalLibraryResultMessage(
  deleted: number,
  failed: number,
): string {
  if (deleted > 0 && failed === 0) return deleteLocalSuccessMessage(deleted);
  if (deleted > 0 && failed > 0) return deleteLocalPartialMessage(deleted, failed);
  return "Local library could not be deleted. Please try again.";
}

export type DeleteLocalLibraryBusyGate = { current: boolean };

/**
 * Runs the local-only batch delete with a busy gate (double-tap protection).
 * Cancel never reaches this — only the confirm button should call it.
 */
export async function runDeleteLocalLibraryBatch<T>(
  gate: DeleteLocalLibraryBusyGate,
  files: readonly T[],
  deleteBatch: (files: readonly T[]) => Promise<{ deleted: number; failed: number }>,
): Promise<
  | { readonly skipped: true }
  | {
      readonly skipped: false;
      readonly deleted: number;
      readonly failed: number;
      readonly message: string;
    }
> {
  if (gate.current || files.length === 0) {
    return { skipped: true };
  }
  gate.current = true;
  try {
    const result = await deleteBatch(files);
    return {
      skipped: false,
      deleted: result.deleted,
      failed: result.failed,
      message: deleteLocalLibraryResultMessage(result.deleted, result.failed),
    };
  } finally {
    gate.current = false;
  }
}

export function isDeleteLocalLibraryDisabled(
  fileCount: number,
  deleting: boolean,
): boolean {
  return fileCount === 0 || deleting;
}

export function deleteLocalLibrarySubtitle(fileCount: number): string {
  return fileCount === 0
    ? "No local files to delete"
    : "Delete all downloaded recordings and photos from this device";
}
