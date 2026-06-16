import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { ok, fail, unauthorized, forbidden, handleError } from "@/lib/http";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "knowledge:manage")) return forbidden();

    const doc = await prisma.knowledgeDocument.findFirst({
      where: { id: params.id, organizationId: ctx.organization.id },
    });
    if (!doc) return fail("Documento não encontrado", 404);

    const body = await req.json();
    const updated = await prisma.knowledgeDocument.update({
      where: { id: params.id },
      data: {
        title: body.title ?? undefined,
        content: body.content ?? undefined,
        category: body.category ?? undefined,
        status: body.status ?? undefined,
        agentId: body.agentId ?? undefined,
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
    if (!hasPermission(ctx.role, "knowledge:manage")) return forbidden();

    const doc = await prisma.knowledgeDocument.findFirst({
      where: { id: params.id, organizationId: ctx.organization.id },
    });
    if (!doc) return fail("Documento não encontrado", 404);

    await prisma.knowledgeDocument.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
