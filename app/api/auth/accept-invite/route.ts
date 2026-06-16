import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { acceptInviteSchema } from "@/lib/validations";
import { hashToken } from "@/lib/crypto";
import { ok, fail, handleError, getClientIp } from "@/lib/http";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const { token, name, password } = acceptInviteSchema.parse(
      await req.json(),
    );

    const invite = await prisma.invite.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!invite || invite.status !== "pending")
      return fail("Convite inválido ou já utilizado.", 400);
    if (invite.expiresAt < new Date()) {
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: "expired" },
      });
      return fail("Convite expirado. Solicite um novo.", 400);
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.upsert({
        where: { email: invite.email },
        update: { name, passwordHash, status: "active" },
        create: {
          email: invite.email,
          name,
          passwordHash,
          status: "active",
        },
      });

      await tx.organizationMember.upsert({
        where: {
          userId_organizationId: {
            userId: u.id,
            organizationId: invite.organizationId,
          },
        },
        update: { role: invite.role },
        create: {
          userId: u.id,
          organizationId: invite.organizationId,
          role: invite.role,
        },
      });

      await tx.invite.update({
        where: { id: invite.id },
        data: { status: "accepted", acceptedAt: new Date() },
      });

      return u;
    });

    const sessionToken = await createSession({
      userId: user.id,
      userAgent: req.headers.get("user-agent"),
      ipAddress: getClientIp(req),
    });
    setSessionCookie(sessionToken);

    await createAuditLog({
      organizationId: invite.organizationId,
      userId: user.id,
      action: "invite.accepted",
      entityType: "invite",
      entityId: invite.id,
    });

    return ok({ id: user.id, name: user.name });
  } catch (err) {
    return handleError(err);
  }
}
