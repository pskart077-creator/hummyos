import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { ok, fail, unauthorized, forbidden, handleError } from "@/lib/http";
import { syncMetaCampaigns } from "@/lib/meta/sync";

export async function POST() {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "meta:sync")) return forbidden();

    try {
      const result = await syncMetaCampaigns(ctx.organization.id);
      return ok(result);
    } catch (err) {
      return fail(
        err instanceof Error ? err.message : "Falha na sincronização",
        422,
      );
    }
  } catch (err) {
    return handleError(err);
  }
}
