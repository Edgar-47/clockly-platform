"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Building2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRegisterCompany } from "@/hooks/use-auth";
import { usePlans } from "@/hooks/use-plans";
import type { PlanType } from "@/types/plan";

const TIMEZONES = [
  "Europe/Madrid",
  "UTC",
  "Europe/Lisbon",
  "Europe/Paris",
  "Europe/London",
  "America/New_York",
  "America/Mexico_City",
];

const schema = z.object({
  company_name: z.string().trim().min(2, "Introduce el nombre de empresa").max(160),
  owner_email: z.string().trim().email("Introduce un email valido").max(255),
  owner_full_name: z.string().trim().min(1, "Introduce tu nombre").max(160),
  password: z.string().min(8, "Minimo 8 caracteres").max(256),
  timezone: z.string().min(1),
  plan_type: z.enum(["free", "pro", "business"]),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_PLANS: Array<{ code: PlanType; name: string; max_employees: number | null }> = [
  { code: "free", name: "Free", max_employees: 5 },
  { code: "pro", name: "Pro", max_employees: 30 },
  { code: "business", name: "Business", max_employees: null },
];

export default function RegisterCompanyPage() {
  const registerCompany = useRegisterCompany();
  const plans = usePlans();
  const planOptions = useMemo(
    () => (plans.data?.length ? plans.data : DEFAULT_PLANS),
    [plans.data],
  );
  const [selectedTimezone, setSelectedTimezone] = useState("Europe/Madrid");
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("free");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      timezone: "Europe/Madrid",
      plan_type: "free",
    },
  });

  const onSubmit = (values: FormValues) => registerCompany.mutate(values);

  return (
    <div className="w-full rounded-xl border border-border bg-white p-7 shadow-md">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <h1 className="text-[22px] font-bold tracking-tight text-ink">
          Crear empresa
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          Alta del tenant, owner y configuracion inicial.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {registerCompany.error && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-danger-border bg-danger-bg px-3.5 py-3 text-sm text-danger-DEFAULT">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span className="text-[13px]">
              {(registerCompany.error as { detail?: string })?.detail ?? "No se pudo crear la empresa."}
            </span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="company_name" className="text-[13px]">Empresa</Label>
          <Input id="company_name" autoComplete="organization" {...register("company_name")} aria-invalid={!!errors.company_name} />
          {errors.company_name && <p className="text-[12px] text-danger-DEFAULT">{errors.company_name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="owner_full_name" className="text-[13px]">Nombre del owner</Label>
          <Input id="owner_full_name" autoComplete="name" {...register("owner_full_name")} aria-invalid={!!errors.owner_full_name} />
          {errors.owner_full_name && <p className="text-[12px] text-danger-DEFAULT">{errors.owner_full_name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="owner_email" className="text-[13px]">Email del owner</Label>
          <Input id="owner_email" type="email" autoComplete="email" {...register("owner_email")} aria-invalid={!!errors.owner_email} />
          {errors.owner_email && <p className="text-[12px] text-danger-DEFAULT">{errors.owner_email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-[13px]">Contrasena</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} aria-invalid={!!errors.password} />
          {errors.password && <p className="text-[12px] text-danger-DEFAULT">{errors.password.message}</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[13px]">Zona horaria</Label>
            <Select
              value={selectedTimezone}
              onValueChange={(value) => {
                setSelectedTimezone(value);
                setValue("timezone", value, { shouldValidate: true });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((timezone) => (
                  <SelectItem key={timezone} value={timezone}>
                    {timezone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px]">Plan inicial</Label>
            <Select
              value={selectedPlan}
              onValueChange={(value) => {
                const plan = value as PlanType;
                setSelectedPlan(plan);
                setValue("plan_type", plan, { shouldValidate: true });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {planOptions.map((plan) => (
                  <SelectItem key={plan.code} value={plan.code}>
                    {plan.name} {plan.max_employees === null ? "(sin limite)" : `(${plan.max_employees})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={registerCompany.isPending}>
          Crear empresa y continuar
        </Button>
      </form>

      <div className="mt-5 text-center text-[13px] text-ink-muted">
        Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Inicia sesion
        </Link>
      </div>
    </div>
  );
}
