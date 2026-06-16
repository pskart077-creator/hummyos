import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions";
import { agentSchema } from "@/lib/validations";
import { ok, unauthorized, forbidden, handleError } from "@/lib/http";
import { slugify } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "agents:view")) return forbidden();

    const agents = await prisma.agent.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { name: "asc" },
    });
    return ok(agents);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) return unauthorized();
    if (!hasPermission(ctx.role, "agents:manage")) return forbidden();

    const data = agentSchema.parse(await req.json());
    const slug = slugify(data.name) || `agente-${Date.now()}`;

    const agent = await prisma.agent.create({
      data: {
        organizationId: ctx.organization.id,
        name: data.name,
        slug,
        description: data.description,
        systemPrompt: data.systemPrompt,
        modelProvider: data.modelProvider,
        modelName: data.modelName,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        status: data.status,
        requiresApprovalForActions: data.requiresApprovalForActions,
        allowedTools: data.allowedTools,
      },
    });
    await createAuditLog({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      action: "agent.created",
      entityType: "agent",
      entityId: agent.id,
    });
    return ok(agent, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
