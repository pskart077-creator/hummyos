"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

type Agent = {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  modelProvider: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  status: string;
  requiresApprovalForActions: boolean;
  allowedTools: string[];
};

export function AgentEditor({
  agent,
  canManage,
}: {
  agent: Agent;
  canManage: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description"),
        systemPrompt: form.get("systemPrompt"),
        modelProvider: form.get("modelProvider"),
        modelName: form.get("modelName"),
        temperature: Number(form.get("temperature")),
        maxTokens: Number(form.get("maxTokens")),
        status: form.get("status"),
        requiresApprovalForActions: form.get("requiresApproval") === "on",
      }),
    });
    const json = await res.json();
    setMsg(json.ok ? "Salvo com sucesso." : json.error ?? "Falha ao salvar");
    if (json.ok) router.refresh();
    setSaving(false);
  }

  return (
    <form onSubmit={save} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Prompt do sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="systemPrompt">
              Instruções do agente (system prompt)
            </Label>
            <Textarea
              id="systemPrompt"
              name="systemPrompt"
              rows={14}
              defaultValue={agent.systemPrompt}
              disabled={!canManage}
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Label htmlFor="allowedTools">Ferramentas permitidas</Label>
            <div className="flex flex-wrap gap-1.5">
              {agent.allowedTools.length === 0 && (
                <span className="text-xs text-slate-500">Nenhuma</span>
              )}
              {agent.allowedTools.map((t) => (
                <span
                  key={t}
                  className="rounded-md border border-border-subtle bg-bg-base px-2 py-1 text-[11px] text-slate-300"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              defaultValue={agent.name}
              disabled={!canManage}
            />
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={agent.description ?? ""}
              disabled={!canManage}
            />
          </div>
          <div>
            <Label htmlFor="modelProvider">Provedor</Label>
            <Select
              id="modelProvider"
              name="modelProvider"
              defaultValue={agent.modelProvider}
              disabled={!canManage}
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="modelName">Modelo</Label>
            <Input
              id="modelName"
              name="modelName"
              defaultValue={agent.modelName}
              disabled={!canManage}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="temperature">Temperatura</Label>
              <Input
                id="temperature"
                name="temperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                defaultValue={agent.temperature}
                disabled={!canManage}
              />
            </div>
            <div>
              <Label htmlFor="maxTokens">Máx. tokens</Label>
              <Input
                id="maxTokens"
                name="maxTokens"
                type="number"
                defaultValue={agent.maxTokens}
                disabled={!canManage}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              name="status"
              defaultValue={agent.status}
              disabled={!canManage}
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="draft">Rascunho</option>
              <option value="archived">Arquivado</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              name="requiresApproval"
              defaultChecked={agent.requiresApprovalForActions}
              disabled={!canManage}
              className="accent-brand"
            />
            Exige aprovação humana para ações
          </label>

          {msg && (
            <p className="text-xs text-slate-400">{msg}</p>
          )}
          {canManage && (
            <Button type="submit" loading={saving} className="w-full">
              Salvar alterações
            </Button>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
