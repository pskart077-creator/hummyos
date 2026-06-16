import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, extra?: unknown) {
  return NextResponse.json(
    { ok: false, error: message, details: extra },
    { status },
  );
}

export function unauthorized(message = "Não autenticado") {
  return fail(message, 401);
}

export function forbidden(message = "Sem permissão") {
  return fail(message, 403);
}

/** Converte exceções comuns (Zod) em respostas amigáveis. */
export function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return fail("Dados inválidos", 422, err.flatten());
  }
  console.error("[api] erro não tratado", err);
  return fail("Erro interno", 500);
}

export function getClientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}
