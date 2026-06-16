import { metaPost } from "./client";

/**
 * Ações de escrita na Meta. SEMPRE devem ser disparadas via fluxo de
 * aprovação (executeApprovedMetaAction no worker) — nunca diretamente
 * por uma sugestão de IA.
 */

export async function setEntityStatus(
  entityId: string,
  status: "ACTIVE" | "PAUSED",
  accessToken: string,
  organizationId?: string,
) {
  return metaPost<{ success: boolean }>(
    `/${entityId}`,
    { status },
    accessToken,
    organizationId,
  );
}

export async function updateDailyBudget(
  entityId: string,
  dailyBudgetCents: number,
  accessToken: string,
  organizationId?: string,
) {
  return metaPost<{ success: boolean }>(
    `/${entityId}`,
    { daily_budget: String(dailyBudgetCents) },
    accessToken,
    organizationId,
  );
}

export const META_ACTION_TYPES = [
  "pause_campaign",
  "pause_adset",
  "pause_ad",
  "activate_entity",
  "update_budget",
  "create_campaign",
  "create_adset",
  "create_ad",
  "publish_creative",
] as const;

export type MetaActionType = (typeof META_ACTION_TYPES)[number];
