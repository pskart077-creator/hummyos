import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-base text-center">
      <p className="text-5xl font-bold text-brand-400">404</p>
      <h1 className="text-xl font-semibold text-slate-100">
        Página não encontrada
      </h1>
      <Link
        href="/dashboard"
        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-black hover:bg-brand-400"
      >
        Voltar ao dashboard
      </Link>
    </div>
  );
}
