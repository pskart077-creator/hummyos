"use client";

import { useState } from "react";
import { ShieldCheck, ShieldX, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { formatDateTime } from "@/lib/utils";

type Event = {
  id: string;
  type: string;
  message: string | null;
  createdAt: string;
};
type Approval = {
  id: string;
  actionType: string;
  title: string;
  description: string | null;
  riskLevel: string;
  status: string;
  payload: Record<string, unknown>;
  reason: string | null;
  createdAt: string;
  requestedBy: { name: string } | null;
  events: Event[];
};

const TABS = [
  { key: "pending", label: "Pendentes" },
  { key: "approved", label: "Aprovadas" },
  { key: "rejected", label: "Rejeitadas" },
  { key: "executed", label: "Executadas" },
];

export function ApprovalsList({
  initial,
  canDecide,
}: {
  initial: Approval[];
  canDecide: boolean;
}) {
  const [items, setItems] = useState<Approval[]>(initial);
  const [tab, setTab] = useState("pending");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = items.filter((a) =>
    tab === "executed"
      ? a.status === "executed" || a.status === "failed"
      : a.status === tab,
  );

  async function act(id: string, action: "approve" | "reject" | "execute") {
    setBusy(id + action);
    let reason: string | undefined;
    if (action === "reject") {
      reason = prompt("Motivo da rejeição (opcional):") ?? undefined;
    }
    const res = await fetch(`/api/approvals/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (json.ok) {
      setItems((list) =>
        list.map((a) => (a.id === id ? { ...a, ...json.data } : a)),
      );
    } else {
      alert(json.error ?? "Falha na ação");
    }
    setBusy(null);
  }

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-lg border border-border-subtle bg-bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key
                ? "bg-brand/10 text-brand-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={20} />}
          title="Nada por aqui"
          description="Quando houver solicitações neste status, elas aparecerão aqui."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <Card key={a.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-100">
                        {a.title}
                      </p>
                      <StatusBadge value={a.riskLevel} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {a.description}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {a.actionType} · solicitado por{" "}
                      {a.requestedBy?.name ?? "IA"} ·{" "}
                      {formatDateTime(a.createdAt)}
                    </p>
                  </div>
                  <StatusBadge value={a.status} />
                </div>

                {Object.keys(a.payload ?? {}).length > 0 && (
                  <pre className="mt-3 overflow-x-auto rounded-lg border border-border-subtle bg-bg-base p-3 text-[11px] text-slate-400">
                    {JSON.stringify(a.payload, null, 2)}
                  </pre>
                )}

                {a.reason && (
                  <p className="mt-2 text-xs text-slate-400">
                    <span className="text-slate-500">Motivo:</span> {a.reason}
                  </p>
                )}

                {a.events.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {a.events.map((e) => (
                      <Badge key={e.id} tone="neutral">
                        {e.type}
                      </Badge>
                    ))}
                  </div>
                )}

                {canDecide && (
                  <div className="mt-4 flex gap-2">
                    {a.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          loading={busy === a.id + "approve"}
                          onClick={() => act(a.id, "approve")}
                        >
                          <ShieldCheck size={15} /> Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          loading={busy === a.id + "reject"}
                          onClick={() => act(a.id, "reject")}
                        >
                          <ShieldX size={15} /> Rejeitar
                        </Button>
                      </>
                    )}
                    {a.status === "approved" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={busy === a.id + "execute"}
                        onClick={() => act(a.id, "execute")}
                      >
                        <Play size={15} /> Executar ação
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
