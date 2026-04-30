"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/shared/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { employeesService } from "@/services/employees.service";
import type { CsvImportResult } from "@/types/employee";

const FIELD_LABELS: Record<string, string> = {
  nombre: "Nombre",
  apellidos: "Apellidos",
  email: "Email",
  puesto: "Puesto",
  dni: "DNI",
  pin: "PIN",
  file: "Archivo",
  header: "Cabecera",
  general: "General",
};

function fieldLabel(field: string) {
  return FIELD_LABELS[field] ?? field;
}

export default function EmployeeCsvImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvImportResult | null>(null);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const previewMutation = useMutation({
    mutationFn: (file: File) => employeesService.previewCsv(file),
    onSuccess: (result) => setPreview(result),
    onError: () => toast.error("No se pudo analizar el archivo CSV."),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => employeesService.importCsv(file),
    onSuccess: (result) => {
      setImportResult(result);
      setPreview(null);
      setSelectedFile(null);
      if (result.imported > 0) {
        toast.success(`${result.imported} empleado${result.imported !== 1 ? "s" : ""} importado${result.imported !== 1 ? "s" : ""} correctamente.`);
      } else {
        toast.warning("No se importó ningún empleado. Revisa los errores.");
      }
    },
    onError: () => toast.error("Error durante la importación."),
  });

  function handleFileSelect(file: File) {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Solo se admiten archivos .csv");
      return;
    }
    setSelectedFile(file);
    setPreview(null);
    setImportResult(null);
    previewMutation.mutate(file);
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) handleFileSelect(file);
    event.target.value = "";
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }

  function handleConfirmImport() {
    if (!selectedFile) return;
    importMutation.mutate(selectedFile);
  }

  function handleReset() {
    setSelectedFile(null);
    setPreview(null);
    setImportResult(null);
  }

  const hasPreviewErrors = preview && preview.errors.length > 0;
  const hasValidRows = preview && preview.preview.length > 0;

  return (
    <>
      <Topbar title="Importar empleados" />
      <div className="space-y-5 p-6">

        {/* Instructions + CSV example download */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              Importar desde CSV
            </CardTitle>
            <CardDescription>
              Sube un archivo CSV con los datos de tus empleados. Los campos obligatorios son{" "}
              <strong>nombre</strong> y <strong>apellidos</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border bg-surface-bg px-4 py-3 text-[13px] text-ink-muted">
              <p className="font-semibold text-ink mb-1">Columnas admitidas (cabecera en español):</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 sm:grid-cols-3">
                {[
                  ["nombre", "Obligatorio"],
                  ["apellidos", "Obligatorio"],
                  ["email", "Opcional"],
                  ["puesto", "Opcional"],
                  ["dni", "Opcional"],
                  ["pin", "4 dígitos, opcional"],
                ].map(([col, note]) => (
                  <span key={col}>
                    <code className="font-mono text-ink">{col}</code>
                    <span className="ml-1 text-ink-xmuted">({note})</span>
                  </span>
                ))}
              </div>
            </div>

            <a
              href="/plantilla-empleados.csv"
              download="plantilla-empleados.csv"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
              onClick={(e) => {
                e.preventDefault();
                const csvContent = "nombre,apellidos,email,puesto,dni,pin\nMaría,García,maria@empresa.com,Camarera,12345678A,1234\nJuan,López,,Cocinero,,\nAna,Martínez,ana@empresa.com,Recepcionista,,5678";
                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "plantilla-empleados.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Descargar plantilla CSV
            </a>
          </CardContent>
        </Card>

        {/* Drop zone */}
        {!importResult && (
          <Card>
            <CardContent className="pt-5">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition-colors cursor-pointer ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-surface-bg"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className={`h-8 w-8 ${isDragging ? "text-primary" : "text-ink-xmuted"}`} />
                <div className="text-center">
                  <p className="text-[14px] font-semibold text-ink">
                    {selectedFile ? selectedFile.name : "Arrastra tu archivo CSV aquí"}
                  </p>
                  <p className="text-[12px] text-ink-muted mt-0.5">o haz clic para seleccionar</p>
                </div>
                {previewMutation.isPending && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleInputChange} />
            </CardContent>
          </Card>
        )}

        {/* Preview results */}
        {preview && !previewMutation.isPending && (
          <div className="space-y-4">
            {/* Summary badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold text-ink">Resultado del análisis:</span>
              <Badge variant="success">{preview.preview.length} válido{preview.preview.length !== 1 ? "s" : ""}</Badge>
              {preview.skipped > 0 && <Badge variant="danger">{preview.skipped} con error{preview.skipped !== 1 ? "es" : ""}</Badge>}
            </div>

            {/* Errors */}
            {hasPreviewErrors && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-danger-DEFAULT text-[15px]">
                    <AlertCircle className="h-4 w-4" />
                    Filas con errores (serán omitidas)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border">
                    {preview.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-3 py-2 text-[13px]">
                        <span className="shrink-0 font-mono text-ink-muted">Fila {err.row}</span>
                        <span className="shrink-0 rounded bg-danger-bg px-1.5 py-0.5 text-[11px] font-medium text-danger-DEFAULT">
                          {fieldLabel(err.field)}
                        </span>
                        <span className="text-ink-muted">{err.message}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Valid rows preview table */}
            {hasValidRows && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-[15px]">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Empleados listos para importar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-border">
                          {["Nombre", "Apellidos", "Email", "Puesto", "DNI", "PIN"].map((h) => (
                            <th key={h} className="pb-2 pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted last:pr-0">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {preview.preview.map((row, i) => (
                          <tr key={i}>
                            <td className="py-2 pr-4 font-medium text-ink">{row.nombre}</td>
                            <td className="py-2 pr-4 text-ink-muted">{row.apellidos}</td>
                            <td className="py-2 pr-4 text-ink-muted">{row.email || "—"}</td>
                            <td className="py-2 pr-4 text-ink-muted">{row.puesto || "—"}</td>
                            <td className="py-2 pr-4 font-mono text-ink-muted">{row.dni || "—"}</td>
                            <td className="py-2 font-mono text-ink-muted">{row.pin ? "••••" : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              {hasValidRows && (
                <Button onClick={handleConfirmImport} loading={importMutation.isPending}>
                  <Upload className="h-4 w-4" />
                  Importar {preview.preview.length} empleado{preview.preview.length !== 1 ? "s" : ""}
                </Button>
              )}
              <Button variant="secondary" onClick={handleReset}>
                <X className="h-4 w-4" />
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Import success result */}
        {importResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Importación completada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <div className="rounded-lg border border-success-border bg-success-bg px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-success-DEFAULT">{importResult.imported}</p>
                  <p className="text-[12px] text-ink-muted mt-0.5">Importados</p>
                </div>
                {importResult.skipped > 0 && (
                  <div className="rounded-lg border border-warning-border bg-warning-bg px-4 py-3 text-center">
                    <p className="text-2xl font-bold text-warning-DEFAULT">{importResult.skipped}</p>
                    <p className="text-[12px] text-ink-muted mt-0.5">Omitidos</p>
                  </div>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <div className="rounded-md border border-warning-border bg-warning-bg px-4 py-3">
                  <p className="text-[13px] font-semibold text-warning-DEFAULT mb-2">Errores en filas omitidas:</p>
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-[12px] text-ink-muted">
                      Fila {err.row} · {fieldLabel(err.field)}: {err.message}
                    </p>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/employees">Ver empleados</Link>
                </Button>
                <Button variant="secondary" onClick={handleReset}>
                  Importar otro archivo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
