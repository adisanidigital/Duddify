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
               * 2026-05-13 — Service Worker temporarily disabled while we
               * recover from a caching outage. We still REGISTER /sw.js so
               * existing PWAs pick up the killswitch SW (which unregisters
               * itself + clears all caches), but we do not re-register any
               * SW afterwards. Once we've verified the app is back up, this
               * block will be reinstated with a safer SW design.
               */
              (function () {
                if (!('serviceWorker' in navigator)) return;
                var refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', function () {
                  if (refreshing) return;
                  refreshing = true;
                  window.location.reload();
                });
                // One-shot registration: triggers the killswitch SW for
                // anyone who has the old one cached. After the killswitch
                // unregisters, nothing else registers a SW — the page
                // serves from the network on every load.
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js').catch(function(){});
                  // Also proactively unregister any leftover SWs that the
                  // browser might still consider "controlling" — defence in
                  // depth for browsers that don't honour the killswitch
                  // self-unregister cleanly.
                  navigator.serviceWorker.getRegistrations().then(function (regs) {
                    setTimeout(function () {
                      regs.forEach(function (r) { try { r.update(); } catch(e){} });
                    }, 1500);
                  }).catch(function(){});
                });
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
