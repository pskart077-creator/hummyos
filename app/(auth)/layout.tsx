import { Logo } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base p-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(245,179,1,0.08), transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" />
          <p className="mt-3 text-sm text-slate-400">
            Sistema operacional interno da Hummy
          </p>
        </div>
        {children}
        <p className="mt-6 text-center text-xs text-slate-500">
          Acesso restrito à equipe Hummy · Cadastro apenas por convite
        </p>
      </div>
    </div>
  );
}
