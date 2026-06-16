"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email") }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h1 className="text-lg font-semibold text-slate-100">
          Recuperar senha
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Enviaremos instruções de redefinição se o e-mail existir.
        </p>
        {sent ? (
          <div className="mt-5 rounded-lg bg-success/10 px-3 py-3 text-xs text-success">
            Se o e-mail estiver cadastrado, um link de redefinição foi gerado.
            No MVP, o link é registrado no log do servidor para o admin.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <Button type="submit" loading={loading} className="w-full">
              Enviar
            </Button>
          </form>
        )}
        <div className="mt-4 text-center">
          <Link href="/login" className="text-xs text-slate-400 hover:text-brand-400">
            Voltar ao login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
