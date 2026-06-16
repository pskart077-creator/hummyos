import { requireAuth } from "@/lib/auth/context";
import { hasPermission, ROLE_LABELS } from "@/lib/permissions";
import { NAV_ITEMS } from "@/lib/navigation";
import { env } from "@/lib/env";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireAuth();

  const items = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(ctx.role, item.permission),
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar items={items} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          name={ctx.user.name}
          email={ctx.user.email}
          roleLabel={ROLE_LABELS[ctx.role]}
          appEnv={env.appEnv}
        />
        <main className="flex-1 overflow-y-auto bg-bg-base">
          <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
