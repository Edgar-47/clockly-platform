"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, FileText, Shield } from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/shared/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMe } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export default function ItssRegistroPage() {
  const me = useMe();
  const canExport = Boolean(me.data?.company.has_exports);
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [format, setFormat] = useState<"xlsx" | "pdf">("xlsx");

  const exportMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({
        year: String(year),
        month: String(month),
        format,
      });
      const response = await fetch(`/api/exports/itss-registro?${params}`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail ?? `Error ${response.status}`);
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1] ?? `libro-registro-${year}-${String(month).padStart(2, "0")}.${format}`;
      return { blob, filename };
    },
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Libro registro exportado.");
    },
    onError: (err: Error) => toast.error(err.message ?? "No se pudo exportar."),
  });

  const monthName = MONTHS.find((m) => m.value === month)?.label ?? "";

  return (
    <>
      <Topbar title="Libro Registro ITSS" />
      <div className="space-y-5 p-6">

        {/* Legal context */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Libro Registro de Jornada
            </CardTitle>
            <CardDescription>
              Exportación del registro mensual de jornada según el artículo 34.9 del Estatuto de los
              Trabajadores (Real Decreto-ley 8/2019). Apto para presentar ante la Inspección de Trabajo (ITSS).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border bg-surface-bg px-4 py-3 text-[13px] text-ink-muted space-y-1">
              <p>El archivo incluye: <strong>empresa, CIF, empleado, DNI/NIE, fecha, hora entrada/salida, horas trabajadas</strong>.</p>
              <p>Ordenado por empleado y fecha. Formato Excel estructurado o PDF.</p>
              {!me.data?.company.cif && (
                <p className="text-warning-DEFAULT font-medium">
                  ⚠ Tu empresa no tiene CIF configurado. Añádelo en Configuración → Empresa para que aparezca en el documento.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Export form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Seleccionar periodo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!canExport ? (
              <div className="rounded-md border border-warning-border bg-warning-bg px-4 py-3 text-[13px] text-warning-DEFAULT">
                La exportación no está disponible en tu plan actual. Actualiza el plan para acceder.
              </div>
            ) : (
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label>Año</Label>
                  <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                    <SelectTrigger className="w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Mes</Label>
                  <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Formato</Label>
                  <Select value={format} onValueChange={(v) => setFormat(v as "xlsx" | "pdf")}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xlsx">Excel</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => exportMutation.mutate()}
                  loading={exportMutation.isPending}
                >
                  <Download className="h-4 w-4" />
                  Descargar {monthName} {year}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
