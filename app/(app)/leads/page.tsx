import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/states";
import { UserPlus } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leads · Hummy OS" };

const STATUSES = ["new", "contacted", "hot", "cold", "won", "lost"];

export default async function LeadsPage() {
  const ctx = await requirePermission("leads:view");
  const leads = await prisma.lead.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { createdAt: "desc" },
    include: { assignedTo: { select: { name: true } } },
    take: 200,
  });

  const counts = STATUSES.map((s) => ({
    status: s,
    count: leads.filter((l) => l.status === s).length,
  }));

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Pipeline de leads da Hummy. A IA Vendedora pode sugerir follow-ups."
      />
      <div className="mb-4 grid grid-cols-3 gap-3 lg:grid-cols-6">
        {counts.map((c) => (
          <Card key={c.status} className="p-3 text-center">
            <p className="text-lg font-semibold text-slate-50">{c.count}</p>
            <div className="mt-1 flex justify-center">
              <StatusBadge value={c.status} />
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-5">
          {leads.length === 0 ? (
            <EmptyState
              icon={<UserPlus size={20} />}
              title="Nenhum lead ainda"
              description="Leads de campanhas e canais aparecerão aqui."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Nome</TH>
                  <TH>Origem</TH>
                  <TH>Status</TH>
                  <TH>Responsável</TH>
                  <TH>Criado</TH>
                </TR>
              </THead>
              <tbody>
                {leads.map((l) => (
                  <TR key={l.id}>
                    <TD className="font-medium">{l.name}</TD>
                    <TD className="text-xs text-slate-400">{l.source ?? "—"}</TD>
                    <TD>
                      <StatusBadge value={l.status} />
                    </TD>
                    <TD className="text-xs">{l.assignedTo?.name ?? "—"}</TD>
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
    </div>
  );
}
