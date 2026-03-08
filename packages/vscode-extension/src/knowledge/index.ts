/**
 * Knowledge service orchestration for VS Code extension.
 */

import { randomUUID, createHash } from 'node:crypto';
import * as path from 'node:path';
import { FileKnowledgeStore } from './store.js';
import { buildKnowledgeContext, retrieveKnowledge } from './retrieval.js';
import type { FeedbackEvent, KnowledgeCard, KnowledgeScene, LastTurnMemory } from './types.js';

export interface KnowledgeRuntimeConfig {
  enabled: boolean;
  topK: number;
  minScore: number;
  repoPath: string;
  feedbackWeight: number;
  feedbackMinSamples: number;
}

let globalStoragePath = '';
let store: FileKnowledgeStore | undefined;
let storeRoot = '';
let lastTurn: LastTurnMemory | undefined;

function nowIso(): string {
  return new Date().toISOString();
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function pickStoreRoot(cfg: KnowledgeRuntimeConfig): string {
  if (cfg.repoPath.trim()) return cfg.repoPath.trim();
  return path.join(globalStoragePath, 'knowledge');
}

async function ensureStore(cfg: KnowledgeRuntimeConfig): Promise<FileKnowledgeStore> {
  if (!globalStoragePath) throw new Error('Knowledge service not initialized');
  const root = pickStoreRoot(cfg);
  if (!store || root !== storeRoot) {
    store = new FileKnowledgeStore(root);
    storeRoot = root;
  }
  await store.ensure();
  return store;
}

function fingerprint(question: string): string {
  return createHash('sha1').update(normalize(question)).digest('hex').slice(0, 16);
}

function extractCommands(answer: string): string[] {
  return answer
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /\b(npm|npx|git|openclaw|node|pnpm|yarn|python|pip|curl)\b/i.test(line))
    .slice(0, 8);
}

function toSteps(answer: string): string[] {
  const lines = answer
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.length <= 180);
  const picked = lines.filter((line) => /^(\d+\.|-|\*)\s+/.test(line));
  if (picked.length > 0) return picked.slice(0, 6).map((line) => line.replace(/^(\d+\.|-|\*)\s+/, ''));
  return lines.slice(0, 4);
}

function toTitle(question: string): string {
  const t = question.trim().replace(/\s+/g, ' ');
  if (t.length <= 64) return t;
  return `${t.slice(0, 61)}...`;
}

function keywordTags(question: string): string[] {
  const q = normalize(question);
  const tags: string[] = [];
  if (q.includes('openclaw')) tags.push('openclaw');
  if (q.includes('vscode') || q.includes('vs code')) tags.push('vscode');
  if (q.includes('install') || q.includes('安装')) tags.push('install');
  if (q.includes('plugin') || q.includes('插件')) tags.push('plugin');
  if (q.includes('config') || q.includes('配置')) tags.push('config');
  if (q.includes('build') || q.includes('编译')) tags.push('build');
  return Array.from(new Set(tags)).slice(0, 6);
}

export function initKnowledgeService(storagePath: string): void {
  globalStoragePath = storagePath;
}

export async function retrieveKnowledgeContext(
  question: string,
  scene: KnowledgeScene,
  cfg: KnowledgeRuntimeConfig
): Promise<{ contextText: string; matchedCardIds: string[] }> {
  if (!cfg.enabled || question.trim().length === 0) return { contextText: '', matchedCardIds: [] };
  const s = await ensureStore(cfg);
  const cards = await s.listCards();
  const results = retrieveKnowledge(cards, question, {
    topK: cfg.topK,
    minScore: cfg.minScore,
    feedbackWeight: cfg.feedbackWeight,
    feedbackMinSamples: cfg.feedbackMinSamples,
    scene,
  });
  const out = buildKnowledgeContext(results);
  return { contextText: out.text, matchedCardIds: out.matchedCardIds };
}

export function rememberLastTurn(turn: LastTurnMemory): void {
  lastTurn = turn;
}

export function getLastTurn(): LastTurnMemory | undefined {
  return lastTurn;
}

export async function saveCurrentTurnAsKnowledge(cfg: KnowledgeRuntimeConfig): Promise<{ ok: boolean; message: string }> {
  const turn = getLastTurn();
  if (!turn || !turn.question.trim() || !turn.answer.trim()) {
    return { ok: false, message: 'No recent Q&A available to save.' };
  }
  const s = await ensureStore(cfg);
  const fp = fingerprint(turn.question);
  const cards = await s.listCards();
  const existing = cards.find((c) => c.problemFingerprint === fp);
  const base: KnowledgeCard = existing ?? {
    id: `ks_${randomUUID().slice(0, 8)}`,
    schemaVersion: 1,
    title: toTitle(turn.question),
    scene: 'chat',
    tags: keywordTags(turn.question),
    questionPattern: turn.question,
    problemFingerprint: fp,
    rootCause: toSteps(turn.answer)[0] ?? '',
    solutionSteps: toSteps(turn.answer),
    commands: extractCommands(turn.answer),
    pitfalls: [],
    validation: [],
    qualityScore: 0.5,
    feedback: { usefulCount: 0, notUsefulCount: 0 },
    meta: { sourceRefs: ['manual-save'], createdAt: nowIso(), updatedAt: nowIso(), createdBy: 'user' },
  };
  const updated: KnowledgeCard = {
    ...base,
    title: toTitle(turn.question),
    questionPattern: turn.question,
    solutionSteps: toSteps(turn.answer),
    commands: extractCommands(turn.answer),
    tags: Array.from(new Set([...(base.tags ?? []), ...keywordTags(turn.question)])).slice(0, 8),
    meta: {
      ...base.meta,
      updatedAt: nowIso(),
    },
  };
  await s.upsertCard(updated);
  return { ok: true, message: `Saved knowledge card: ${updated.title}` };
}

export async function markLastTurnFeedback(
  value: 'useful' | 'not_useful',
  cfg: KnowledgeRuntimeConfig
): Promise<{ ok: boolean; message: string }> {
  const turn = getLastTurn();
  if (!turn || turn.matchedCardIds.length === 0) {
    return { ok: false, message: 'No matched knowledge card for the recent answer.' };
  }
  const s = await ensureStore(cfg);
  const cardId = turn.matchedCardIds[0];
  const updated = await s.applyFeedback(cardId, value, cfg.feedbackWeight, cfg.feedbackMinSamples);
  if (!updated) return { ok: false, message: 'Matched knowledge card no longer exists.' };
  const event: FeedbackEvent = {
    id: randomUUID(),
    cardId,
    value,
    timestamp: nowIso(),
    actor: 'user',
    sessionId: 'vscode',
  };
  await s.appendFeedback(event);
  return {
    ok: true,
    message: `Feedback recorded for ${updated.title}. qualityScore=${updated.qualityScore.toFixed(2)}`,
  };
}

export async function searchKnowledge(
  query: string,
  cfg: KnowledgeRuntimeConfig
): Promise<Array<{ id: string; title: string; score: number }>> {
  const s = await ensureStore(cfg);
  const cards = await s.listCards();
  const results = retrieveKnowledge(cards, query, {
    topK: cfg.topK,
    minScore: cfg.minScore,
    feedbackWeight: cfg.feedbackWeight,
    feedbackMinSamples: cfg.feedbackMinSamples,
    scene: 'chat',
  });
  return results.map((r) => ({ id: r.card.id, title: r.card.title, score: r.score }));
}

/** List all knowledge cards (for QuickPick / short view). */
export async function listAllCards(
  cfg: KnowledgeRuntimeConfig
): Promise<Array<{ id: string; title: string; qualityScore: number; updatedAt: string }>> {
  const s = await ensureStore(cfg);
  const cards = await s.listCards();
  return cards.map((c) => ({
    id: c.id,
    title: c.title,
    qualityScore: c.qualityScore,
    updatedAt: c.meta?.updatedAt ?? '',
  }));
}

/** List all cards with full content (for chat /list display). */
export async function listAllCardsFull(cfg: KnowledgeRuntimeConfig): Promise<KnowledgeCard[]> {
  const s = await ensureStore(cfg);
  return s.listCards();
}

