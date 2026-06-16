import { z } from "zod";
import { ASSIGNABLE_ROLES } from "./permissions";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const inviteSchema = z.object({
  email: z.string().email("E-mail inválido"),
  role: z.enum(ASSIGNABLE_ROLES as [string, ...string[]]),
});

export const acceptInviteSchema = z
  .object({
    token: z.string().min(10),
    name: z.string().min(2, "Informe seu nome"),
    password: z.string().min(8, "Mínimo de 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: z.string().min(8, "Mínimo de 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

export const createConversationSchema = z.object({
  agentId: z.string().optional(),
  title: z.string().optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, "Mensagem vazia").max(8000),
});

export const agentChatSchema = z.object({
  message: z.string().trim().min(1, "Mensagem vazia").max(8000),
  conversationId: z.string().optional().nullable(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  companyId: z.string().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(2, "Título muito curto"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status: z
    .enum([
      "pending",
      "in_progress",
      "waiting_approval",
      "completed",
      "cancelled",
    ])
    .default("pending"),
  assignedToUserId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const createApprovalSchema = z.object({
  actionType: z.string().min(2),
  title: z.string().min(2),
  description: z.string().optional(),
  payload: z.record(z.unknown()).default({}),
  riskLevel: z.enum(["low", "medium", "high", "blocked"]).default("medium"),
});

export const decideApprovalSchema = z.object({
  reason: z.string().optional(),
});

export const agentSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  systemPrompt: z.string().default(""),
  modelProvider: z.string().default("anthropic"),
  modelName: z.string().default("claude-opus-4-8"),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().min(64).max(32000).default(2048),
  status: z.enum(["draft", "active", "inactive", "archived"]).default("active"),
  requiresApprovalForActions: z.boolean().default(true),
  allowedTools: z.array(z.string()).default([]),
});
