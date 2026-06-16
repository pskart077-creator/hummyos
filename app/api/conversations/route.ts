import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { createConversationSchema } from "@/lib/validations";
import { ok, unauthorized, forbidden, handleError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();

    const conversations = await prisma.conversation.findMany({
      where: { organizationId: ctx.organization.id, userId: ctx.user.id },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      include: { agent: { select: { name: true, slug: true } } },
    });
    return ok(conversations);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "chat:use")) return forbidden();

    const { agentId, title } = createConversationSchema.parse(
      await req.json(),
    );

    // Garante que o agente pertence à organização.
    let resolvedAgentId: string | null = null;
    if (agentId) {
      const agent = await prisma.agent.findFirst({
        where: { id: agentId, organizationId: ctx.organization.id },
      });
      resolvedAgentId = agent?.id ?? null;
    }

    const conversation = await prisma.conversation.create({
      data: {
        organizationId: ctx.organization.id,
        userId: ctx.user.id,
        agentId: resolvedAgentId,
        title: title || "Nova conversa",
      },
    });
    return ok(conversation, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
