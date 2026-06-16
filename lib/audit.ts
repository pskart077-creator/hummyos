import { prisma } from "@/lib/prisma";
import { Prisma, type LogLevel } from "@prisma/client";

type AuditInput = {
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
};

/**
 * Registra uma ação de auditoria. Nunca persiste senhas/tokens —
 * sanitize o metadata antes de chamar.
 */
export async function createAuditLog(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId ?? null,
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: sanitize(input.metadata ?? {}) as Prisma.InputJsonValue,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (err) {
    // Auditoria nunca deve quebrar o fluxo principal.
    console.error("[audit] falha ao registrar log", err);
  }
}

type SystemLogInput = {
  organizationId?: string | null;
  level?: LogLevel;
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export async function createSystemLog(input: SystemLogInput): Promise<void> {
  try {
    await prisma.systemLog.create({
      data: {
        organizationId: input.organizationId ?? null,
        level: input.level ?? "info",
        source: input.source,
        message: input.message,
        metadata: sanitize(input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("[systemLog] falha ao registrar", err);
  }
}

const SENSITIVE_KEYS = [
  "password",
  "passwordhash",
  "token",
  "secret",
  "authorization",
  "accesstoken",
  "apikey",
  "encrypted",
];

/** Remove campos sensíveis recursivamente antes de logar. */
function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
      out[key] = "[redacted]";
    } else if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      out[key] = sanitize(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}
