import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/** Where uploaded evidence photos are stored. Injected into the API so tests can use memory. */
export type Storage = {
  put: (key: string, data: Uint8Array, contentType: string) => Promise<{ url: string; pathname: string }>;
};

/** Vercel Blob in production (BLOB_READ_WRITE_TOKEN set); the local public/uploads folder in development. */
export function defaultStorage(): Storage {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      put: async (key, data, contentType) => {
        const { put } = await import("@vercel/blob");
        const blob = await put(key, Buffer.from(data), { access: "public", contentType, addRandomSuffix: true });
        return { url: blob.url, pathname: blob.pathname };
      },
    };
  }
  return {
    put: async (key, data) => {
      if (process.env.VERCEL) throw new Error("Uploads need BLOB_READ_WRITE_TOKEN on Vercel.");
      const file = path.join(process.cwd(), "public", "uploads", key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, data);
      return { url: `/uploads/${key}`, pathname: key };
    },
  };
}

export function memoryStorage(): Storage & { files: Map<string, Uint8Array> } {
  const files = new Map<string, Uint8Array>();
  return {
    files,
    put: async (key, data) => {
      files.set(key, data);
      return { url: `https://files.test/${key}`, pathname: key };
    },
  };
}

/** Identifies an image by its first bytes (never trust the browser-supplied content type). */
export function sniffImage(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}
