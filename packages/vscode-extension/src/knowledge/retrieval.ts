/**
 * Lightweight retrieval and ranking for knowledge cards.
 */

import type { KnowledgeCard, RetrievalResult } from './types.js';

export interface RetrievalOptions {
  topK: number;
  minScore: number;
  feedbackWeight: number;
  feedbackMinSamples: number;
  scene?: string;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\w\u4e00-\u9fa5\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(' ').map((x) => x.trim()).filter((x) => x.length >= 2);
}

function overlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let common = 0;
  for (const x of setA) {
    if (setB.has(x)) common += 1;
  }
  return common / Math.max(setA.size, setB.size, 1);
}

function cardText(card: KnowledgeCard): string {
  return [
    card.title,
    card.questionPattern,
    card.rootCause,
    card.solutionSteps.join(' '),
    card.commands.join(' '),
    card.tags.join(' '),
  ].join(' ');
}

function recencyFactor(lastFeedbackAt?: string): number {
  if (!lastFeedbackAt) return 0.85;
  const t = new Date(lastFeedbackAt).getTime();
  if (Number.isNaN(t)) return 0.85;
  const days = (Date.now() - t) / (1000 * 60 * 60 * 24);
  if (days <= 30) return 1;
  if (days >= 180) return 0.7;
  return 1 - ((days - 30) / 150) * 0.3;
}

export function retrieveKnowledge(
  cards: KnowledgeCard[],
  query: string,
  opts: RetrievalOptions
): RetrievalResult[] {
  const qTokens = tokenize(query);
  const out: RetrievalResult[] = [];
  for (const card of cards) {
    const reason: string[] = [];
    const cTokens = tokenize(cardText(card));
    const textSimilarity = overlapScore(qTokens, cTokens);
    let tagSceneMatch = 0;
    if (opts.scene && card.scene === opts.scene) {
      tagSceneMatch += 0.35;
      reason.push('scene');
    }
    const qSet = new Set(qTokens);
    const hasTagMatch = card.tags.some((tag) => qSet.has(normalize(tag)));
    if (hasTagMatch) {
      tagSceneMatch += 0.25;
      reason.push('tag');
    }
    const base = clamp01(textSimilarity * 0.6 + tagSceneMatch * 0.4);
    const useful = card.feedback.usefulCount;
    const notUseful = card.feedback.notUsefulCount;
    const samples = useful + notUseful;
    const feedbackRate = useful / Math.max(1, samples);
    const sampleFactor = samples >= opts.feedbackMinSamples ? 1 : 0.3;
    const adjustedFeedback = feedbackRate * sampleFactor * recencyFactor(card.feedback.lastFeedbackAt);
    const weight = clamp01(opts.feedbackWeight);
    const final = clamp01(base * (1 - weight) + adjustedFeedback * weight);
    if (final >= opts.minScore) {
      out.push({ card, score: final, reason: reason.length > 0 ? reason : ['text'] });
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, Math.max(1, opts.topK));
}

export function buildKnowledgeContext(results: RetrievalResult[]): { text: string; matchedCardIds: string[] } {
  if (results.length === 0) return { text: '', matchedCardIds: [] };
  const lines: string[] = [];
  lines.push('Team knowledge references (use if relevant):');
  for (const r of results) {
    const c = r.card;
    lines.push(`- [${c.id}] ${c.title} (score=${r.score.toFixed(2)})`);
    if (c.rootCause) lines.push(`  Root cause: ${c.rootCause}`);
    if (c.solutionSteps.length > 0) lines.push(`  Steps: ${c.solutionSteps.slice(0, 3).join(' | ')}`);
    if (c.pitfalls.length > 0) lines.push(`  Pitfalls: ${c.pitfalls.slice(0, 2).join(' | ')}`);
  }
  return { text: lines.join('\n'), matchedCardIds: results.map((r) => r.card.id) };
}

