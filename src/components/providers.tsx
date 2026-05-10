"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ColorThemeProvider } from "@/components/color-theme";
import { PrivacyProvider } from "@/lib/privacy";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <ColorThemeProvider>
        <PrivacyProvider>
          <QueryClientProvider client={client}>
            {children}
            <Toaster richColors position="top-center" closeButton />
          </QueryClientProvider>
        </PrivacyProvider>
      </ColorThemeProvider>
    </NextThemesProvider>
  );
}
