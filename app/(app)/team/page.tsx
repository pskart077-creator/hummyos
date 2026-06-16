import { requirePermission } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { TeamManager } from "./team-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Equipe · Hummy OS" };

export default async function TeamPage() {
  const ctx = await requirePermission("team:view");

  const [members, invites] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId: ctx.organization.id },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invite.findMany({
      where: { organizationId: ctx.organization.id, status: "pending" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const canManage = hasPermission(ctx.role, "team:manage");

  return (
    <div>
      <PageHeader
        title="Equipe"
        description="Gerencie membros, cargos e convites. Cadastro é apenas por convite."
      />
      <TeamManager
        canManage={canManage}
        isAdminMaster={ctx.role === "admin_master"}
        currentUserId={ctx.user.id}
        members={members.map((m) => ({
          id: m.id,
          role: m.role,
          name: m.user.name,
          email: m.user.email,
          status: m.user.status,
          lastLoginAt: m.user.lastLoginAt
            ? formatDateTime(m.user.lastLoginAt)
            : "nunca",
        }))}
        invites={invites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          createdAt: formatDateTime(i.createdAt),
        }))}
      />
    </div>
  );
}
