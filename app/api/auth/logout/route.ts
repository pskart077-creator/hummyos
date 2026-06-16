import { destroyCurrentSession } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/context";
import { createAuditLog } from "@/lib/audit";
import { ok, handleError } from "@/lib/http";

export async function POST() {
  try {
    const ctx = await getCurrentUser();
    if (ctx) {
      await createAuditLog({
        organizationId: ctx.organization.id,
        userId: ctx.user.id,
        action: "auth.logout",
      });
    }
    await destroyCurrentSession();
    return ok({ loggedOut: true });
  } catch (err) {
    return handleError(err);
  }
}
