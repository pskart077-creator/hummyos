import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { createTaskSchema } from "@/lib/validations";
import { ok, unauthorized, forbidden, handleError } from "@/lib/http";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "tasks:view")) return forbidden();

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const priority = url.searchParams.get("priority") ?? undefined;
    const assignedToUserId = url.searchParams.get("assignedTo") ?? undefined;

    const tasks = await prisma.task.findMany({
      where: {
        organizationId: ctx.organization.id,
        status: status as never,
        priority: priority as never,
        assignedToUserId,
      },
      orderBy: { createdAt: "desc" },
      include: { assignedTo: { select: { name: true } } },
    });
    return ok(tasks);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "tasks:manage")) return forbidden();

    const data = createTaskSchema.parse(await req.json());
    const task = await prisma.task.create({
      data: {
        organizationId: ctx.organization.id,
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        assignedToUserId: data.assignedToUserId ?? null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        createdByUserId: ctx.user.id,
      },
    });

    await createAuditLog({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      action: "task.created",
      entityType: "task",
      entityId: task.id,
    });

    return ok(task, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
