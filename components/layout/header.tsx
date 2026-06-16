"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";

const ENV_TONE: Record<string, "success" | "warning" | "info"> = {
  production: "success",
  staging: "warning",
  development: "info",
};

const ENV_LABEL: Record<string, string> = {
  production: "Produção",
  staging: "Staging",
  development: "Desenvolvimento",
};

export function Header({
  name,
  email,
  roleLabel,
  appEnv,
}: {
  name: string;
  email: string;
  roleLabel: string;
  appEnv: string;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border-subtle bg-bg-surface/80 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <Badge tone={ENV_TONE[appEnv] ?? "info"}>
          {ENV_LABEL[appEnv] ?? appEnv}
        </Badge>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-100">{name}</p>
          <p className="text-xs text-slate-400">{roleLabel}</p>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/15 text-sm font-semibold text-brand-400"
          title={email}
        >
          {initials(name)}
        </div>
        <button
          onClick={logout}
          disabled={loggingOut}
          title="Sair"
          className="rounded-lg p-2 text-slate-400 hover:bg-bg-elevated hover:text-danger disabled:opacity-50"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
