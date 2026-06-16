import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { ROLE_LABELS } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Configurações · Hummy OS" };

export default async function SettingsPage() {
  const ctx = await requirePermission("settings:view");
  const usageLimits = await prisma.usageLimit.findMany({
    where: { organizationId: ctx.organization.id },
  });

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Informações da organização e limites operacionais."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Nome" value={ctx.organization.name} />
            <Row label="Slug" value={ctx.organization.slug} />
            <Row label="Seu cargo" value={ROLE_LABELS[ctx.role]} />
            <Row
              label="Criada em"
              value={formatDateTime(ctx.organization.createdAt)}
            />
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Ambiente</span>
              <Badge
                tone={env.appEnv === "production" ? "success" : "info"}
              >
                {env.appEnv}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limites de uso de IA</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {usageLimits.length === 0 ? (
              <p className="text-xs text-slate-400">
                Nenhum limite mensal configurado. Você pode definir limites por
                organização e por agente para controlar custos.
              </p>
            ) : (
              <ul className="space-y-2">
                {usageLimits.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-base p-2.5 text-xs"
                  >
                    <span>{l.agentId ? "Agente específico" : "Organização"}</span>
                    <span className="font-medium text-slate-200">
                      US$ {Number(l.monthlyLimitUsd).toFixed(2)}/mês
                    </span>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  );
}
