/**
 * Calibration state: request count + high-effort thinking baseline per tier.
 * First 20 requests do not show savings (C); after 20 we use baseline for savings (A).
 */

import type { Memento } from 'vscode';
import type { Tier } from './heuristicCore.js';

const REQUEST_COUNT_KEY = 'monisave.requestCount';
const BASELINE_SAMPLES_KEY = 'monisave.baselineSamples';
const CALIBRATION_WARMUP = 20;
const MAX_SAMPLES_PER_TIER = 50;

let globalState: Memento | null = null;

export const CALIBRATION_WARMUP_REQUESTS = CALIBRATION_WARMUP;

export function initCalibration(state: Memento): void {
  globalState = state;
}

function getState(): Memento {
  if (!globalState) throw new Error('Calibration not initialized');
  return globalState;
}

export function getRequestCount(): number {
  return getState().get<number>(REQUEST_COUNT_KEY, 0);
}

/** Increment request count, persist, and return the new count. */
export async function incrementRequestCount(): Promise<number> {
  const state = getState();
  const count = state.get<number>(REQUEST_COUNT_KEY, 0) + 1;
  await state.update(REQUEST_COUNT_KEY, count);
  return count;
}

export function shouldShowSavings(count: number): boolean {
  return count > CALIBRATION_WARMUP;
}

interface BaselineSamples {
  simple: number[];
  medium: number[];
  complex: number[];
}

function getSamples(): BaselineSamples {
  const raw = getState().get<BaselineSamples>(BASELINE_SAMPLES_KEY, {
    simple: [],
    medium: [],
    complex: [],
  });
  return {
    simple: raw.simple ?? [],
    medium: raw.medium ?? [],
    complex: raw.complex ?? [],
  };
}

/** Record thinking tokens from a high-effort request to build baseline. */
export async function recordHighEffortThinking(tier: Tier, thinkingTokens: number): Promise<void> {
  if (thinkingTokens <= 0) return;
  const samples = getSamples();
  const arr = samples[tier];
  arr.push(thinkingTokens);
  if (arr.length > MAX_SAMPLES_PER_TIER) arr.shift();
  await getState().update(BASELINE_SAMPLES_KEY, samples);
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

/** Baseline thinking tokens for a tier (median of high-effort samples). Undefined if no data. */
export function getBaselineForTier(tier: Tier): number | undefined {
  const samples = getSamples()[tier];
  if (!samples || samples.length === 0) return undefined;
  const v = median(samples);
  return v > 0 ? Math.round(v) : undefined;
}
