import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/states";
import { BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Conhecimento · Hummy OS" };

export default async function KnowledgePage() {
  const ctx = await requirePermission("knowledge:view");
  const docs = await prisma.knowledgeDocument.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Base de conhecimento"
        description="Documentos que alimentam os agentes. Estrutura pronta para embeddings/busca semântica."
      />
      {docs.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={20} />}
          title="Nenhum documento"
          description="Faça upload de PDFs, TXT ou MD (em breve) ou cadastre conteúdo manualmente."
        />
      ) : (
        <Card>
          <CardContent className="space-y-2 pt-5">
            {docs.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-base p-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    {d.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {d.category ?? "Sem categoria"} ·{" "}
                    {formatDateTime(d.createdAt)}
                  </p>
                </div>
                <StatusBadge value={d.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
