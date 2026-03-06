/**
 * Unit tests for evaluate() and getEffort(). Cover simple/medium/complex and edge cases.
 */

import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/evaluate.js';
import { getEffort } from '../src/mapping.js';
import { computeSavings } from '../src/savings.js';
describe('evaluate', () => {
  it('returns simple for short message with simple intent (EN)', () => {
    expect(evaluate('fix typo')).toBe('simple');
    expect(evaluate('rename this variable')).toBe('simple');
    expect(evaluate('what does this do?')).toBe('simple');
  });

  it('returns simple for short message with simple intent (ZH)', () => {
    expect(evaluate('改个变量')).toBe('simple');
    expect(evaluate('什么意思')).toBe('simple');
    expect(evaluate('简短说')).toBe('simple');
  });

  it('returns complex for long message', () => {
    const long = 'a'.repeat(401);
    expect(evaluate(long)).toBe('complex');
  });

  it('returns complex for step by step / architecture phrases', () => {
    expect(evaluate('Explain step by step how to design the architecture')).toBe('complex');
    expect(evaluate('请分析这段代码并设计重构方案')).toBe('complex');
    expect(evaluate('implement from scratch a full backend')).toBe('complex');
  });

  it('returns medium for medium-length message without strong keywords', () => {
    expect(evaluate('How do I add a new endpoint to my API?')).toBe('medium');
    expect(evaluate('Add a function that validates the input.')).toBe('medium');
  });

  it('returns complex when scene is agent', () => {
    expect(evaluate('fix typo', { scene: 'agent' })).toBe('complex');
  });

  it('returns complex when messageCount > threshold', () => {
    expect(evaluate('fix typo', { messageCount: 11 })).toBe('complex');
  });

  it('returns at least medium when message contains code block', () => {
    expect(evaluate('```js\nconst x = 1;\n```')).toBe('complex');
    expect(evaluate('check this: `code`')).toBe('medium');
  });

  it('returns medium for empty or whitespace-only message', () => {
    expect(evaluate('')).toBe('medium');
    expect(evaluate('   ')).toBe('medium');
  });

  it('returns complex for multiple question marks', () => {
    expect(evaluate('What is this? Why? And how?')).toBe('complex');
  });

  it('returns medium for boundary length 79 vs 81 with simple intent', () => {
    const short = 'fix typo. ' + 'x'.repeat(69);
    expect(short.length).toBeLessThanOrEqual(80);
    expect(evaluate(short)).toBe('simple');
    const aBitLong = 'fix typo. ' + 'x'.repeat(72);
    expect(evaluate(aBitLong)).toBe('medium');
  });

  it('respects custom length threshold', () => {
    const msg = 'x'.repeat(85);
    expect(evaluate(msg)).toBe('medium');
    expect(evaluate(msg, undefined, { lengthComplexMin: 80 })).toBe('complex');
  });

  it('returns medium on exception (safe fallback)', () => {
    expect(evaluate(undefined as unknown as string)).toBe('medium');
  });
});

describe('getEffort', () => {
  it('maps tier to effort correctly', () => {
    expect(getEffort('simple')).toBe('low');
    expect(getEffort('medium')).toBe('medium');
    expect(getEffort('complex')).toBe('high');
  });

  it('respects custom tierToEffort override', () => {
    expect(getEffort('simple', { tierToEffort: { simple: 'medium' } })).toBe('medium');
  });
});

describe('computeSavings', () => {
  it('returns hasData false when no thinking_tokens', () => {
    const r = computeSavings(
      { input_tokens: 100, output_tokens: 50 },
      'low',
      'claude-sonnet-4-6'
    );
    expect(r.hasData).toBe(false);
    expect(r.saved_tokens).toBe(0);
    expect(r.saved_usd_estimate).toBe(0);
  });

  it('returns saved_tokens > 0 for low effort with thinking_tokens', () => {
    const r = computeSavings(
      { input_tokens: 100, output_tokens: 50, thinking_tokens: 500 },
      'low',
      'claude-sonnet-4-6'
    );
    expect(r.hasData).toBe(true);
    expect(r.saved_tokens).toBeGreaterThan(0);
    expect(r.saved_usd_estimate).toBeGreaterThan(0);
  });

  it('returns zero savings for high effort', () => {
    const r = computeSavings(
      { input_tokens: 100, output_tokens: 50, thinking_tokens: 1000 },
      'high',
      'claude-sonnet-4-6'
    );
    expect(r.hasData).toBe(true);
    expect(r.saved_tokens).toBe(0);
    expect(r.saved_usd_estimate).toBe(0);
  });

  it('uses different price for different model prefix', () => {
    const rSonnet = computeSavings(
      { thinking_tokens: 1000 },
      'low',
      'claude-sonnet-4-6'
    );
    const rOpus = computeSavings(
      { thinking_tokens: 1000 },
      'low',
      'claude-opus-4-6'
    );
    expect(rOpus.saved_usd_estimate).toBeGreaterThan(rSonnet.saved_usd_estimate);
  });
});
