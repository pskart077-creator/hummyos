import "dotenv/config";
import { Worker } from "bullmq";
import { getConnection, QUEUE_NAMES, type JobName } from "./queues";
import { syncMetaCampaigns } from "../lib/meta/sync";
import { createSystemLog } from "../lib/audit";

/**
 * Worker de jobs do Hummy OS. Execute com `npm run worker:dev`.
 * Requer REDIS_URL configurado.
 */

async function processJob(name: JobName, data: Record<string, unknown>) {
  const organizationId = data.organizationId as string;
  switch (name) {
    case "syncMetaCampaigns":
    case "syncMetaInsights":
      return syncMetaCampaigns(organizationId);

    case "executeApprovedMetaAction":
      // A execução real das ações Meta aprovadas seria feita aqui,
      // lendo MetaActionRequest com status "queued".
      await createSystemLog({
        organizationId,
        source: "worker",
        message: `Job ${name} recebido (placeholder de execução).`,
        metadata: data,
      });
      return { ok: true };

    case "runAiTrafficAnalysis":
    case "generateDailyReport":
    case "runComplianceCheck":
    case "processKnowledgeFile":
      await createSystemLog({
        organizationId,
        source: "worker",
        message: `Job ${name} processado (placeholder).`,
        metadata: data,
      });
      return { ok: true };

    default:
      throw new Error(`Job desconhecido: ${name}`);
  }
}

function main() {
  const connection = getConnection();
  if (!connection) {
    console.error(
      "[worker] REDIS_URL não configurado. Defina REDIS_URL para rodar o worker.",
    );
    process.exit(1);
  }

  const queueNames = Object.values(QUEUE_NAMES);
  const workers = queueNames.map(
    (queueName) =>
      new Worker(
        queueName,
        async (job) => {
          console.log(`[worker:${queueName}] processando ${job.name}`);
          return processJob(job.name as JobName, job.data);
        },
        { connection: connection as never },
      ),
  );

  for (const w of workers) {
    w.on("failed", (job, err) =>
      console.error(`[worker] job ${job?.name} falhou:`, err.message),
    );
  }

  console.log(
    `[worker] ativo nas filas: ${queueNames.join(", ")}. Aguardando jobs...`,
  );
}

main();
