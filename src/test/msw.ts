import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

/** Mock Service Worker in Node: component tests talk to a fake API over real fetch calls. */
export const server = setupServer();

export function setupMswServer() {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}
