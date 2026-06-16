import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatCompact } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Coins } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Uso de IA · Hummy OS" };

export default async function AiUsagePage() {
  const ctx = await requirePermission("ai_usage:view");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [todayAgg, monthAgg, byAgent, byModel] = await Promise.all([
    prisma.aiUsageRecord.aggregate({
      where: { organizationId: ctx.organization.id, createdAt: { gte: today } },
      _sum: { totalTokens: true, estimatedCostBrl: true },
    }),
    prisma.aiUsageRecord.aggregate({
      where: {
        organizationId: ctx.organization.id,
        createdAt: { gte: monthStart },
      },
      _sum: { totalTokens: true, estimatedCostBrl: true, estimatedCostUsd: true },
    }),
    prisma.aiUsageRecord.groupBy({
      by: ["agentId"],
      where: {
        organizationId: ctx.organization.id,
        createdAt: { gte: monthStart },
      },
      _sum: { totalTokens: true, estimatedCostBrl: true },
    }),
    prisma.aiUsageRecord.groupBy({
      by: ["model"],
      where: {
        organizationId: ctx.organization.id,
        createdAt: { gte: monthStart },
      },
      _sum: { totalTokens: true, estimatedCostBrl: true },
    }),
  ]);

  const agents = await prisma.agent.findMany({
    where: { organizationId: ctx.organization.id },
    select: { id: true, name: true },
  });
  const agentName = (id: string | null) =>
    agents.find((a) => a.id === id)?.name ?? "Sem agente";

  return (
    <div>
      <PageHeader
        title="Uso e custos de IA"
        description="Acompanhe tokens e custo estimado por agente, modelo e período."
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Tokens hoje"
          value={formatCompact(Number(todayAgg._sum.totalTokens ?? 0))}
          icon={<Coins size={18} />}
        />
        <StatCard
          label="Custo hoje"
          value={formatBRL(Number(todayAgg._sum.estimatedCostBrl ?? 0))}
        />
        <StatCard
          label="Tokens no mês"
          value={formatCompact(Number(monthAgg._sum.totalTokens ?? 0))}
        />
        <StatCard
          label="Custo no mês"
          value={formatBRL(Number(monthAgg._sum.estimatedCostBrl ?? 0))}
          hint={`≈ US$ ${Number(monthAgg._sum.estimatedCostUsd ?? 0).toFixed(2)}`}
          tone="brand"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Uso por agente (mês)</CardTitle>
          </CardHeader>
          <CardContent>
            {byAgent.length === 0 ? (
              <EmptyState title="Sem uso registrado" />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Agente</TH>
                    <TH>Tokens</TH>
                    <TH>Custo</TH>
                  </TR>
                </THead>
                <tbody>
                  {byAgent.map((a) => (
                    <TR key={a.agentId ?? "none"}>
                      <TD>{agentName(a.agentId)}</TD>
                      <TD>{formatCompact(Number(a._sum.totalTokens ?? 0))}</TD>
                      <TD>{formatBRL(Number(a._sum.estimatedCostBrl ?? 0))}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uso por modelo (mês)</CardTitle>
          </CardHeader>
          <CardContent>
            {byModel.length === 0 ? (
              <EmptyState title="Sem uso registrado" />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Modelo</TH>
                    <TH>Tokens</TH>
                    <TH>Custo</TH>
                  </TR>
                </THead>
                <tbody>
                  {byModel.map((m) => (
                    <TR key={m.model}>
                      <TD className="font-mono text-xs">{m.model}</TD>
                      <TD>{formatCompact(Number(m._sum.totalTokens ?? 0))}</TD>
                      <TD>{formatBRL(Number(m._sum.estimatedCostBrl ?? 0))}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
