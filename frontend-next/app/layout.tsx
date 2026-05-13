import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import "./globals.css";
import { Providers } from "@/components/shared/providers";
import { ServiceWorkerRegistration } from "@/components/shared/service-worker-registration";

export const metadata: Metadata = {
  title: {
    default: "ClockLy",
    template: "%s · ClockLy",
  },
  description: "Sistema de control horario y gestión de empleados para negocios modernos.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ClockLy",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563EB",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await connection();

  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
