import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { ok, unauthorized, forbidden, handleError } from "@/lib/http";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "meta:view")) return forbidden();

    const connection = await prisma.metaConnection.findUnique({
      where: { organizationId: ctx.organization.id },
      include: { adAccounts: { select: { accountId: true, name: true } } },
    });

    return ok({
      appConfigured: env.meta.configured,
      status: connection?.status ?? "not_configured",
      businessName: connection?.businessName ?? null,
      lastSyncedAt: connection?.lastSyncedAt ?? null,
      lastError: connection?.lastError ?? null,
      adAccounts: connection?.adAccounts ?? [],
    });
  } catch (err) {
    return handleError(err);
  }
}
