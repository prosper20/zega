import { vi } from "vitest";

/** Records Next.js router calls made by components under test. */
export const routerMock = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() };
