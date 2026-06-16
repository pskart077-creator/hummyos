import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { ok, unauthorized, forbidden, handleError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "logs:view")) return forbidden();

    const url = new URL(req.url);
    const type = url.searchParams.get("type") ?? "audit"; // audit | system | integration
    const take = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);

    if (type === "system") {
      const logs = await prisma.systemLog.findMany({
        where: {
          organizationId: ctx.organization.id,
          level: (url.searchParams.get("level") as never) || undefined,
          source: url.searchParams.get("source") || undefined,
        },
        orderBy: { createdAt: "desc" },
        take,
      });
      return ok(logs);
    }

    if (type === "integration") {
      const logs = await prisma.integrationLog.findMany({
        where: {
          organizationId: ctx.organization.id,
          provider: url.searchParams.get("provider") || undefined,
        },
        orderBy: { createdAt: "desc" },
        take,
      });
      return ok(logs);
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        organizationId: ctx.organization.id,
        userId: url.searchParams.get("userId") || undefined,
        action: url.searchParams.get("action") || undefined,
      },
      orderBy: { createdAt: "desc" },
      take,
      include: { user: { select: { name: true } } },
    });
    return ok(logs);
  } catch (err) {
    return handleError(err);
  }
}
