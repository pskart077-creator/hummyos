import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { ok, fail, unauthorized, forbidden, handleError } from "@/lib/http";
import { executeApproval } from "@/lib/services/approvals";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "approvals:decide")) return forbidden();

    const approval = await prisma.approvalRequest.findFirst({
      where: { id: params.id, organizationId: ctx.organization.id },
    });
    if (!approval) return fail("Aprovação não encontrada", 404);

    try {
      const result = await executeApproval(params.id, ctx.user.id);
      return ok(result);
    } catch (err) {
      return fail(
        err instanceof Error ? err.message : "Falha na execução",
        422,
      );
    }
  } catch (err) {
    return handleError(err);
  }
}
