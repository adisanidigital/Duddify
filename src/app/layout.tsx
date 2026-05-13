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
              (function () {
                if (!('serviceWorker' in navigator)) return;
                var refreshing = false;
                // When a new SW takes control, reload once so the page gets
                // the latest JS chunks. Without this, users on installed
                // PWAs stay on the old build until they manually kill +
                // reopen the app — the "stuck on grey grid" bug.
                navigator.serviceWorker.addEventListener('controllerchange', function () {
                  if (refreshing) return;
                  refreshing = true;
                  window.location.reload();
                });
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js').then(function (reg) {
                    // Tell any waiting SW to take over immediately.
                    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                    reg.addEventListener('updatefound', function () {
                      var nw = reg.installing;
                      if (!nw) return;
                      nw.addEventListener('statechange', function () {
                        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                          nw.postMessage({ type: 'SKIP_WAITING' });
                        }
                      });
                    });
                    // Periodically poll for updates while the tab is open.
                    setInterval(function () { reg.update().catch(function(){}); }, 60000);
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
