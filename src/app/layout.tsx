import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { NoFlashScript } from "@/components/color-theme";

export const metadata: Metadata = {
  title: "Duddify — Expense Tracker",
  description: "Track expenses, income & investments together. Works on iOS, Android, web.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Duddify",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0e" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Duddify" />
        <meta name="application-name" content="Duddify" />
        <script dangerouslySetInnerHTML={{ __html: NoFlashScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans">
        <Providers>{children}</Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              /*
               * 2026-05-13 — Service Worker disabled while we recover from
               * a caching outage. We do NOT register a new SW. We DO
               * proactively unregister any existing SW that the browser
               * still has from a previous build, and we clear all Cache
               * Storage entries. After this script runs the page serves
               * straight from the network on every load.
               */
              (function () {
                if (!('serviceWorker' in navigator)) return;
                try {
                  navigator.serviceWorker.getRegistrations().then(function (regs) {
                    regs.forEach(function (r) { try { r.unregister(); } catch(e){} });
                  }).catch(function(){});
                } catch (e) {}
                try {
                  if ('caches' in window) {
                    caches.keys().then(function (keys) {
                      keys.forEach(function (k) { try { caches.delete(k); } catch(e){} });
                    }).catch(function(){});
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
