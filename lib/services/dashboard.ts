import { prisma } from "@/lib/prisma";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export type DashboardMetrics = Awaited<ReturnType<typeof getDashboardMetrics>>;

/** Agrega as métricas do dashboard, todas escopadas por organização. */
export async function getDashboardMetrics(organizationId: string) {
  const today = startOfToday();
  const monthStart = startOfMonth();

  const [
    salesTodayAgg,
    leadsToday,
    insightsToday,
    activeCampaigns,
    pendingRecommendations,
    pendingTasks,
    pendingApprovals,
    recentConversations,
    criticalLogs,
    integrations,
    usageTodayAgg,
    usageMonthAgg,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { organizationId, createdAt: { gte: today }, status: "paid" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.lead.count({
      where: { organizationId, createdAt: { gte: today } },
    }),
    prisma.metaInsightCache.aggregate({
      where: { campaign: { adAccount: { connection: { organizationId } } }, dateStart: { gte: today } },
      _sum: { spend: true, conversions: true },
    }),
    prisma.metaCampaignCache.count({
      where: {
        adAccount: { connection: { organizationId } },
        status: "ACTIVE",
      },
    }),
    prisma.aiRecommendation.findMany({
      where: { organizationId, status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.task.count({
      where: {
        organizationId,
        status: { in: ["pending", "in_progress", "waiting_approval"] },
      },
    }),
    prisma.approvalRequest.count({
      where: { organizationId, status: "pending" },
    }),
    prisma.conversation.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { agent: true, user: true },
    }),
    prisma.systemLog.findMany({
      where: { organizationId, level: { in: ["error", "critical"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.integration.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    }),
    prisma.aiUsageRecord.aggregate({
      where: { organizationId, createdAt: { gte: today } },
      _sum: { totalTokens: true, estimatedCostBrl: true },
    }),
    prisma.aiUsageRecord.aggregate({
      where: { organizationId, createdAt: { gte: monthStart } },
      _sum: { estimatedCostBrl: true, estimatedCostUsd: true },
    }),
  ]);

  const spendToday = Number(insightsToday._sum.spend ?? 0);
  const conversionsToday = Number(insightsToday._sum.conversions ?? 0);
  const salesAmountToday = Number(salesTodayAgg._sum.amount ?? 0);

  const cpa = conversionsToday > 0 ? spendToday / conversionsToday : null;
  const roas = spendToday > 0 ? salesAmountToday / spendToday : null;

  return {
    salesToday: salesAmountToday,
    salesCountToday: salesTodayAgg._count,
    leadsToday,
    spendToday,
    cpa,
    roas,
    activeCampaigns,
    pendingRecommendations,
    pendingTasks,
    pendingApprovals,
    recentConversations,
    criticalLogs,
    integrations,
    aiTokensToday: Number(usageTodayAgg._sum.totalTokens ?? 0),
    aiCostTodayBrl: Number(usageTodayAgg._sum.estimatedCostBrl ?? 0),
    aiCostMonthBrl: Number(usageMonthAgg._sum.estimatedCostBrl ?? 0),
    aiCostMonthUsd: Number(usageMonthAgg._sum.estimatedCostUsd ?? 0),
  };
}
