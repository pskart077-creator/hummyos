import { env } from "@/lib/env";
import { createIntegrationLog } from "@/lib/integration-log";

/**
 * Cliente OpenClaw. Toda chamada é registrada em integration_logs.
 * O token NUNCA é exposto ao frontend — este módulo é server-only.
 */

class OpenClawNotConfiguredError extends Error {
  constructor() {
    super("OpenClaw não está configurado. Defina OPENCLAW_BASE_URL e OPENCLAW_AUTH_TOKEN.");
    this.name = "OpenClawNotConfiguredError";
  }
}

function ensureConfigured() {
  if (!env.openclaw.configured) throw new OpenClawNotConfiguredError();
}

async function request<T>(
  path: string,
  init: RequestInit,
  organizationId?: string,
): Promise<T> {
  ensureConfigured();
  const url = `${env.openclaw.baseUrl.replace(/\/$/, "")}${path}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.openclaw.authToken}`,
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
    const durationMs = Date.now() - start;
    const body = await res.json().catch(() => ({}));

    await createIntegrationLog({
      organizationId,
      provider: "openclaw",
      level: res.ok ? "info" : "error",
      action: `${init.method ?? "GET"} ${path}`,
      message: res.ok ? "ok" : `HTTP ${res.status}`,
      response: body,
      durationMs,
    });

    if (!res.ok) {
      throw new Error(`OpenClaw ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
    }
    return body as T;
  } catch (err) {
    await createIntegrationLog({
      organizationId,
      provider: "openclaw",
      level: "error",
      action: `${init.method ?? "GET"} ${path}`,
      message: err instanceof Error ? err.message : "erro desconhecido",
      durationMs: Date.now() - start,
    });
    throw err;
  }
}

export async function checkOpenClawHealth(organizationId?: string) {
  if (!env.openclaw.configured) {
    return { configured: false, healthy: false } as const;
  }
  try {
    await request("/health", { method: "GET" }, organizationId);
    return { configured: true, healthy: true } as const;
  } catch {
    return { configured: true, healthy: false } as const;
  }
}

export async function listOpenClawAgents(organizationId?: string) {
  return request<{ agents: unknown[] }>(
    "/agents",
    { method: "GET" },
    organizationId,
  );
}

export async function sendMessageToOpenClaw(
  params: { agentId?: string; message: string; context?: unknown },
  organizationId?: string,
) {
  const agentId = params.agentId ?? env.openclaw.defaultAgentId;
  return request<{ reply: string; runId?: string }>(
    "/messages",
    {
      method: "POST",
      body: JSON.stringify({
        agentId,
        message: params.message,
        context: params.context,
      }),
    },
    organizationId,
  );
}

export async function runAgent(
  params: { agentId?: string; input: unknown },
  organizationId?: string,
) {
  const agentId = params.agentId ?? env.openclaw.defaultAgentId;
  return request<{ runId: string; status: string; output?: unknown }>(
    "/runs",
    {
      method: "POST",
      body: JSON.stringify({ agentId, input: params.input }),
    },
    organizationId,
  );
}

export async function createOpenClawRunLog(
  organizationId: string,
  data: { action: string; message?: string; payload?: unknown },
) {
  await createIntegrationLog({
    organizationId,
    provider: "openclaw",
    action: data.action,
    message: data.message,
    request: data.payload,
  });
}

export { OpenClawNotConfiguredError };
