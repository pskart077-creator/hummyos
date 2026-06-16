import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { decryptSecret } from "@/lib/crypto";
import { listCampaigns } from "./campaigns";
import { getInsights, deriveMetrics } from "./insights";
import { createSystemLog } from "@/lib/audit";

const SECRET = () => env.meta.encryptionSecret || env.encryptionKey;

/** Resolve o token de acesso descriptografado de uma organização. */
export async function getMetaToken(
  organizationId: string,
): Promise<string | null> {
  const conn = await prisma.metaConnection.findUnique({
    where: { organizationId },
  });
  if (!conn?.encryptedAccessToken) return null;
  try {
    return decryptSecret(conn.encryptedAccessToken, SECRET());
  } catch {
    return null;
  }
}

/**
 * Sincroniza campanhas + insights das contas selecionadas para o cache.
 * Read-only na Meta. Falha de forma controlada se não houver conexão.
 */
export async function syncMetaCampaigns(organizationId: string) {
  const connection = await prisma.metaConnection.findUnique({
    where: { organizationId },
    include: { adAccounts: { where: { selected: true } } },
  });
  if (!connection) throw new Error("Conta Meta não conectada.");

  const token = await getMetaToken(organizationId);
  if (!token) throw new Error("Token Meta indisponível.");

  const accounts =
    connection.adAccounts.length > 0
      ? connection.adAccounts
      : await prisma.metaAdAccount.findMany({
          where: { connectionId: connection.id },
        });

  let synced = 0;
  for (const account of accounts) {
    const campaigns = await listCampaigns(
      account.accountId,
      token,
      organizationId,
    );
    for (const c of campaigns) {
      const cached = await prisma.metaCampaignCache.upsert({
        where: {
          adAccountId_campaignId: {
            adAccountId: account.id,
            campaignId: c.id,
          },
        },
        update: {
          name: c.name,
          status: c.status,
          objective: c.objective,
          dailyBudget: c.daily_budget
            ? (Number(c.daily_budget) / 100).toFixed(2)
            : null,
          raw: c as never,
          syncedAt: new Date(),
        },
        create: {
          adAccountId: account.id,
          campaignId: c.id,
          name: c.name,
          status: c.status,
          objective: c.objective,
          dailyBudget: c.daily_budget
            ? (Number(c.daily_budget) / 100).toFixed(2)
            : null,
          raw: c as never,
        },
      });

      const insight = await getInsights(
        c.id,
        token,
        "last_7d",
        organizationId,
      ).catch(() => null);
      if (insight) {
        const m = deriveMetrics(insight);
        await prisma.metaInsightCache.create({
          data: {
            level: "campaign",
            refId: c.id,
            campaignId: cached.id,
            dateStart: insight.date_start
              ? new Date(insight.date_start)
              : new Date(),
            dateStop: insight.date_stop
              ? new Date(insight.date_stop)
              : new Date(),
            spend: m.spend.toFixed(2),
            impressions: m.impressions,
            clicks: m.clicks,
            ctr: m.ctr,
            cpc: m.cpc.toFixed(4),
            cpm: m.cpm.toFixed(4),
            conversions: m.conversions,
            cpa: m.cpa != null ? m.cpa.toFixed(2) : null,
            roas: m.roas,
            raw: insight as never,
          },
        });
      }
      synced++;
    }
  }

  await prisma.metaConnection.update({
    where: { organizationId },
    data: { lastSyncedAt: new Date(), lastError: null },
  });
  await createSystemLog({
    organizationId,
    source: "meta",
    message: `Sincronização concluída: ${synced} campanha(s).`,
  });

  return { synced };
}
