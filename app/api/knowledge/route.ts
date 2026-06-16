import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { ok, fail, unauthorized, forbidden, handleError } from "@/lib/http";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "knowledge:view")) return forbidden();
    const docs = await prisma.knowledgeDocument.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { createdAt: "desc" },
    });
    return ok(docs);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "knowledge:manage")) return forbidden();

    const body = await req.json();
    if (!body.title) return fail("Título obrigatório", 422);

    const doc = await prisma.knowledgeDocument.create({
      data: {
        organizationId: ctx.organization.id,
        title: body.title,
        content: body.content ?? null,
        category: body.category ?? null,
        agentId: body.agentId ?? null,
        status: "ready",
      },
    });
    await createAuditLog({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      action: "knowledge.created",
      entityType: "knowledge_document",
      entityId: doc.id,
    });
    return ok(doc, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
