"use client";

import { useState } from "react";
import { Building2, DollarSign, TrendingUp, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Topbar } from "@/components/shared/topbar";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AffiliateRead {
  id: string;
  partner_name: string;
  partner_email: string;
  code: string;
  commission_rate: number;
  total_earned: number;
  is_active: boolean;
  notes: string | null;
  referral_count: number;
  active_referrals: number;
  converted_referrals: number;
}

function useAffiliates() {
  return useQuery<AffiliateRead[]>({
    queryKey: ["affiliates"],
    queryFn: () => api.get("/affiliates"),
    retry: false,
  });
}

function useToggleStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (isActive: boolean) =>
      api.patch(`/affiliates/${id}/status`, { is_active: isActive }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["affiliates"] }),
  });
}

function AffiliateRow({ affiliate }: { affiliate: AffiliateRead }) {
  const toggle = useToggleStatus(affiliate.id);
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-ink">{affiliate.partner_name}</p>
            <Badge variant={affiliate.is_active ? "default" : "outline"} className="text-[10px]">
              {affiliate.is_active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          <p className="text-xs text-ink-muted">{affiliate.partner_email}</p>
          <p className="mt-1 font-mono text-xs text-primary">
            Código: <strong>{affiliate.code}</strong>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggle.mutate(!affiliate.is_active)}
            disabled={toggle.isPending}
          >
            {affiliate.is_active ? "Desactivar" : "Activar"}
          </Button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
        <div className="rounded-md bg-surface-bg p-2">
          <p className="font-bold text-ink">{affiliate.referral_count}</p>
          <p className="text-ink-muted">Referidos</p>
        </div>
        <div className="rounded-md bg-surface-bg p-2">
          <p className="font-bold text-ink">{affiliate.active_referrals}</p>
          <p className="text-ink-muted">Activos</p>
        </div>
        <div className="rounded-md bg-success-bg p-2">
          <p className="font-bold text-success-DEFAULT">
            {Number(affiliate.commission_rate * 100).toFixed(0)}%
          </p>
          <p className="text-ink-muted">Comisión</p>
        </div>
      </div>
      {affiliate.notes && (
        <p className="mt-2 text-xs text-ink-muted">{affiliate.notes}</p>
      )}
    </div>
  );
}

export default function SuperadminAffiliatesPage() {
  const affiliates = useAffiliates();
  const data = affiliates.data ?? [];

  const totalReferrals = data.reduce((s, a) => s + a.referral_count, 0);
  const activeAffiliates = data.filter((a) => a.is_active).length;
  const totalActive = data.reduce((s, a) => s + a.active_referrals, 0);

  return (
    <>
      <Topbar title="Afiliados" />
      <div className="space-y-5 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Afiliados totales"
            value={data.length}
            icon={<Users className="h-5 w-5" />}
            iconColor="blue"
            loading={affiliates.isLoading}
          />
          <StatCard
            label="Afiliados activos"
            value={activeAffiliates}
            icon={<TrendingUp className="h-5 w-5" />}
            iconColor="green"
            loading={affiliates.isLoading}
          />
          <StatCard
            label="Empresas referidas"
            value={totalReferrals}
            icon={<Building2 className="h-5 w-5" />}
            iconColor="orange"
            loading={affiliates.isLoading}
          />
          <StatCard
            label="Clientes activos vía afiliado"
            value={totalActive}
            icon={<DollarSign className="h-5 w-5" />}
            iconColor="green"
            loading={affiliates.isLoading}
          />
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between pb-4">
            <CardTitle>Programa de afiliados</CardTitle>
            <a
              href="/partner"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary underline underline-offset-2"
            >
              Ver página pública
            </a>
          </CardHeader>
          <CardContent>
            {affiliates.isLoading ? (
              <p className="py-8 text-center text-sm text-ink-muted">Cargando afiliados…</p>
            ) : data.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-ink-muted">Sin afiliados registrados.</p>
                <p className="mt-1 text-xs text-ink-muted">
                  Usa la API para crear afiliados:{" "}
                  <code className="rounded bg-surface-bg px-1 py-0.5 font-mono text-[11px]">
                    POST /api/affiliates
                  </code>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.map((a) => (
                  <AffiliateRow key={a.id} affiliate={a} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Integración con Stripe (próximamente)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-ink-muted">
              El pago automático de comisiones vía Stripe Connect está planificado para el Mes 3.
              Por ahora, las comisiones se calculan manualmente desde el panel.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
