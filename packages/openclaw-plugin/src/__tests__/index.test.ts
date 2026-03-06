/**
 * Unit tests for OpenClaw plugin: hook returns modelOverride, command returns text, RPC returns stats.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import register from '../index.js';

describe('openclaw-plugin', () => {
  let hookHandler: ((ctx: Record<string, unknown>) => Promise<{ modelOverride?: string }> | { modelOverride?: string }) | null = null;
  let commandHandler: ((ctx: Record<string, unknown>) => { text: string } | Promise<{ text: string }>) | null = null;
  let rpcHandler: ((arg: { respond: (ok: boolean, data: unknown) => void }) => void) | null = null;

  beforeEach(() => {
    hookHandler = null;
    commandHandler = null;
    rpcHandler = null;
  });

  it('registers before_prompt_build and returns modelOverride for simple message', async () => {
    const api = {
      registerHook: (name: string, handler: (ctx: Record<string, unknown>) => Promise<{ modelOverride?: string }> | { modelOverride?: string }) => {
        if (name === 'before_prompt_build') hookHandler = handler;
      },
      registerCommand: (cmd: { name: string; description: string; handler: (ctx: Record<string, unknown>) => { text: string } | Promise<{ text: string }> }) => {
        if (cmd.name === 'savings') commandHandler = cmd.handler;
      },
      registerGatewayMethod: (name: string, handler: (arg: { respond: (ok: boolean, data: unknown) => void }) => void) => {
        if (name === 'monisave.stats') rpcHandler = handler;
      },
      config: {},
    };
    register(api as Parameters<typeof register>[0]);
    expect(hookHandler).not.toBeNull();

    const result = await (hookHandler!({ messages: [{ role: 'user', content: '改个变量' }] }) as Promise<{ modelOverride?: string }>);
    expect(result.modelOverride).toBeDefined();
    expect(typeof result.modelOverride).toBe('string');
    expect(result.modelOverride).toContain('low'); // simple -> low effort model id
  });

  it('returns modelOverride for complex message (agent scene)', async () => {
    const api = {
      registerHook: (name: string, handler: (ctx: Record<string, unknown>) => Promise<{ modelOverride?: string }> | { modelOverride?: string }) => {
        if (name === 'before_prompt_build') hookHandler = handler;
      },
      registerCommand: () => {},
      registerGatewayMethod: () => {},
      config: {},
    };
    register(api as Parameters<typeof register>[0]);
    const result = await (hookHandler!({
      messages: [{ role: 'user', content: '从零实现一个完整的微服务架构' }],
      scene: 'agent',
    }) as Promise<{ modelOverride?: string }>);
    expect(result.modelOverride).toBeDefined();
    expect(result.modelOverride).toContain('high');
  });

  it('registers /savings command and returns no-data message when no usage', async () => {
    const api = {
      registerHook: () => {},
      registerCommand: (cmd: { name: string; handler: (ctx: Record<string, unknown>) => { text: string } | Promise<{ text: string }> }) => {
        if (cmd.name === 'savings') commandHandler = cmd.handler;
      },
      registerGatewayMethod: () => {},
      config: {},
    };
    register(api as Parameters<typeof register>[0]);
    expect(commandHandler).not.toBeNull();
    const out = await Promise.resolve(commandHandler!({}));
    expect(out.text).toMatch(/暂无数据|No data/i);
  });

  it('registers monisave.stats RPC and responds with saved_tokens, saved_usd, request_count', () => {
    const responded: { ok: boolean; data: unknown } = { ok: false, data: null };
    const api = {
      registerHook: () => {},
      registerCommand: () => {},
      registerGatewayMethod: (name: string, handler: (arg: { respond: (ok: boolean, data: unknown) => void }) => void) => {
        if (name === 'monisave.stats') rpcHandler = handler;
      },
      config: {},
    };
    register(api as Parameters<typeof register>[0]);
    expect(rpcHandler).not.toBeNull();
    rpcHandler!({ respond: (ok, data) => { responded.ok = ok; responded.data = data; } });
    expect(responded.ok).toBe(true);
    const data = responded.data as { saved_tokens: number; saved_usd: number; request_count: number };
    expect(data).toHaveProperty('saved_tokens');
    expect(data).toHaveProperty('saved_usd');
    expect(data).toHaveProperty('request_count');
  });
});
