"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "cn";

import type { MediaSlot } from "./media";

/**
 * Lazy, muted, looping product video in a browser-style frame.
 * - Loads only when scrolled into view (IntersectionObserver), pauses when off-screen.
 * - Honours prefers-reduced-motion (shows poster / fallback instead of playing).
 * - Falls back to an animated UI mock while no recording exists.
 */
export function LandingVideo({
  slot,
  fallback,
  className,
  chrome = true,
}: {
  slot: MediaSlot;
  fallback: ReactNode;
  className?: string;
  chrome?: boolean;
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
      className={cn(
        "bg-card relative overflow-hidden rounded-2xl border shadow-xl shadow-primary/5 ring-1 ring-black/5",
        className,
      )}
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
          className="block aspect-video w-full object-cover"
          muted
          loop
          playsInline
          preload="none"
          poster={slot.poster}
          aria-label={slot.label}
          onError={() => setFailed(true)}
        />
      ) : (
        <ScaledMock label={slot.label}>{fallback}</ScaledMock>
      )}
    </figure>
  );
}

const MOCK_W = 640;
const MOCK_H = 360;

/** Lays the mock out on a fixed 640x360 canvas and scales it to the frame, like a video would. */
function ScaledMock({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / MOCK_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} role="img" aria-label={label} className="relative aspect-video w-full overflow-hidden">
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: MOCK_W, height: MOCK_H, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
