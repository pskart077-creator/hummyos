import { prisma } from "@/lib/prisma";
import { Prisma, type LogLevel } from "@prisma/client";

type Input = {
  organizationId?: string | null;
  integrationId?: string | null;
  provider: string;
  level?: LogLevel;
  action: string;
  message?: string;
  request?: unknown;
  response?: unknown;
  durationMs?: number;
};

/** Registra uma chamada de integração (OpenClaw, Meta, etc). Nunca loga tokens. */
export async function createIntegrationLog(input: Input): Promise<void> {
  try {
    await prisma.integrationLog.create({
      data: {
        organizationId: input.organizationId ?? null,
        integrationId: input.integrationId ?? null,
        provider: input.provider,
        level: input.level ?? "info",
        action: input.action,
        message: input.message ?? null,
        request: scrub(input.request),
        response: scrub(input.response),
        durationMs: input.durationMs ?? null,
      },
    });
  } catch (err) {
    console.error("[integrationLog] falha", err);
  }
}

const SENSITIVE = ["token", "secret", "authorization", "apikey", "password"];

function scrub(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value == null) return Prisma.JsonNull;
  try {
    const json = JSON.parse(
      JSON.stringify(value, (key, val) =>
        SENSITIVE.some((s) => key.toLowerCase().includes(s)) ? "[redacted]" : val,
      ),
    );
    return json as Prisma.InputJsonValue;
  } catch {
    return Prisma.JsonNull;
  }
}
