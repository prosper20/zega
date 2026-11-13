import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => cleanup());

const noop = () => undefined;

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: noop,
      removeListener: noop,
      addEventListener: noop,
      removeEventListener: noop,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

class NoopObserver {
  observe = noop;
  unobserve = noop;
  disconnect = noop;
  takeRecords = () => [];
}
globalThis.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver ??= NoopObserver as unknown as typeof IntersectionObserver;

// Next.js navigation is not available in jsdom: provide a router that records calls.
vi.mock("next/navigation", async () => {
  const { routerMock } = await import("./router");
  return { useRouter: () => routerMock, usePathname: () => "/dashboard", useSearchParams: () => new URLSearchParams() };
});
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));
