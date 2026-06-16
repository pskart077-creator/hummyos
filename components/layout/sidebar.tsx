"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { NavIcon } from "./icon";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/navigation";

export function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  const groups = items.reduce<Record<string, NavItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border-subtle bg-bg-surface md:flex">
      <div className="flex h-16 items-center border-b border-border-subtle px-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {Object.entries(groups).map(([group, groupItems]) => (
          <div key={group}>
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {group}
            </p>
            <div className="space-y-0.5">
              {groupItems.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-brand/10 font-medium text-brand-400"
                        : "text-slate-400 hover:bg-bg-elevated hover:text-slate-200",
                    )}
                  >
                    <NavIcon name={item.icon} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
