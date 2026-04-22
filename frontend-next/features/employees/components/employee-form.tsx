"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import type { EmployeeCreateRequest } from "@/types/employee";

const schema = z.object({
  first_name: z.string().min(1, "Nombre requerido"),
  last_name: z.string().min(1, "Apellidos requeridos"),
  dni: z.string().min(1, "DNI requerido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  role: z.enum(["admin", "employee"]).default("employee"),
  role_title: z.string().optional(),
  pin_code: z
    .string()
    .length(4, "El PIN debe tener 4 dígitos")
    .optional()
    .or(z.literal("")),
  internal_code: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface EmployeeFormProps {
  onSubmit: (values: EmployeeCreateRequest) => void;
  loading?: boolean;
  error?: string | null;
}

export function EmployeeForm({ onSubmit, loading, error }: EmployeeFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "employee" },
  });

  const handleFormSubmit = (values: FormValues) => {
    onSubmit({
      ...values,
      email: values.email || undefined,
      phone: values.phone || undefined,
      role_title: values.role_title || undefined,
      pin_code: values.pin_code || undefined,
      internal_code: values.internal_code || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="first_name">Nombre *</Label>
          <Input
            id="first_name"
            placeholder="María"
            {...register("first_name")}
          />
          {errors.first_name && (
            <p className="text-xs text-danger">{errors.first_name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="last_name">Apellidos *</Label>
          <Input
            id="last_name"
            placeholder="García López"
            {...register("last_name")}
          />
          {errors.last_name && (
            <p className="text-xs text-danger">{errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="dni">DNI *</Label>
          <Input id="dni" placeholder="12345678A" {...register("dni")} />
          {errors.dni && (
            <p className="text-xs text-danger">{errors.dni.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña *</Label>
          <Input
            id="password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-danger">{errors.password.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="maria@negocio.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-danger">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            placeholder="612 345 678"
            {...register("phone")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Rol</Label>
          <Select
            defaultValue="employee"
            onValueChange={(v) =>
              setValue("role", v as "admin" | "employee")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="employee">Empleado</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="role_title">Puesto</Label>
          <Input
            id="role_title"
            placeholder="Estilista, Recepcionista..."
            {...register("role_title")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pin_code">PIN kiosk (4 dígitos)</Label>
          <Input
            id="pin_code"
            placeholder="1234"
            maxLength={4}
            {...register("pin_code")}
          />
          {errors.pin_code && (
            <p className="text-xs text-danger">{errors.pin_code.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>
          Crear empleado
        </Button>
      </div>
    </form>
  );
}
