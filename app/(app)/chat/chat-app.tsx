"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Send,
  Pin,
  Trash2,
  Copy,
  Bot,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea, Select } from "@/components/ui/input";
import { EmptyState, Spinner } from "@/components/ui/states";
import { cn, formatDateTime } from "@/lib/utils";

type Agent = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};
type Conversation = {
  id: string;
  title: string;
  pinned: boolean;
  agentId: string | null;
  updatedAt: string;
  agent?: { name: string } | null;
};
type Message = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

export function ChatApp({
  agents,
  initialConversationId,
}: {
  agents: Agent[];
  initialConversationId?: string;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversationId ?? null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [agentId, setAgentId] = useState<string>(agents[0]?.id ?? "");
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    const json = await res.json();
    if (json.ok) setConversations(json.data);
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`);
    const json = await res.json();
    if (json.ok) {
      setMessages(json.data.messages);
      if (json.data.agentId) setAgentId(json.data.agentId);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
    else setMessages([]);
  }, [activeId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function newConversation() {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: agentId || undefined }),
    });
    const json = await res.json();
    if (json.ok) {
      await loadConversations();
      setActiveId(json.data.id);
      setMessages([]);
    }
  }

  async function send() {
    const content = input.trim();
    if (!content || sending) return;

    let convId = activeId;
    if (!convId) {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agentId || undefined }),
      });
      const json = await res.json();
      if (!json.ok) return;
      convId = json.data.id;
      setActiveId(convId);
      await loadConversations();
    }

    setInput("");
    setMessages((m) => [
      ...m,
      {
        id: `tmp-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      },
    ]);
    setSending(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        signal: abortRef.current.signal,
      });
      const json = await res.json();
      if (json.ok) {
        await loadMessages(convId!);
        await loadConversations();
      } else {
        setMessages((m) => [
          ...m,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: `⚠️ ${json.error ?? "Erro ao responder."}`,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((m) => [
          ...m,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: "⚠️ Geração interrompida ou falhou.",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
    setSending(false);
  }

  async function togglePin(c: Conversation) {
    await fetch(`/api/conversations/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !c.pinned }),
    });
    loadConversations();
  }

  async function rename(c: Conversation) {
    const title = prompt("Novo título da conversa:", c.title);
    if (!title) return;
    await fetch(`/api/conversations/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    loadConversations();
  }

  async function remove(c: Conversation) {
    if (!confirm("Apagar esta conversa?")) return;
    await fetch(`/api/conversations/${c.id}`, { method: "DELETE" });
    if (activeId === c.id) {
      setActiveId(null);
      setMessages([]);
    }
    loadConversations();
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Lista de conversas */}
      <div className="flex w-72 shrink-0 flex-col rounded-2xl border border-border-subtle bg-bg-surface">
        <div className="border-b border-border-subtle p-3">
          <Button onClick={newConversation} className="w-full" size="sm">
            <Plus size={16} /> Nova conversa
          </Button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {conversations.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-slate-500">
              Nenhuma conversa ainda.
            </p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group flex items-center gap-1 rounded-lg px-2 py-2 text-sm",
                activeId === c.id
                  ? "bg-brand/10 text-brand-400"
                  : "text-slate-300 hover:bg-bg-elevated",
              )}
            >
              <button
                onClick={() => setActiveId(c.id)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="flex items-center gap-1 truncate">
                  {c.pinned && <Pin size={12} className="shrink-0" />}
                  {c.title}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {c.agent?.name ?? "Sem agente"}
                </p>
              </button>
              <div className="flex shrink-0 opacity-0 group-hover:opacity-100">
                <IconBtn onClick={() => togglePin(c)} title="Fixar">
                  <Pin size={13} />
                </IconBtn>
                <IconBtn onClick={() => rename(c)} title="Renomear">
                  <Pencil size={13} />
                </IconBtn>
                <IconBtn onClick={() => remove(c)} title="Apagar">
                  <Trash2 size={13} />
                </IconBtn>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Janela de chat */}
      <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-border-subtle bg-bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle p-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Bot size={16} className="text-brand-400" />
            <span>Agente:</span>
          </div>
          <Select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="max-w-xs"
          >
            <option value="">Sem agente (Jarvis padrão)</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && !sending && (
            <EmptyState
              icon={<Bot size={20} />}
              title="Comece uma conversa"
              description="Escolha um agente e envie sua primeira mensagem. As respostas e o uso ficam registrados."
            />
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Spinner /> Pensando...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border-subtle p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Escreva uma mensagem... (Enter envia, Shift+Enter quebra linha)"
              rows={2}
              className="resize-none"
            />
            {sending ? (
              <Button variant="secondary" onClick={stop}>
                Parar
              </Button>
            ) : (
              <Button onClick={send} disabled={!input.trim()}>
                <Send size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "group max-w-[80%] rounded-2xl px-4 py-3 text-sm",
          isUser
            ? "bg-brand/15 text-slate-100"
            : "border border-border-subtle bg-bg-base text-slate-200",
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {!isUser && (
          <div className="mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => navigator.clipboard.writeText(message.content)}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300"
            >
              <Copy size={12} /> Copiar
            </button>
            <span className="text-[11px] text-slate-600">
              {formatDateTime(message.createdAt)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="rounded p-1 text-slate-400 hover:bg-bg-hover hover:text-slate-200"
    >
      {children}
    </button>
  );
}
