"use client";

import { useEffect, useRef } from "react";

const SRC = "/videos/fault-to-fixed.mp4";
const POSTER = "/videos/fault-to-fixed.jpg";

/**
 * Decorative looping background for the "From fault to fixed" panel.
 * Loads only when near the viewport, pauses off-screen and stays on the poster for reduced motion.
 */
export function FaultToFixedVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!video.src) video.src = SRC;
          if (!reduced) void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      aria-hidden="true"
      tabIndex={-1}
      poster={POSTER}
      muted
      loop
      playsInline
      preload="none"
      className="absolute inset-0 size-full object-cover"
    />
  );
}
