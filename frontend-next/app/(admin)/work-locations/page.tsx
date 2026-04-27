"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Building2, Edit2, MapPin, PlusCircle, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import {
  useWorkLocations,
  useCreateWorkLocation,
  useUpdateWorkLocation,
  useDeleteWorkLocation,
} from "@/hooks/use-locations";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { WorkLocation } from "@/types/location";

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Nombre *</Label>
        <Input id="name" {...register("name")} placeholder="Oficina central" />
        {errors.name && <p className="mt-1 text-[11px] text-danger-DEFAULT">{errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="address">Dirección</Label>
        <Input id="address" {...register("address")} placeholder="Calle Gran Vía, 1, Madrid" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="latitude">Latitud</Label>
          <Input
            id="latitude"
            type="number"
            step="any"
            {...register("latitude")}
            placeholder="41.3851"
          />
          {errors.latitude && (
            <p className="mt-1 text-[11px] text-danger-DEFAULT">{errors.latitude.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="longitude">Longitud</Label>
          <Input
            id="longitude"
            type="number"
            step="any"
            {...register("longitude")}
            placeholder="2.1734"
          />
          {errors.longitude && (
            <p className="mt-1 text-[11px] text-danger-DEFAULT">{errors.longitude.message}</p>
          )}
        </div>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={handleUseMyLocation}>
        <MapPin className="h-3.5 w-3.5" />
        Usar mi ubicación actual
      </Button>

      <div>
        <Label htmlFor="radius">Radio permitido (metros)</Label>
        <Input
          id="radius"
          type="number"
          min={10}
          max={50000}
          {...register("allowed_radius_meters")}
          placeholder="100"
        />
        {errors.allowed_radius_meters && (
          <p className="mt-1 text-[11px] text-danger-DEFAULT">{errors.allowed_radius_meters.message}</p>
        )}
        <p className="mt-1 text-[11px] text-ink-xmuted">
          Los fichajes fuera de este radio se marcarán como &ldquo;Fuera de rango&rdquo;.
        </p>
      </div>

      {/* Privacy notice */}
      <div className="rounded-md border border-border bg-surface-bg px-3 py-2 text-[11px] text-ink-muted">
        La ubicación solo se registra en el momento del fichaje. ClockLy no realiza seguimiento
        continuo de los empleados.
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Guardar
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
  };

  const handleUpdate = async (values: LocationFormValues) => {
    if (!editTarget) return;
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
    <div className="mx-auto max-w-3xl space-y-5 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Building2 className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-[15px] font-bold text-ink">Centros de trabajo</h1>
            <p className="text-[12px] text-ink-xmuted">
              Define dónde trabajan tus empleados para verificar fichajes por ubicación.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusCircle className="h-3.5 w-3.5" />
          Nuevo centro
        </Button>
      </div>

      {/* Privacy notice */}
      <div className="rounded-lg border border-border bg-surface-bg px-4 py-3 text-[12px] text-ink-muted">
        <strong>Privacidad:</strong> La ubicación solo se registra en el momento del fichaje.
        ClockLy no realiza seguimiento continuo de la posición de los empleados.
      </div>

      {/* Location list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[14px]">
            <MapPin className="h-4 w-4 text-primary" />
            Centros registrados
            <Badge variant="outline" className="ml-1">
              {locations.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-md bg-surface-bg" />
              ))}
            </div>
          ) : locations.length === 0 ? (
            <div className="py-10 text-center">
              <Building2 className="mx-auto mb-3 h-8 w-8 text-ink-xmuted" />
              <p className="text-[13px] text-ink-muted">No hay centros de trabajo configurados.</p>
              <p className="mt-1 text-[12px] text-ink-xmuted">
                Crea un centro para empezar a verificar ubicaciones en los fichajes.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {locations.map((loc) => (
                <div key={loc.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-ink">{loc.name}</p>
                      <Badge variant={loc.is_active ? "success" : "muted"} className="text-[10px]">
                        {loc.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    {loc.address && (
                      <p className="mt-0.5 text-[12px] text-ink-muted">{loc.address}</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-ink-xmuted">
                      {loc.latitude != null && loc.longitude != null ? (
                        <span>
                          {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                        </span>
                      ) : (
                        <span className="text-warning-DEFAULT">Sin coordenadas</span>
                      )}
                      <span>· Radio: {loc.allowed_radius_meters} m</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditTarget(loc)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleToggleActive(loc)}
                    >
                      {loc.is_active ? (
                        <ToggleRight className="h-3.5 w-3.5 text-success-DEFAULT" />
                      ) : (
                        <ToggleLeft className="h-3.5 w-3.5 text-ink-muted" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-danger-DEFAULT hover:bg-danger-bg"
                      onClick={() => handleDelete(loc)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo centro de trabajo</DialogTitle>
          </DialogHeader>
          <LocationForm
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            loading={create.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar centro de trabajo</DialogTitle>
          </DialogHeader>
          {editTarget && (
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
