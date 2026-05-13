"use client";

import { CheckCircle2, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlans } from "@/hooks/use-plans";
import { cn } from "@/lib/utils";
import type { PlanType } from "@/types/plan";
import { billingService } from "@/services/billing.service";

interface PlanCardsProps {
  currentPlan?: PlanType;
  compact?: boolean;
}

export function PlanCards({ currentPlan, compact = false }: PlanCardsProps) {
  const plans = usePlans();
  const checkout = useMutation({
    mutationFn: (plan: Exclude<PlanType, "free">) => billingService.checkout(plan),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (error) => toast.error((error as Error).message ?? "No se pudo iniciar el checkout."),
  });

  if (plans.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-border bg-white p-5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!plans.data?.length) return null;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {plans.data.map((plan) => {
        const isCurrent = currentPlan === plan.code;
        return (
          <div
            key={plan.code}
            className={cn(
              "relative rounded-lg border bg-white p-5 shadow-xs",
              plan.recommended ? "border-primary shadow-glow-sm" : "border-border",
              compact && "p-4",
            )}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-ink">{plan.name}</h3>
              <div className="flex items-center gap-2">
                {plan.recommended && (
                  <Badge>
                    <Sparkles className="h-3 w-3" />
                    Recomendado
                  </Badge>
                )}
                {isCurrent && <Badge variant="success">Actual</Badge>}
              </div>
            </div>
            <p className="min-h-12 text-sm leading-relaxed text-ink-muted">
              {plan.description}
            </p>
            <ul className="mt-5 space-y-2.5">
              {plan.feature_labels.map((feature) => (
                <li key={feature} className="flex gap-2 text-sm text-ink-soft">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {!isCurrent && plan.code !== "free" && (
              <Button
                className="mt-5 w-full"
                variant={plan.recommended ? "default" : "secondary"}
                loading={checkout.isPending}
                onClick={() => checkout.mutate(plan.code as Exclude<PlanType, "free">)}
              >
                {plan.cta_label}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
