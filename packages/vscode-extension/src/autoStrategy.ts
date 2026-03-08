/**
 * Auto mode strategy: decides effort/tier when effortMode is "auto".
 * Default implementation uses Claude default behavior (high effort).
 * Replace or extend this module to plug in heuristic or ML-based optimization later.
 */

import type { Effort, Tier } from './heuristicCore.js';

export interface AutoStrategyInput {
  lastUserMessage: string;
  messageCount: number;
  scene?: 'chat' | 'agent';
}

export interface AutoStrategyResult {
  effort: Effort;
  tier: Tier;
}

/**
 * Resolve effort and tier for auto mode.
 * Default: Claude default behavior (high effort). Override this or the implementation
 * in this file to enable heuristic/ML-based auto selection later.
 */
export function getEffortForAuto(_input: AutoStrategyInput): AutoStrategyResult {
  return { effort: 'high', tier: 'complex' };
}
