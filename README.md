# Hummy OS

**Sistema operacional interno da Hummy com IA, tráfego, vendas, atendimento e automações.**

Plataforma interna fechada para a equipe da Hummy. Cada IA trabalha como um
"funcionário digital" com função, permissões, ferramentas, logs, tarefas e
aprovações. Nenhuma ação sensível é executada pela IA sem aprovação humana.

> Acesso restrito à equipe. **Não há cadastro público** — novos usuários entram
> apenas por convite do Admin Master.

---

## ✨ Principais módulos

- **Autenticação segura** — login, convite, recuperação de senha, sessões em
  cookies `httpOnly`, RBAC por cargo.
- **Dashboard** — vendas, leads, gasto, CPA/ROAS, campanhas ativas, alertas,
  tarefas/aprovações pendentes, custo de IA.
- **Chat IA** — conversas por agente, histórico, custo registrado, streaming-ready.
- **Agentes IA** — Jarvis Admin, IA de Tráfego, Vendedora, Atendimento,
  Criativos e Analista. Prompt, modelo, ferramentas e permissões editáveis.
- **Meta Ads** — leitura de campanhas/insights (modo seguro). Ações sensíveis
  passam por aprovação.
- **Aprovações** — fluxo humano para pausar campanha, mexer em orçamento, etc.
- **Tarefas** — board por status, criadas por humanos ou pela IA.
- **Compliance** — análise de copy/criativos contra regras da Hummy.
- **Criativos, Leads, Vendas, Conhecimento, Relatórios, Logs, Uso de IA, Equipe.**
- **Integrações** — OpenClaw, Meta Ads (+ estrutura para WhatsApp, Webhook,
  GitHub, E-mail). Tokens criptografados em repouso.

---

## 🧱 Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Prisma** + **PostgreSQL**
- Autenticação própria (sessões em banco + cookie `httpOnly`), **bcryptjs**
- **Zod** (validação), **AES-256-GCM** (criptografia de secrets)
- **BullMQ** + **Redis** (filas/jobs) — opcional no MVP
- RBAC centralizado, middleware de auth, rate limit, auditoria completa

---

## 🚀 Setup local

### Pré-requisitos
- Node.js 20+
- PostgreSQL (recomendado via Docker)
- (Opcional) Redis para filas

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
Copie o exemplo e preencha:
```bash
cp .env.example .env
```
Gere os segredos (`NEXTAUTH_SECRET`, `ENCRYPTION_KEY`, `META_ENCRYPTION_SECRET`):
```bash
# Linux/Mac
openssl rand -base64 32
# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
```

### 3. Subir o banco (Docker)
```bash
docker compose up -d        # Postgres em localhost:5432 e Redis em :6379
```

### 4. Migrar e popular o banco
```bash
npm run prisma:migrate      # aplica as migrations
npm run prisma:seed         # cria org Hummy, admin e agentes
```

### 5. Rodar
```bash
npm run dev                 # http://localhost:3000
```

Login inicial: use `ADMIN_EMAIL` / `ADMIN_PASSWORD` do `.env`. Se
`ADMIN_PASSWORD` não estiver definido, o seed imprime uma senha temporária no
terminal.

### (Opcional) Worker de filas
```bash
npm run worker:dev          # requer REDIS_URL
```

---

## ⚙️ Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Conexão Postgres |
| `NEXTAUTH_SECRET` | Segredo de assinatura de sessão |
| `ENCRYPTION_KEY` | Chave AES-256 (base64, 32 bytes) para secrets |
| `APP_URL` | URL pública da app |
| `APP_ENV` | `production` \| `staging` \| `development` (indicador no header) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Usuário inicial (seed) |
| `REDIS_URL` | Redis para filas (opcional) |
| `OPENCLAW_BASE_URL` / `OPENCLAW_AUTH_TOKEN` / `OPENCLAW_DEFAULT_AGENT_ID` | OpenClaw |
| `META_APP_ID` / `META_APP_SECRET` / `META_REDIRECT_URI` / `META_API_VERSION` / `META_ENCRYPTION_SECRET` | Meta Ads |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `AI_PROVIDER` | Provedor de IA do chat |

> Sem chave de IA, o chat responde em **modo local** (sem custo) para
> desenvolvimento. Tokens **nunca** são expostos ao frontend nem gravados em logs.

---

## 🔌 Configurar OpenClaw

1. Defina `OPENCLAW_BASE_URL`, `OPENCLAW_AUTH_TOKEN` e
   `OPENCLAW_DEFAULT_AGENT_ID` no `.env`.
2. Acesse **Integrações → OpenClaw → Testar conexão**.
3. Todas as chamadas ficam registradas em `integration_logs`. Sem configuração,
   o sistema mostra erro amigável e não quebra.

Cliente: [`lib/openclaw/client.ts`](lib/openclaw/client.ts) —
`sendMessageToOpenClaw`, `runAgent`, `checkOpenClawHealth`,
`listOpenClawAgents`, `createOpenClawRunLog`.

---

## 📣 Configurar Meta Ads

1. Crie um app na Meta e configure `META_APP_ID`, `META_APP_SECRET`,
   `META_REDIRECT_URI` (= `APP_URL` + `/api/integrations/meta/callback`) e
   `META_ENCRYPTION_SECRET`.
2. Em **Integrações → Meta Ads → Conectar conta**, faça o OAuth.
3. O token de acesso é **criptografado** antes de ser salvo
   (`meta_connections.encryptedAccessToken`).
4. **Meta Ads → Sincronizar** popula o cache de campanhas/insights.

No MVP, o módulo é **read-only**. Ações de escrita (pausar, ajustar orçamento)
geram uma **solicitação de aprovação** e só são executadas após aprovação
humana, pelo worker.

Serviços: `lib/meta/{client,oauth,campaigns,insights,actions,sync}.ts`.

---

## 🔐 Segurança & permissões

- Rotas protegidas por middleware + `requireAuth` / `requirePermission` nos
  Server Components e API Routes.
- **RBAC** centralizado em [`lib/permissions.ts`](lib/permissions.ts).
- Toda query é escopada por `organizationId` (isolamento multi-tenant).
- Senhas com bcrypt; secrets com AES-256-GCM; rate limit em login.
- Auditoria em `audit_logs`, `system_logs`, `integration_logs` — **sem** senhas
  ou tokens.

### Cargos
`admin_master` (tudo), `owner`, `gestor_trafego`, `vendedora`, `atendimento`,
`designer`, `financeiro`, `operacional`, `readonly`.

---

## 📜 Scripts

| Script | Ação |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (gera Prisma Client) |
| `npm run start` | Servidor de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sem emitir |
| `npm run prisma:migrate` | Migrations (dev) |
| `npm run prisma:deploy` | Migrations (produção) |
| `npm run prisma:seed` | Seed inicial |
| `npm run prisma:studio` | Prisma Studio |
| `npm run worker:dev` / `worker:start` | Worker de filas |

---

## 🏗️ Estrutura

```
app/
  (auth)/        login, accept-invite, forgot/reset-password
  (app)/         dashboard, chat, agents, meta-ads, tasks, approvals, ...
  api/           rotas de API (auth, conversations, tasks, approvals, meta, ...)
components/      ui/ (primitivos), layout/, brand/
lib/             auth/, ai/, meta/, openclaw/, compliance/, services/,
                 prisma, permissions, crypto, audit, env, validations
prisma/          schema.prisma, migrations/, seed.ts
workers/         filas BullMQ + worker de jobs
```

---

## 🚢 Deploy em produção

1. Provisione Postgres e (opcional) Redis gerenciados.
2. Configure todas as variáveis de ambiente (com `APP_ENV=production`).
3. Aplique migrations: `npm run prisma:deploy`.
4. Rode o seed **uma vez** (ou crie o admin manualmente).
5. Build e start:
   ```bash
   npm run build
   npm run start
   ```
6. Rode o worker num processo separado: `npm run worker:start`.
7. Sirva atrás de HTTPS (cookies usam `secure` em produção).

Compatível com qualquer host Node (Vercel, Railway, Render, VM com PM2/Docker).
Para a Meta, lembre-se de cadastrar o `redirect_uri` exato no app da Meta e
passar pela revisão de permissões (`ads_read`, `ads_management`).

---

## ⚠️ Notas

- Os dados criados pelo seed (tarefas, lead, vendas de exemplo) são marcados
  como **[dado seed]** apenas para visualização inicial.
- O build de produção passa **lint** e **build** sem erros.
- Estrutura pronta para evoluir: embeddings na base de conhecimento, execução
  real de ações Meta no worker, WhatsApp e webhooks.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
