import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/register-company", "/forgot-password", "/reset-password", "/accept-invitation", "/privacy", "/terms"];
const SESSION_COOKIES = ["clockly_access", "clockly_refresh"];
const LEAFLET_IMAGE_SOURCES = ["https://unpkg.com", "https://*.tile.openstreetmap.org"];
const GOOGLE_FONT_SOURCES = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIES.some((cookie) => Boolean(request.cookies.get(cookie)?.value));
}

function shouldBypassMiddleware(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/sw.js" ||
    pathname.includes(".")
  );
}

function buildCsp(request: NextRequest): { nonce: string; value: string } | null {
  if (process.env.NODE_ENV !== "production") return null;

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8010";
  const apiOrigin = new URL(apiBase, request.url).origin;

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Existing Leaflet/chart surfaces still use controlled inline style attributes.
    `style-src 'self' 'unsafe-inline' ${GOOGLE_FONT_SOURCES[0]}`,
    `img-src 'self' data: blob: ${LEAFLET_IMAGE_SOURCES.join(" ")}`,
    `font-src 'self' data: ${GOOGLE_FONT_SOURCES[1]}`,
    `connect-src 'self' ${apiOrigin}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];

  return { nonce, value: directives.join("; ") };
}

function nextWithCsp(request: NextRequest, csp: { nonce: string; value: string } | null): NextResponse {
  if (!csp) return NextResponse.next();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", csp.nonce);
  requestHeaders.set("Content-Security-Policy", csp.value);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("Content-Security-Policy", csp.value);
  return response;
}

function redirectWithCsp(url: URL, csp: { nonce: string; value: string } | null): NextResponse {
  const response = NextResponse.redirect(url);
  if (csp) response.headers.set("Content-Security-Policy", csp.value);
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldBypassMiddleware(pathname)) {
    return NextResponse.next();
  }

  const csp = buildCsp(request);
  const hasSession = hasSessionCookie(request);

  if (!hasSession && !isPublic(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return redirectWithCsp(loginUrl, csp);
  }

  if (hasSession && (pathname === "/" || pathname === "/login")) {
    return redirectWithCsp(new URL("/dashboard", request.url), csp);
  }

  return nextWithCsp(request, csp);
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|sw.js|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
