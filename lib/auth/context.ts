import { redirect } from "next/navigation";
import type { Organization, Role, User } from "@prisma/client";
import { getSessionUser } from "./session";
import {
  hasPermission,
  hasAnyPermission,
  type Permission,
} from "@/lib/permissions";

export type AuthContext = {
  user: User;
  organization: Organization;
  role: Role;
  membershipId: string;
};

/**
 * Resolve o usuário logado + organização ativa (primeira membership).
 * Retorna null se não autenticado ou sem organização.
 */
export async function getCurrentUser(): Promise<AuthContext | null> {
  const user = await getSessionUser();
  if (!user) return null;

  // O tipo retornado por getSessionUser inclui memberships+organization.
  const memberships = (user as User & {
    memberships: { id: string; role: Role; organization: Organization }[];
  }).memberships;

  const active = memberships?.[0];
  if (!active) return null;

  return {
    user,
    organization: active.organization,
    role: active.role,
    membershipId: active.id,
  };
}

export async function getCurrentOrganization(): Promise<Organization | null> {
  const ctx = await getCurrentUser();
  return ctx?.organization ?? null;
}

/** Exige autenticação. Redireciona para /login se não houver sessão. */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/login");
  return ctx;
}

/** Exige um dos papéis informados. Redireciona para /403 caso contrário. */
export async function requireRole(...roles: Role[]): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!roles.includes(ctx.role) && ctx.role !== "admin_master") {
    redirect("/403");
  }
  return ctx;
}

/** Exige uma permissão específica. Redireciona para /403 caso contrário. */
export async function requirePermission(
  permission: Permission,
): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!hasPermission(ctx.role, permission)) {
    redirect("/403");
  }
  return ctx;
}

/** Versão "soft" para checagens condicionais dentro de páginas. */
export async function can(permission: Permission): Promise<boolean> {
  const ctx = await getCurrentUser();
  return ctx ? hasPermission(ctx.role, permission) : false;
}

export { hasPermission, hasAnyPermission };
