"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

type RouteErrorFallbackProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  description: string;
  homeHref?: string;
  homeLabel?: string;
};

export function RouteErrorFallback({
  error,
  reset,
  title,
  description,
  homeHref = "/dashboard",
  homeLabel = "Ir al dashboard",
}: RouteErrorFallbackProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-bg px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-border bg-white p-6 text-center shadow-sm">
        <Logo size="md" className="mb-6 justify-center" />
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-danger-border bg-danger-bg text-danger-DEFAULT">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button type="button" onClick={reset}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Reintentar
          </Button>
          <Button asChild type="button" variant="secondary">
            <Link href={homeHref}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {homeLabel}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
