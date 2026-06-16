"use client";

import { useState } from "react";
import { Plug, Bot, Megaphone, Webhook, Github, Mail, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/states";

type OpenClaw = {
  configured: boolean;
  baseUrl: string;
  tokenMasked: string;
  status: string;
  lastCheckedAt: string | null;
};
type Meta = {
  appConfigured: boolean;
  status: string;
  lastSyncedAt: string | null;
  lastError: string | null;
};
type Other = { id: string; name: string; status: string };
type Log = {
  id: string;
  provider: string;
  level: string;
  action: string;
  message: string | null;
  createdAt: string;
};

const ICONS: Record<string, React.ReactNode> = {
  WhatsApp: <MessageCircle size={18} />,
  Webhook: <Webhook size={18} />,
  GitHub: <Github size={18} />,
  "E-mail": <Mail size={18} />,
};

export function IntegrationsGrid({
  canManage,
  openclaw,
  meta,
  others,
  recentLogs,
}: {
  canManage: boolean;
  openclaw: OpenClaw;
  meta: Meta;
  others: Other[];
  recentLogs: Log[];
}) {
  const [ocStatus, setOcStatus] = useState(openclaw.status);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  async function testOpenClaw() {
    setTesting(true);
    setTestMsg(null);
    const res = await fetch("/api/integrations/openclaw/test", {
      method: "POST",
    });
    const json = await res.json();
    if (json.ok) {
      setOcStatus(
        json.data.healthy
          ? "connected"
          : json.data.configured
            ? "error"
            : "not_configured",
      );
      setTestMsg(
        json.data.healthy
          ? "Conexão OK."
          : json.data.configured
            ? "Configurado, mas sem resposta saudável."
            : "OpenClaw não configurado (defina as variáveis de ambiente).",
      );
    } else {
      setTestMsg(json.error ?? "Falha no teste");
    }
    setTesting(false);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {/* OpenClaw */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot size={18} className="text-brand-400" />
                <CardTitle>OpenClaw</CardTitle>
              </div>
              <StatusBadge value={ocStatus} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-slate-400">
            <Row label="Base URL" value={openclaw.baseUrl} />
            <Row label="Token" value={openclaw.tokenMasked} />
            <Row
              label="Último teste"
              value={openclaw.lastCheckedAt ?? "nunca"}
            />
            <p className="pt-1 text-[11px] text-slate-500">
              Configurado por variáveis de ambiente: OPENCLAW_BASE_URL,
              OPENCLAW_AUTH_TOKEN, OPENCLAW_DEFAULT_AGENT_ID.
            </p>
            {canManage && (
              <div className="flex items-center gap-3 pt-2">
                <Button size="sm" onClick={testOpenClaw} loading={testing}>
                  Testar conexão
                </Button>
                {testMsg && <span className="text-xs">{testMsg}</span>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Meta Ads */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone size={18} className="text-brand-400" />
                <CardTitle>Meta Ads</CardTitle>
              </div>
              <StatusBadge value={meta.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-slate-400">
            <Row
              label="App configurado"
              value={meta.appConfigured ? "Sim" : "Não"}
            />
            <Row
              label="Última sincronização"
              value={meta.lastSyncedAt ?? "nunca"}
            />
            {meta.lastError && (
              <Row label="Último erro" value={meta.lastError} />
            )}
            {!meta.appConfigured ? (
              <p className="pt-1 text-[11px] text-slate-500">
                Configure META_APP_ID, META_APP_SECRET, META_REDIRECT_URI e
                META_ENCRYPTION_SECRET no .env para habilitar a conexão OAuth.
              </p>
            ) : (
              canManage && (
                <a
                  href="/api/integrations/meta/connect"
                  className="mt-2 inline-flex rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-black"
                >
                  Conectar conta Meta
                </a>
              )
            )}
          </CardContent>
        </Card>

        {/* Outras */}
        <Card>
          <CardHeader>
            <CardTitle>Outras integrações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {others.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-base p-3"
                >
                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    {ICONS[o.name] ?? <Plug size={18} />}
                    {o.name}
                  </div>
                  <StatusBadge value={o.status} />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-500">
              Estrutura pronta. Conecte conforme as credenciais forem
              configuradas.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Logs recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Logs de integração</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <EmptyState title="Sem chamadas registradas" />
          ) : (
            <ul className="space-y-2">
              {recentLogs.map((l) => (
                <li
                  key={l.id}
                  className="rounded-lg border border-border-subtle bg-bg-base p-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-300">
                      {l.provider}
                    </span>
                    <StatusBadge value={l.level} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">{l.action}</p>
                  {l.message && (
                    <p className="text-[11px] text-slate-500">{l.message}</p>
                  )}
                  <p className="mt-0.5 text-[10px] text-slate-600">
                    {l.createdAt}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="truncate text-slate-300">{value}</span>
    </div>
  );
}
