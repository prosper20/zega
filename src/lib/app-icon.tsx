import { ImageResponse } from "next/og";

import { AppLogo } from "@/components/app-logo";

export function createAppIcon(size: number) {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <AppLogo width={size} height={size} tile="#246cff" />
    </div>,
    { width: size, height: size },
  );
}
