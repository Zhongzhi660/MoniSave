/**
 * MoniSave OpenClaw plugin: before_prompt_build hook + /savings command + monisave.stats RPC.
 * All comments in English per plan.
 */

import { evaluate, getEffort, computeSavings, type Tier, type Usage } from './heuristicCore.js';
import { getModelIdForTier, getModelIdForEffort, getLanguage, getInitialEffortMode, type MonisavePluginConfig, type EffortMode } from './config.js';
import { strings } from './strings.js';

/** In-memory session stats: saved tokens, saved USD, request count */
export interface SessionStats {
  saved_tokens: number;
  saved_usd: number;
  request_count: number;
}

let sessionStats: SessionStats = { saved_tokens: 0, saved_usd: 0, request_count: 0 };
let lastTier: Tier = 'medium';
let lastModelId: string = '';
let currentMode: EffortMode = 'auto';

/** Extract last user message text from hook context. Handles common OpenClaw shapes. */
function extractLastUserMessage(ctx: Record<string, unknown>): string {
  const messages = ctx.messages as Array<{ role?: string; content?: string; text?: string }> | undefined;
  if (Array.isArray(messages)) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      const role = (m?.role ?? '').toLowerCase();
      if (role === 'user' || role === 'human') {
        const content = typeof m?.content === 'string' ? m.content : m?.text ?? '';
        return content;
      }
    }
  }
  const prompt = ctx.prompt as string | undefined;
  if (typeof prompt === 'string') return prompt;
  return '';
}

/** Get plugin config from OpenClaw config. Assumes plugins.entries['monisave-thinking'].config */
function getPluginConfig(api: { config?: Record<string, unknown> }): MonisavePluginConfig | undefined {
  const entries = (api.config as Record<string, unknown>)?.plugins as Record<string, { config?: MonisavePluginConfig }> | undefined;
  const entry = entries?.['monisave-thinking'];
  return entry?.config;
}

/** Format savings for /savings command (with currency symbol) */
function formatSavings(stats: SessionStats, lang: 'zh' | 'en'): string {
  if (stats.request_count === 0) return lang === 'zh' ? strings.no_data.zh : strings.no_data.en;
  const money = lang === 'zh' ? `¥${stats.saved_usd.toFixed(2)}` : `$${stats.saved_usd.toFixed(2)}`;
  return lang === 'zh'
    ? strings.savings_message.zh(stats.saved_tokens, money)
    : strings.savings_message.en(stats.saved_tokens, money);
}


export default function register(api: {
  registerHook: (name: string, handler: (ctx: Record<string, unknown>) => Promise<{ modelOverride?: string }> | { modelOverride?: string }) => void;
  registerCommand: (cmd: { name: string; description: string; handler: (ctx: Record<string, unknown>) => { text: string } | Promise<{ text: string }> }) => void;
  registerGatewayMethod?: (name: string, handler: (arg: { respond: (ok: boolean, data: unknown) => void }) => void) => void;
  config?: Record<string, unknown>;
  logger?: { info: (msg: string) => void };
}) {
  const pluginConfig = getPluginConfig(api);
  const envLang = typeof process !== 'undefined' && process.env
    ? (process.env.LANG ?? process.env.OPENCLAW_LANG)
    : undefined;
  const lang = getLanguage(pluginConfig, envLang);
  currentMode = getInitialEffortMode(pluginConfig);

  api.registerHook('before_prompt_build', (ctx) => {
    try {
      let modelId: string;
      if (currentMode === 'auto') {
        const lastUserMsg = extractLastUserMessage(ctx);
        const messageCount = typeof (ctx as Record<string, unknown>).messageCount === 'number'
          ? (ctx as Record<string, unknown>).messageCount as number
          : undefined;
        const scene = (ctx as Record<string, unknown>).scene as string | undefined;
        const tier = evaluate(lastUserMsg, {
          scene: scene === 'agent' ? 'agent' : undefined,
          messageCount,
        }) as Tier;
        lastTier = tier;
        modelId = getModelIdForTier(tier, pluginConfig);
      } else {
        lastTier = currentMode === 'low' ? 'simple' : currentMode === 'medium' ? 'medium' : 'complex';
        modelId = getModelIdForEffort(currentMode, pluginConfig);
      }
      lastModelId = modelId;
      return { modelOverride: modelId };
    } catch {
      return {};
    }
  });

  api.registerCommand({
    name: 'savings',
    description: lang === 'zh' ? strings.command_description.zh : strings.command_description.en,
    handler: () => ({ text: formatSavings(sessionStats, lang) }),
  });

  api.registerCommand({
    name: 'monisave_mode',
    description: lang === 'zh' ? '查看当前 MoniSave 档位' : 'View current MoniSave mode',
    handler: () => ({ text: lang === 'zh' ? strings.mode_current.zh(currentMode) : strings.mode_current.en(currentMode) }),
  });

  const modes: Array<{ cmd: string; mode: EffortMode; desc: { zh: string; en: string } }> = [
    { cmd: 'monisave_auto', mode: 'auto', desc: { zh: '切换为自动档位', en: 'Switch to auto mode' } },
    { cmd: 'monisave_low', mode: 'low', desc: { zh: '切换为 low 档位', en: 'Switch to low mode' } },
    { cmd: 'monisave_medium', mode: 'medium', desc: { zh: '切换为 medium 档位', en: 'Switch to medium mode' } },
    { cmd: 'monisave_high', mode: 'high', desc: { zh: '切换为 high 档位', en: 'Switch to high mode' } },
    { cmd: 'monisave_max', mode: 'max', desc: { zh: '切换为 max 档位', en: 'Switch to max mode' } },
  ];

  for (const { cmd, mode, desc } of modes) {
    api.registerCommand({
      name: cmd,
      description: lang === 'zh' ? desc.zh : desc.en,
      handler: () => {
        currentMode = mode;
        const base = lang === 'zh' ? strings.mode_set.zh(currentMode) : strings.mode_set.en(currentMode);
        if (mode === 'max' && !pluginConfig?.effortToModelId?.max) {
          const hint = lang === 'zh' ? strings.mode_max_hint.zh : strings.mode_max_hint.en;
          return { text: `${base}\n${hint}` };
        }
        return { text: base };
      },
    });
  }

  if (api.registerGatewayMethod) {
    api.registerGatewayMethod('monisave.stats', ({ respond }) => {
      respond(true, { ...sessionStats });
    });
  }

  /** Call from llm_output or similar when OpenClaw provides usage. Uses last tier/model from before_prompt_build. */
  function recordUsage(usage: Usage): void {
    const effort = getEffort(lastTier);
    const result = computeSavings(usage, effort, lastModelId);
    if (!result.hasData) return;
    sessionStats.saved_tokens += result.saved_tokens;
    sessionStats.saved_usd += result.saved_usd_estimate;
    sessionStats.request_count += 1;
  }

  return { recordUsage, getSessionStats: () => sessionStats };
}
