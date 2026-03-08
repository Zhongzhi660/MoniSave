/**
 * Language Model Chat Provider: evaluate difficulty, inject effort, stream Anthropic response, update savings.
 */

import * as vscode from 'vscode';
import { computeSavings, getThinkingPricePerM, type Tier, type Effort, type Usage } from './heuristicCore.js';
import { getEffortForAuto } from './autoStrategy.js';
import { getConfig } from './config.js';
import { getAndClearFullEffortOnce } from './fullEffortOnce.js';
import { updateSessionSavings, setLastTier, setCalibrating } from './statusBar.js';
import { strings, getLang } from './strings.js';
import {
  incrementRequestCount,
  shouldShowSavings,
  recordHighEffortThinking,
  getBaselineForTier,
  CALIBRATION_WARMUP_REQUESTS,
} from './calibration.js';
import { retrieveKnowledgeContext, rememberLastTurn } from './knowledge/index.js';

/** Anthropic model ID used for all requests. Visible in Chat model picker. */
export const MODEL_ID = 'claude-sonnet-4-6';
const DEFAULT_EFFORT: Effort = 'high';

/** Map our Effort to Anthropic's output_config.effort for adaptive thinking */
const EFFORT_TO_API: Record<Effort, string> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
};

function modelSupportsMaxEffort(modelId: string): boolean {
  return modelId.startsWith('claude-opus-4-6');
}

function extractLastUserMessage(messages: readonly vscode.LanguageModelChatRequestMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === vscode.LanguageModelChatMessageRole.User) {
      const parts = m.content.filter((p): p is vscode.LanguageModelTextPart => p instanceof vscode.LanguageModelTextPart);
      if (parts.length === 0) return '';
      // Cursor injects context (file contents, paths) as earlier TextParts;
      // the user's actual query is typically the shortest or last part.
      const shortest = parts.reduce((a, b) => a.value.length <= b.value.length ? a : b);
      return shortest.value;
    }
  }
  return '';
}

function vscodeMessagesToAnthropic(messages: readonly vscode.LanguageModelChatRequestMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  const out: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const m of messages) {
    const parts = m.content.filter((p): p is vscode.LanguageModelTextPart => p instanceof vscode.LanguageModelTextPart);
    const text = parts.map((p) => p.value).join('');
    if (m.role === vscode.LanguageModelChatMessageRole.User) {
      out.push({ role: 'user', content: text });
    } else if (m.role === vscode.LanguageModelChatMessageRole.Assistant) {
      out.push({ role: 'assistant', content: text });
    }
  }
  return out;
}

export interface MonisaveChatProviderOptions {
  onFirstRequest?: () => void;
}

export class MonisaveChatProvider implements vscode.LanguageModelChatProvider {
  private onFirstRequest?: () => void;
  private shownMaxDowngradeWarning = false;

  constructor(options?: MonisaveChatProviderOptions) {
    this.onFirstRequest = options?.onFirstRequest;
  }

  async provideLanguageModelChatInformation(
    _options: { silent?: boolean },
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelChatInformation[]> {
    if (token.isCancellationRequested) return [];
    const cfg = getConfig();
    if (!cfg.apiKey && !process.env.ANTHROPIC_API_KEY) {
      if (!_options.silent) {
        await vscode.commands.executeCommand('monisave.manage');
      }
      return [];
    }
    return [
      {
        id: 'monisave-claude',
        name: `MoniSave (${MODEL_ID})`,
        family: 'claude-sonnet-4',
        version: '1',
        maxInputTokens: 200_000,
        maxOutputTokens: 8_192,
        capabilities: { toolCalling: true },
      },
    ];
  }

  async provideLanguageModelChatResponse(
    _model: vscode.LanguageModelChatInformation,
    messages: readonly vscode.LanguageModelChatRequestMessage[],
    _options: vscode.ProvideLanguageModelChatResponseOptions,
    progress: vscode.Progress<vscode.LanguageModelResponsePart>,
    token: vscode.CancellationToken
  ): Promise<void> {
    this.onFirstRequest?.();
    const cfg = getConfig();
    const lastUser = extractLastUserMessage(messages);
    let effort: Effort = DEFAULT_EFFORT;
    let tier: Tier = 'medium';
    const selectedMode = cfg.effortMode;

    const forceHighThisTurn = getAndClearFullEffortOnce();
    console.log('[MoniSave] cfg.enabled:', cfg.enabled, 'selectedMode:', selectedMode, 'forceHigh:', forceHighThisTurn, 'apiKey set:', !!cfg.apiKey);
    if (forceHighThisTurn || !cfg.enabled) {
      effort = 'high';
      tier = 'complex';
    } else if (selectedMode !== 'auto') {
      if (selectedMode === 'max') {
        effort = 'high';
        tier = 'complex';
        if (!modelSupportsMaxEffort(MODEL_ID) && !this.shownMaxDowngradeWarning) {
          this.shownMaxDowngradeWarning = true;
          const lang = getLang(cfg.language, undefined);
          const msg = lang === 'zh' ? strings.warning_maxDowngraded.zh : strings.warning_maxDowngraded.en;
          void vscode.window.showWarningMessage(msg);
        }
      } else {
        effort = selectedMode;
        tier = effort === 'low' ? 'simple' : effort === 'medium' ? 'medium' : 'complex';
      }
    } else {
      const autoResult = getEffortForAuto({
        lastUserMessage: lastUser,
        messageCount: messages.length,
        scene: 'chat',
      });
      effort = autoResult.effort;
      tier = autoResult.tier;
      console.log('[MoniSave] auto mode → tier:', tier, 'effort:', effort);
    }
    setLastTier(tier);

    if (cfg.showEffortOnSend) {
      const lang = getLang(cfg.language, undefined);
      const msg = lang === 'zh' ? `MoniSave: 本条使用 ${effort}` : `MoniSave: This message uses ${effort}`;
      void vscode.window.setStatusBarMessage(msg, 4000);
    }

    const anthropicMessages = vscodeMessagesToAnthropic(messages);
    let matchedCardIds: string[] = [];
    if (cfg.knowledgeEnabled && lastUser.trim().length > 0) {
      try {
        const knowledge = await retrieveKnowledgeContext(lastUser, 'chat', {
          enabled: cfg.knowledgeEnabled,
          topK: cfg.knowledgeTopK,
          minScore: cfg.knowledgeMinScore,
          repoPath: cfg.knowledgeRepoPath,
          feedbackWeight: cfg.knowledgeFeedbackWeight,
          feedbackMinSamples: cfg.knowledgeFeedbackMinSamples,
        });
        if (knowledge.contextText) {
          for (let i = anthropicMessages.length - 1; i >= 0; i--) {
            const m = anthropicMessages[i];
            if (m.role === 'user') {
              m.content = `${knowledge.contextText}\n\nCurrent question:\n${m.content}`;
              break;
            }
          }
          matchedCardIds = knowledge.matchedCardIds;
          console.log('[MoniSave][Knowledge] matched cards:', matchedCardIds.join(','));
        }
      } catch (err) {
        console.warn('[MoniSave][Knowledge] retrieval failed:', err);
      }
    }

    const runStream = async (params: { effort: Effort; tier: Tier }) => {
      const apiKey = getConfig().apiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('No API key');
      const maxTokens = 16000;
      const body = {
        model: MODEL_ID,
        max_tokens: maxTokens,
        messages: anthropicMessages,
        stream: true,
        thinking: { type: 'adaptive' },
        output_config: { effort: EFFORT_TO_API[params.effort] },
      };
      const controller = new AbortController();
      token.onCancellationRequested(() => controller.abort());
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Anthropic API ${res.status}: ${errText}`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');
      const dec = new TextDecoder();
      let buf = '';
      let usage: Usage = {};
      let thinkingText = '';
      let assistantText = '';
      let hasThinkingBlock = false;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;
          try {
            const event = JSON.parse(data) as {
              type: string;
              message?: { usage?: { input_tokens?: number; output_tokens?: number } };
              usage?: { input_tokens?: number; output_tokens?: number };
              content_block?: { type: string };
              delta?: { type: string; text?: string; thinking?: string };
            };
            if (event.type === 'message_start' && event.message?.usage) {
              usage = { ...usage, ...event.message.usage };
            }
            if (event.type === 'message_delta' && event.usage) {
              const u = event.usage as { input_tokens?: number; output_tokens?: number };
              if (u.input_tokens !== undefined) usage.input_tokens = u.input_tokens;
              if (u.output_tokens !== undefined) usage.output_tokens = u.output_tokens;
            }
            if (event.type === 'content_block_start' && event.content_block?.type === 'thinking') {
              hasThinkingBlock = true;
            }
            if (event.type === 'content_block_delta' && event.delta?.type === 'thinking_delta' && event.delta.thinking) {
              thinkingText += event.delta.thinking;
            }
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta' && event.delta.text) {
              assistantText += event.delta.text;
              progress.report(new vscode.LanguageModelTextPart(event.delta.text));
            }
          } catch {
            // skip malformed lines (ping, etc.)
          }
        }
      }
      // Estimate thinking tokens from the accumulated thinking text (~4 chars per token)
      const estimatedThinkingTokens = hasThinkingBlock ? Math.ceil(thinkingText.length / 4) : 0;
      if (estimatedThinkingTokens > 0) {
        usage.thinking_tokens = estimatedThinkingTokens;
      }

      const count = await incrementRequestCount();
      if (params.effort === 'high' && estimatedThinkingTokens > 0) {
        await recordHighEffortThinking(tier, estimatedThinkingTokens);
      }
      setCalibrating(count <= CALIBRATION_WARMUP_REQUESTS ? count : null);

      if (shouldShowSavings(count)) {
        const baseline = getBaselineForTier(tier);
        const actualThinking = usage.thinking_tokens ?? 0;
        let savedTokens: number;
        let savedUsd: number;
        if (baseline !== undefined && params.effort !== 'high') {
          savedTokens = Math.max(0, baseline - actualThinking);
          const pricePerM = getThinkingPricePerM(MODEL_ID);
          savedUsd = (savedTokens / 1_000_000) * pricePerM;
          savedUsd = Math.round(savedUsd * 1e6) / 1e6;
        } else {
          const result = computeSavings(usage, params.effort, MODEL_ID);
          savedTokens = result.saved_tokens;
          savedUsd = result.saved_usd_estimate;
        }
        updateSessionSavings(savedTokens, savedUsd, tier);
        console.log('[MoniSave] tier:', params.tier, 'effort:', params.effort, 'count:', count, 'input_tokens:', usage.input_tokens, 'output:', usage.output_tokens, 'thinking:', estimatedThinkingTokens, 'saved:', savedTokens);
      } else {
        updateSessionSavings(0, 0, tier);
        console.log('[MoniSave] tier:', params.tier, 'effort:', params.effort, 'count:', count, '(calibrating)', 'input_tokens:', usage.input_tokens, 'output:', usage.output_tokens, 'thinking:', estimatedThinkingTokens);
      }
      rememberLastTurn({
        question: lastUser,
        answer: assistantText,
        matchedCardIds,
      });
    };

    await runStream({ effort, tier });
  }

  async provideTokenCount(
    _model: vscode.LanguageModelChatInformation,
    text: string | vscode.LanguageModelChatRequestMessage,
    _token: vscode.CancellationToken
  ): Promise<number> {
    const str = typeof text === 'string' ? text : JSON.stringify(text);
    return Math.ceil(str.length / 4);
  }
}
