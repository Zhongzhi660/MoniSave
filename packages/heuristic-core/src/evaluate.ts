/**
 * Heuristic difficulty evaluation: last user message + optional meta -> tier (simple | medium | complex).
 * Safe-high strategy: default medium; only downgrade to simple when clearly matched.
 */

import type { Tier } from './config.js';
import { mergeEvaluateOptions, type EvaluateOptions } from './config.js';
import {
  hasBlockSimpleWord,
  hasCodeBlock,
  hasComplexPhrase,
  hasFilePath,
  hasMultipleQuestions,
  hasSimpleIntent,
} from './keywords.js';

export interface EvaluateMeta {
  /** Scene: agent locks to complex */
  scene?: 'coding' | 'chat' | 'agent';
  /** Number of messages so far in context */
  messageCount?: number;
}

/**
 * Evaluate difficulty tier for the given user message.
 * Returns 'medium' on any exception to avoid blocking the request.
 */
export function evaluate(message: string, meta?: EvaluateMeta, options?: EvaluateOptions): Tier {
  try {
    const opts = mergeEvaluateOptions(options);
    const text = (message ?? '').trim();
    const len = text.length;

    if (meta?.scene === 'agent') return 'complex';
    if (meta?.scene !== 'chat' && meta?.messageCount != null && meta.messageCount > opts.messageCountComplex) {
      return 'complex';
    }

    const isChat = meta?.scene === 'chat';

    if (isChat) {
      // In chat, the message may contain injected context (file paths, code blocks)
      // from the IDE. Only use explicit intent phrases for complexity detection.
      if (hasComplexPhrase(text) || hasMultipleQuestions(text)) return 'complex';
      if (len < opts.lengthSimpleMax && hasSimpleIntent(text)) return 'simple';
    } else {
      if (len >= opts.lengthComplexMin || hasComplexPhrase(text) || hasCodeBlock(text) || hasFilePath(text) || hasMultipleQuestions(text)) {
        return 'complex';
      }
      if (
        len < opts.lengthSimpleMax &&
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
