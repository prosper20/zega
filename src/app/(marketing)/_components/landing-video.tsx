"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "cn";

import type { MediaSlot } from "./media";

type Canvas = { w: number; h: number };

const LANDSCAPE: Canvas = { w: 640, h: 360 };

/**
 * Lazy, muted, looping product video.
 * - Loads only when scrolled into view (IntersectionObserver) and pauses when off-screen.
 * - Honours prefers-reduced-motion (shows poster or fallback instead of playing).
 * - Falls back to an animated UI mock while no recording exists.
 *
 * `chrome` adds a browser title bar. `canvas` sets the mock's design size (default 640x360);
 * pass a portrait canvas for phone frames.
 */
export function LandingVideo({
  slot,
  fallback,
  className,
  chrome = true,
  canvas = LANDSCAPE,
}: {
  slot: MediaSlot;
  fallback: ReactNode;
  className?: string;
  chrome?: boolean;
  canvas?: Canvas;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video || !slot.src) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!video.src) video.src = slot.src as string;
          if (!reduced) void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [slot.src]);

  const showVideo = Boolean(slot.src) && !failed;

  return (
    <figure
      className={cn("bg-card text-card-foreground relative overflow-hidden rounded-xl border shadow-lg", className)}
    >
      {chrome && (
        <div className="bg-muted/60 flex items-center gap-1.5 border-b px-4 py-2.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
          <span className="text-muted-foreground bg-background ml-3 rounded-md px-3 py-0.5 text-[11px]">zega.app</span>
        </div>
      )}
      {showVideo ? (
        <video
          ref={ref}
          className="block w-full object-cover"
          style={{ aspectRatio: `${canvas.w} / ${canvas.h}` }}
          muted
          loop
          playsInline
          preload="none"
          poster={slot.poster}
          aria-label={slot.label}
          onError={() => setFailed(true)}
        />
      ) : (
        <ScaledMock label={slot.label} canvas={canvas}>
          {fallback}
        </ScaledMock>
      )}
    </figure>
  );
}

/** Lays the mock out on a fixed design canvas and scales it to the frame, like a video would. */
function ScaledMock({ label, canvas, children }: { label: string; canvas: Canvas; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / canvas.w));
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvas.w]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: `${canvas.w} / ${canvas.h}` }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: canvas.w, height: canvas.h, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
