import { metaGet } from "./client";

type MetaList<T> = { data: T[] };

export type MetaCampaign = {
  id: string;
  name: string;
  status: string;
  objective?: string;
  daily_budget?: string;
};

export type MetaAdset = {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
  campaign_id?: string;
};

export type MetaAd = {
  id: string;
  name: string;
  status: string;
  adset_id?: string;
};

export async function listCampaigns(
  adAccountId: string,
  accessToken: string,
  organizationId?: string,
) {
  const res = await metaGet<MetaList<MetaCampaign>>(
    `/act_${adAccountId}/campaigns`,
    {
      fields: "id,name,status,objective,daily_budget",
      limit: "200",
    },
    accessToken,
    organizationId,
  );
  return res.data;
}

export async function listAdsets(
  campaignId: string,
  accessToken: string,
  organizationId?: string,
) {
  const res = await metaGet<MetaList<MetaAdset>>(
    `/${campaignId}/adsets`,
    { fields: "id,name,status,daily_budget,campaign_id", limit: "200" },
    accessToken,
    organizationId,
  );
  return res.data;
}

export async function listAds(
  adsetId: string,
  accessToken: string,
  organizationId?: string,
) {
  const res = await metaGet<MetaList<MetaAd>>(
    `/${adsetId}/ads`,
    { fields: "id,name,status,adset_id", limit: "200" },
    accessToken,
    organizationId,
  );
  return res.data;
}
