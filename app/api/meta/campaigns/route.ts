import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { ok, unauthorized, forbidden, handleError } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Retorna campanhas do cache (read-only). */
export async function GET(req: Request) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "meta:view")) return forbidden();

    const status = new URL(req.url).searchParams.get("status") ?? undefined;

    const campaigns = await prisma.metaCampaignCache.findMany({
      where: {
        adAccount: { connection: { organizationId: ctx.organization.id } },
        status: status || undefined,
      },
      include: { insights: { orderBy: { syncedAt: "desc" }, take: 1 } },
      orderBy: { name: "asc" },
    });
    return ok(campaigns);
  } catch (err) {
    return handleError(err);
  }
}
