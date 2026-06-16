import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { env } from "@/lib/env";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
} from "@/lib/meta/oauth";
import { encryptSecret } from "@/lib/crypto";
import { createSystemLog, createAuditLog } from "@/lib/audit";

const SECRET = () => env.meta.encryptionSecret || env.encryptionKey;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = cookies().get("meta_oauth_state")?.value;

  const ctx = await getCurrentUser();
  if (!ctx) return NextResponse.redirect(`${env.appUrl}/login`);

  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(
      `${env.appUrl}/integrations?error=meta_state_mismatch`,
    );
  }
  if (!state.startsWith(ctx.organization.id)) {
    return NextResponse.redirect(`${env.appUrl}/integrations?error=meta_org`);
  }

  try {
    const short = await exchangeCodeForToken(code);
    const long = await exchangeForLongLivedToken(short.accessToken).catch(
      () => short,
    );

    await prisma.metaConnection.upsert({
      where: { organizationId: ctx.organization.id },
      update: {
        status: "connected",
        encryptedAccessToken: encryptSecret(long.accessToken, SECRET()),
        tokenExpiresAt: long.expiresIn
          ? new Date(Date.now() + long.expiresIn * 1000)
          : null,
        lastError: null,
      },
      create: {
        organizationId: ctx.organization.id,
        status: "connected",
        encryptedAccessToken: encryptSecret(long.accessToken, SECRET()),
        tokenExpiresAt: long.expiresIn
          ? new Date(Date.now() + long.expiresIn * 1000)
          : null,
      },
    });

    await prisma.integration.updateMany({
      where: { organizationId: ctx.organization.id, type: "meta_ads" },
      data: { status: "connected", lastCheckedAt: new Date() },
    });

    await createAuditLog({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      action: "meta.connected",
    });

    const res = NextResponse.redirect(
      `${env.appUrl}/integrations?connected=meta`,
    );
    res.cookies.delete("meta_oauth_state");
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro desconhecido";
    await prisma.metaConnection.updateMany({
      where: { organizationId: ctx.organization.id },
      data: { status: "error", lastError: message },
    });
    await createSystemLog({
      organizationId: ctx.organization.id,
      level: "error",
      source: "meta",
      message: "Falha no callback OAuth da Meta",
      metadata: { error: message },
    });
    return NextResponse.redirect(
      `${env.appUrl}/integrations?error=meta_oauth_failed`,
    );
  }
}
