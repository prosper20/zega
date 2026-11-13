"use client";

/**
 * Prepares a photo for upload in the browser: resizes to at most 1600px, re-encodes as JPEG
 * (which drops EXIF data such as GPS location) and keeps it well under the 3 MB server limit.
 */
export async function preparePhoto(file: File): Promise<File> {
  const { default: imageCompression } = await import("browser-image-compression");
  const out = await imageCompression(file, {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1600,
    fileType: "image/jpeg",
    initialQuality: 0.82,
    useWebWorker: true,
    preserveExif: false,
  });
  return new File([out], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}
