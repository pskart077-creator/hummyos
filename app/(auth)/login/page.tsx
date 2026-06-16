import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar · Hummy OS" };

export default function LoginPage() {
  return (
    <Card>
      <CardContent className="pt-6">
        <h1 className="text-lg font-semibold text-slate-100">Entrar</h1>
        <p className="mt-1 text-xs text-slate-400">
          Use suas credenciais da equipe Hummy.
        </p>
        <div className="mt-5">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
        <div className="mt-4 text-center">
          <Link
            href="/forgot-password"
            className="text-xs text-slate-400 hover:text-brand-400"
          >
            Esqueci minha senha
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
