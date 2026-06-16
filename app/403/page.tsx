import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export const metadata = { title: "Acesso negado · Hummy OS" };

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-base text-center">
      <ShieldAlert className="text-danger" size={48} />
      <h1 className="text-2xl font-semibold text-slate-100">Acesso negado</h1>
      <p className="max-w-sm text-sm text-slate-400">
        Você não tem permissão para acessar esta área. Fale com um
        administrador da Hummy se precisar de acesso.
      </p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-black hover:bg-brand-400"
      >
        Voltar ao dashboard
      </Link>
    </div>
  );
}
