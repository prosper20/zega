"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "cn";
import { Camera, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

/** Drag-and-drop or camera capture, with previews. Photos are compressed when the request is submitted. */
export function PhotoPicker({ files, onChange, max }: { files: File[]; onChange: (f: File[]) => void; max: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(
    () => () => {
      for (const u of previews) URL.revokeObjectURL(u);
    },
    [previews],
  );

  function add(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.length >= max) {
        toast.error(`You can attach up to ${max} photos.`);
        break;
      }
      if (!ACCEPT.includes(f.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(f.name)) {
        toast.error(`${f.name} is not a photo.`);
        continue;
      }
      if (f.size > MAX_INPUT_BYTES) {
        toast.error(`${f.name} is larger than 20 MB.`);
        continue;
      }
      next.push(f);
    }
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">Photos (optional)</span>
        <span className="text-muted-foreground text-xs">
          {files.length}/{max} · location data is removed before upload
        </span>
      </div>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drop target only; the "Add photo" button is the keyboard path */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        }}
        className={cn(
          "grid grid-cols-3 gap-2 rounded-xl border-2 border-dashed p-3 sm:grid-cols-5",
          dragging && "border-primary bg-accent",
        )}
      >
        {previews.map((src, i) => (
          <div key={src} className="group relative aspect-square overflow-hidden rounded-lg border">
            {/* biome-ignore lint/performance/noImgElement: local object URL preview */}
            <img src={src} alt={`Attachment ${i + 1} preview`} className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label={`Remove photo ${i + 1}`}
              onClick={() => onChange(files.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-90 hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {files.length < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="text-muted-foreground hover:text-foreground hover:bg-muted flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border text-xs"
          >
            {files.length === 0 ? <Camera className="size-5" /> : <ImagePlus className="size-5" />}
            Add photo
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
