import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

import { exchangeSpotifyCodeForToken } from "@/lib/spotify/client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const expectedState = req.cookies.get("spotify_oauth_state")?.value;

  if (error) {
    return htmlResponse(`Spotify retornou erro: ${escapeHtml(error)}`, true);
  }

  if (!code) {
    return htmlResponse("Spotify nao retornou o codigo OAuth.", true);
  }

  if (!state || !expectedState || state !== expectedState) {
    return htmlResponse("Estado OAuth invalido. Tente iniciar o login de novo.", true);
  }

  try {
    const token = await exchangeSpotifyCodeForToken(code);
    const saved = await saveRefreshToken(token.refresh_token);
    const response = htmlResponse(
      [
        "Login Spotify concluido.",
        "",
        saved
          ? "Refresh token salvo automaticamente no .env do Hummy OS."
          : "Adicione esta linha no .env do Hummy OS:",
        "",
        saved ? "SPOTIFY_REFRESH_TOKEN=<salvo>" : `SPOTIFY_REFRESH_TOKEN=${token.refresh_token ?? ""}`,
        "",
        "Depois reinicie o Hummy OS e o MCP.",
      ].join("\n"),
    );

    response.cookies.set("spotify_oauth_state", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (err) {
    return htmlResponse(
      err instanceof Error ? err.message : "Erro ao finalizar login Spotify.",
      true,
    );
  }
}

function htmlResponse(message: string, isError = false) {
  return new NextResponse(
    `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Spotify - Hummy OS</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Arial, sans-serif;
        background: #0f172a;
        color: #e5e7eb;
      }
      main {
        width: min(720px, calc(100vw - 32px));
      }
      pre {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        padding: 20px;
        border: 1px solid ${isError ? "#ef4444" : "#22c55e"};
        border-radius: 8px;
        background: #020617;
      }
    </style>
  </head>
  <body>
    <main>
      <pre>${escapeHtml(message)}</pre>
    </main>
  </body>
</html>`,
    {
      status: isError ? 400 : 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function saveRefreshToken(refreshToken?: string) {
  if (!refreshToken) return false;

  const envPath = join(process.cwd(), ".env");

  try {
    const content = await readFile(envPath, "utf8").catch(() => "");
    const line = `SPOTIFY_REFRESH_TOKEN=${refreshToken}`;

    if (content.match(/^SPOTIFY_REFRESH_TOKEN=.*$/m)) {
      await writeFile(
        envPath,
        content.replace(/^SPOTIFY_REFRESH_TOKEN=.*$/m, line),
      );
    } else {
      await writeFile(envPath, `${content.trimEnd()}\n${line}\n`);
    }

    return true;
  } catch {
    return false;
  }
}
