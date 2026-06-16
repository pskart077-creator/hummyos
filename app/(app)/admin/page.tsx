import Link from "next/link";
import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Bot, ScrollText, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Hummy OS" };

export default async function AdminPage() {
  const ctx = await requirePermission("admin:access");

  const [users, agents, pendingApprovals, auditCount, recentAudit] =
    await Promise.all([
      prisma.organizationMember.count({
        where: { organizationId: ctx.organization.id },
      }),
      prisma.agent.count({ where: { organizationId: ctx.organization.id } }),
      prisma.approvalRequest.count({
        where: { organizationId: ctx.organization.id, status: "pending" },
      }),
      prisma.auditLog.count({
        where: { organizationId: ctx.organization.id },
      }),
      prisma.auditLog.findMany({
        where: { organizationId: ctx.organization.id },
        orderBy: { createdAt: "desc" },
        take: 12,
        include: { user: { select: { name: true } } },
      }),
    ]);

  return (
    <div>
      <PageHeader
        title="Admin"
        description="Visão administrativa da organização. Acesso restrito ao Admin Master."
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Link href="/team">
          <StatCard label="Membros" value={users} icon={<Users size={18} />} />
        </Link>
        <Link href="/agents">
          <StatCard label="Agentes IA" value={agents} icon={<Bot size={18} />} />
        </Link>
        <Link href="/approvals">
          <StatCard
            label="Aprovações pendentes"
            value={pendingApprovals}
            icon={<ShieldCheck size={18} />}
            tone={pendingApprovals > 0 ? "warning" : "neutral"}
          />
        </Link>
        <Link href="/logs">
          <StatCard
            label="Eventos de auditoria"
            value={auditCount}
            icon={<ScrollText size={18} />}
          />
        </Link>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Atividade recente</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {recentAudit.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-base px-3 py-2 text-xs"
              >
                <span className="font-mono text-slate-300">{a.action}</span>
                <span className="text-slate-500">{a.user?.name ?? "—"}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
