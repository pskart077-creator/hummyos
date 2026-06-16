import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Image as ImageIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Criativos · Hummy OS" };

export default async function CreativesPage() {
  const ctx = await requirePermission("creatives:view");
  const creatives = await prisma.creative.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Criativos"
        description="Briefings, copies e peças. Antes de publicar, tudo passa por compliance."
      />
      {creatives.length === 0 ? (
        <EmptyState
          icon={<ImageIcon size={20} />}
          title="Nenhum criativo ainda"
          description="Peça ideias para a IA de Criativos no Chat ou cadastre uma peça."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {creatives.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between">
                <Badge tone="purple">{c.type}</Badge>
                <StatusBadge value={c.status} />
              </div>
              <h3 className="mt-2 text-sm font-semibold text-slate-100">
                {c.title}
              </h3>
              {c.description && (
                <p className="mt-1 line-clamp-3 text-xs text-slate-400">
                  {c.description}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                <span>{c.product ?? "Sem produto"}</span>
                <span>{formatDateTime(c.createdAt)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
