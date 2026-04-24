"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TicketCreateRequest } from "@/types/ticket";

const schema = z.object({
  title: z.string().min(1, "Titulo requerido").max(160),
  description: z.string().max(2000).optional(),
  occurred_on: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function TicketForm({
  onSubmit,
  loading,
}: {
  onSubmit: (values: TicketCreateRequest) => void;
  loading?: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit((values) => {
        onSubmit({
          title: values.title,
          description: values.description || undefined,
          occurred_on: values.occurred_on || undefined,
        });
        reset();
      })}
    >
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-[13px]">Título</Label>
        <Input id="title" placeholder="Retraso, ausencia, solicitud..." {...register("title")} />
        {errors.title && <p className="text-[12px] text-danger-DEFAULT">{errors.title.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="occurred_on" className="text-[13px]">Fecha</Label>
        <Input id="occurred_on" type="date" {...register("occurred_on")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-[13px]">Descripción</Label>
        <textarea
          id="description"
          className="min-h-[96px] w-full rounded border border-border-strong bg-white px-3 py-2 text-sm text-ink shadow-inner-sm outline-none transition-all duration-150 placeholder:text-ink-xmuted focus:border-primary focus:ring-2 focus:ring-primary/15 focus:shadow-none resize-none"
          placeholder="Detalle de la incidencia..."
          {...register("description")}
        />
      </div>
      <Button type="submit" loading={loading}>
        Crear incidencia
      </Button>
    </form>
  );
}
