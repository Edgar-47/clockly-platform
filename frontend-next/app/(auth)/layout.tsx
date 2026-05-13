import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export const metadata: Metadata = {
  title: "Acceso",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-surface-bg bg-auth-pattern px-4 py-12 overflow-hidden">
      {/* Subtle background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/4 blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full max-w-[400px] flex-col items-center">
        <Link href="/" className="mb-8 transition-opacity hover:opacity-80">
          <Logo size="md" />
        </Link>

        {children}

        <p className="mt-8 text-[11px] text-ink-xmuted">
          © {new Date().getFullYear()} ClockLy · Control horario para negocios
        </p>
      </div>
    </div>
  );
}
