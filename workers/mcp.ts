import "dotenv/config";

import { Prisma, PrismaClient } from "@prisma/client";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  getSpotifyCurrentTrack,
  spotifyNext,
  spotifyPause,
  spotifyPlay,
  spotifyPrevious,
} from "../lib/spotify/client";

const prisma = new PrismaClient();

const ORGANIZATION_ID = process.env.HUMMY_MCP_ORG_ID;
const AGENT_ID = process.env.HUMMY_MCP_AGENT_ID;

if (!ORGANIZATION_ID) {
  throw new Error("HUMMY_MCP_ORG_ID nao foi definido no .env");
}

const server = new McpServer({
  name: "hummy-os",
  version: "0.1.0",
});

const prioritySchema = z.enum(["low", "medium", "high", "urgent"]);
const riskLevelSchema = z.enum(["low", "medium", "high", "blocked"]);
const approvalStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "executed",
  "failed",
  "cancelled",
]);
const leadStatusSchema = z.enum([
  "new",
  "contacted",
  "hot",
  "cold",
  "won",
  "lost",
]);
const saleStatusSchema = z.enum([
  "pending",
  "paid",
  "refunded",
  "cancelled",
]);
const logLevelSchema = z.enum(["debug", "info", "warning", "error", "critical"]);

function toolText(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, jsonReplacer, 2),
      },
    ],
  };
}

function jsonReplacer(_key: string, value: unknown) {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Prisma.Decimal) return value.toString();
  return value;
}

function parseOptionalDate(value?: string) {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("dueDate precisa ser uma data valida em ISO-8601");
  }

  return date;
}

function sanitizeJson(value: unknown): Prisma.InputJsonValue {
  if (value === null) return null as unknown as Prisma.InputJsonValue;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJson(item)) as Prisma.InputJsonArray;
  }

  if (typeof value === "object" && value) {
    const out: Record<string, Prisma.InputJsonValue> = {};
    for (const [key, item] of Object.entries(value)) {
      if (isSensitiveKey(key)) {
        out[key] = "[redacted]";
      } else if (item !== undefined) {
        out[key] = sanitizeJson(item);
      }
    }
    return out as Prisma.InputJsonObject;
  }

  return String(value);
}

function isSensitiveKey(key: string) {
  const normalized = key.toLowerCase();
  return [
    "password",
    "passwordhash",
    "token",
    "secret",
    "authorization",
    "accesstoken",
    "apikey",
    "encrypted",
  ].some((sensitive) => normalized.includes(sensitive));
}

async function registerAudit(
  action: string,
  entityType?: string,
  entityId?: string,
  metadata: Record<string, unknown> = {},
) {
  await prisma.auditLog.create({
    data: {
      organizationId: ORGANIZATION_ID,
      action,
      entityType,
      entityId,
      metadata: sanitizeJson({
        ...metadata,
        source: "mcp",
        agentId: AGENT_ID,
      }),
    },
  });
}

async function ensureLeadBelongsToOrg(leadId?: string) {
  if (!leadId) return null;

  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      organizationId: ORGANIZATION_ID,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!lead) {
    throw new Error("Lead nao encontrado para esta organizacao");
  }

  return lead;
}

server.registerTool(
  "hummy_system_status",
  {
    title: "Status do Hummy OS",
    description: "Verifica se o MCP do Hummy OS esta funcionando.",
    inputSchema: {},
  },
  async () => {
    const [organization, pendingTasks, pendingApprovals] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: ORGANIZATION_ID },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      }),
      prisma.task.count({
        where: {
          organizationId: ORGANIZATION_ID,
          status: { in: ["pending", "in_progress", "waiting_approval"] },
        },
      }),
      prisma.approvalRequest.count({
        where: {
          organizationId: ORGANIZATION_ID,
          status: "pending",
        },
      }),
    ]);

    return toolText({
      ok: true,
      service: "hummy-os-mcp",
      organization,
      pendingTasks,
      pendingApprovals,
      timestamp: new Date().toISOString(),
    });
  },
);

server.registerTool(
  "hummy_create_task",
  {
    title: "Criar tarefa",
    description: "Cria uma tarefa interna no Hummy OS.",
    inputSchema: {
      title: z.string().min(3),
      description: z.string().optional(),
      priority: prioritySchema.default("medium"),
      dueDate: z.string().optional(),
      relatedEntityType: z.string().optional(),
      relatedEntityId: z.string().optional(),
    },
  },
  async ({
    title,
    description,
    priority,
    dueDate,
    relatedEntityType,
    relatedEntityId,
  }) => {
    const task = await prisma.task.create({
      data: {
        organizationId: ORGANIZATION_ID,
        title,
        description,
        priority,
        status: "pending",
        createdByAgentId: AGENT_ID,
        dueDate: parseOptionalDate(dueDate),
        relatedEntityType,
        relatedEntityId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        dueDate: true,
        createdAt: true,
      },
    });

    await registerAudit("mcp.task.create", "Task", task.id, {
      tool: "hummy_create_task",
      priority,
    });

    return toolText(task);
  },
);

server.registerTool(
  "hummy_request_approval",
  {
    title: "Solicitar aprovacao",
    description:
      "Cria uma solicitacao de aprovacao antes de executar uma acao sensivel.",
    inputSchema: {
      actionType: z.string().min(2),
      title: z.string().min(3),
      description: z.string().optional(),
      riskLevel: riskLevelSchema.default("medium"),
      payload: z.record(z.unknown()).default({}),
    },
  },
  async ({ actionType, title, description, riskLevel, payload }) => {
    const approval = await prisma.approvalRequest.create({
      data: {
        organizationId: ORGANIZATION_ID,
        requestedByAgentId: AGENT_ID,
        actionType,
        title,
        description,
        riskLevel,
        payload: sanitizeJson(payload),
        status: "pending",
        events: {
          create: {
            type: "requested",
            message: "Solicitacao criada via MCP.",
            metadata: sanitizeJson({
              tool: "hummy_request_approval",
              source: "mcp",
              agentId: AGENT_ID,
            }),
          },
        },
      },
      select: {
        id: true,
        actionType: true,
        title: true,
        description: true,
        riskLevel: true,
        status: true,
        createdAt: true,
      },
    });

    await registerAudit(
      "mcp.approval.request",
      "ApprovalRequest",
      approval.id,
      {
        tool: "hummy_request_approval",
        actionType,
        riskLevel,
      },
    );

    return toolText(approval);
  },
);

server.registerTool(
  "hummy_recent_approvals",
  {
    title: "Aprovacoes recentes",
    description: "Lista as aprovacoes recentes do Hummy OS.",
    inputSchema: {
      limit: z.number().min(1).max(20).default(10),
      status: approvalStatusSchema.optional(),
    },
  },
  async ({ limit, status }) => {
    const approvals = await prisma.approvalRequest.findMany({
      where: {
        organizationId: ORGANIZATION_ID,
        status,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      select: {
        id: true,
        actionType: true,
        title: true,
        description: true,
        riskLevel: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return toolText(approvals);
  },
);

server.registerTool(
  "hummy_create_lead",
  {
    title: "Criar lead",
    description: "Cria um lead no Hummy OS e registra o evento de origem.",
    inputSchema: {
      name: z.string().min(2),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      source: z.string().optional(),
      status: leadStatusSchema.default("new"),
      note: z.string().optional(),
    },
  },
  async ({ name, email, phone, source, status, note }) => {
    const lead = await prisma.lead.create({
      data: {
        organizationId: ORGANIZATION_ID,
        name,
        email,
        phone,
        source,
        status,
        notes: note
          ? {
              create: {
                content: note,
              },
            }
          : undefined,
        events: {
          create: {
            type: "mcp.created",
            metadata: sanitizeJson({
              source: source ?? "mcp",
              tool: "hummy_create_lead",
              agentId: AGENT_ID,
            }),
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        source: true,
        status: true,
        createdAt: true,
      },
    });

    await registerAudit("mcp.lead.create", "Lead", lead.id, {
      tool: "hummy_create_lead",
      source,
    });

    return toolText(lead);
  },
);

server.registerTool(
  "hummy_create_sale",
  {
    title: "Criar venda",
    description: "Registra uma venda no Hummy OS.",
    inputSchema: {
      customerName: z.string().min(2),
      product: z.string().min(2),
      amount: z.number().positive(),
      status: saleStatusSchema.default("paid"),
      source: z.string().optional(),
      leadId: z.string().optional(),
    },
  },
  async ({ customerName, product, amount, status, source, leadId }) => {
    await ensureLeadBelongsToOrg(leadId);

    const sale = await prisma.sale.create({
      data: {
        organizationId: ORGANIZATION_ID,
        leadId,
        customerName,
        product,
        amount: new Prisma.Decimal(amount),
        status,
        source: source ?? "mcp",
      },
      select: {
        id: true,
        leadId: true,
        customerName: true,
        product: true,
        amount: true,
        status: true,
        source: true,
        createdAt: true,
      },
    });

    await registerAudit("mcp.sale.create", "Sale", sale.id, {
      tool: "hummy_create_sale",
      source,
      leadId,
    });

    return toolText(sale);
  },
);

server.registerTool(
  "hummy_register_log",
  {
    title: "Registrar log",
    description: "Registra um log de sistema no Hummy OS.",
    inputSchema: {
      level: logLevelSchema.default("info"),
      source: z.string().min(2).default("mcp"),
      message: z.string().min(2),
      metadata: z.record(z.unknown()).default({}),
    },
  },
  async ({ level, source, message, metadata }) => {
    const log = await prisma.systemLog.create({
      data: {
        organizationId: ORGANIZATION_ID,
        level,
        source,
        message,
        metadata: sanitizeJson({
          ...metadata,
          tool: "hummy_register_log",
          source: "mcp",
          agentId: AGENT_ID,
        }),
      },
      select: {
        id: true,
        level: true,
        source: true,
        message: true,
        createdAt: true,
      },
    });

    return toolText(log);
  },
);

server.registerTool(
  "hummy_get_agent_context",
  {
    title: "Contexto do agente",
    description: "Busca configuracao e contexto seguro de um agente do Hummy OS.",
    inputSchema: {
      agentId: z.string().optional(),
      slug: z.string().optional(),
    },
  },
  async ({ agentId, slug }) => {
    const agentWhere =
      slug || agentId || AGENT_ID
        ? {
            OR: [
              ...(slug ? [{ slug }] : []),
              ...(agentId ? [{ id: agentId }] : []),
              ...(!slug && !agentId && AGENT_ID ? [{ id: AGENT_ID }] : []),
            ],
          }
        : {};

    const agent = await prisma.agent.findFirst({
      where: {
        organizationId: ORGANIZATION_ID,
        ...agentWhere,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        roleType: true,
        systemPrompt: true,
        modelProvider: true,
        modelName: true,
        temperature: true,
        maxTokens: true,
        status: true,
        allowedTools: true,
        requiresApprovalForActions: true,
        updatedAt: true,
      },
    });

    if (!agent) {
      throw new Error("Agente nao encontrado para esta organizacao");
    }

    return toolText(agent);
  },
);

server.registerTool(
  "spotify_current_track",
  {
    title: "Musica atual do Spotify",
    description: "Mostra a musica que esta tocando agora no Spotify.",
    inputSchema: {},
  },
  async () => {
    const track = await getSpotifyCurrentTrack();
    return toolText(track);
  },
);

server.registerTool(
  "spotify_pause",
  {
    title: "Pausar Spotify",
    description: "Pausa a reproducao atual do Spotify.",
    inputSchema: {
      deviceId: z.string().optional(),
    },
  },
  async ({ deviceId }) => {
    const result = await spotifyPause(deviceId);
    await registerAudit("mcp.spotify.pause", "SpotifyPlayback", undefined, {
      tool: "spotify_pause",
      deviceId,
    });
    return toolText(result);
  },
);

server.registerTool(
  "spotify_next",
  {
    title: "Proxima musica",
    description: "Pula para a proxima musica no Spotify.",
    inputSchema: {
      deviceId: z.string().optional(),
    },
  },
  async ({ deviceId }) => {
    const result = await spotifyNext(deviceId);
    await registerAudit("mcp.spotify.next", "SpotifyPlayback", undefined, {
      tool: "spotify_next",
      deviceId,
    });
    return toolText(result);
  },
);

server.registerTool(
  "spotify_previous",
  {
    title: "Musica anterior",
    description: "Volta para a musica anterior no Spotify.",
    inputSchema: {
      deviceId: z.string().optional(),
    },
  },
  async ({ deviceId }) => {
    const result = await spotifyPrevious(deviceId);
    await registerAudit("mcp.spotify.previous", "SpotifyPlayback", undefined, {
      tool: "spotify_previous",
      deviceId,
    });
    return toolText(result);
  },
);

server.registerTool(
  "spotify_play",
  {
    title: "Tocar Spotify",
    description:
      "Retoma a reproducao do Spotify ou toca uma faixa/contexto especifico.",
    inputSchema: {
      deviceId: z.string().optional(),
      uri: z.string().optional(),
      contextUri: z.string().optional(),
    },
  },
  async ({ deviceId, uri, contextUri }) => {
    const result = await spotifyPlay({ deviceId, uri, contextUri });
    await registerAudit("mcp.spotify.play", "SpotifyPlayback", undefined, {
      tool: "spotify_play",
      deviceId,
      uri,
      contextUri,
    });
    return toolText(result);
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
