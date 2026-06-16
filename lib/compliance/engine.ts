import type { RiskLevel } from "@prisma/client";

export type ComplianceIssue = {
  term: string;
  category: string;
  severity: RiskLevel;
  explanation: string;
};

export type ComplianceResult = {
  riskLevel: RiskLevel;
  issues: ComplianceIssue[];
  suggestions: string[];
};

/**
 * Regras de compliance da Hummy. Heurística baseada em termos sensíveis.
 * Produtos podem tocar em vitalidade/libido/bem-estar — a linguagem deve
 * evitar promessas médicas/sexuais explícitas.
 */
const RULES: {
  category: string;
  severity: RiskLevel;
  patterns: RegExp[];
  explanation: string;
}[] = [
  {
    category: "Promessa de cura/tratamento",
    severity: "blocked",
    patterns: [
      /\bcura\b/i,
      /\bcurar\b/i,
      /\btratamento\b/i,
      /\btrata\b/i,
      /\bdiagn[óo]stic/i,
      /\brem[ée]dio\b/i,
    ],
    explanation:
      "Evite alegar cura, tratamento ou diagnóstico. Pode violar políticas de anúncio.",
  },
  {
    category: "Promessa sexual explícita",
    severity: "blocked",
    patterns: [
      /\bsexual\b/i,
      /\bsexo\b/i,
      /\beresç?[ãa]o\b/i,
      /\bpot[êe]ncia sexual\b/i,
      /\bperformance sexual\b/i,
      /\blibido garantid/i,
    ],
    explanation:
      "Linguagem sexual explícita não é permitida. Prefira bem-estar, disposição e vitalidade.",
  },
  {
    category: "Impotência / linguagem agressiva",
    severity: "high",
    patterns: [/\bimpot[êe]ncia\b/i, /\bdisfun[çc][ãa]o er[ée]til\b/i],
    explanation:
      "Termos sobre impotência são sensíveis. Reposicione para energia, equilíbrio e autocuidado.",
  },
  {
    category: "Garantia de resultado",
    severity: "high",
    patterns: [
      /\bgarant(e|ia|ido|imos)\b/i,
      /\b100%\b/i,
      /\bresultado garantido\b/i,
      /\bcomprovadamente\b/i,
    ],
    explanation:
      "Evite garantir resultados físicos. Use linguagem de apoio à rotina e ao bem-estar.",
  },
  {
    category: "Antes/depois sensível",
    severity: "medium",
    patterns: [/\bantes e depois\b/i, /\bantes\/depois\b/i],
    explanation:
      "Comparações antes/depois podem ser sensíveis. Prefira foco em hábitos e disposição.",
  },
  {
    category: "Apelo adulto forte",
    severity: "medium",
    patterns: [/\bna cama\b/i, /\bna hora h\b/i, /\bpegada\b/i],
    explanation:
      "Apelo adulto forte deve ser evitado. Mantenha tom educativo e de marca.",
  },
];

const SAFE_VOCAB = [
  "bem-estar",
  "vitalidade",
  "disposição",
  "energia",
  "equilíbrio",
  "autocuidado",
  "rotina",
  "conteúdo educativo",
];

export function runComplianceCheck(text: string): ComplianceResult {
  const issues: ComplianceIssue[] = [];
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (match) {
        issues.push({
          term: match[0],
          category: rule.category,
          severity: rule.severity,
          explanation: rule.explanation,
        });
        break; // um match por regra é suficiente
      }
    }
  }

  const riskLevel = computeRisk(issues);
  const suggestions = buildSuggestions(issues);
  return { riskLevel, issues, suggestions };
}

function computeRisk(issues: ComplianceIssue[]): RiskLevel {
  if (issues.some((i) => i.severity === "blocked")) return "blocked";
  if (issues.some((i) => i.severity === "high")) return "high";
  if (issues.some((i) => i.severity === "medium")) return "medium";
  return "low";
}

function buildSuggestions(issues: ComplianceIssue[]): string[] {
  if (issues.length === 0) {
    return ["Texto sem termos sensíveis detectados. Ainda assim, revise o tom."];
  }
  const out = issues.map(
    (i) => `Revise “${i.term}” (${i.category}): ${i.explanation}`,
  );
  out.push(
    `Prefira vocabulário seguro: ${SAFE_VOCAB.join(", ")}.`,
  );
  return out;
}
