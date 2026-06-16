import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { ChatApp } from "../chat-app";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chat IA · Hummy OS" };

export default async function ChatConversationPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await requirePermission("chat:use");
  const agents = await prisma.agent.findMany({
    where: { organizationId: ctx.organization.id, status: "active" },
    select: { id: true, name: true, slug: true, description: true },
    orderBy: { name: "asc" },
  });
  return <ChatApp agents={agents} initialConversationId={params.id} />;
}
