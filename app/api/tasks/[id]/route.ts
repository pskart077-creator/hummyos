import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { updateTaskSchema } from "@/lib/validations";
import { ok, fail, unauthorized, forbidden, handleError } from "@/lib/http";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "tasks:manage")) return forbidden();

    const existing = await prisma.task.findFirst({
      where: { id: params.id, organizationId: ctx.organization.id },
    });
    if (!existing) return fail("Tarefa não encontrada", 404);

    const data = updateTaskSchema.parse(await req.json());
    const task = await prisma.task.update({
      where: { id: params.id },
      data: {
        ...data,
        assignedToUserId: data.assignedToUserId ?? undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });

    await createAuditLog({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      action: "task.updated",
      entityType: "task",
      entityId: task.id,
      metadata: { changes: data },
    });
    return ok(task);
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
    if (!hasPermission(ctx.role, "tasks:manage")) return forbidden();

    const existing = await prisma.task.findFirst({
      where: { id: params.id, organizationId: ctx.organization.id },
    });
    if (!existing) return fail("Tarefa não encontrada", 404);

    await prisma.task.delete({ where: { id: params.id } });
    await createAuditLog({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      action: "task.deleted",
      entityType: "task",
      entityId: params.id,
    });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
