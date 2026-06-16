import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { ok, unauthorized, forbidden, handleError } from "@/lib/http";
import { checkOpenClawHealth } from "@/lib/openclaw/client";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "integrations:manage")) return forbidden();

    const health = await checkOpenClawHealth(ctx.organization.id);

    await prisma.integration.updateMany({
      where: { organizationId: ctx.organization.id, type: "openclaw" },
      data: {
        status: health.healthy
          ? "connected"
          : health.configured
            ? "error"
            : "not_configured",
        lastCheckedAt: new Date(),
      },
    });

    return ok(health);
  } catch (err) {
    return handleError(err);
  }
}
