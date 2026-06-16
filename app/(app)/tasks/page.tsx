import { requirePermission } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { TasksBoard } from "./tasks-board";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tarefas · Hummy OS" };

export default async function TasksPage() {
  const ctx = await requirePermission("tasks:view");
  const [tasks, members] = await Promise.all([
    prisma.task.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { createdAt: "desc" },
      include: { assignedTo: { select: { id: true, name: true } } },
    }),
    prisma.organizationMember.findMany({
      where: { organizationId: ctx.organization.id },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  const canManage = hasPermission(ctx.role, "tasks:manage");

  return (
    <div>
      <PageHeader
        title="Tarefas"
        description="Tarefas criadas por humanos ou pela IA, organizadas por status."
      />
      <TasksBoard
        initialTasks={JSON.parse(JSON.stringify(tasks))}
        members={members.map((m) => ({ id: m.user.id, name: m.user.name }))}
        canManage={canManage}
      />
    </div>
  );
}
