import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { ok, fail, unauthorized, handleError } from "@/lib/http";

export const dynamic = "force-dynamic";

async function loadOwned(id: string, organizationId: string, userId: string) {
  return prisma.conversation.findFirst({
    where: { id, organizationId, userId },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.id,
        organizationId: ctx.organization.id,
        userId: ctx.user.id,
      },
      include: {
        agent: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!conversation) return fail("Conversa não encontrada", 404);
    return ok(conversation);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    const existing = await loadOwned(
      params.id,
      ctx.organization.id,
      ctx.user.id,
    );
    if (!existing) return fail("Conversa não encontrada", 404);

    const body = await req.json();
    const updated = await prisma.conversation.update({
      where: { id: params.id },
      data: {
        title: typeof body.title === "string" ? body.title : undefined,
        pinned: typeof body.pinned === "boolean" ? body.pinned : undefined,
        agentId:
          typeof body.agentId === "string" || body.agentId === null
            ? body.agentId
            : undefined,
      },
    });
    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    const existing = await loadOwned(
      params.id,
      ctx.organization.id,
      ctx.user.id,
    );
    if (!existing) return fail("Conversa não encontrada", 404);

    await prisma.conversation.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
