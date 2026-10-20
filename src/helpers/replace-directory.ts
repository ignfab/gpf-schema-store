import {
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
} from 'fs';
import { join } from 'path';

/*
 * =============================================================================
 * Directory replacement
 * =============================================================================
 */

/**
 * Replaces {parentDir}/{name} with the content written by `write`.
 *
 * The content is first written to a temporary directory, which is then
 * promoted (the previous directory is restored if the promotion fails).
 */
export function replaceDirectory(
  parentDir: string,
  name: string,
  write: (targetDir: string) => void,
): void {
  const targetRoot = join(parentDir, name);
  const nextRoot = join(parentDir, `.${name}-next-${process.pid}-${Date.now()}`);
  const previousRoot = join(parentDir, `.${name}-previous`);

  if (!existsSync(targetRoot) && existsSync(previousRoot)) {
    renameSync(previousRoot, targetRoot);
  }

  rmSync(nextRoot, { recursive: true, force: true });
  rmSync(previousRoot, { recursive: true, force: true });

  try {
    mkdirSync(nextRoot, { recursive: true });
    write(nextRoot);

    const hadPreviousSnapshot = existsSync(targetRoot);
    if (hadPreviousSnapshot) {
      renameSync(targetRoot, previousRoot);
    }

    try {
      renameSync(nextRoot, targetRoot);
    } catch (error) {
      if (hadPreviousSnapshot) {
        try {
          renameSync(previousRoot, targetRoot);
        } catch (restoreError) {
          throw new Error(
            `Failed to promote ${nextRoot} to ${targetRoot} and failed to restore previous snapshot from ${previousRoot}: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`,
            { cause: error },
          );
        }
      }
      throw error;
    }

    try {
      rmSync(previousRoot, { recursive: true, force: true });
    } catch {
      // The new snapshot is already promoted; retry stale backup cleanup on the next update.
    }
  } catch (error) {
    try {
      rmSync(nextRoot, { recursive: true, force: true });
    } catch {
      // Preserve the original failure; stale temp cleanup can be retried on the next update.
    }
    throw error;
  }
}
