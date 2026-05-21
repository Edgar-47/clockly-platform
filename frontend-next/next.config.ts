import type { NextConfig } from "next";

const NOINDEX_ROUTES = [
  "/dashboard/:path*",
  "/onboarding/:path*",
  "/employees/:path*",
  "/sessions/:path*",
  "/analytics/:path*",
  "/board/:path*",
  "/tickets/:path*",
  "/cash-closures/:path*",
  "/salaries/:path*",
  "/locations/:path*",
  "/work-locations/:path*",
  "/settings/:path*",
  "/upgrade/:path*",
  "/kiosk/:path*",
  "/employee/:path*",
  "/businesses/:path*",
  "/expenses/:path*",
  "/schedules/:path*",
  "/superadmin/:path*",
  "/access-unavailable/:path*",
  "/accept-invitation/:path*",
  "/reset-password/:path*",
];

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  async headers() {
    if (process.env.NODE_ENV !== "production") return [];

    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      ...NOINDEX_ROUTES.map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Clock-in/out and work-location setup use navigator.geolocation on this origin.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
  async rewrites() {
    // API_URL_INTERNAL: server-to-server proxy destination.
    //   Production on Fly.io currently uses https://api.clockly.es so requests
    //   go through fly-proxy instead of direct 6PN machine networking.
    // NEXT_PUBLIC_API_URL: public-facing API origin baked into client bundles and CSP.
    //   Production: https://api.clockly.es
    // Local dev: neither is set, falls back to http://127.0.0.1:8010.
    const apiBase =
      process.env.API_URL_INTERNAL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://127.0.0.1:8010";
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
