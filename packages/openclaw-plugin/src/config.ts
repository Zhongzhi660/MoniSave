/**
 * Read tier->modelId mapping from plugin config. Defaults match plan YAML.
 */

import type { Tier } from './heuristicCore.js';

export type EffortMode = 'auto' | 'low' | 'medium' | 'high' | 'max';

export interface MonisavePluginConfig {
  /** Tier to OpenClaw model id (e.g. anthropic/claude-sonnet-4-6-low) */
  tierToModelId?: Partial<Record<Tier, string>>;
  /** Optional direct mapping for manual effort mode. */
  effortToModelId?: Partial<Record<Exclude<EffortMode, 'auto'>, string>>;
  /** Startup effort mode (default: auto) */
  effortMode?: EffortMode;
  /** Language for /savings output: 'zh' | 'en' */
  language?: 'zh' | 'en';
}

const DEFAULT_TIER_TO_MODEL_ID: Record<Tier, string> = {
  simple: 'anthropic/claude-sonnet-4-6-low',
  medium: 'anthropic/claude-sonnet-4-6-medium',
  complex: 'anthropic/claude-sonnet-4-6-high',
};

function effortToTier(effort: Exclude<EffortMode, 'auto'>): Tier {
  if (effort === 'low') return 'simple';
  if (effort === 'medium') return 'medium';
  return 'complex';
}

export function getModelIdForTier(tier: Tier, config?: MonisavePluginConfig): string {
  const map = { ...DEFAULT_TIER_TO_MODEL_ID, ...config?.tierToModelId };
  return map[tier] ?? map.medium ?? DEFAULT_TIER_TO_MODEL_ID.medium;
}

export function getModelIdForEffort(effort: Exclude<EffortMode, 'auto'>, config?: MonisavePluginConfig): string {
  const direct = config?.effortToModelId?.[effort];
  if (direct) return direct;
  return getModelIdForTier(effortToTier(effort), config);
}

export function getInitialEffortMode(config?: MonisavePluginConfig): EffortMode {
  return config?.effortMode ?? 'auto';
}

export function getLanguage(config?: MonisavePluginConfig, envLang?: string): 'zh' | 'en' {
  if (config?.language) return config.language;
  if (envLang?.toLowerCase().startsWith('zh')) return 'zh';
  return 'en';
}
