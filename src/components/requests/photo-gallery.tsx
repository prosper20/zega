"use client";

import { useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Attachment } from "@/lib/queries";

const LABEL = { evidence: "Reported", before: "Before", after: "After" } as const;

export function PhotoGallery({ photos }: { photos: Attachment[] }) {
  const [open, setOpen] = useState<Attachment | null>(null);
  if (!photos.length) return null;
  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpen(p)}
            className="group relative aspect-square overflow-hidden rounded-lg border"
          >
            {/* biome-ignore lint/performance/noImgElement: user uploads from blob storage */}
            <img
              src={p.url}
              alt={`${LABEL[p.kind]} by ${p.uploadedBy.name}`}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {LABEL[p.kind]}
            </span>
          </button>
        ))}
      </div>
      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">Photo</DialogTitle>
          {open && (
            // biome-ignore lint/performance/noImgElement: user uploads from blob storage
            <img
              src={open.url}
              alt={`${LABEL[open.kind]}, full size`}
              className="max-h-[80vh] w-full rounded object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
