import { Badge } from "./badge";

type Tone = React.ComponentProps<typeof Badge>["tone"];

const MAP: Record<string, { tone: Tone; label: string }> = {
  // genéricos
  active: { tone: "success", label: "Ativo" },
  inactive: { tone: "neutral", label: "Inativo" },
  draft: { tone: "neutral", label: "Rascunho" },
  archived: { tone: "neutral", label: "Arquivado" },
  // tarefas
  pending: { tone: "warning", label: "Pendente" },
  in_progress: { tone: "info", label: "Em andamento" },
  waiting_approval: { tone: "purple", label: "Aguardando aprovação" },
  completed: { tone: "success", label: "Concluída" },
  cancelled: { tone: "neutral", label: "Cancelada" },
  // prioridade
  low: { tone: "neutral", label: "Baixa" },
  medium: { tone: "info", label: "Média" },
  high: { tone: "warning", label: "Alta" },
  urgent: { tone: "danger", label: "Urgente" },
  critical: { tone: "danger", label: "Crítica" },
  // aprovações
  approved: { tone: "success", label: "Aprovada" },
  rejected: { tone: "danger", label: "Rejeitada" },
  executed: { tone: "success", label: "Executada" },
  failed: { tone: "danger", label: "Falhou" },
  // risco / compliance
  blocked: { tone: "danger", label: "Bloqueado" },
  // leads
  new: { tone: "info", label: "Novo" },
  contacted: { tone: "purple", label: "Contatado" },
  hot: { tone: "danger", label: "Quente" },
  cold: { tone: "neutral", label: "Frio" },
  won: { tone: "success", label: "Ganho" },
  lost: { tone: "neutral", label: "Perdido" },
  // integrações
  connected: { tone: "success", label: "Conectado" },
  not_configured: { tone: "neutral", label: "Não configurado" },
  error: { tone: "danger", label: "Erro" },
  disconnected: { tone: "warning", label: "Desconectado" },
  // criativos
  in_review: { tone: "warning", label: "Em revisão" },
  published: { tone: "success", label: "Publicado" },
  // logs
  info: { tone: "info", label: "Info" },
  warning: { tone: "warning", label: "Aviso" },
  debug: { tone: "neutral", label: "Debug" },
  // recomendações
  converted_to_task: { tone: "purple", label: "Virou tarefa" },
  // vendas
  paid: { tone: "success", label: "Pago" },
  refunded: { tone: "warning", label: "Reembolsado" },
};

export function StatusBadge({ value }: { value: string }) {
  const item = MAP[value] ?? { tone: "neutral" as Tone, label: value };
  return <Badge tone={item.tone}>{item.label}</Badge>;
}
