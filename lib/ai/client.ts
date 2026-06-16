import "server-only";

import { env } from "@/lib/env";
import { estimateTokens } from "./cost";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatResult = {
  content: string;
  inputTokens: number;
  outputTokens: number;
  provider: string;
  model: string;
};

type ChatOptions = {
  systemPrompt?: string;
  model?: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
};

const OPENCLAW_FAST_DIRECTIVES = [
  "/think off",
  "/fast on",
  "/reasoning off",
  "/verbose off",
];

const OPENCLAW_FAST_INSTRUCTIONS = [
  "Voce e o Jarvis da HummyOS.",
  "Responda em portugues do Brasil.",
  "Seja extremamente direto, rapido e util.",
  "Use no maximo 5 linhas por padrao.",
  "Sem introducao e sem enrolar.",
  "Se for tecnico, de o proximo passo pratico.",
].join(" ");

const OPENCLAW_MAX_OUTPUT_TOKENS = 350;
const OPENCLAW_MAX_HISTORY_MESSAGES = 6;
const OPENCLAW_MAX_MESSAGE_CHARS = 1400;
const OPENCLAW_MAX_INSTRUCTION_CHARS = 900;

function truncateForModel(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}...`;
}

/**
 * Cliente de IA unificado.
 * Prioridade:
 * 1. OpenClaw Gateway, se OPENCLAW_GATEWAY_URL e OPENCLAW_GATEWAY_TOKEN existirem
 * 2. Anthropic
 * 3. OpenAI
 * 4. Fallback local
 */
export async function chatComplete(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<ChatResult> {
  const provider = opts.provider ?? env.ai.provider;

  if (process.env.OPENCLAW_GATEWAY_URL && process.env.OPENCLAW_GATEWAY_TOKEN) {
    return callOpenClaw(messages, opts);
  }

  const model =
    opts.model ??
    (provider === "openai" ? "gpt-4o-mini" : "claude-opus-4-8");

  if (provider === "anthropic" && env.ai.anthropicKey) {
    return callAnthropic(messages, { ...opts, model });
  }

  if (provider === "openai" && env.ai.openaiKey) {
    return callOpenAI(messages, { ...opts, model });
  }

  return localFallback(messages, model, provider);
}

async function callOpenClaw(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<ChatResult> {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL;
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;
  const agentId = process.env.OPENCLAW_AGENT_ID || "main";

  if (!gatewayUrl || !gatewayToken) {
    throw new Error("OpenClaw nao configurado no .env.local");
  }

  const systemMessages = [
    opts.systemPrompt,
    ...messages.filter((m) => m.role === "system").map((m) => m.content),
  ]
    .filter(Boolean)
    .map((text) =>
      truncateForModel(String(text), OPENCLAW_MAX_INSTRUCTION_CHARS),
    );

  const conversation = messages
    .filter((m) => m.role !== "system")
    .slice(-OPENCLAW_MAX_HISTORY_MESSAGES)
    .map((m) => {
      const label =
        m.role === "user"
          ? "Usuario"
          : m.role === "assistant"
            ? "Assistente"
            : "Sistema";

      return `${label}: ${truncateForModel(m.content, OPENCLAW_MAX_MESSAGE_CHARS)}`;
    })
    .join("\n\n");

  const instructions = [
    OPENCLAW_FAST_INSTRUCTIONS,
    systemMessages.length
      ? `Contexto fixo resumido, se for relevante:\n${systemMessages.join("\n\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const input = [...OPENCLAW_FAST_DIRECTIVES, "", conversation].join("\n");
  const stableUser = "hummy:dashboard:main";
  const maxOutputTokens = Math.min(
    opts.maxTokens ?? OPENCLAW_MAX_OUTPUT_TOKENS,
    OPENCLAW_MAX_OUTPUT_TOKENS,
  );
  const temperature = Math.min(opts.temperature ?? 0.3, 0.3);

  const res = await fetch(`${gatewayUrl}/v1/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${gatewayToken}`,
      "Content-Type": "application/json",
      "x-openclaw-agent-id": agentId,
      "x-openclaw-session-key": stableUser,
    },
    body: JSON.stringify({
      model: "openclaw",
      instructions,
      input,
      user: stableUser,
      max_output_tokens: maxOutputTokens,
      temperature,
    }),
  });

  const data = await res.json();

  if (!res.ok || data.status === "failed") {
    throw new Error(
      data?.error?.message ||
        data?.error?.code ||
        "Erro ao chamar o OpenClaw",
    );
  }

  const content =
    data.output?.[0]?.content?.find((c: { type?: string; text?: string }) => {
      return c.type === "output_text" && c.text;
    })?.text ||
    data.output?.[0]?.content?.[0]?.text ||
    data.output_text ||
    "";

  return {
    content,
    inputTokens:
      data.usage?.input_tokens ?? estimateTokens(`${instructions}\n${input}`),
    outputTokens: data.usage?.output_tokens ?? estimateTokens(content),
    provider: "openclaw",
    model: data.model ?? "openclaw",
  };
}

async function callAnthropic(
  messages: ChatMessage[],
  opts: ChatOptions & { model: string },
): Promise<ChatResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ai.anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 350,
      temperature: opts.temperature ?? 0.3,
      system: opts.systemPrompt,
      messages: messages
        .filter((m) => m.role !== "system")
        .slice(-OPENCLAW_MAX_HISTORY_MESSAGES)
        .map((m) => ({
          role: m.role,
          content: truncateForModel(m.content, OPENCLAW_MAX_MESSAGE_CHARS),
        })),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const content =
    data.content?.map((c: { text?: string }) => c.text).join("") ?? "";

  return {
    content,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
    provider: "anthropic",
    model: opts.model,
  };
}

async function callOpenAI(
  messages: ChatMessage[],
  opts: ChatOptions & { model: string },
): Promise<ChatResult> {
  const compactMessages = messages
    .slice(-OPENCLAW_MAX_HISTORY_MESSAGES)
    .map((m) => ({
      role: m.role,
      content: truncateForModel(m.content, OPENCLAW_MAX_MESSAGE_CHARS),
    }));
  const finalMessages = opts.systemPrompt
    ? [{ role: "system", content: opts.systemPrompt }, ...compactMessages]
    : compactMessages;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.ai.openaiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 350,
      messages: finalMessages,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();

  return {
    content: data.choices?.[0]?.message?.content ?? "",
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
    provider: "openai",
    model: opts.model,
  };
}

/** Modo local: resposta util sem chamar API externa. */
function localFallback(
  messages: ChatMessage[],
  model: string,
  provider: string,
): ChatResult {
  const last = [...messages].reverse().find((m) => m.role === "user");

  const content = [
    "Modo local.",
    "OpenClaw, Anthropic ou OpenAI nao estao configurados no `.env.local`.",
    last
      ? `Recebi: "${last.content.slice(0, 280)}".`
      : "Pronto para ajudar a equipe Hummy.",
  ].join("\n");

  const inputTokens = estimateTokens(messages.map((m) => m.content).join(" "));

  return {
    content,
    inputTokens,
    outputTokens: estimateTokens(content),
    provider: `${provider}:local`,
    model,
  };
}
