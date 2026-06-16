import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { ok, fail, unauthorized, forbidden, handleError } from "@/lib/http";
import { createAuditLog } from "@/lib/audit";

/**
 * Decide sobre uma recomendação da IA.
 * body: { action: "approve" | "reject" | "convert_to_task" }
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "recommendations:view")) return forbidden();

    const rec = await prisma.aiRecommendation.findFirst({
      where: { id: params.id, organizationId: ctx.organization.id },
    });
    if (!rec) return fail("Recomendação não encontrada", 404);

    const { action } = await req.json();

    if (action === "convert_to_task") {
      const task = await prisma.task.create({
        data: {
          organizationId: ctx.organization.id,
          title: rec.title,
          description: rec.description,
          priority: rec.severity === "critical" ? "urgent" : "high",
          createdByUserId: ctx.user.id,
          relatedEntityType: "ai_recommendation",
          relatedEntityId: rec.id,
        },
      });
      await prisma.aiRecommendation.update({
        where: { id: rec.id },
        data: { status: "converted_to_task" },
      });
      await createAuditLog({
        organizationId: ctx.organization.id,
        userId: ctx.user.id,
        action: "recommendation.converted_to_task",
        entityType: "ai_recommendation",
        entityId: rec.id,
      });
      return ok({ taskId: task.id });
    }

    const status = action === "approve" ? "approved" : "rejected";
    const updated = await prisma.aiRecommendation.update({
      where: { id: rec.id },
      data: { status },
    });
    await createAuditLog({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      action: `recommendation.${status}`,
      entityType: "ai_recommendation",
      entityId: rec.id,
    });
    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
}
