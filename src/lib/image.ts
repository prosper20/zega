"use client";

// Resize to 1600px and re-encode as JPEG, which also strips EXIF (GPS) data.
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
  return new File([out], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
}
