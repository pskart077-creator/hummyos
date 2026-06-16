import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { resetPasswordSchema } from "@/lib/validations";
import { hashToken } from "@/lib/crypto";
import { ok, fail, handleError } from "@/lib/http";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const { token, password } = resetPasswordSchema.parse(await req.json());

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { include: { memberships: true } } },
    });

    if (!record || record.usedAt || record.expiresAt < new Date())
      return fail("Token inválido ou expirado.", 400);

    const passwordHash = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Invalida todas as sessões ativas por segurança.
      prisma.authSession.deleteMany({ where: { userId: record.userId } }),
    ]);

    await createAuditLog({
      organizationId: record.user.memberships[0]?.organizationId,
      userId: record.userId,
      action: "auth.password_reset",
    });

    return ok({ reset: true });
  } catch (err) {
    return handleError(err);
  }
}
