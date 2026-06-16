import type { ReportType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { ok, unauthorized, forbidden, handleError } from "@/lib/http";
import { chatComplete } from "@/lib/ai/client";
import { recordAiUsage } from "@/lib/ai/usage";
import { getDashboardMetrics } from "@/lib/services/dashboard";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const VALID_TYPES: ReportType[] = [
  "daily",
  "weekly",
  "traffic",
  "sales",
  "leads",
  "ai",
  "tasks",
  "custom",
];

export async function GET() {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "reports:view")) return forbidden();
    const reports = await prisma.report.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return ok(reports);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "reports:create")) return forbidden();

    const body = await req.json().catch(() => ({}));
    const type: ReportType = VALID_TYPES.includes(body.type)
      ? body.type
      : "daily";

    const analista = await prisma.agent.findFirst({
      where: { organizationId: ctx.organization.id, roleType: "analista" },
    });
    const metrics = await getDashboardMetrics(ctx.organization.id);

    const dataSummary = {
      vendasHoje: metrics.salesToday,
      leadsHoje: metrics.leadsToday,
      gastoTrafego: metrics.spendToday,
      cpa: metrics.cpa,
      roas: metrics.roas,
      campanhasAtivas: metrics.activeCampaigns,
      tarefasPendentes: metrics.pendingTasks,
      aprovacoesPendentes: metrics.pendingApprovals,
      custoIAmes: metrics.aiCostMonthBrl,
    };

    const prompt = `Gere um relatório ${type} objetivo para a equipe da Hummy com base nestes dados (JSON): ${JSON.stringify(
      dataSummary,
    )}. Inclua: resumo executivo, destaques, pontos de atenção e próximos passos. Seja conciso e prático.`;

    const result = await chatComplete([{ role: "user", content: prompt }], {
      systemPrompt: analista?.systemPrompt,
      model: analista?.modelName,
      provider: analista?.modelProvider,
    });

    await recordAiUsage({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      agentId: analista?.id,
      provider: result.provider,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });

    const report = await prisma.report.create({
      data: {
        organizationId: ctx.organization.id,
        type,
        title: `Relatório ${type} — ${new Date().toLocaleDateString("pt-BR")}`,
        content: result.content,
        data: dataSummary as never,
        createdByAgentId: analista?.id,
      },
    });

    await createAuditLog({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      action: "report.generated",
      entityType: "report",
      entityId: report.id,
      metadata: { type },
    });

    return ok(report, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
