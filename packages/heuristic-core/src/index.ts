/**
 * @monisave/heuristic-core
 * Difficulty evaluation and savings calculation for thinking token optimization.
 */

export { evaluate, type EvaluateMeta } from './evaluate.js';
export { getEffort } from './mapping.js';
export { computeSavings, type SavingsResult, type Usage } from './savings.js';
export {
  DEFAULT_LENGTH_COMPLEX_MIN,
  DEFAULT_LENGTH_SIMPLE_MAX,
  DEFAULT_MESSAGE_COUNT_COMPLEX,
  DEFAULT_TIER_TO_EFFORT,
  mergeEvaluateOptions,
  type Effort,
  type EvaluateOptions,
  type Tier,
} from './config.js';
export {
  hasCodeBlock,
  hasComplexPhrase,
  hasFilePath,
  hasMultipleQuestions,
  hasSimpleIntent,
  hasBlockSimpleWord,
  normalizeForMatch,
  SIMPLE_INTENT_PHRASES,
  COMPLEX_PHRASES,
  BLOCK_SIMPLE_WORDS,
} from './keywords.js';
export { getThinkingPricePerM, DEFAULT_THINKING_PRICE_PER_M } from './pricing.js';
