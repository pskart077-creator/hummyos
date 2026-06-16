import { Queue } from "bullmq";
import IORedis from "ioredis";

/**
 * Definições de fila (BullMQ). Requer REDIS_URL. Se ausente, as funções
 * de enfileiramento viram no-op (úteis no MVP sem Redis).
 */

export const QUEUE_NAMES = {
  meta: "meta",
  ai: "ai",
  reports: "reports",
  compliance: "compliance",
  knowledge: "knowledge",
} as const;

export type JobName =
  | "syncMetaCampaigns"
  | "syncMetaInsights"
  | "executeApprovedMetaAction"
  | "runAiTrafficAnalysis"
  | "generateDailyReport"
  | "runComplianceCheck"
  | "processKnowledgeFile";

let connection: IORedis | null = null;
const queues = new Map<string, Queue>();

export function getConnection(): IORedis | null {
  if (!process.env.REDIS_URL) return null;
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}

export function getQueue(name: string): Queue | null {
  const conn = getConnection();
  if (!conn) return null;
  if (!queues.has(name)) {
    // bullmq embute sua própria cópia do ioredis; o cast evita o conflito
    // de tipos entre as duas instalações (a runtime é compatível).
    queues.set(name, new Queue(name, { connection: conn as never }));
  }
  return queues.get(name)!;
}

/** Enfileira um job. Retorna false se não houver Redis configurado. */
export async function enqueue(
  queueName: string,
  jobName: JobName,
  data: Record<string, unknown>,
): Promise<boolean> {
  const queue = getQueue(queueName);
  if (!queue) {
    console.warn(
      `[queues] REDIS_URL ausente — job ${jobName} não enfileirado.`,
    );
    return false;
  }
  await queue.add(jobName, data, {
    removeOnComplete: 100,
    removeOnFail: 200,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  });
  return true;
}
