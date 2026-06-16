import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";
import { generateToken, hashToken } from "@/lib/crypto";
import { ok, handleError, getClientIp } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { createSystemLog } from "@/lib/audit";
import { env } from "@/lib/env";

const RESET_TTL_MIN = 30;

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req) ?? "unknown";
    const rl = rateLimit(`forgot:${ip}`, 5, 60_000);
    if (!rl.allowed) return ok({ sent: true }); // não revela rate limit

    const { email } = forgotPasswordSchema.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Resposta sempre genérica (não revela se o e-mail existe).
    if (!user) return ok({ sent: true });

    const token = generateToken(32);
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_TTL_MIN * 60 * 1000),
      },
    });

    const resetUrl = `${env.appUrl}/reset-password?token=${token}`;
    // MVP: sem provider de e-mail. Logamos o link no servidor para o admin.
    await createSystemLog({
      source: "auth",
      level: "info",
      message: "Link de recuperação de senha gerado",
      metadata: { userId: user.id },
    });
    console.log(`[forgot-password] link para ${user.email}: ${resetUrl}`);

    return ok({ sent: true });
  } catch (err) {
    return handleError(err);
  }
}
