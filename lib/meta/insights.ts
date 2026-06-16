import { metaGet } from "./client";

export type MetaInsight = {
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
  date_start?: string;
  date_stop?: string;
};

/** Puxa insights de uma entidade (campanha/adset/ad/conta). */
export async function getInsights(
  entityId: string,
  accessToken: string,
  datePreset = "last_7d",
  organizationId?: string,
): Promise<MetaInsight | null> {
  const res = await metaGet<{ data: MetaInsight[] }>(
    `/${entityId}/insights`,
    {
      fields:
        "spend,impressions,clicks,ctr,cpc,cpm,actions,action_values",
      date_preset: datePreset,
    },
    accessToken,
    organizationId,
  );
  return res.data?.[0] ?? null;
}

/** Calcula conversões, CPA e ROAS a partir de actions/action_values. */
export function deriveMetrics(insight: MetaInsight) {
  const spend = Number(insight.spend ?? 0);
  const purchases =
    insight.actions?.find((a) =>
      ["purchase", "offsite_conversion.fb_pixel_purchase"].includes(
        a.action_type,
      ),
    )?.value ?? 0;
  const revenue =
    insight.action_values?.find((a) =>
      ["purchase", "offsite_conversion.fb_pixel_purchase"].includes(
        a.action_type,
      ),
    )?.value ?? 0;

  const conversions = Number(purchases);
  const rev = Number(revenue);
  return {
    spend,
    impressions: Number(insight.impressions ?? 0),
    clicks: Number(insight.clicks ?? 0),
    ctr: Number(insight.ctr ?? 0),
    cpc: Number(insight.cpc ?? 0),
    cpm: Number(insight.cpm ?? 0),
    conversions,
    cpa: conversions > 0 ? spend / conversions : null,
    roas: spend > 0 && rev > 0 ? rev / spend : null,
  };
}
