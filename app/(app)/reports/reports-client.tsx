"use client";

import { useState } from "react";
import { FileBarChart, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";

type Report = {
  id: string;
  type: string;
  title: string;
  content: string;
  createdAt: string;
};

export function ReportsClient({
  canCreate,
  initial,
}: {
  canCreate: boolean;
  initial: Report[];
}) {
  const [reports, setReports] = useState<Report[]>(initial);
  const [type, setType] = useState("daily");
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<Report | null>(initial[0] ?? null);

  async function generate() {
    setLoading(true);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const json = await res.json();
    if (json.ok) {
      const r = {
        id: json.data.id,
        type: json.data.type,
        title: json.data.title,
        content: json.data.content ?? "",
        createdAt: new Date().toLocaleString("pt-BR"),
      };
      setReports((rs) => [r, ...rs]);
      setActive(r);
    } else {
      alert(json.error ?? "Falha ao gerar");
    }
    setLoading(false);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-3">
        {canCreate && (
          <Card className="p-4">
            <p className="mb-2 text-xs font-medium text-slate-300">
              Gerar novo relatório
            </p>
            <div className="flex gap-2">
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="daily">Diário</option>
                <option value="weekly">Semanal</option>
                <option value="traffic">Tráfego</option>
                <option value="sales">Vendas</option>
                <option value="leads">Leads</option>
                <option value="ai">IA</option>
                <option value="tasks">Tarefas</option>
              </Select>
              <Button onClick={generate} loading={loading}>
                Gerar
              </Button>
            </div>
          </Card>
        )}
        <div className="space-y-2">
          {reports.length === 0 && (
            <EmptyState
              icon={<FileBarChart size={20} />}
              title="Nenhum relatório"
            />
          )}
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => setActive(r)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                active?.id === r.id
                  ? "border-brand/40 bg-brand/5"
                  : "border-border-subtle bg-bg-surface hover:bg-bg-elevated"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-100">
                  {r.title}
                </span>
                <Badge tone="purple">{r.type}</Badge>
              </div>
              <p className="text-[11px] text-slate-500">{r.createdAt}</p>
            </button>
          ))}
        </div>
      </div>

      <Card className="lg:col-span-2">
        <CardContent className="pt-5">
          {active ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">
                  {active.title}
                </h2>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigator.clipboard.writeText(active.content)}
                >
                  <Copy size={14} /> Copiar
                </Button>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-slate-300">
                {active.content}
              </pre>
            </>
          ) : (
            <EmptyState title="Selecione ou gere um relatório" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
