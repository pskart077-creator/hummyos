import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission, ALL_ROLES } from "@/lib/permissions";
import { ok, fail, unauthorized, forbidden, handleError } from "@/lib/http";
import { createAuditLog } from "@/lib/audit";

/** Atualiza papel ou status de um membro da organização. id = membershipId */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "team:manage")) return forbidden();

    const membership = await prisma.organizationMember.findFirst({
      where: { id: params.id, organizationId: ctx.organization.id },
      include: { user: true },
    });
    if (!membership) return fail("Membro não encontrado", 404);

    // Protege o admin_master de ser rebaixado por quem não é admin_master.
    if (
      membership.role === "admin_master" &&
      ctx.role !== "admin_master"
    ) {
      return forbidden("Apenas um Admin Master pode alterar outro.");
    }

    const body = await req.json();
    const updates: { role?: Role } = {};

    if (typeof body.role === "string") {
      if (!ALL_ROLES.includes(body.role)) return fail("Cargo inválido", 422);
      if (body.role === "admin_master" && ctx.role !== "admin_master") {
        return forbidden("Apenas Admin Master concede admin_master.");
      }
      updates.role = body.role as Role;
    }

    if (updates.role) {
      await prisma.organizationMember.update({
        where: { id: membership.id },
        data: { role: updates.role },
      });
    }

    if (typeof body.status === "string") {
      if (membership.userId === ctx.user.id) {
        return fail("Você não pode alterar seu próprio status.", 422);
      }
      await prisma.user.update({
        where: { id: membership.userId },
        data: { status: body.status === "suspended" ? "suspended" : "active" },
      });
      if (body.status === "suspended") {
        await prisma.authSession.deleteMany({
          where: { userId: membership.userId },
        });
      }
    }

    await createAuditLog({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      action: "team.member_updated",
      entityType: "membership",
      entityId: membership.id,
      metadata: { role: body.role, status: body.status },
    });

    return ok({ updated: true });
  } catch (err) {
    return handleError(err);
  }
}
