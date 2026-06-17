import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { ok, fail, unauthorized, forbidden, handleError } from "@/lib/http";
import { createAuditLog } from "@/lib/audit";

/** Cancela um convite pendente. id = inviteId */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "team:manage")) return forbidden();

    const invite = await prisma.invite.findFirst({
      where: {
        id: params.id,
        organizationId: ctx.organization.id,
        status: "pending",
      },
    });

    if (!invite) return fail("Convite pendente nao encontrado", 404);

    await prisma.invite.update({
      where: { id: invite.id },
      data: { status: "revoked" },
    });

    await createAuditLog({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      action: "invite.revoked",
      entityType: "invite",
      entityId: invite.id,
      metadata: {
        email: invite.email,
        role: invite.role,
      },
    });

    return ok({ revoked: true });
  } catch (err) {
    return handleError(err);
  }
}
