"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, THead, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/permissions";

type Member = {
  id: string;
  role: string;
  name: string;
  email: string;
  status: string;
  lastLoginAt: string;
};
type Invite = { id: string; email: string; role: string; createdAt: string };

export function TeamManager({
  canManage,
  isAdminMaster,
  currentUserId,
  members,
  invites,
}: {
  canManage: boolean;
  isAdminMaster: boolean;
  currentUserId: string;
  members: Member[];
  invites: Invite[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const roles = isAdminMaster
    ? [...ASSIGNABLE_ROLES, "admin_master"]
    : ASSIGNABLE_ROLES;

  async function createInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setInviteUrl(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        role: form.get("role"),
      }),
    });
    const json = await res.json();
    if (json.ok) {
      setInviteUrl(json.data.inviteUrl);
      router.refresh();
    } else {
      alert(json.error ?? "Falha ao criar convite");
    }
    setSaving(false);
  }

  async function changeRole(id: string, role: string) {
    await fetch(`/api/team/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    router.refresh();
  }

  async function toggleSuspend(id: string, current: string) {
    const status = current === "suspended" ? "active" : "suspended";
    await fetch(`/api/team/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setOpen(true)}>
            <UserPlus size={16} /> Convidar membro
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Membros ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Nome</TH>
                <TH>Cargo</TH>
                <TH>Status</TH>
                <TH>Último login</TH>
                {canManage && <TH></TH>}
              </TR>
            </THead>
            <tbody>
              {members.map((m) => (
                <TR key={m.id}>
                  <TD>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-slate-500">{m.email}</p>
                  </TD>
                  <TD>
                    {canManage && m.id !== currentUserId ? (
                      <Select
                        value={m.role}
                        onChange={(e) => changeRole(m.id, e.target.value)}
                        className="h-8 w-auto text-xs"
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r as keyof typeof ROLE_LABELS]}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      ROLE_LABELS[m.role as keyof typeof ROLE_LABELS]
                    )}
                  </TD>
                  <TD>
                    <StatusBadge value={m.status} />
                  </TD>
                  <TD className="text-xs text-slate-500">{m.lastLoginAt}</TD>
                  {canManage && (
                    <TD>
                      {m.id !== currentUserId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleSuspend(m.id, m.status)}
                        >
                          {m.status === "suspended" ? "Reativar" : "Suspender"}
                        </Button>
                      )}
                    </TD>
                  )}
                </TR>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Convites pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <EmptyState title="Nenhum convite pendente" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>E-mail</TH>
                  <TH>Cargo</TH>
                  <TH>Criado</TH>
                </TR>
              </THead>
              <tbody>
                {invites.map((i) => (
                  <TR key={i.id}>
                    <TD>{i.email}</TD>
                    <TD>{ROLE_LABELS[i.role as keyof typeof ROLE_LABELS]}</TD>
                    <TD className="text-xs text-slate-500">{i.createdAt}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setInviteUrl(null);
        }}
        title="Convidar membro"
        description="Gera um link de convite para compartilhar com a pessoa."
      >
        {inviteUrl ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Convite criado! Compartilhe o link abaixo (válido por 7 dias):
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={inviteUrl} className="text-xs" />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigator.clipboard.writeText(inviteUrl)}
              >
                <Copy size={15} />
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={createInvite} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="role">Cargo</Label>
              <Select id="role" name="role" defaultValue="vendedora">
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={saving}>
                Gerar convite
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
