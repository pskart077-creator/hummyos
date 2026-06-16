/** Tabela simplificada de preços por 1M tokens (USD). Ajuste conforme contrato. */
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  default: { input: 1, output: 3 },
};

const USD_TO_BRL = Number(process.env.USD_TO_BRL ?? 5.4);

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
) {
  const p = PRICING[model] ?? PRICING.default;
  const usd =
    (inputTokens / 1_000_000) * p.input +
    (outputTokens / 1_000_000) * p.output;
  return { usd, brl: usd * USD_TO_BRL };
}

/** Estimativa grosseira de tokens (~4 chars/token) quando o provider não informa. */
export function estimateTokens(text: string): number {
  return Math.ceil((text?.length ?? 0) / 4);
}
