import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/states";
import { ComplianceChecker } from "./compliance-checker";

export const dynamic = "force-dynamic";
export const metadata = { title: "Compliance · Hummy OS" };

export default async function CompliancePage() {
  const ctx = await requirePermission("compliance:view");
  const checks = await prisma.complianceCheck.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div>
      <PageHeader
        title="Compliance de anúncios"
        description="Toda copy/criativo deve ser analisada antes de aprovar anúncios. Foco em bem-estar e vitalidade, sem promessas médicas/sexuais."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ComplianceChecker />
        <Card>
          <CardHeader>
            <CardTitle>Checks recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {checks.length === 0 ? (
              <EmptyState title="Nenhum check ainda" />
            ) : (
              <ul className="space-y-2">
                {checks.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-lg border border-border-subtle bg-bg-base p-3"
                  >
                    <div className="flex items-center justify-between">
                      <StatusBadge value={c.riskLevel} />
                      <span className="text-[11px] text-slate-500">
                        {formatDateTime(c.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-300">
                      {c.inputText}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
