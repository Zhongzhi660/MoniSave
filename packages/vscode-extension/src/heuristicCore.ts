/**
 * Local heuristic core for VS Code packaging stability.
 * Mirrors logic from @monisave/heuristic-core to avoid workspace symlink issues in VSIX builds.
 */

export type Tier = 'simple' | 'medium' | 'complex';
export type Effort = 'low' | 'medium' | 'high';

export interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  thinking_tokens?: number;
}

const SIMPLE_INTENT_PHRASES: string[] = [
  'fix typo',
  'fix a typo',
  '改个 typo',
  '修个变量',
  '改个变量',
  '补全这句',
  '什么意思',
  '简短说',
  'rename',
  'rename variable',
  'rename this',
  'what does this do',
  'brief',
  'short answer',
];

const COMPLEX_PHRASES: string[] = [
  'step by step',
  'step-by-step',
  '分析',
  '设计',
  '架构',
  '重构',
  '从零实现',
  '全面',
  'implement from scratch',
  'design the architecture',
  'explain in detail',
  'detailed analysis',
];

const BLOCK_SIMPLE_WORDS: string[] = [
  '步骤',
  '分析',
  '设计',
  '实现',
  '重构',
  'explain',
  'implement',
  'refactor',
  'design',
  'analyze',
];

const DEFAULT_LENGTH_SIMPLE_MAX = 80;
const DEFAULT_LENGTH_COMPLEX_MIN = 400;
const DEFAULT_MESSAGE_COUNT_COMPLEX = 10;
const DEFAULT_TIER_TO_EFFORT: Record<Tier, Effort> = {
  simple: 'low',
  medium: 'medium',
  complex: 'high',
};

const DEFAULT_THINKING_PRICE_PER_M: Record<string, number> = {
  'claude-sonnet-4': 3,
  'claude-opus-4': 15,
  'claude-3-5-sonnet': 3,
  'claude-3-opus': 15,
};

const HIGH_BASELINE_MULT = 1.6;
const SKIPPED_THINKING_BASELINE: Record<Effort, number> = {
  low: 30,
  medium: 20,
  high: 0,
};

function normalizeForMatch(s: string): string {
  return s
    .replace(/\u3000/g, ' ')
    .replace(/[\uff01-\uff5e]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toLowerCase()
    .trim();
}

function hasSimpleIntent(text: string): boolean {
  const n = normalizeForMatch(text);
  return SIMPLE_INTENT_PHRASES.some((p) => n.includes(normalizeForMatch(p)));
}

function hasComplexPhrase(text: string): boolean {
  const n = normalizeForMatch(text);
  return COMPLEX_PHRASES.some((p) => n.includes(normalizeForMatch(p)));
}

function hasBlockSimpleWord(text: string): boolean {
  const n = normalizeForMatch(text);
  const words = n.split(/\s+/);
  return BLOCK_SIMPLE_WORDS.some((w) =>
    words.some((word) => word.includes(normalizeForMatch(w)) || normalizeForMatch(w).split(/\s+/).every((part) => n.includes(part)))
  );
}

function hasCodeBlock(text: string): boolean {
  return /```[\s\S]*?```/.test(text) || text.includes('```');
}

function hasFilePath(text: string): boolean {
  return /[\w\-]+\/[\w\-./]+|\.\w{2,4}\b|[\u4e00-\u9fa5]*\/[\u4e00-\u9fa5\w\-./]+/.test(text);
}

function hasMultipleQuestions(text: string): boolean {
  const qMarks = (text.match(/\?/g) ?? []).length;
  if (qMarks >= 2) return true;
  return /\b[1-3]\s*[.．、]\s*|\b1\s*[.．、]\s*\w+[\s\S]*\b2\s*[.．、]/.test(text);
}

export function evaluate(message: string, meta?: { scene?: 'coding' | 'chat' | 'agent'; messageCount?: number }): Tier {
  try {
    const text = (message ?? '').trim();
    const len = text.length;

    if (meta?.scene === 'agent') return 'complex';
    if (meta?.scene !== 'chat' && meta?.messageCount != null && meta.messageCount > DEFAULT_MESSAGE_COUNT_COMPLEX) {
      return 'complex';
    }

    const isChat = meta?.scene === 'chat';
    if (isChat) {
      if (hasComplexPhrase(text) || hasMultipleQuestions(text)) return 'complex';
      if (len < DEFAULT_LENGTH_SIMPLE_MAX && hasSimpleIntent(text)) return 'simple';
    } else {
      if (len >= DEFAULT_LENGTH_COMPLEX_MIN || hasComplexPhrase(text) || hasCodeBlock(text) || hasFilePath(text) || hasMultipleQuestions(text)) {
        return 'complex';
      }
      if (
        len < DEFAULT_LENGTH_SIMPLE_MAX &&
        !hasBlockSimpleWord(text) &&
        !hasCodeBlock(text) &&
        !hasFilePath(text) &&
        hasSimpleIntent(text)
      ) {
        return 'simple';
      }
    }
    return 'medium';
  } catch {
    return 'medium';
  }
}

export function getEffort(tier: Tier): Effort {
  return DEFAULT_TIER_TO_EFFORT[tier];
}

export function getThinkingPricePerM(modelId: string, pricingTable?: Record<string, number>): number {
  const table = pricingTable ?? DEFAULT_THINKING_PRICE_PER_M;
  for (const [prefix, price] of Object.entries(table)) {
    if (modelId.startsWith(prefix)) return price;
  }
  return table['*'] ?? 5;
}

export function computeSavings(
  usage: Usage,
  effortUsed: Effort,
  modelId: string,
  pricingTable?: Record<string, number>
): { saved_tokens: number; saved_usd_estimate: number; hasData: boolean } {
  if (effortUsed === 'high') {
    return { saved_tokens: 0, saved_usd_estimate: 0, hasData: true };
  }

  const thinking = usage.thinking_tokens ?? 0;
  let saved_tokens: number;
  if (thinking > 0) {
    const baseline = Math.round(thinking * HIGH_BASELINE_MULT);
    saved_tokens = baseline - thinking;
  } else {
    saved_tokens = SKIPPED_THINKING_BASELINE[effortUsed];
  }

  saved_tokens = Math.max(0, saved_tokens);
  const pricePerM = getThinkingPricePerM(modelId, pricingTable);
  const saved_usd_estimate = (saved_tokens / 1_000_000) * pricePerM;

  return {
    saved_tokens,
    saved_usd_estimate: Math.round(saved_usd_estimate * 1e6) / 1e6,
    hasData: true,
  };
}
