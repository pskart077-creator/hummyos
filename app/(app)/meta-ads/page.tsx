import Link from "next/link";
import { Megaphone, Plug } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { formatBRL, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, THead, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Meta Ads · Hummy OS" };

export default async function MetaAdsPage() {
  const ctx = await requirePermission("meta:view");

  const connection = await prisma.metaConnection.findUnique({
    where: { organizationId: ctx.organization.id },
    include: { adAccounts: true },
  });

  const connected = connection?.status === "connected";

  if (!connected) {
    return (
      <div>
        <PageHeader
          title="Meta Ads"
          description="Leitura de campanhas, conjuntos, anúncios e métricas. Ações sensíveis exigem aprovação."
        />
        <EmptyState
          icon={<Plug size={20} />}
          title="Conecte sua conta Meta para sincronizar campanhas"
          description={
            env.meta.configured
              ? "O app Meta está configurado. Conecte uma conta de anúncios na tela de Integrações."
              : "Configure META_APP_ID e META_APP_SECRET no .env e depois conecte uma conta."
          }
          action={
            <Link
              href="/integrations"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-black"
            >
              Ir para Integrações
            </Link>
          }
        />
      </div>
    );
  }

  const campaigns = await prisma.metaCampaignCache.findMany({
    where: { adAccount: { connectionId: connection!.id } },
    include: { insights: { orderBy: { syncedAt: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
    take: 100,
  });

  const totalSpend = campaigns.reduce(
    (acc, c) => acc + Number(c.insights[0]?.spend ?? 0),
    0,
  );
  const activeCount = campaigns.filter((c) => c.status === "ACTIVE").length;

  return (
    <div>
      <PageHeader
        title="Meta Ads"
        description={`Última sincronização: ${
          connection?.lastSyncedAt
            ? formatDateTime(connection.lastSyncedAt)
            : "nunca"
        }`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Campanhas" value={campaigns.length} icon={<Megaphone size={18} />} />
        <StatCard label="Ativas" value={activeCount} tone="success" />
        <StatCard label="Gasto (cache)" value={formatBRL(totalSpend)} />
        <StatCard
          label="Contas de anúncio"
          value={connection?.adAccounts.length ?? 0}
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Campanhas</CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <EmptyState
              title="Sem campanhas em cache"
              description="Sincronize na tela de Integrações para puxar os dados."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Campanha</TH>
                  <TH>Status</TH>
                  <TH>Gasto</TH>
                  <TH>CTR</TH>
                  <TH>CPA</TH>
                  <TH>ROAS</TH>
                </TR>
              </THead>
              <tbody>
                {campaigns.map((c) => {
                  const i = c.insights[0];
                  return (
                    <TR key={c.id}>
                      <TD className="font-medium">{c.name ?? c.campaignId}</TD>
                      <TD>
                        <Badge
                          tone={c.status === "ACTIVE" ? "success" : "neutral"}
                        >
                          {c.status ?? "—"}
                        </Badge>
                      </TD>
                      <TD>{i ? formatBRL(Number(i.spend)) : "—"}</TD>
                      <TD>{i ? `${i.ctr.toFixed(2)}%` : "—"}</TD>
                      <TD>{i?.cpa ? formatBRL(Number(i.cpa)) : "—"}</TD>
                      <TD>{i?.roas ? `${i.roas.toFixed(2)}x` : "—"}</TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
