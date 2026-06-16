import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { agentChatSchema } from "@/lib/validations";
import { ok, fail, unauthorized, forbidden, handleError } from "@/lib/http";
import { chatComplete, type ChatMessage } from "@/lib/ai/client";
import { recordAiUsage } from "@/lib/ai/usage";
import { createSystemLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const VOICE_CONVERSATION_TITLE = "Jarvis por voz";

async function findJarvisAgent(organizationId: string) {
  return (
    (await prisma.agent.findFirst({
      where: {
        organizationId,
        slug: "jarvis-admin",
        status: "active",
      },
    })) ??
    prisma.agent.findFirst({
      where: {
        organizationId,
        roleType: "admin",
        status: "active",
      },
      orderBy: { createdAt: "asc" },
    })
  );
}

export async function POST(req: Request) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "chat:use")) return forbidden();

    const body = agentChatSchema.parse(await req.json());
    const agent = await findJarvisAgent(ctx.organization.id);

    let conversation = body.conversationId
      ? await prisma.conversation.findFirst({
          where: {
            id: body.conversationId,
            organizationId: ctx.organization.id,
            userId: ctx.user.id,
          },
          include: {
            agent: true,
            messages: { orderBy: { createdAt: "desc" }, take: 6 },
          },
        })
      : null;

    if (!conversation) {
      conversation = await prisma.conversation.findFirst({
        where: {
          organizationId: ctx.organization.id,
          userId: ctx.user.id,
          title: VOICE_CONVERSATION_TITLE,
          status: "active",
        },
        orderBy: { updatedAt: "desc" },
        include: {
          agent: true,
          messages: { orderBy: { createdAt: "desc" }, take: 6 },
        },
      });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          organizationId: ctx.organization.id,
          userId: ctx.user.id,
          agentId: agent?.id ?? null,
          title: VOICE_CONVERSATION_TITLE,
        },
        include: {
          agent: true,
          messages: { orderBy: { createdAt: "asc" }, take: 0 },
        },
      });
    }

    const activeAgent = conversation.agent ?? agent;
    const history: ChatMessage[] = [...conversation.messages]
      .reverse()
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
    history.push({ role: "user", content: body.message });

    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: body.message,
        metadata: {
          channel: "voice",
          ...(body.sessionId ? { sessionId: body.sessionId } : {}),
        },
      },
    });

    let result;
    try {
      result = await chatComplete(history, {
        systemPrompt: activeAgent?.systemPrompt,
        model: activeAgent?.modelName,
        provider: activeAgent?.modelProvider,
        temperature: activeAgent?.temperature,
        maxTokens: activeAgent?.maxTokens,
      });
    } catch (err) {
      await createSystemLog({
        organizationId: ctx.organization.id,
        level: "error",
        source: "voice-chat",
        message: "Falha ao gerar resposta de voz da IA",
        metadata: { error: err instanceof Error ? err.message : "unknown" },
      });
      return fail("Falha ao gerar resposta da IA. Tente novamente.", 502);
    }

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: result.content,
        metadata: {
          channel: "voice",
          provider: result.provider,
          model: result.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        },
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        updatedAt: new Date(),
        agentId: conversation.agentId ?? activeAgent?.id ?? undefined,
      },
    });

    await recordAiUsage({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      agentId: activeAgent?.id,
      provider: result.provider,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });

    return ok({
      answer: result.content,
      content: result.content,
      conversationId: conversation.id,
      userMessage,
      assistantMessage,
    });
  } catch (err) {
    return handleError(err);
  }
}
