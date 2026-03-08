/**
 * JSONL-backed file store for team knowledge cards.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { FeedbackEvent, KnowledgeCard } from './types.js';

const CARDS_FILE = 'knowledge-cards.jsonl';
const FEEDBACK_FILE = 'knowledge-feedback.jsonl';

function nowIso(): string {
  return new Date().toISOString();
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

async function readJsonl<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as T);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeJsonl<T>(filePath: string, rows: T[]): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  const body = rows.map((r) => JSON.stringify(r)).join('\n');
  await fs.writeFile(tempPath, body.length > 0 ? `${body}\n` : '', 'utf8');
  await fs.rename(tempPath, filePath);
}

export class FileKnowledgeStore {
  constructor(private readonly rootDir: string) {}

  getRootDir(): string {
    return this.rootDir;
  }

  private cardsPath(): string {
    return path.join(this.rootDir, CARDS_FILE);
  }

  private feedbackPath(): string {
    return path.join(this.rootDir, FEEDBACK_FILE);
  }

  async ensure(): Promise<void> {
    await fs.mkdir(this.rootDir, { recursive: true });
  }

  async listCards(): Promise<KnowledgeCard[]> {
    await this.ensure();
    return readJsonl<KnowledgeCard>(this.cardsPath());
  }

  async saveCards(cards: KnowledgeCard[]): Promise<void> {
    await this.ensure();
    await writeJsonl(this.cardsPath(), cards);
  }

  async appendFeedback(event: FeedbackEvent): Promise<void> {
    await this.ensure();
    const rows = await readJsonl<FeedbackEvent>(this.feedbackPath());
    rows.push(event);
    await writeJsonl(this.feedbackPath(), rows);
  }

  async upsertCard(card: KnowledgeCard): Promise<void> {
    const cards = await this.listCards();
    const idx = cards.findIndex((x) => x.id === card.id);
    if (idx >= 0) {
      cards[idx] = { ...card, qualityScore: clamp01(card.qualityScore), meta: { ...card.meta, updatedAt: nowIso() } };
    } else {
      cards.push({ ...card, qualityScore: clamp01(card.qualityScore) });
    }
    await this.saveCards(cards);
  }

  async getCardById(id: string): Promise<KnowledgeCard | undefined> {
    const cards = await this.listCards();
    return cards.find((c) => c.id === id);
  }

  async applyFeedback(
    cardId: string,
    value: 'useful' | 'not_useful',
    feedbackWeight: number,
    minSamples: number
  ): Promise<KnowledgeCard | undefined> {
    const cards = await this.listCards();
    const idx = cards.findIndex((c) => c.id === cardId);
    if (idx < 0) return undefined;
    const card = cards[idx];
    const useful = card.feedback.usefulCount + (value === 'useful' ? 1 : 0);
    const notUseful = card.feedback.notUsefulCount + (value === 'not_useful' ? 1 : 0);
    const samples = useful + notUseful;
    const feedbackRate = useful / Math.max(1, samples);
    const sampleFactor = samples >= minSamples ? 1 : 0.3;
    const effectiveWeight = clamp01(feedbackWeight) * sampleFactor;
    const nextScore = clamp01(card.qualityScore * (1 - effectiveWeight) + feedbackRate * effectiveWeight);

    const updated: KnowledgeCard = {
      ...card,
      qualityScore: nextScore,
      feedback: {
        usefulCount: useful,
        notUsefulCount: notUseful,
        lastFeedbackAt: nowIso(),
      },
      meta: {
        ...card.meta,
        updatedAt: nowIso(),
      },
    };
    cards[idx] = updated;
    await this.saveCards(cards);
    return updated;
  }
}

