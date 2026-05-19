"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Building2,
  Edit2,
  MapPin,
  MoreVertical,
  Navigation,
  PlusCircle,
  Radio,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import {
  useWorkLocations,
  useCreateWorkLocation,
  useUpdateWorkLocation,
  useDeleteWorkLocation,
} from "@/hooks/use-locations";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkLocation } from "@/types/location";

const MiniMap = dynamic(
  () => import("@/features/work-locations/components/mini-map").then((m) => m.MiniMap),
  { ssr: false },
);

const locationSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(160),
  address: z.string().max(255).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional().or(z.literal("")),
  longitude: z.coerce.number().min(-180).max(180).optional().or(z.literal("")),
  allowed_radius_meters: z.coerce.number().min(10).max(50000).default(100),
  is_active: z.boolean().default(true),
});

type LocationFormValues = z.infer<typeof locationSchema>;

interface LocationFormProps {
  defaultValues?: Partial<LocationFormValues>;
  onSubmit: (values: LocationFormValues) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

function LocationForm({ defaultValues, onSubmit, onCancel, loading }: LocationFormProps) {
  const { capture, permissionStatus } = useGeolocation();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: { allowed_radius_meters: 100, is_active: true, ...defaultValues },
  });

  const handleUseMyLocation = async () => {
    const geo = await capture();
    if (geo.latitude != null && geo.longitude != null) {
      setValue("latitude", geo.latitude);
      setValue("longitude", geo.longitude);
      toast.success("Ubicación capturada correctamente.");
    } else {
      toast.error(
        permissionStatus === "denied"
          ? "Permiso de ubicación denegado."
          : "No se pudo obtener la ubicación.",
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-[13px] font-semibold text-ink">
          Nombre del centro <span className="text-danger-DEFAULT">*</span>
        </Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Oficina central, Tienda norte…"
          className="h-10 rounded-xl border-border bg-surface-bg px-3.5 text-[13px] focus-visible:ring-2 focus-visible:ring-primary/30"
        />
        {errors.name && (
          <p className="text-[11px] text-danger-DEFAULT">{errors.name.message}</p>
        )}
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="address" className="text-[13px] font-semibold text-ink">
          Dirección
        </Label>
        <Input
          id="address"
          {...register("address")}
          placeholder="Calle Gran Vía, 1, Madrid"
          className="h-10 rounded-xl border-border bg-surface-bg px-3.5 text-[13px] focus-visible:ring-2 focus-visible:ring-primary/30"
        />
      </div>

      {/* Coordinates */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[13px] font-semibold text-ink">Coordenadas GPS</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUseMyLocation}
            className="h-7 gap-1.5 rounded-lg px-2.5 text-[12px]"
          >
            <Navigation className="h-3 w-3" />
            Usar mi ubicación
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <Input
              id="latitude"
              type="number"
              step="any"
              {...register("latitude")}
              placeholder="41.3851"
              className="h-10 rounded-xl border-border bg-surface-bg px-3.5 text-[13px] focus-visible:ring-2 focus-visible:ring-primary/30"
            />
            {errors.latitude && (
              <p className="mt-1 text-[11px] text-danger-DEFAULT">{errors.latitude.message}</p>
            )}
          </div>
          <div>
            <Input
              id="longitude"
              type="number"
              step="any"
              {...register("longitude")}
              placeholder="2.1734"
              className="h-10 rounded-xl border-border bg-surface-bg px-3.5 text-[13px] focus-visible:ring-2 focus-visible:ring-primary/30"
            />
            {errors.longitude && (
              <p className="mt-1 text-[11px] text-danger-DEFAULT">{errors.longitude.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Radius */}
      <div className="space-y-1.5">
        <Label htmlFor="radius" className="text-[13px] font-semibold text-ink">
          Radio de verificación
        </Label>
        <div className="relative">
          <Input
            id="radius"
            type="number"
            min={10}
            max={50000}
            {...register("allowed_radius_meters")}
            placeholder="100"
            className="h-10 rounded-xl border-border bg-surface-bg pl-3.5 pr-14 text-[13px] focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-medium text-ink-muted">
            metros
          </span>
        </div>
        {errors.allowed_radius_meters && (
          <p className="text-[11px] text-danger-DEFAULT">{errors.allowed_radius_meters.message}</p>
        )}
        <p className="text-[11px] text-ink-xmuted">
          Fichajes fuera de este radio se marcarán como &ldquo;Fuera de rango&rdquo;.
        </p>
      </div>

      {/* Privacy notice */}
      <div className="flex gap-2.5 rounded-xl border border-border bg-surface-bg px-3.5 py-3 text-[11px] text-ink-muted">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <span>
          La ubicación solo se registra en el momento del fichaje. ClockLy no realiza
          seguimiento continuo de los empleados.
        </span>
      </div>

      <DialogFooter className="gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">
          Cancelar
        </Button>
        <Button type="submit" loading={loading} className="rounded-xl">
          Guardar centro
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function WorkLocationsPage() {
  const { data: locations = [], isLoading } = useWorkLocations(true);
  const create = useCreateWorkLocation();
  const update = useUpdateWorkLocation();
  const del = useDeleteWorkLocation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkLocation | null>(null);

  const handleCreate = async (values: LocationFormValues) => {
    try {
      await create.mutateAsync({
        name: values.name,
        address: values.address || undefined,
        latitude: values.latitude !== "" ? Number(values.latitude) : undefined,
        longitude: values.longitude !== "" ? Number(values.longitude) : undefined,
        allowed_radius_meters: values.allowed_radius_meters,
        is_active: values.is_active,
      });
      toast.success("Centro de trabajo creado.");
      setCreateOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al crear el centro de trabajo.");
    }
  };

  const handleUpdate = async (values: LocationFormValues) => {
    if (!editTarget) return;
    try {
      await update.mutateAsync({
        id: editTarget.id,
        payload: {
          name: values.name,
          address: values.address || undefined,
          latitude: values.latitude !== "" ? Number(values.latitude) : undefined,
          longitude: values.longitude !== "" ? Number(values.longitude) : undefined,
          allowed_radius_meters: values.allowed_radius_meters,
          is_active: values.is_active,
        },
      });
      toast.success("Centro actualizado.");
      setEditTarget(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar el centro.");
    }
  };

  const handleToggleActive = (loc: WorkLocation) => {
    update.mutate(
      { id: loc.id, payload: { is_active: !loc.is_active } },
      { onSuccess: () => toast.success(loc.is_active ? "Centro desactivado." : "Centro activado.") },
    );
  };

  const handleDelete = (loc: WorkLocation) => {
    if (!confirm(`¿Desactivar el centro "${loc.name}"? El historial de fichajes se conservará.`)) return;
    del.mutate(loc.id, { onSuccess: () => toast.success("Centro desactivado.") });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-[16px] font-bold text-ink">Centros de trabajo</h1>
            <p className="mt-0.5 text-[12px] text-ink-xmuted">
              Define dónde trabajan tus empleados para verificar fichajes por ubicación.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="w-full rounded-xl sm:w-auto">
          <PlusCircle className="h-3.5 w-3.5" />
          Nuevo centro
        </Button>
      </div>

      {/* Privacy notice */}
      <div className="flex gap-2.5 rounded-xl border border-border bg-surface-bg px-4 py-3 text-[12px] text-ink-muted">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <span>
          <strong className="text-ink">Privacidad:</strong> La ubicación solo se registra
          en el momento del fichaje. ClockLy no realiza seguimiento continuo de la posición
          de los empleados.
        </span>
      </div>

      {/* Location list */}
      <div className="space-y-3">
        {isLoading ? (
          <>
            {[1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-surface-bg border border-border" />
            ))}
          </>
        ) : locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-bg py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-xmuted/10 mb-3">
              <Building2 className="h-6 w-6 text-ink-xmuted" />
            </div>
            <p className="text-[13px] font-medium text-ink-muted">
              No hay centros de trabajo configurados.
            </p>
            <p className="mt-1 text-[12px] text-ink-xmuted">
              Crea un centro para empezar a verificar ubicaciones en los fichajes.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4 rounded-xl"
              onClick={() => setCreateOpen(true)}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Crear primer centro
            </Button>
          </div>
        ) : (
          locations.map((loc) => (
            <Card key={loc.id} className="overflow-hidden rounded-2xl border-border p-0 shadow-sm">
              <div className="flex flex-col sm:flex-row">
                {/* Mini map */}
                {loc.latitude != null && loc.longitude != null ? (
                  <div className="relative isolate h-[160px] shrink-0 overflow-hidden sm:h-auto sm:w-[200px]">
                    <MiniMap
                      latitude={loc.latitude}
                      longitude={loc.longitude}
                      radiusMeters={loc.allowed_radius_meters}
                      label={loc.name}
                    />
                    {/* Subtle overlay fade on the right edge */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white/20 to-transparent hidden sm:block" />
                  </div>
                ) : (
                  <div className="flex h-[120px] shrink-0 items-center justify-center bg-surface-bg sm:h-auto sm:w-[160px]">
                    <div className="text-center">
                      <MapPin className="mx-auto h-6 w-6 text-ink-xmuted/40" />
                      <p className="mt-1 text-[10px] text-ink-xmuted">Sin coordenadas</p>
                    </div>
                  </div>
                )}

                {/* Info + actions */}
                <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[14px] font-bold text-ink">{loc.name}</p>
                          <Badge
                            variant={loc.is_active ? "success" : "muted"}
                            className="text-[10px]"
                          >
                            {loc.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                        {loc.address && (
                          <p className="mt-1 text-[12px] text-ink-muted">{loc.address}</p>
                        )}
                      </div>

                      {/* Action buttons — icon row on sm+, hamburger on mobile */}
                      <div className="shrink-0">
                        {/* Desktop: individual icon buttons */}
                        <div className="hidden items-center gap-1 sm:flex">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 rounded-lg p-0"
                            onClick={() => setEditTarget(loc)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 rounded-lg p-0"
                            onClick={() => handleToggleActive(loc)}
                          >
                            {loc.is_active ? (
                              <ToggleRight className="h-4 w-4 text-success-DEFAULT" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-ink-muted" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 rounded-lg p-0 text-danger-DEFAULT hover:bg-danger-bg"
                            onClick={() => handleDelete(loc)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Mobile: hamburger dropdown */}
                        <div className="sm:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 rounded-lg p-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditTarget(loc)}>
                                <Edit2 className="h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(loc)}>
                                {loc.is_active ? (
                                  <ToggleLeft className="h-4 w-4" />
                                ) : (
                                  <ToggleRight className="h-4 w-4" />
                                )}
                                {loc.is_active ? "Desactivar" : "Activar"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                destructive
                                onClick={() => handleDelete(loc)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats chips */}
                  <div className="flex flex-wrap gap-2">
                    {loc.latitude != null && loc.longitude != null ? (
                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-bg px-2.5 py-1 text-[11px] text-ink-muted">
                        <MapPin className="h-3 w-3 text-primary" />
                        {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-warning-border bg-warning-bg px-2.5 py-1 text-[11px] text-warning-DEFAULT">
                        <MapPin className="h-3 w-3" />
                        Sin coordenadas
                      </div>
                    )}
                    <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-bg px-2.5 py-1 text-[11px] text-ink-muted">
                      <Radio className="h-3 w-3 text-primary" />
                      Radio: {loc.allowed_radius_meters} m
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="flex max-h-[90vh] w-[92vw] max-w-md flex-col overflow-hidden rounded-2xl p-0 sm:w-full">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle className="text-[16px]">Nuevo centro de trabajo</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-6 py-5">
            <LocationForm
              onSubmit={handleCreate}
              onCancel={() => setCreateOpen(false)}
              loading={create.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="flex max-h-[90vh] w-[92vw] max-w-md flex-col overflow-hidden rounded-2xl p-0 sm:w-full">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle className="text-[16px]">Editar centro de trabajo</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="overflow-y-auto px-6 py-5">
              <LocationForm
                defaultValues={{
                  name: editTarget.name,
                  address: editTarget.address ?? undefined,
                  latitude: editTarget.latitude ?? undefined,
                  longitude: editTarget.longitude ?? undefined,
                  allowed_radius_meters: editTarget.allowed_radius_meters,
                  is_active: editTarget.is_active,
                }}
                onSubmit={handleUpdate}
                onCancel={() => setEditTarget(null)}
                loading={update.isPending}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
