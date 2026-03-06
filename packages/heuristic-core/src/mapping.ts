/**
 * Map difficulty tier to Claude effort level. Uses config default or override.
 */

import type { Effort, Tier } from './config.js';
import { mergeEvaluateOptions, type EvaluateOptions } from './config.js';

/**
 * Get effort for a given tier. Uses DEFAULT_TIER_TO_EFFORT unless options.tierToEffort is provided.
 */
export function getEffort(tier: Tier, options?: EvaluateOptions): Effort {
  const opts = mergeEvaluateOptions(options);
  return opts.tierToEffort[tier];
}
