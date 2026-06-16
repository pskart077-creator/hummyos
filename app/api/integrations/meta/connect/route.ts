import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { env } from "@/lib/env";
import { buildMetaAuthUrl } from "@/lib/meta/oauth";
import { generateToken } from "@/lib/crypto";

export async function GET() {
  const ctx = await getCurrentUser();
  if (!ctx) return NextResponse.redirect(`${env.appUrl}/login`);
  if (!hasPermission(ctx.role, "integrations:manage")) {
    return NextResponse.redirect(`${env.appUrl}/403`);
  }
  if (!env.meta.configured) {
    return NextResponse.redirect(
      `${env.appUrl}/integrations?error=meta_not_configured`,
    );
  }

  // state com prefixo da org para validar no callback (CSRF básico).
  const state = `${ctx.organization.id}.${generateToken(16)}`;
  const res = NextResponse.redirect(buildMetaAuthUrl(state));
  res.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
