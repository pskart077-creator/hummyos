import { requirePermission } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { ApprovalsList } from "./approvals-list";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aprovações · Hummy OS" };

export default async function ApprovalsPage() {
  const ctx = await requirePermission("approvals:view");
  const approvals = await prisma.approvalRequest.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { name: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
    take: 100,
  });

  const canDecide =
    hasPermission(ctx.role, "approvals:decide") ||
    hasPermission(ctx.role, "approvals:decide_traffic");

  return (
    <div>
      <PageHeader
        title="Aprovações"
        description="Nenhuma ação sensível é executada pela IA sem aprovação humana."
      />
      <ApprovalsList
        initial={JSON.parse(JSON.stringify(approvals))}
        canDecide={canDecide}
      />
    </div>
  );
}
