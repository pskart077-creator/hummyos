import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { buildSpotifyAuthorizeUrl } from "@/lib/spotify/client";

export const runtime = "nodejs";

export async function GET() {
  try {
    const state = randomBytes(16).toString("hex");
    const response = NextResponse.redirect(buildSpotifyAuthorizeUrl(state));

    response.cookies.set("spotify_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro ao iniciar login.",
      },
      { status: 500 },
    );
  }
}
