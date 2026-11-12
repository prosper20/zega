import { ImageResponse } from "next/og";

import { AppLogo } from "@/components/app-logo";

export function createAppIcon(size: number) {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", color: "#246cff" }}>
      <AppLogo width={size} height={size} />
    </div>,
    { width: size, height: size },
  );
}
