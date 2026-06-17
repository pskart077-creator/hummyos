import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_AGENTS } from "../lib/agents/defaults";

const prisma = new PrismaClient();

const ORG_SLUG = "hummy";

async function main() {
  console.log("🌱 Seed Hummy OS — iniciando...");

  // ─── Organização ───────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: {},
    create: { name: "Hummy", slug: ORG_SLUG, status: "active" },
  });
  console.log(`✓ Organização: ${org.name}`);

  // ─── Admin Master (Lucas) ──────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@hummy.local";
  const adminName = process.env.ADMIN_NAME ?? "Lucas";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "hummy-admin-123";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      status: "active",
      ...(process.env.ADMIN_PASSWORD ? { passwordHash } : {}),
    },
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash,
      status: "active",
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: { userId: admin.id, organizationId: org.id },
    },
    update: { role: "admin_master" },
    create: {
      userId: admin.id,
      organizationId: org.id,
      role: "admin_master",
    },
  });
  console.log(`✓ Admin Master: ${adminEmail}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`  ⚠ Senha temporária: ${adminPassword} (defina ADMIN_PASSWORD no .env)`);
  }

  // ─── Agentes IA ─────────────────────────────────────────────────────
  for (const a of DEFAULT_AGENTS) {
    await prisma.agent.upsert({
      where: { organizationId_slug: { organizationId: org.id, slug: a.slug } },
      update: {
        name: a.name,
        description: a.description,
        roleType: a.roleType,
        systemPrompt: a.systemPrompt,
        allowedTools: a.allowedTools,
        requiresApprovalForActions: a.requiresApprovalForActions,
      },
      create: {
        organizationId: org.id,
        name: a.name,
        slug: a.slug,
        description: a.description,
        roleType: a.roleType,
        systemPrompt: a.systemPrompt,
        allowedTools: a.allowedTools,
        requiresApprovalForActions: a.requiresApprovalForActions,
      },
    });
  }
  console.log(`✓ ${DEFAULT_AGENTS.length} agentes IA`);

  // ─── Integrações (placeholders não configurados) ───────────────────
  const integrations: { type: any; name: string }[] = [
    { type: "openclaw", name: "OpenClaw" },
    { type: "meta_ads", name: "Meta Ads" },
    { type: "whatsapp", name: "WhatsApp" },
    { type: "webhook", name: "Webhook" },
    { type: "github", name: "GitHub" },
    { type: "email", name: "E-mail" },
  ];
  for (const i of integrations) {
    await prisma.integration.upsert({
      where: {
        organizationId_type: { organizationId: org.id, type: i.type },
      },
      update: {},
      create: {
        organizationId: org.id,
        type: i.type,
        name: i.name,
        status: "not_configured",
      },
    });
  }
  console.log(`✓ ${integrations.length} integrações (placeholders)`);

  // ─── Conexão Meta (placeholder) ────────────────────────────────────
  await prisma.metaConnection.upsert({
    where: { organizationId: org.id },
    update: {},
    create: { organizationId: org.id, status: "not_configured" },
  });

  // ─── Dados de exemplo (SEED — apenas para visualização) ────────────
  const seedTag = { seed: true };
  const trafego = await prisma.agent.findFirst({
    where: { organizationId: org.id, slug: "ia-trafego" },
  });

  const existingTasks = await prisma.task.count({
    where: { organizationId: org.id },
  });
  if (existingTasks === 0) {
    await prisma.task.createMany({
      data: [
        {
          organizationId: org.id,
          title: "Criar 3 variações de criativo para Libido Fem",
          description: "Ângulos de bem-estar e disposição. [dado seed]",
          status: "pending",
          priority: "high",
          createdByUserId: admin.id,
        },
        {
          organizationId: org.id,
          title: "Revisar campanha com CPA alto",
          description: "Avaliar pausa ou ajuste de público. [dado seed]",
          status: "in_progress",
          priority: "urgent",
          createdByUserId: admin.id,
        },
        {
          organizationId: org.id,
          title: "Responder leads quentes parados",
          description: "Follow-up dos leads marcados como hot. [dado seed]",
          status: "pending",
          priority: "medium",
          createdByUserId: admin.id,
        },
      ],
    });

    await prisma.aiRecommendation.create({
      data: {
        organizationId: org.id,
        agentId: trafego?.id,
        type: "budget_optimization",
        title: "Aumentar orçamento da campanha Tadala (ROAS alto)",
        description:
          "Campanha com ROAS acima da meta e CPA saudável. Sugiro testar +20% de orçamento. [dado seed]",
        severity: "medium",
        suggestedAction: { action: "increase_budget", percent: 20 },
        status: "pending",
      },
    });

    await prisma.lead.createMany({
      data: [
        {
          organizationId: org.id,
          name: "Maria S.",
          source: "meta_ads",
          status: "hot",
        },
        {
          organizationId: org.id,
          name: "João P.",
          source: "organic",
          status: "new",
        },
      ],
    });

    await prisma.sale.createMany({
      data: [
        {
          organizationId: org.id,
          customerName: "Cliente Exemplo 1",
          product: "Kit Maca + Tadala",
          amount: "197.00",
          status: "paid",
          source: "meta_ads",
        },
        {
          organizationId: org.id,
          customerName: "Cliente Exemplo 2",
          product: "Libido Fem",
          amount: "97.00",
          status: "paid",
          source: "meta_ads",
        },
      ],
    });

    await prisma.systemLog.create({
      data: {
        organizationId: org.id,
        level: "info",
        source: "seed",
        message: "Seed inicial executado com dados de exemplo.",
        metadata: seedTag,
      },
    });
    console.log("✓ Dados de exemplo (seed) criados");
  } else {
    console.log("• Dados de exemplo já existem, pulando");
  }

  console.log("✅ Seed concluído.");
}

main()
  .catch((e) => {
    console.error("❌ Seed falhou:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
