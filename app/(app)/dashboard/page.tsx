import Link from "next/link";
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Activity,
  Megaphone,
  Bell,
  ListChecks,
  ShieldCheck,
  Coins,
} from "lucide-react";
import { requireAuth } from "@/lib/auth/context";
import { getDashboardMetrics } from "@/lib/services/dashboard";
import { formatBRL, formatPct, formatCompact, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { VoiceJarvisButton } from "@/components/ai/voice-jarvis-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard · Hummy OS" };

export default async function DashboardPage() {
  const ctx = await requireAuth();
  const m = await getDashboardMetrics(ctx.organization.id);

  const connectedIntegrations = m.integrations.filter(
    (i) => i.status === "connected",
  ).length;

  return (
    <div>
      <PageHeader
        title={`Olá, ${ctx.user.name.split(" ")[0]} 👋`}
        description="Visão geral da operação da Hummy hoje."
      />

      <div className="mb-4">
        <VoiceJarvisButton
          userId={ctx.user.id}
          companyId={ctx.organization.id}
          sessionId="dashboard-voice"
        />
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Vendas hoje"
          value={formatBRL(m.salesToday)}
          hint={`${m.salesCountToday} venda(s)`}
          icon={<DollarSign size={18} />}
          tone="success"
        />
        <StatCard
          label="Leads hoje"
          value={m.leadsToday}
          icon={<Users size={18} />}
          tone="brand"
        />
        <StatCard
          label="Gasto em tráfego"
          value={formatBRL(m.spendToday)}
          icon={<Megaphone size={18} />}
        />
        <StatCard
          label="Campanhas ativas"
          value={m.activeCampaigns}
          icon={<Activity size={18} />}
        />
        <StatCard
          label="CPA estimado"
          value={m.cpa != null ? formatBRL(m.cpa) : "—"}
          hint={m.cpa == null ? "Sem conversões hoje" : undefined}
          icon={<Target size={18} />}
        />
        <StatCard
          label="ROAS estimado"
          value={m.roas != null ? `${m.roas.toFixed(2)}x` : "—"}
          hint={m.roas == null ? "Sem gasto registrado" : undefined}
          icon={<TrendingUp size={18} />}
          tone={m.roas != null && m.roas >= 1 ? "success" : "neutral"}
        />
        <StatCard
          label="Uso de IA hoje"
          value={formatCompact(m.aiTokensToday)}
          hint={`${formatBRL(m.aiCostTodayBrl)} hoje`}
          icon={<Coins size={18} />}
        />
        <StatCard
          label="Custo de IA no mês"
          value={formatBRL(m.aiCostMonthBrl)}
          hint={`≈ US$ ${m.aiCostMonthUsd.toFixed(2)}`}
          icon={<Coins size={18} />}
        />
      </div>

      {/* Pendências */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PendingLink
          href="/tasks"
          icon={<ListChecks size={18} />}
          label="Tarefas pendentes"
          count={m.pendingTasks}
        />
        <PendingLink
          href="/approvals"
          icon={<ShieldCheck size={18} />}
          label="Aprovações pendentes"
          count={m.pendingApprovals}
        />
        <PendingLink
          href="/meta-ads"
          icon={<Bell size={18} />}
          label="Alertas da IA"
          count={m.pendingRecommendations.length}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Alertas / recomendações */}
        <Card>
          <CardHeader>
            <CardTitle>Alertas da IA</CardTitle>
          </CardHeader>
          <CardContent>
            {m.pendingRecommendations.length === 0 ? (
              <EmptyState
                title="Sem alertas no momento"
                description="Quando a IA detectar oportunidades ou riscos, eles aparecem aqui."
              />
            ) : (
              <ul className="space-y-3">
                {m.pendingRecommendations.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border-subtle bg-bg-base p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-100">
                        {r.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                        {r.description}
                      </p>
                    </div>
                    <StatusBadge value={r.severity} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Conversas recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Últimas conversas</CardTitle>
          </CardHeader>
          <CardContent>
            {m.recentConversations.length === 0 ? (
              <EmptyState
                title="Nenhuma conversa ainda"
                description="Abra o Chat IA para começar."
                action={
                  <Link
                    href="/chat"
                    className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-black"
                  >
                    Abrir Chat IA
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-2">
                {m.recentConversations.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/chat/${c.id}`}
                      className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-base p-3 hover:bg-bg-elevated"
                    >
                      <div>
                        <p className="text-sm text-slate-100">{c.title}</p>
                        <p className="text-xs text-slate-500">
                          {c.agent?.name ?? "Sem agente"} ·{" "}
                          {formatDateTime(c.updatedAt)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Integrações */}
        <Card>
          <CardHeader>
            <CardTitle>Status das integrações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {m.integrations.map((i) => (
                <Link key={i.id} href="/integrations">
                  <Badge
                    tone={i.status === "connected" ? "success" : "neutral"}
                  >
                    {i.name}
                  </Badge>
                </Link>
              ))}
            </div>
            {connectedIntegrations === 0 && (
              <p className="mt-3 text-xs text-slate-400">
                Nenhuma integração conectada.{" "}
                <Link href="/integrations" className="text-brand-400">
                  Conectar agora →
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Logs críticos */}
        <Card>
          <CardHeader>
            <CardTitle>Últimos logs críticos</CardTitle>
          </CardHeader>
          <CardContent>
            {m.criticalLogs.length === 0 ? (
              <EmptyState title="Sem erros recentes" />
            ) : (
              <ul className="space-y-2">
                {m.criticalLogs.map((l) => (
                  <li
                    key={l.id}
                    className="rounded-lg border border-danger/20 bg-danger/5 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-danger">
                        {l.source}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {formatDateTime(l.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">{l.message}</p>
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

function PendingLink({
  href,
  icon,
  label,
  count,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <Link href={href}>
      <Card className="flex items-center justify-between p-4 transition-colors hover:bg-bg-elevated">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-elevated text-brand-400">
            {icon}
          </div>
          <span className="text-sm text-slate-200">{label}</span>
        </div>
        <span className="text-lg font-semibold text-slate-50">{count}</span>
      </Card>
    </Link>
  );
}
