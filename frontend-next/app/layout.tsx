import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import "./globals.css";
import { Providers } from "@/components/shared/providers";
import { ServiceWorkerRegistration } from "@/components/shared/service-worker-registration";

export const metadata: Metadata = {
  metadataBase: new URL("https://clockly.es"),
  applicationName: "ClockLy",
  title: {
    default: "ClockLy",
    template: "%s · ClockLy",
  },
  description: "Software de control horario y gestión de empleados para pymes en España.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ClockLy",
  },
  icons: {
    icon: [{ url: "/clockly-flow-icon.svg", type: "image/svg+xml" }],
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
