/**
 * Compute saved thinking tokens vs a "high effort" baseline.
 *
 * Strategy: Anthropic adaptive thinking behaves like a switch —
 * at lower effort the model often skips thinking entirely.
 * We use empirically-calibrated baselines per effort level
 * rather than unreliable ratio-based extrapolation.
 *
 * Baseline (what high effort would cost in thinking tokens):
 *   - When model DID think: baseline = actual × HIGH_BASELINE_MULT
 *   - When model DIDN'T think: baseline = fixed per-request estimate
 *     (calibrated from observed high-effort thinking on simple queries)
 */

import type { Effort } from './config.js';
import { getThinkingPricePerM } from './pricing.js';

export interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  /** Estimated thinking tokens (set by provider from SSE stream) */
  thinking_tokens?: number;
}

export interface SavingsResult {
  saved_tokens: number;
  saved_usd_estimate: number;
  hasData: boolean;
}

/**
 * Empirical baselines from observed Sonnet 4.6 behavior:
 * - Simple queries at high effort: ~15-25 thinking tokens
 * - Medium-complexity at high effort: ~40-80 thinking tokens
 *
 * When the model DID think at lower effort, high effort would
 * have generated ~60% more thinking (conservative).
 */
const HIGH_BASELINE_MULT = 1.6;

/** Fixed baseline when model skipped thinking entirely, keyed by effort */
const SKIPPED_THINKING_BASELINE: Record<Effort, number> = {
  low: 30,
  medium: 20,
  high: 0,
};

export function computeSavings(
  usage: Usage,
  effortUsed: Effort,
  modelId: string,
  pricingTable?: Record<string, number>
): SavingsResult {
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
