/**
 * Acesso centralizado e tipado às variáveis de ambiente.
 * Nunca importe este módulo em código client — ele expõe segredos.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  appEnv: (process.env.APP_ENV ?? "development") as
    | "production"
    | "staging"
    | "development",

  get databaseUrl() {
    return required("DATABASE_URL", process.env.DATABASE_URL);
  },
  get authSecret() {
    return required("NEXTAUTH_SECRET", process.env.NEXTAUTH_SECRET);
  },
  get encryptionKey() {
    return required("ENCRYPTION_KEY", process.env.ENCRYPTION_KEY);
  },

  redisUrl: process.env.REDIS_URL ?? "",

  openclaw: {
    baseUrl: process.env.OPENCLAW_BASE_URL ?? "",
    authToken: process.env.OPENCLAW_AUTH_TOKEN ?? "",
    defaultAgentId: process.env.OPENCLAW_DEFAULT_AGENT_ID ?? "",
    get configured() {
      return Boolean(
        process.env.OPENCLAW_BASE_URL && process.env.OPENCLAW_AUTH_TOKEN,
      );
    },
  },

  meta: {
    appId: process.env.META_APP_ID ?? "",
    appSecret: process.env.META_APP_SECRET ?? "",
    redirectUri: process.env.META_REDIRECT_URI ?? "",
    apiVersion: process.env.META_API_VERSION ?? "v21.0",
    encryptionSecret: process.env.META_ENCRYPTION_SECRET ?? "",
    get configured() {
      return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
    },
  },

  ai: {
    provider: process.env.AI_PROVIDER ?? "anthropic",
    anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
    openaiKey: process.env.OPENAI_API_KEY ?? "",
    get configured() {
      return Boolean(
        process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
      );
    },
  },

  elevenLabs: {
    apiKey: process.env.ELEVENLABS_API_KEY ?? "",
    voiceId: process.env.ELEVENLABS_VOICE_ID ?? "",
    get configured() {
      return Boolean(
        process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID,
      );
    },
  },
};

export function isProduction() {
  return env.nodeEnv === "production";
}
