import { requirePermission } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { ReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Relatórios · Hummy OS" };

export default async function ReportsPage() {
  const ctx = await requirePermission("reports:view");
  const reports = await prisma.report.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Relatórios gerados pela IA Analista a partir dos dados da operação."
      />
      <ReportsClient
        canCreate={hasPermission(ctx.role, "reports:create")}
        initial={reports.map((r) => ({
          id: r.id,
          type: r.type,
          title: r.title,
          content: r.content ?? "",
          createdAt: formatDateTime(r.createdAt),
        }))}
      />
    </div>
  );
}
