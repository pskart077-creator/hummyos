import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { createApprovalSchema } from "@/lib/validations";
import { ok, unauthorized, forbidden, handleError } from "@/lib/http";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "approvals:view")) return forbidden();

    const status = new URL(req.url).searchParams.get("status") ?? undefined;
    const approvals = await prisma.approvalRequest.findMany({
      where: { organizationId: ctx.organization.id, status: status as never },
      orderBy: { createdAt: "desc" },
      include: { requestedBy: { select: { name: true } } },
    });
    return ok(approvals);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "approvals:request")) return forbidden();

    const data = createApprovalSchema.parse(await req.json());
    const approval = await prisma.approvalRequest.create({
      data: {
        organizationId: ctx.organization.id,
        requestedByUserId: ctx.user.id,
        actionType: data.actionType,
        title: data.title,
        description: data.description,
        payload: data.payload as never,
        riskLevel: data.riskLevel,
      },
    });

    await prisma.approvalEvent.create({
      data: {
        approvalId: approval.id,
        userId: ctx.user.id,
        type: "created",
        message: `Solicitação criada: ${data.actionType}`,
      },
    });
    await createAuditLog({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      action: "approval.created",
      entityType: "approval",
      entityId: approval.id,
    });
    return ok(approval, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
