import { env } from "@/lib/env";
import { graphUrl } from "./client";

/** Monta a URL de autorização OAuth da Meta (login dialog). */
export function buildMetaAuthUrl(state: string): string {
  const url = new URL(
    `https://www.facebook.com/${env.meta.apiVersion}/dialog/oauth`,
  );
  url.searchParams.set("client_id", env.meta.appId);
  url.searchParams.set("redirect_uri", env.meta.redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set(
    "scope",
    ["ads_read", "ads_management", "business_management"].join(","),
  );
  url.searchParams.set("response_type", "code");
  return url.toString();
}

/** Troca o code por um access token de curta duração. */
export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const url = new URL(graphUrl("/oauth/access_token"));
  url.searchParams.set("client_id", env.meta.appId);
  url.searchParams.set("client_secret", env.meta.appSecret);
  url.searchParams.set("redirect_uri", env.meta.redirectUri);
  url.searchParams.set("code", code);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Falha ao trocar code por token");
  }
  return { accessToken: body.access_token, expiresIn: body.expires_in ?? 0 };
}

/** Converte para token de longa duração (60 dias). */
export async function exchangeForLongLivedToken(
  shortToken: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const url = new URL(graphUrl("/oauth/access_token"));
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", env.meta.appId);
  url.searchParams.set("client_secret", env.meta.appSecret);
  url.searchParams.set("fb_exchange_token", shortToken);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "Falha ao obter token longo");
  }
  return { accessToken: body.access_token, expiresIn: body.expires_in ?? 0 };
}
