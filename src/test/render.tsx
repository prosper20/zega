import type { ReactElement, ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";

function TestProviders({
  client,
  searchParams,
  children,
}: {
  client: QueryClient;
  searchParams: string;
  children: ReactNode;
}) {
  return (
    <QueryClientProvider client={client}>
      <NuqsTestingAdapter searchParams={searchParams}>{children}</NuqsTestingAdapter>
    </QueryClientProvider>
  );
}

/** Renders a component with the same providers as the app (React Query + URL state), isolated per test. */
export function renderWithProviders(ui: ReactElement, { searchParams = "" }: { searchParams?: string } = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false }, mutations: { retry: false } },
  });
  return {
    client,
    ...render(
      <TestProviders client={client} searchParams={searchParams}>
        {ui}
      </TestProviders>,
    ),
  };
}
