import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { sendMessageSchema } from "@/lib/validations";
import { ok, fail, unauthorized, forbidden, handleError } from "@/lib/http";
import { chatComplete, type ChatMessage } from "@/lib/ai/client";
import { recordAiUsage } from "@/lib/ai/usage";
import { createSystemLog } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "chat:use")) return forbidden();

    const { content } = sendMessageSchema.parse(await req.json());

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.id,
        organizationId: ctx.organization.id,
        userId: ctx.user.id,
      },
      include: {
        agent: true,
        messages: { orderBy: { createdAt: "desc" }, take: 6 },
      },
    });
    if (!conversation) return fail("Conversa não encontrada", 404);

    // Persiste a mensagem do usuário.
    const userMessage = await prisma.message.create({
      data: { conversationId: conversation.id, role: "user", content },
    });

    // Monta o histórico para o modelo.
    const history: ChatMessage[] = [...conversation.messages]
      .reverse()
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    history.push({ role: "user", content });

    const agent = conversation.agent;

    let result;
    try {
      result = await chatComplete(history, {
        systemPrompt: agent?.systemPrompt,
        model: agent?.modelName,
        provider: agent?.modelProvider,
        temperature: agent?.temperature,
        maxTokens: agent?.maxTokens,
      });
    } catch (err) {
      await createSystemLog({
        organizationId: ctx.organization.id,
        level: "error",
        source: "chat",
        message: "Falha ao gerar resposta da IA",
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
          provider: result.provider,
          model: result.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        },
      },
    });

    // Atualiza título com a primeira mensagem, se ainda for o padrão.
    const titleUpdate =
      conversation.title === "Nova conversa"
        ? content.slice(0, 48)
        : undefined;
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date(), title: titleUpdate },
    });

    await recordAiUsage({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      agentId: agent?.id,
      provider: result.provider,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });

    return ok({ userMessage, assistantMessage });
  } catch (err) {
    return handleError(err);
  }
}
