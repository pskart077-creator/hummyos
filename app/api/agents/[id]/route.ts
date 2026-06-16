import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { agentSchema } from "@/lib/validations";
import { ok, fail, unauthorized, forbidden, handleError } from "@/lib/http";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "agents:view")) return forbidden();
    const agent = await prisma.agent.findFirst({
      where: { id: params.id, organizationId: ctx.organization.id },
    });
    if (!agent) return fail("Agente não encontrado", 404);
    return ok(agent);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "agents:manage")) return forbidden();

    const existing = await prisma.agent.findFirst({
      where: { id: params.id, organizationId: ctx.organization.id },
    });
    if (!existing) return fail("Agente não encontrado", 404);

    const data = agentSchema.partial().parse(await req.json());
    const agent = await prisma.agent.update({
      where: { id: params.id },
      data,
    });
    await createAuditLog({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      action: "agent.updated",
      entityType: "agent",
      entityId: agent.id,
    });
    return ok(agent);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "agents:manage")) return forbidden();

    const existing = await prisma.agent.findFirst({
      where: { id: params.id, organizationId: ctx.organization.id },
    });
    if (!existing) return fail("Agente não encontrado", 404);

    await prisma.agent.delete({ where: { id: params.id } });
    await createAuditLog({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      action: "agent.deleted",
      entityType: "agent",
      entityId: params.id,
    });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
