import { Topbar } from "@/components/shared/topbar";

export default function SchedulesPage() {
  return (
    <>
      <Topbar title="Horarios" />
      <div className="flex h-[calc(100vh-70px)] items-center justify-center">
        <div className="text-center">
          <p className="text-5xl font-bold text-border-strong">⏳</p>
          <p className="mt-4 text-lg font-semibold text-ink">Próximamente</p>
          <p className="mt-2 text-sm text-ink-muted">
            Esta sección está en desarrollo.
          </p>
        </div>
      </div>
    </>
  );
}
