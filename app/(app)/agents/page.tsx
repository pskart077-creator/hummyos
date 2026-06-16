import Link from "next/link";
import { Bot, ShieldCheck } from "lucide-react";
import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/states";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agentes IA · Hummy OS" };

export default async function AgentsPage() {
  const ctx = await requirePermission("agents:view");
  const agents = await prisma.agent.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Agentes IA"
        description="Cada agente é um funcionário digital com função, modelo, ferramentas e permissões."
      />
      {agents.length === 0 ? (
        <EmptyState
          icon={<Bot size={20} />}
          title="Nenhum agente"
          description="Rode o seed para criar os agentes padrão da Hummy."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <Link key={a.id} href={`/agents/${a.id}`}>
              <Card className="h-full transition-colors hover:bg-bg-elevated">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-brand-400">
                      <Bot size={20} />
                    </div>
                    <StatusBadge value={a.status} />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-slate-100">
                    {a.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                    {a.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge tone="purple">{a.modelName}</Badge>
                    {a.requiresApprovalForActions && (
                      <Badge tone="warning">
                        <ShieldCheck size={11} /> Aprovação
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
