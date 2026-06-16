import { prisma } from "@/lib/prisma";
import { estimateCost } from "./cost";

export async function recordAiUsage(input: {
  organizationId: string;
  userId?: string | null;
  agentId?: string | null;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}) {
  const total = input.inputTokens + input.outputTokens;
  const { usd, brl } = estimateCost(
    input.model,
    input.inputTokens,
    input.outputTokens,
  );
  await prisma.aiUsageRecord.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      agentId: input.agentId ?? null,
      provider: input.provider,
      model: input.model,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      totalTokens: total,
      estimatedCostUsd: usd.toFixed(6),
      estimatedCostBrl: brl.toFixed(6),
    },
  });
  return { total, usd, brl };
}
