import type { Role } from "@prisma/client";

/**
 * Mapa de permissões centralizado (RBAC).
 * Cada permissão é uma string "recurso:ação". admin_master tem "*".
 */

export const PERMISSIONS = [
  // organização & equipe
  "org:manage",
  "team:view",
  "team:manage",
  // agentes
  "agents:view",
  "agents:manage",
  // chat
  "chat:use",
  // meta ads / tráfego
  "meta:view",
  "meta:sync",
  "recommendations:view",
  "recommendations:create",
  // aprovações
  "approvals:view",
  "approvals:request",
  "approvals:decide",
  "approvals:decide_traffic",
  // tarefas
  "tasks:view",
  "tasks:manage",
  // criativos
  "creatives:view",
  "creatives:manage",
  "creatives:approve",
  // compliance
  "compliance:view",
  "compliance:override",
  // leads & vendas
  "leads:view",
  "leads:manage",
  "sales:view",
  // conhecimento
  "knowledge:view",
  "knowledge:manage",
  // integrações
  "integrations:view",
  "integrations:manage",
  // logs & relatórios
  "logs:view",
  "reports:view",
  "reports:create",
  // custos de IA
  "ai_usage:view",
  "ai_usage:manage",
  // configurações & admin
  "settings:view",
  "settings:manage",
  "admin:access",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[] | "*"> = {
  admin_master: "*",
  owner: [
    "org:manage",
    "team:view",
    "team:manage",
    "agents:view",
    "agents:manage",
    "chat:use",
    "meta:view",
    "meta:sync",
    "recommendations:view",
    "recommendations:create",
    "approvals:view",
    "approvals:request",
    "approvals:decide",
    "approvals:decide_traffic",
    "tasks:view",
    "tasks:manage",
    "creatives:view",
    "creatives:manage",
    "creatives:approve",
    "compliance:view",
    "compliance:override",
    "leads:view",
    "leads:manage",
    "sales:view",
    "knowledge:view",
    "knowledge:manage",
    "integrations:view",
    "integrations:manage",
    "logs:view",
    "reports:view",
    "reports:create",
    "ai_usage:view",
    "ai_usage:manage",
    "settings:view",
    "settings:manage",
  ],
  gestor_trafego: [
    "chat:use",
    "meta:view",
    "meta:sync",
    "recommendations:view",
    "recommendations:create",
    "approvals:view",
    "approvals:request",
    "approvals:decide_traffic",
    "tasks:view",
    "tasks:manage",
    "creatives:view",
    "reports:view",
    "knowledge:view",
    "ai_usage:view",
  ],
  vendedora: [
    "chat:use",
    "leads:view",
    "leads:manage",
    "sales:view",
    "tasks:view",
    "tasks:manage",
    "knowledge:view",
  ],
  atendimento: [
    "chat:use",
    "leads:view",
    "tasks:view",
    "tasks:manage",
    "knowledge:view",
  ],
  designer: [
    "chat:use",
    "creatives:view",
    "creatives:manage",
    "compliance:view",
    "tasks:view",
    "knowledge:view",
  ],
  financeiro: [
    "chat:use",
    "sales:view",
    "reports:view",
    "ai_usage:view",
    "logs:view",
  ],
  operacional: [
    "chat:use",
    "tasks:view",
    "tasks:manage",
    "approvals:view",
    "knowledge:view",
    "reports:view",
  ],
  readonly: [
    "chat:use",
    "meta:view",
    "tasks:view",
    "leads:view",
    "sales:view",
    "reports:view",
    "knowledge:view",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (perms === "*") return true;
  return perms.includes(permission);
}

export function hasAnyPermission(
  role: Role,
  permissions: Permission[],
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function permissionsForRole(role: Role): Permission[] {
  const perms = ROLE_PERMISSIONS[role];
  return perms === "*" ? ALL : perms;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin_master: "Admin Master",
  owner: "Owner",
  gestor_trafego: "Gestor de Tráfego",
  vendedora: "Vendedora",
  atendimento: "Atendimento",
  designer: "Designer",
  financeiro: "Financeiro",
  operacional: "Operacional",
  readonly: "Somente leitura",
};

export const ALL_ROLES: Role[] = [
  "admin_master",
  "owner",
  "gestor_trafego",
  "vendedora",
  "atendimento",
  "designer",
  "financeiro",
  "operacional",
  "readonly",
];

/** Roles que um admin pode atribuir via convite (todas menos admin_master por padrão). */
export const ASSIGNABLE_ROLES: Role[] = ALL_ROLES.filter(
  (r) => r !== "admin_master",
);
