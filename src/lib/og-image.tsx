import { ImageResponse } from "next/og";

import { wordmarkSvg } from "@/components/app-logo";

import { readFile } from "node:fs/promises";
import path from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };

const NAVY = "#001e40";
const BLUE = "#246cff";
const PALE = "#e8efff";

function Step({ label, done, current }: { label: string; done: boolean; current?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 92 }}>
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: done ? BLUE : "#ffffff",
          border: `3px solid ${done ? BLUE : "#c9d3e3"}`,
          color: "#ffffff",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {done && (
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              fill="none"
              stroke="#ffffff"
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div style={{ fontSize: 15, color: current ? NAVY : "#4c6177", fontWeight: current ? 700 : 500 }}>{label}</div>
    </div>
  );
}

/** Inter (the interface typeface) bundled with the app so social cards match the product. */
async function loadFonts() {
  const dir = path.join(process.cwd(), "src/lib/og-fonts");
  const [regular, semibold, extrabold] = await Promise.all(
    ["inter-latin-400-normal.woff", "inter-latin-600-normal.woff", "inter-latin-800-normal.woff"].map((f) =>
      readFile(path.join(dir, f)),
    ),
  );
  return [
    { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: semibold, weight: 600 as const, style: "normal" as const },
    { name: "Inter", data: extrabold, weight: 800 as const, style: "normal" as const },
  ];
}

export async function renderOgImage({ headline, subline }: { headline: string; subline: string }) {
  const fonts = await loadFonts();
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: NAVY,
        backgroundImage:
          "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
        backgroundSize: "56px 56px",
        padding: 64,
        fontFamily: "Inter",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 560 }}>
        {wordmarkSvg("#ffffff", BLUE, 210)}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 58, lineHeight: 1.08, fontWeight: 800, color: "#ffffff", letterSpacing: -1.5 }}>
            {headline}
          </div>
          <div style={{ fontSize: 26, lineHeight: 1.35, color: PALE }}>{subline}</div>
        </div>
        <div style={{ fontSize: 22, color: "#8fb0ff", fontWeight: 600 }}>Report it. Track it. Resolve it.</div>
      </div>

      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            width: 470,
            background: "#ffffff",
            borderRadius: 18,
            padding: 30,
            boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 17, color: "#4c6177", fontWeight: 600, letterSpacing: 1 }}>ZG-26-000412</div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#9a5b00",
                background: "#fff1d6",
                borderRadius: 999,
                padding: "6px 14px",
              }}
            >
              In progress
            </div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: NAVY, lineHeight: 1.15 }}>
            Leaking pipe in the shower block
          </div>
          <div style={{ fontSize: 18, color: "#4c6177" }}>Moremi Hall › Floor 2 · Plumbing · High priority</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <Step label="Reported" done />
            <Step label="Assigned" done />
            <Step label="Working" done current />
            <Step label="Resolved" done={false} />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "2px solid #e5e8ec",
              paddingTop: 16,
              fontSize: 17,
              color: "#4c6177",
            }}
          >
            <div style={{ display: "flex" }}>Officer: Chinedu Okeke</div>
            <div style={{ display: "flex", color: "#027a48", fontWeight: 600 }}>3h 12m left</div>
          </div>
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts },
  );
}
