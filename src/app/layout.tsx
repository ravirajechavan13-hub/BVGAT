import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "BVGAT Sagar Complex Store • Inventory & Stock Management",
  description:
    "BVGAT Sagar Complex Store — Inward Entry, Outward Entry, Main Stock, Serial-wise Stock & Monthly Excel Reports. Android APK ready (Capacitor).",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BVGAT Sagar Store",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#15803d",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href="/icons/icon-512.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-512.png" />
      </head>
      <body className="h-full bg-slate-50 text-slate-900 antialiased selection:bg-green-600 selection:text-white">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
