import { requirePermission } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { maskSecret } from "@/lib/crypto";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { IntegrationsGrid } from "./integrations-grid";

export const dynamic = "force-dynamic";
export const metadata = { title: "Integrações · Hummy OS" };

export default async function IntegrationsPage() {
  const ctx = await requirePermission("integrations:view");
  const [integrations, metaConnection, recentLogs] = await Promise.all([
    prisma.integration.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { name: "asc" },
    }),
    prisma.metaConnection.findUnique({
      where: { organizationId: ctx.organization.id },
    }),
    prisma.integrationLog.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const canManage = hasPermission(ctx.role, "integrations:manage");

  return (
    <div>
      <PageHeader
        title="Integrações"
        description="Conecte e monitore OpenClaw, Meta Ads e demais serviços. Tokens são criptografados e nunca expostos."
      />
      <IntegrationsGrid
        canManage={canManage}
        openclaw={{
          configured: env.openclaw.configured,
          baseUrl: env.openclaw.baseUrl
            ? env.openclaw.baseUrl
            : "(não definido)",
          tokenMasked: env.openclaw.authToken
            ? maskSecret(env.openclaw.authToken)
            : "(não definido)",
          status:
            integrations.find((i) => i.type === "openclaw")?.status ??
            "not_configured",
          lastCheckedAt:
            integrations.find((i) => i.type === "openclaw")?.lastCheckedAt
              ?.toISOString() ?? null,
        }}
        meta={{
          appConfigured: env.meta.configured,
          status: metaConnection?.status ?? "not_configured",
          lastSyncedAt: metaConnection?.lastSyncedAt?.toISOString() ?? null,
          lastError: metaConnection?.lastError ?? null,
        }}
        others={integrations
          .filter((i) => !["openclaw", "meta_ads"].includes(i.type))
          .map((i) => ({ id: i.id, name: i.name, status: i.status }))}
        recentLogs={recentLogs.map((l) => ({
          id: l.id,
          provider: l.provider,
          level: l.level,
          action: l.action,
          message: l.message,
          createdAt: formatDateTime(l.createdAt),
        }))}
      />
    </div>
  );
}
