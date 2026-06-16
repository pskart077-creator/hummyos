import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validations";
import { ok, fail, handleError, getClientIp } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req) ?? "unknown";
    const rl = rateLimit(`login:${ip}`, 8, 60_000);
    if (!rl.allowed) {
      return fail(
        `Muitas tentativas. Tente novamente em ${rl.retryAfter}s.`,
        429,
      );
    }

    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { memberships: true },
    });

    // Resposta genérica para não vazar existência de conta.
    const invalid = () => fail("Credenciais inválidas", 401);

    if (!user || !user.passwordHash) return invalid();
    if (user.status === "suspended")
      return fail("Conta suspensa. Contate o administrador.", 403);

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return invalid();

    if (user.memberships.length === 0)
      return fail("Usuário sem organização vinculada.", 403);

    const token = await createSession({
      userId: user.id,
      userAgent: req.headers.get("user-agent"),
      ipAddress: ip,
    });
    setSessionCookie(token);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await createAuditLog({
      organizationId: user.memberships[0].organizationId,
      userId: user.id,
      action: "auth.login",
      ipAddress: ip,
    });

    return ok({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    return handleError(err);
  }
}
