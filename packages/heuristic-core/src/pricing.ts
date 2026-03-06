/**
 * Default thinking token pricing (per 1M tokens). Align with Anthropic public pricing.
 * Can be overridden via pricingTable in computeSavings.
 */

export type Effort = 'low' | 'medium' | 'high';

/** USD per 1M thinking tokens, by model id prefix */
export const DEFAULT_THINKING_PRICE_PER_M: Record<string, number> = {
  'claude-sonnet-4': 3,
  'claude-opus-4': 15,
  'claude-3-5-sonnet': 3,
  'claude-3-opus': 15,
};

const FALLBACK_PRICE = 5;

/**
 * Resolve thinking price per 1M tokens for a model id (e.g. claude-sonnet-4-6, claude-opus-4).
 */
export function getThinkingPricePerM(modelId: string, pricingTable?: Record<string, number>): number {
  const table = pricingTable ?? DEFAULT_THINKING_PRICE_PER_M;
  for (const [prefix, price] of Object.entries(table)) {
    if (modelId.startsWith(prefix)) return price;
  }
  return table['*'] ?? FALLBACK_PRICE;
}
