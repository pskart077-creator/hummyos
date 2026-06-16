import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/states";
import { ShoppingCart, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vendas · Hummy OS" };

export default async function SalesPage() {
  const ctx = await requirePermission("sales:view");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [sales, todayAgg, monthAgg] = await Promise.all([
    prisma.sale.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.sale.aggregate({
      where: {
        organizationId: ctx.organization.id,
        createdAt: { gte: today },
        status: "paid",
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: {
        organizationId: ctx.organization.id,
        createdAt: { gte: monthStart },
        status: "paid",
      },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const monthTotal = Number(monthAgg._sum.amount ?? 0);
  const ticket = monthAgg._count > 0 ? monthTotal / monthAgg._count : 0;

  return (
    <div>
      <PageHeader title="Vendas" description="Resultado de vendas da Hummy." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total hoje"
          value={formatBRL(Number(todayAgg._sum.amount ?? 0))}
          hint={`${todayAgg._count} venda(s)`}
          icon={<DollarSign size={18} />}
          tone="success"
        />
        <StatCard
          label="Total no mês"
          value={formatBRL(monthTotal)}
          hint={`${monthAgg._count} venda(s)`}
          icon={<ShoppingCart size={18} />}
        />
        <StatCard label="Ticket médio" value={formatBRL(ticket)} />
        <StatCard label="Vendas (registros)" value={sales.length} />
      </div>

      <Card className="mt-4">
        <CardContent className="pt-5">
          {sales.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart size={20} />}
              title="Nenhuma venda registrada"
              description="Integre seu checkout para popular esta tela."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Cliente</TH>
                  <TH>Produto</TH>
                  <TH>Valor</TH>
                  <TH>Status</TH>
                  <TH>Origem</TH>
                  <TH>Data</TH>
                </TR>
              </THead>
              <tbody>
                {sales.map((s) => (
                  <TR key={s.id}>
                    <TD className="font-medium">{s.customerName}</TD>
                    <TD className="text-xs">{s.product}</TD>
                    <TD>{formatBRL(Number(s.amount))}</TD>
                    <TD>
                      <StatusBadge value={s.status} />
                    </TD>
                    <TD className="text-xs text-slate-400">
                      {s.source ?? "—"}
                    </TD>
                    <TD className="text-xs text-slate-500">
                      {formatDateTime(s.createdAt)}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
