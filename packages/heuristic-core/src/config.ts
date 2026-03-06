/**
 * Default thresholds and tier-to-effort mapping. All overridable via options.
 */

export const DEFAULT_LENGTH_SIMPLE_MAX = 80;
export const DEFAULT_LENGTH_COMPLEX_MIN = 400;
export const DEFAULT_MESSAGE_COUNT_COMPLEX = 10;

export type Tier = 'simple' | 'medium' | 'complex';
export type Effort = 'low' | 'medium' | 'high';

export interface EvaluateOptions {
  /** Max message length to consider simple (default 80) */
  lengthSimpleMax?: number;
  /** Min message length to consider complex (default 400) */
  lengthComplexMin?: number;
  /** Message count above which we up-tier to complex in agent context (default 10) */
  messageCountComplex?: number;
  /** Override tier->effort mapping */
  tierToEffort?: Partial<Record<Tier, Effort>>;
}

export const DEFAULT_TIER_TO_EFFORT: Record<Tier, Effort> = {
  simple: 'low',
  medium: 'medium',
  complex: 'high',
};

export function mergeEvaluateOptions(options?: EvaluateOptions): Required<Omit<EvaluateOptions, 'tierToEffort'>> & { tierToEffort: Record<Tier, Effort> } {
  return {
    lengthSimpleMax: options?.lengthSimpleMax ?? DEFAULT_LENGTH_SIMPLE_MAX,
    lengthComplexMin: options?.lengthComplexMin ?? DEFAULT_LENGTH_COMPLEX_MIN,
    messageCountComplex: options?.messageCountComplex ?? DEFAULT_MESSAGE_COUNT_COMPLEX,
    tierToEffort: { ...DEFAULT_TIER_TO_EFFORT, ...options?.tierToEffort },
  };
}
