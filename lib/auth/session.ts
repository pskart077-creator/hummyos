import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/lib/crypto";

export const SESSION_COOKIE = "hummy_session";
const SESSION_TTL_DAYS = 7;

type CreateSessionInput = {
  userId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
};

/** Cria sessão no banco e devolve o token bruto (vai para o cookie). */
export async function createSession({
  userId,
  userAgent,
  ipAddress,
}: CreateSessionInput): Promise<string> {
  const token = generateToken(32);
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
  await prisma.authSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
      expiresAt,
    },
  });
  return token;
}

export function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}

/** Invalida a sessão atual (logout) no banco e limpa o cookie. */
export async function destroyCurrentSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.authSession
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined);
  }
  clearSessionCookie();
}

/** Resolve a sessão atual a partir do cookie. Null se inválida/expirada. */
export async function getSessionUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          memberships: { include: { organization: true } },
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.authSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (session.user.status === "suspended") return null;

  return session.user;
}
