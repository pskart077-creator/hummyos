import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import type { Permission } from "@/lib/permissions";

/**
 * Renderiza children apenas se o usuário atual tiver a permissão.
 * Server Component.
 */
export async function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const ctx = await getCurrentUser();
  if (ctx && hasPermission(ctx.role, permission)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
}
