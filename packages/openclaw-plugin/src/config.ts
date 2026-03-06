/**
 * Read tier->modelId mapping from plugin config. Defaults match plan YAML.
 */

import type { Tier } from '@monisave/heuristic-core';

export interface MonisavePluginConfig {
  /** Tier to OpenClaw model id (e.g. anthropic/claude-sonnet-4-6-low) */
  tierToModelId?: Partial<Record<Tier, string>>;
  /** Language for /savings output: 'zh' | 'en' */
  language?: 'zh' | 'en';
}

const DEFAULT_TIER_TO_MODEL_ID: Record<Tier, string> = {
  simple: 'anthropic/claude-sonnet-4-6-low',
  medium: 'anthropic/claude-sonnet-4-6-medium',
  complex: 'anthropic/claude-sonnet-4-6-high',
};

export function getModelIdForTier(tier: Tier, config?: MonisavePluginConfig): string {
  const map = { ...DEFAULT_TIER_TO_MODEL_ID, ...config?.tierToModelId };
  return map[tier] ?? map.medium ?? DEFAULT_TIER_TO_MODEL_ID.medium;
}

export function getLanguage(config?: MonisavePluginConfig, envLang?: string): 'zh' | 'en' {
  if (config?.language) return config.language;
  if (envLang?.toLowerCase().startsWith('zh')) return 'zh';
  return 'en';
}
