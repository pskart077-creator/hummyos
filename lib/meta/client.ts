import { env } from "@/lib/env";
import { createIntegrationLog } from "@/lib/integration-log";

/** Cliente base da Graph API da Meta. Server-only. */

export class MetaNotConfiguredError extends Error {
  constructor() {
    super(
      "Meta Ads não está configurado. Defina META_APP_ID e META_APP_SECRET e conecte uma conta.",
    );
    this.name = "MetaNotConfiguredError";
  }
}

export function graphUrl(path: string): string {
  const version = env.meta.apiVersion;
  return `https://graph.facebook.com/${version}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function metaGet<T>(
  path: string,
  params: Record<string, string>,
  accessToken: string,
  organizationId?: string,
): Promise<T> {
  const url = new URL(graphUrl(path));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", accessToken);

  const start = Date.now();
  const res = await fetch(url.toString(), { cache: "no-store" });
  const body = await res.json().catch(() => ({}));

  await createIntegrationLog({
    organizationId,
    provider: "meta_ads",
    level: res.ok ? "info" : "error",
    action: `GET ${path}`,
    message: res.ok ? "ok" : `HTTP ${res.status}`,
    // request sem o token (a Graph API recebe via query; scrub remove)
    request: { path, params },
    response: res.ok ? { received: Array.isArray(body?.data) ? body.data.length : 1 } : body,
    durationMs: Date.now() - start,
  });

  if (!res.ok) {
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Meta API: ${msg}`);
  }
  return body as T;
}

export async function metaPost<T>(
  path: string,
  params: Record<string, string>,
  accessToken: string,
  organizationId?: string,
): Promise<T> {
  const start = Date.now();
  const form = new URLSearchParams({ ...params, access_token: accessToken });
  const res = await fetch(graphUrl(path), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));

  await createIntegrationLog({
    organizationId,
    provider: "meta_ads",
    level: res.ok ? "info" : "error",
    action: `POST ${path}`,
    message: res.ok ? "ok" : `HTTP ${res.status}`,
    request: { path, params },
    response: body,
    durationMs: Date.now() - start,
  });

  if (!res.ok) {
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Meta API: ${msg}`);
  }
  return body as T;
}
