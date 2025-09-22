/**
 * my_photo_diary/lib/media/storage.ts
 *
 * Utilities for saving/deleting images and generating thumbnails using Expo FileSystem
 * and ImageManipulator.
 *
 * Notes:
 * - Designed for mobile (Expo). Web handling (Blob/IndexedDB) is out-of-scope for this file
 *   but should be abstracted at a higher layer.
 * - This file does not call any network APIs. It only reads/writes local files.
 */

import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

export type SaveImageResult = {
  id: string;
  fileUri: string; // file://... or local URI
  thumbnailUri?: string | null;
  width?: number | null;
  height?: number | null;
};

const PHOTOS_DIR = `${FileSystem.documentDirectory}photos/`;
const THUMBS_DIR = `${PHOTOS_DIR}thumbnails/`;

/**
 * Generate a RFC4122 v4 UUID (simple implementation)
 */
function uuidv4(): string {
  // NOTE: crypto.getRandomValues would be preferable. This simple impl is ok for filenames.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    // eslint-disable-next-line no-bitwise
    const r = (Math.random() * 16) | 0;
    // eslint-disable-next-line no-bitwise
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Ensure that the app-specific photos directories exist.
 */
async function ensureDirectoriesExist(): Promise<void> {
  try {
    const photosInfo = await FileSystem.getInfoAsync(PHOTOS_DIR);
    if (!photosInfo.exists) {
      await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
    }
  } catch {
    // ignore; FileSystem may throw on some platforms — caller will observe failures later
  }

  try {
    const thumbsInfo = await FileSystem.getInfoAsync(THUMBS_DIR);
    if (!thumbsInfo.exists) {
      await FileSystem.makeDirectoryAsync(THUMBS_DIR, { intermediates: true });
    }
  } catch {
    // ignore
  }
}

/**
 * Extract file extension from a URI or filename. Returns a normalized extension without dot, e.g. 'jpg'
 */
function extractExtension(uri: string): string {
  try {
    const fragments = uri.split('?')[0].split('#')[0].split('.');
    if (fragments.length <= 1) return 'jpg';
    const ext = fragments[fragments.length - 1].toLowerCase();
    // sanitize
    if (ext.length > 0 && ext.length <= 5) {
      return ext;
    }
    return 'jpg';
  } catch {
    return 'jpg';
  }
}

/**
 * Create a destination path for an image file.
 */
function destinationPathForFileName(fileName: string): string {
  return `${PHOTOS_DIR}${fileName}`;
}

/**
 * Create a destination path for thumbnail.
 */
function destinationPathForThumb(fileName: string): string {
  return `${THUMBS_DIR}${fileName}`;
}

/**
 * Save an image to the app's photos directory.
 *
 * - sourceUri: local URI returned by camera/picker (file:// or content:// on Android).
 * - options:
 *    - generateThumbnail: boolean (default true)
 *    - thumbnailMaxSize: number (max width/height, default 200)
 *    - quality: 0..1 (default 0.9) — used for thumbnail compression
 *
 * Returns SaveImageResult with final fileUri and optional thumbnailUri.
 *
 * Important: This function attempts to copy the provided uri into the app's local storage.
 * If copying fails (platform-specific issues), it will try to move or fallback to returning
 * the original URI (but callers should prefer the copied URI).
 */
export async function saveImage(
  sourceUri: string,
  options?: {
    generateThumbnail?: boolean;
    thumbnailMaxSize?: number;
    quality?: number;
  }
): Promise<SaveImageResult> {
  const generateThumbnail = options?.generateThumbnail ?? true;
  const thumbnailMaxSize = options?.thumbnailMaxSize ?? 200;
  const quality = options?.quality ?? 0.9;

  await ensureDirectoriesExist();

  const id = uuidv4();
  const ext = extractExtension(sourceUri);
  const fileName = `${id}.${ext}`;
  const dest = destinationPathForFileName(fileName);
  let finalUri = dest;

  try {
    // Try copying the file to app directory. If sourceUri is already inside the app dir,
    // we still copy to create a canonical filename.
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
  } catch (err) {
    // If copy fails, try move (may fail on some platforms)
    try {
      await FileSystem.moveAsync({ from: sourceUri, to: dest });
    } catch (moveErr) {
      // As a last resort, if sourceUri is a file:// path and readable by app, fallback to keeping it.
      // But we prefer to throw so the caller can handle errors explicitly.
      // Return a helpful error message.
      throw new Error(
        `Failed to copy/move image to app storage. from=${sourceUri}, to=${dest}. ${String(
          (err && (err as any).message) || err
        )}`
      );
    }
  }

  // Optionally, generate thumbnail
  let thumbnailUri: string | null = null;
  if (generateThumbnail) {
    try {
      const thumbFileName = `${id}_thumb.jpg`;
      const thumbDest = destinationPathForThumb(thumbFileName);

      // Use ImageManipulator to resize and compress
      // First read image dimensions by loading and resizing; ImageManipulator returns the new size.
      const manipResult = await ImageManipulator.manipulateAsync(
        finalUri,
        [{ resize: { width: thumbnailMaxSize } }],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: false,
        }
      );

      // manipulateAsync may write to a temporary file path (manipResult.uri).
      // Move/copy it to our thumbnails dir to keep managed storage organized.
      try {
        await FileSystem.moveAsync({ from: manipResult.uri, to: thumbDest });
        thumbnailUri = thumbDest;
      } catch {
        // If move fails, try copy
        try {
          await FileSystem.copyAsync({ from: manipResult.uri, to: thumbDest });
          thumbnailUri = thumbDest;
          // Try deleting the temporary file (best-effort)
          try {
            await FileSystem.deleteAsync(manipResult.uri, { idempotent: true });
          } catch {
            // ignore
          }
        } catch {
          // If all fails, fallback to manipResult.uri
          thumbnailUri = manipResult.uri;
        }
      }
    } catch (thumbErr) {
      // Thumbnail generation failed — don't block the save; just log and continue.
      // eslint-disable-next-line no-console
      console.warn('Thumbnail generation failed:', thumbErr);
      thumbnailUri = null;
    }
  }

  // Optionally read width/height via ImageManipulator or FileSystem? ImageManipulator gives size on manipulate.
  // For simplicity, attempt a metadata read via ImageManipulator with zero-op manip to get dimensions.
  let width: number | null = null;
  let height: number | null = null;
  try {
    const info = await ImageManipulator.manipulateAsync(finalUri, [], { base64: false });
    if (info && (info as any).width && (info as any).height) {
      width = (info as any).width;
      height = (info as any).height;
    }
  } catch {
    // Ignore
  }

  return {
    id,
    fileUri: finalUri,
    thumbnailUri: thumbnailUri ?? null,
    width,
    height,
  };
}

/**
 * Delete image files (photo + thumbnail).
 * - photoUri: the primary file URI to delete (file://...)
 * - thumbnailUri: optional thumbnail URI to delete
 *
 * Returns an object describing deletion outcomes.
 */
export async function deleteImage(photoUri: string, thumbnailUri?: string | null): Promise<{
  photoDeleted: boolean;
  thumbnailDeleted?: boolean;
}> {
  let photoDeleted = false;
  let thumbnailDeleted: boolean | undefined = undefined;

  try {
    // deleteAsync with idempotent true will not throw if file doesn't exist (expo-file-system v11+).
    // But to be safe we wrap in try/catch.
    await FileSystem.deleteAsync(photoUri, { idempotent: true });
    photoDeleted = true;
  } catch (err) {
    // If deletion fails, log and continue
    // eslint-disable-next-line no-console
    console.warn('Failed to delete photo file:', photoUri, err);
    photoDeleted = false;
  }

  if (thumbnailUri) {
    try {
      await FileSystem.deleteAsync(thumbnailUri, { idempotent: true });
      thumbnailDeleted = true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to delete thumbnail file:', thumbnailUri, err);
      thumbnailDeleted = false;
    }
  }

  return { photoDeleted, thumbnailDeleted };
}

/**
 * Generate a thumbnail from an existing file URI and store it in thumbnails directory.
 * This can be used independently of saveImage.
 */
export async function generateThumbnailFromUri(
  sourceUri: string,
  options?: { maxSize?: number; quality?: number }
): Promise<string> {
  const maxSize = options?.maxSize ?? 200;
  const quality = options?.quality ?? 0.9;

  await ensureDirectoriesExist();

  const id = uuidv4();
  const thumbFileName = `${id}_thumb.jpg`;
  const thumbDest = destinationPathForThumb(thumbFileName);

  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      sourceUri,
      [{ resize: { width: maxSize } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false,
      }
    );

    try {
      await FileSystem.moveAsync({ from: manipResult.uri, to: thumbDest });
      return thumbDest;
    } catch {
      try {
        await FileSystem.copyAsync({ from: manipResult.uri, to: thumbDest });
        // best-effort cleanup of temp file
        try {
          await FileSystem.deleteAsync(manipResult.uri, { idempotent: true });
        } catch {
          // ignore
        }
        return thumbDest;
      } catch {
        // fallback: return temporary result uri
        return manipResult.uri;
      }
    }
  } catch (err) {
    throw new Error(`Thumbnail generation failed for ${sourceUri}: ${String(err)}`);
  }
}

/**
 * Utility: Move an existing file into app-managed photos directory and return the new URI.
 * This is similar to saveImage but will not attempt thumbnail generation.
 */
export async function importFileToPhotos(sourceUri: string): Promise<string> {
  await ensureDirectoriesExist();

  const id = uuidv4();
  const ext = extractExtension(sourceUri);
  const fileName = `${id}.${ext}`;
  const dest = destinationPathForFileName(fileName);

  try {
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
    return dest;
  } catch {
    try {
      await FileSystem.moveAsync({ from: sourceUri, to: dest });
      return dest;
    } catch (err) {
      throw new Error(`Failed to import file to photos: ${String(err)}`);
    }
  }
}

export default {
  saveImage,
  deleteImage,
  generateThumbnailFromUri,
  importFileToPhotos,
};
