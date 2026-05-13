"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/shared/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseTicketForm } from "@/features/expense-tickets/components/expense-ticket-form";
import { useCreateExpenseTicket, useUploadExpenseAttachment } from "@/hooks/use-expense-tickets";
import type { ExpenseTicketCreateRequest } from "@/types/expense-ticket";

export default function NewExpensePage() {
  const router = useRouter();
  const create = useCreateExpenseTicket();
  const uploadAttachment = useUploadExpenseAttachment();

  async function handleSubmit(values: ExpenseTicketCreateRequest, file?: File) {
    try {
      const ticket = await create.mutateAsync(values);
      if (file) {
        await uploadAttachment.mutateAsync({ id: ticket.id, file });
      }
      toast.success("Gasto creado correctamente.");
      router.push(`/expenses/${ticket.id}`);
    } catch (err) {
      toast.error((err as Error).message ?? "No se pudo crear el gasto.");
    }
  }

  const loading = create.isPending || uploadAttachment.isPending;

  return (
    <>
      <Topbar title="Nuevo gasto" />
      <div className="mx-auto max-w-xl space-y-4 p-5 lg:p-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Volver
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Registrar gasto</CardTitle>
            <CardDescription>
              Añade los datos del gasto y adjunta la foto del ticket si la tienes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseTicketForm onSubmit={handleSubmit} loading={loading} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
