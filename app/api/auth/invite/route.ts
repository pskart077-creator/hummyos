import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { inviteSchema } from "@/lib/validations";
import { generateToken, hashToken } from "@/lib/crypto";
import { ok, fail, unauthorized, forbidden, handleError } from "@/lib/http";
import { createAuditLog } from "@/lib/audit";
import { env } from "@/lib/env";

const INVITE_TTL_DAYS = 7;

export async function POST(req: Request) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "team:manage")) return forbidden();

    const { email, role } = inviteSchema.parse(await req.json());
    if (role === "admin_master" && ctx.role !== "admin_master") {
      return forbidden("Apenas Admin Master pode convidar outro Admin Master.");
    }

    const existingMember = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        memberships: { some: { organizationId: ctx.organization.id } },
      },
    });
    if (existingMember)
      return fail("Esse e-mail já faz parte da organização.", 409);

    // Revoga convites pendentes anteriores para o mesmo e-mail.
    await prisma.invite.updateMany({
      where: {
        organizationId: ctx.organization.id,
        email: email.toLowerCase(),
        status: "pending",
      },
      data: { status: "revoked" },
    });

    const token = generateToken(32);
    const invite = await prisma.invite.create({
      data: {
        organizationId: ctx.organization.id,
        email: email.toLowerCase(),
        role: role as Role,
        tokenHash: hashToken(token),
        invitedById: ctx.user.id,
        expiresAt: new Date(
          Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
        ),
      },
    });

    await createAuditLog({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      action: "invite.created",
      entityType: "invite",
      entityId: invite.id,
      metadata: { email: email.toLowerCase(), role },
    });

    // O link de convite é retornado para o admin compartilhar
    // (no MVP não há envio de e-mail automático).
    const inviteUrl = `${requestOrigin(req) ?? env.appUrl}/accept-invite?token=${token}`;
    return ok({ inviteId: invite.id, inviteUrl });
  } catch (err) {
    return handleError(err);
  }
}

function requestOrigin(req: Request) {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;

  try {
    return new URL(req.url).origin;
  } catch {
    return null;
  }
}
