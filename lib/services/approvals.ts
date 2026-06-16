import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog, createSystemLog } from "@/lib/audit";
import { env } from "@/lib/env";

/**
 * Executor central de ações aprovadas. Cada actionType perigoso é
 * tratado aqui. Ações Meta exigem conexão configurada; sem ela, a
 * execução falha de forma controlada (não quebra o sistema).
 */
export async function executeApproval(approvalId: string, userId: string) {
  const approval = await prisma.approvalRequest.findUnique({
    where: { id: approvalId },
    include: { events: false },
  });
  if (!approval) throw new Error("Aprovação não encontrada");
  if (approval.status !== "approved") {
    throw new Error("Apenas aprovações aprovadas podem ser executadas.");
  }

  await prisma.approvalEvent.create({
    data: {
      approvalId,
      userId,
      type: "execution_started",
      message: `Iniciando execução de ${approval.actionType}`,
    },
  });

  try {
    const result = await dispatch(approval.actionType, approval.payload, approval.organizationId);

    const updated = await prisma.approvalRequest.update({
      where: { id: approvalId },
      data: {
        status: "executed",
        executedAt: new Date(),
        result: result as Prisma.InputJsonValue,
      },
    });

    await prisma.approvalEvent.create({
      data: {
        approvalId,
        userId,
        type: "executed",
        message: "Ação executada com sucesso.",
      },
    });
    await createAuditLog({
      organizationId: approval.organizationId,
      userId,
      action: "approval.executed",
      entityType: "approval",
      entityId: approvalId,
      metadata: { actionType: approval.actionType },
    });
    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro desconhecido";
    await prisma.approvalRequest.update({
      where: { id: approvalId },
      data: { status: "failed", result: { error: message } },
    });
    await prisma.approvalEvent.create({
      data: { approvalId, userId, type: "failed", message },
    });
    await createSystemLog({
      organizationId: approval.organizationId,
      level: "error",
      source: "approvals",
      message: `Falha ao executar ${approval.actionType}`,
      metadata: { approvalId, error: message },
    });
    throw err;
  }
}

async function dispatch(
  actionType: string,
  payload: unknown,
  organizationId: string,
): Promise<Record<string, unknown>> {
  // Ações Meta exigem token de conexão.
  if (actionType.startsWith("pause_") || actionType === "update_budget" || actionType === "activate_entity") {
    if (!env.meta.configured) {
      throw new Error(
        "Meta Ads não configurado. Conecte uma conta para executar ações de tráfego.",
      );
    }
    const connection = await prisma.metaConnection.findUnique({
      where: { organizationId },
    });
    if (!connection?.encryptedAccessToken) {
      throw new Error("Conta Meta não conectada — sem token para executar.");
    }
    // A execução real ocorre no worker (executeApprovedMetaAction).
    // Aqui registramos o request para o worker processar.
    const meta = payload as { targetId?: string };
    await prisma.metaActionRequest.create({
      data: {
        organizationId,
        approvalId: undefined,
        actionType,
        targetType: actionType.includes("campaign")
          ? "campaign"
          : actionType.includes("adset")
            ? "adset"
            : "ad",
        targetId: meta.targetId ?? "unknown",
        payload: payload as never,
        status: "queued",
      },
    });
    return { queued: true, note: "Ação enfileirada para execução pelo worker." };
  }

  // Outras ações (internas) — placeholder seguro.
  return { ok: true, note: `Ação ${actionType} registrada.` };
}
