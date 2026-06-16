import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { ok, fail, unauthorized, forbidden, handleError } from "@/lib/http";
import { runComplianceCheck } from "@/lib/compliance/engine";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "compliance:view")) return forbidden();

    const body = await req.json();
    const text = typeof body.text === "string" ? body.text : "";
    if (!text.trim()) return fail("Informe o texto a analisar", 422);

    const result = runComplianceCheck(text);

    const check = await prisma.complianceCheck.create({
      data: {
        organizationId: ctx.organization.id,
        entityType: body.entityType ?? "manual",
        entityId: body.entityId ?? null,
        inputText: text,
        riskLevel: result.riskLevel,
        issues: result.issues as never,
        suggestions: result.suggestions as never,
      },
    });

    await createAuditLog({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      action: "compliance.checked",
      entityType: "compliance_check",
      entityId: check.id,
      metadata: { riskLevel: result.riskLevel },
    });

    return ok({ id: check.id, ...result });
  } catch (err) {
    return handleError(err);
  }
}
