import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { AgentEditor } from "./agent-editor";

export const dynamic = "force-dynamic";

export default async function AgentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await requirePermission("agents:view");
  const agent = await prisma.agent.findFirst({
    where: { id: params.id, organizationId: ctx.organization.id },
  });
  if (!agent) notFound();

  const canManage = hasPermission(ctx.role, "agents:manage");

  return (
    <div>
      <PageHeader
        title={agent.name}
        description={agent.description ?? "Configuração do agente"}
      />
      <AgentEditor
        agent={JSON.parse(JSON.stringify(agent))}
        canManage={canManage}
      />
    </div>
  );
}
