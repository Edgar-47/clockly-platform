"use client";

import Image from "next/image";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_LABELS, PAYMENT_SOURCE_LABELS } from "@/types/expense-ticket";
import type { ExpenseCategory, ExpenseTicketCreateRequest, PaymentSource } from "@/types/expense-ticket";

const schema = z.object({
  title: z.string().min(1, "El concepto es obligatorio").max(200),
  description: z.string().max(2000).optional(),
  category: z.string().min(1, "Selecciona una categoría"),
  purchase_date: z.string().min(1, "La fecha es obligatoria"),
  amount: z
    .string()
    .min(1, "El importe es obligatorio")
    .refine((v) => Number(v) > 0, "El importe debe ser mayor que 0"),
  currency: z.string().length(3).default("EUR"),
  payment_source: z.string().min(1, "Selecciona el método de pago"),
  requires_reimbursement: z.boolean().default(false),
  reimbursement_amount: z.string().optional(),
  internal_notes: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof schema>;

const today = new Date().toISOString().slice(0, 10);

export function ExpenseTicketForm({
  onSubmit,
  loading,
  onFileSelect,
}: {
  onSubmit: (values: ExpenseTicketCreateRequest, file?: File) => void;
  loading?: boolean;
  onFileSelect?: (file: File | null) => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: "EUR",
      requires_reimbursement: false,
      purchase_date: today,
    },
  });

  const requiresReimbursement = useWatch({ control, name: "requires_reimbursement" });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    onFileSelect?.(file);
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  }

  function clearFile() {
    setSelectedFile(null);
    setPreview(null);
    onFileSelect?.(null);
    setFileInputKey((value) => value + 1);
  }

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit((values) => {
        onSubmit(
          {
            title: values.title,
            description: values.description || undefined,
            category: values.category as ExpenseCategory,
            purchase_date: values.purchase_date,
            amount: values.amount,
            currency: values.currency,
            payment_source: values.payment_source as PaymentSource,
            requires_reimbursement: values.requires_reimbursement,
            reimbursement_amount: values.requires_reimbursement && values.reimbursement_amount
              ? values.reimbursement_amount
              : undefined,
            internal_notes: values.internal_notes || undefined,
          },
          selectedFile ?? undefined,
        );
        reset();
        clearFile();
      })}
    >
      {/* Concept */}
      <div className="space-y-1.5">
        <Label htmlFor="et-title" className="text-[13px]">Concepto *</Label>
        <Input id="et-title" placeholder="Compra de material, cena de equipo…" {...register("title")} />
        {errors.title && <p className="text-[12px] text-danger-DEFAULT">{errors.title.message}</p>}
      </div>

      {/* Date + Amount */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="et-date" className="text-[13px]">Fecha *</Label>
          <Input id="et-date" type="date" max={today} {...register("purchase_date")} />
          {errors.purchase_date && <p className="text-[12px] text-danger-DEFAULT">{errors.purchase_date.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="et-amount" className="text-[13px]">Importe *</Label>
          <div className="flex gap-1.5">
            <Input
              id="et-amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              className="flex-1"
              {...register("amount")}
            />
            <Input className="w-16 text-center" placeholder="EUR" maxLength={3} {...register("currency")} />
          </div>
          {errors.amount && <p className="text-[12px] text-danger-DEFAULT">{errors.amount.message}</p>}
        </div>
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label className="text-[13px]">Categoría *</Label>
        <Select onValueChange={(v) => setValue("category", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona categoría" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(CATEGORY_LABELS) as [ExpenseCategory, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && <p className="text-[12px] text-danger-DEFAULT">{errors.category.message}</p>}
      </div>

      {/* Payment source */}
      <div className="space-y-1.5">
        <Label className="text-[13px]">Método de pago *</Label>
        <Select onValueChange={(v) => setValue("payment_source", v)}>
          <SelectTrigger>
            <SelectValue placeholder="¿Cómo se pagó?" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(PAYMENT_SOURCE_LABELS) as [PaymentSource, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.payment_source && <p className="text-[12px] text-danger-DEFAULT">{errors.payment_source.message}</p>}
      </div>

      {/* Reimbursement */}
      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-ink">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border accent-primary"
            {...register("requires_reimbursement")}
          />
          Requiere reembolso
        </label>
        {requiresReimbursement && (
          <div className="space-y-1.5">
            <Label htmlFor="et-reimbursement" className="text-[13px]">Importe a reembolsar</Label>
            <Input
              id="et-reimbursement"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("reimbursement_amount")}
            />
          </div>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="et-desc" className="text-[13px]">Descripción</Label>
        <textarea
          id="et-desc"
          className="min-h-[72px] w-full rounded border border-border-strong bg-white px-3 py-2 text-[13px] text-ink shadow-inner-sm outline-none transition-all placeholder:text-ink-xmuted focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"
          placeholder="Contexto adicional…"
          {...register("description")}
        />
      </div>

      {/* File attachment */}
      <div className="space-y-1.5">
        <Label className="text-[13px]">Adjunto (foto del ticket)</Label>
        {selectedFile ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface-muted p-2.5">
            {preview && (
              <span className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded">
                <Image src={preview} alt="preview" fill sizes="40px" unoptimized className="object-cover" />
              </span>
            )}
            {!preview && <Paperclip className="h-4 w-4 text-ink-muted flex-shrink-0" />}
            <span className="flex-1 truncate text-[12px] text-ink">{selectedFile.name}</span>
            <button type="button" onClick={clearFile} className="text-ink-muted hover:text-danger-DEFAULT">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label
            htmlFor="expense-ticket-file"
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-border p-4 text-[13px] text-ink-muted transition-colors hover:border-primary hover:text-primary"
          >
            <Paperclip className="h-4 w-4" />
            Seleccionar archivo (JPG, PNG, PDF · max 5 MB)
          </label>
        )}
        <input
          key={fileInputKey}
          id="expense-ticket-file"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <Button type="submit" loading={loading} className="w-full">
        Crear gasto
      </Button>
    </form>
  );
}
