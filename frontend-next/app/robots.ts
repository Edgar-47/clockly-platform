import type { MetadataRoute } from "next";

const SITE_URL = "https://app.clockly.es";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/register-company", "/login"],
        disallow: [
          "/api/",
          "/_next/",
          "/dashboard/",
          "/onboarding/",
          "/employees/",
          "/sessions/",
          "/analytics/",
          "/tickets/",
          "/cash-closures/",
          "/salaries/",
          "/locations/",
          "/work-locations/",
          "/settings/",
          "/upgrade/",
          "/kiosk/",
          "/employee/",
          "/businesses/",
          "/expenses/",
          "/schedules/",
          "/superadmin/",
          "/access-unavailable/",
          "/accept-invitation/",
          "/reset-password/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
