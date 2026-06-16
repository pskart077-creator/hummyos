import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/states";

export const dynamic = "force-dynamic";
export const metadata = { title: "Logs · Hummy OS" };

export default async function LogsPage({
  searchParams,
}: {
  searchParams: { level?: string; source?: string };
}) {
  const ctx = await requirePermission("logs:view");

  const [systemLogs, auditLogs] = await Promise.all([
    prisma.systemLog.findMany({
      where: {
        organizationId: ctx.organization.id,
        level: (searchParams.level as never) || undefined,
        source: searchParams.source || undefined,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.auditLog.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { name: true } } },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Logs e auditoria"
        description="Registro de ações, integrações e eventos do sistema. Senhas e tokens nunca são salvos."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Auditoria (ações de usuários)</CardTitle>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <EmptyState title="Sem registros de auditoria" />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Ação</TH>
                    <TH>Usuário</TH>
                    <TH>Quando</TH>
                  </TR>
                </THead>
                <tbody>
                  {auditLogs.map((l) => (
                    <TR key={l.id}>
                      <TD className="font-mono text-xs">{l.action}</TD>
                      <TD>{l.user?.name ?? "—"}</TD>
                      <TD className="text-xs text-slate-500">
                        {formatDateTime(l.createdAt)}
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logs do sistema</CardTitle>
          </CardHeader>
          <CardContent>
            {systemLogs.length === 0 ? (
              <EmptyState title="Sem logs de sistema" />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Nível</TH>
                    <TH>Origem</TH>
                    <TH>Mensagem</TH>
                  </TR>
                </THead>
                <tbody>
                  {systemLogs.map((l) => (
                    <TR key={l.id}>
                      <TD>
                        <StatusBadge value={l.level} />
                      </TD>
                      <TD className="text-xs">{l.source}</TD>
                      <TD className="text-xs text-slate-300">{l.message}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
