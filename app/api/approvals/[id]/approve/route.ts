import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { decideApprovalSchema } from "@/lib/validations";
import { ok, fail, unauthorized, forbidden, handleError } from "@/lib/http";
import { createAuditLog } from "@/lib/audit";

const TRAFFIC_ACTIONS = ["pause_campaign", "pause_adset", "pause_ad", "update_budget", "activate_entity"];

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();

    const approval = await prisma.approvalRequest.findFirst({
      where: { id: params.id, organizationId: ctx.organization.id },
    });
    if (!approval) return fail("Aprovação não encontrada", 404);
    if (approval.status !== "pending")
      return fail("Esta solicitação já foi decidida.", 409);

    const isTraffic = TRAFFIC_ACTIONS.includes(approval.actionType);
    const allowed =
      hasPermission(ctx.role, "approvals:decide") ||
      (isTraffic && hasPermission(ctx.role, "approvals:decide_traffic"));
    if (!allowed) return forbidden("Você não pode aprovar esta ação.");

    const { reason } = decideApprovalSchema.parse(
      await req.json().catch(() => ({})),
    );

    const updated = await prisma.approvalRequest.update({
      where: { id: params.id },
      data: {
        status: "approved",
        approvedByUserId: ctx.user.id,
        reason: reason ?? null,
      },
    });
    await prisma.approvalEvent.create({
      data: {
        approvalId: params.id,
        userId: ctx.user.id,
        type: "approved",
        message: reason ?? "Aprovada",
      },
    });
    await createAuditLog({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      action: "approval.approved",
      entityType: "approval",
      entityId: params.id,
    });
    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
}
