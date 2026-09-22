import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LaunchSplash } from "@/components/app/LaunchSplash";
import { ServiceWorker } from "@/components/app/ServiceWorker";
import { OfflineIndicator } from "@/components/app/OfflineIndicator";
import { CaptureSync } from "@/components/app/CaptureSync";

export const metadata: Metadata = {
  title: {
    default: "ParvizOS",
    template: "%s · ParvizOS",
  },
  description: "Личная операционная система: дела, проекты, финансы, учёба.",
  applicationName: "ParvizOS",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ParvizOS",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d10" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

// Ставим тему до первой отрисовки, чтобы не было вспышки светлого на тёмной теме.
const themeScript = `
(function () {
  try {
    var t = localStorage.getItem('parviz-theme');
    var dark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        {children}
        <LaunchSplash />
        <OfflineIndicator />
        <ServiceWorker />
        <CaptureSync />
      </body>
    </html>
  );
}
