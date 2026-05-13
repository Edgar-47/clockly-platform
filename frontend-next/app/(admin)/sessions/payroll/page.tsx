"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Info } from "lucide-react";
import { useMe } from "@/hooks/use-auth";
import { Topbar } from "@/components/shared/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ExportTarget = "generic" | "a3" | "holded";
type ExportFormat = "xlsx" | "csv";

const TARGETS: { label: string; value: ExportTarget; description: string }[] = [
  { label: "Genérico", value: "generic", description: "Excel estándar con todas las columnas" },
  { label: "A3 Nómina", value: "a3", description: "CSV con formato compatible con A3 Nomina" },
  { label: "Holded", value: "holded", description: "Excel con columnas estándar de Holded" },
];

export default function PayrollExportPage() {
  const me = useMe();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [target, setTarget] = useState<ExportTarget>("generic");
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasExports = me.data?.company.has_exports ?? false;

  const monthName = new Date(year, month - 1, 1).toLocaleString("es", {
    month: "long",
    year: "numeric",
  });

  const handleDownload = async () => {
    setError(null);
    setLoading(true);
    try {
      const fmt = target === "a3" ? "csv" : format;
      const url = `/api/exports/payroll?year=${year}&month=${month}&format=${fmt}&target=${target}`;
      const resp = await fetch(url, { credentials: "include" });
      if (!resp.ok) {
        const json = await resp.json().catch(() => ({}));
        throw new Error(json?.detail ?? `Error ${resp.status}`);
      }
      const blob = await resp.blob();
      const disposition = resp.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1] ?? `clockly-nomina-${year}-${String(month).padStart(2, "0")}.${fmt}`;
      const href = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), { href, download: filename }).click();
      URL.revokeObjectURL(href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al exportar");
    } finally {
      setLoading(false);
    }
  };

  const currentFmt = target === "a3" ? "csv" : format;

  return (
    <>
      <Topbar title="Exportar nómina" />
      <div className="space-y-5 p-4 sm:p-6">
        {!hasExports && (
          <div className="rounded-md border border-warning-border bg-warning-bg px-3.5 py-2.5 text-[13px] text-warning-DEFAULT">
            Las exportaciones están disponibles en los planes Pro y Business.
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            {/* Period selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Periodo de nómina</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-ink-muted" htmlFor="payroll-year">
                    Año
                  </label>
                  <select
                    id="payroll-year"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-ink-muted" htmlFor="payroll-month">
                    Mes
                  </label>
                  <select
                    id="payroll-month"
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {new Date(2024, m - 1, 1).toLocaleString("es", { month: "long" })}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Format target */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Software de nóminas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {TARGETS.map((t) => (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => setTarget(t.value)}
                    className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                      target === t.value
                        ? "border-primary bg-primary/5 text-ink"
                        : "border-border bg-surface text-ink-muted hover:border-primary/40 hover:text-ink"
                    }`}
                  >
                    <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-current flex items-center justify-center">
                      {target === t.value && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.label}</p>
                      <p className="text-xs text-ink-muted">{t.description}</p>
                    </div>
                    {t.value === "a3" && (
                      <Badge variant="outline" className="ml-auto mt-0.5 shrink-0 text-[10px]">
                        CSV
                      </Badge>
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Format selector (only for non-a3) */}
            {target !== "a3" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Formato de archivo</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-3">
                  {(["xlsx", "csv"] as const).map((f) => (
                    <button
                      type="button"
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                        format === f
                          ? "bg-primary text-white"
                          : "border border-border bg-surface text-ink-muted hover:text-ink"
                      }`}
                    >
                      .{f.toUpperCase()}
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary panel */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle>Resumen de exportación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-surface-bg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Periodo</span>
                  <span className="font-semibold capitalize text-ink">{monthName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Destino</span>
                  <span className="font-semibold text-ink">
                    {TARGETS.find((t) => t.value === target)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Archivo</span>
                  <span className="font-semibold text-ink">.{currentFmt.toUpperCase()}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-md bg-primary/5 px-3 py-2.5 text-xs text-ink-muted">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  Incluye: horas normales, horas extra (&gt;8h/día), retrasos y sesiones por
                  empleado.
                </span>
              </div>

              {error && (
                <div className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-xs text-danger-DEFAULT">
                  {error}
                </div>
              )}

              <Button
                onClick={handleDownload}
                disabled={loading || !hasExports}
                className="w-full gap-2"
              >
                {loading ? (
                  "Generando…"
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Descargar {monthName}
                  </>
                )}
              </Button>

              {!hasExports && (
                <p className="text-center text-[11px] text-ink-muted">
                  Activa un plan Pro para exportar datos.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* What's included */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <CardTitle>¿Qué incluye la exportación?</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Horas normales", desc: "Horas trabajadas hasta 8h/día" },
                { label: "Horas extra", desc: "Exceso sobre 8h/día por empleado" },
                { label: "Retrasos", desc: "Total de llegadas tardías en el mes" },
                { label: "Sesiones", desc: "Total de fichajes completados" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-surface-bg p-3">
                  <p className="text-sm font-semibold text-ink">{item.label}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
