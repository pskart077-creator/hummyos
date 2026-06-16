"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/states";
import { Card } from "@/components/ui/card";

type Member = { id: string; name: string };
type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedTo: { id: string; name: string } | null;
};

const COLUMNS: { key: string; label: string }[] = [
  { key: "pending", label: "Pendente" },
  { key: "in_progress", label: "Em andamento" },
  { key: "waiting_approval", label: "Aguardando aprovação" },
  { key: "completed", label: "Concluída" },
];

export function TasksBoard({
  initialTasks,
  members,
  canManage,
}: {
  initialTasks: Task[];
  members: Member[];
  canManage: boolean;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const col of COLUMNS) map[col.key] = [];
    for (const t of tasks) (map[t.status] ??= []).push(t);
    return map;
  }, [tasks]);

  async function createTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description") || undefined,
        priority: form.get("priority"),
        assignedToUserId: form.get("assignedToUserId") || undefined,
      }),
    });
    const json = await res.json();
    if (json.ok) {
      setTasks((t) => [{ ...json.data, assignedTo: null }, ...t]);
      setOpen(false);
    }
    setSaving(false);
  }

  async function advance(task: Task, status: string) {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (json.ok)
      setTasks((ts) =>
        ts.map((t) => (t.id === task.id ? { ...t, status } : t)),
      );
  }

  return (
    <div>
      {canManage && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus size={16} /> Nova tarefa
          </Button>
        </div>
      )}

      {tasks.length === 0 ? (
        <EmptyState
          title="Nenhuma tarefa ainda"
          description="Crie a primeira tarefa ou deixe a IA criar follow-ups."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.key}>
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {col.label}
                </span>
                <span className="text-xs text-slate-500">
                  {grouped[col.key]?.length ?? 0}
                </span>
              </div>
              <div className="space-y-2">
                {grouped[col.key]?.map((t) => (
                  <Card key={t.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-100">
                        {t.title}
                      </p>
                      <StatusBadge value={t.priority} />
                    </div>
                    {t.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                        {t.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        {t.assignedTo?.name ?? "Sem responsável"}
                      </span>
                      {canManage && (
                        <Select
                          value={t.status}
                          onChange={(e) => advance(t, e.target.value)}
                          className="h-7 w-auto text-xs"
                        >
                          {COLUMNS.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.label}
                            </option>
                          ))}
                          <option value="cancelled">Cancelada</option>
                        </Select>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nova tarefa"
        description="Atribua a um responsável e defina a prioridade."
      >
        <form onSubmit={createTask} className="space-y-4">
          <div>
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" required />
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="priority">Prioridade</Label>
              <Select id="priority" name="priority" defaultValue="medium">
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="assignedToUserId">Responsável</Label>
              <Select id="assignedToUserId" name="assignedToUserId">
                <option value="">Sem responsável</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Criar tarefa
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
