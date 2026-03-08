/**
 * Read MoniSave settings from VS Code configuration.
 */

import * as vscode from 'vscode';
import type { Lang } from './strings.js';

export type EffortMode = 'auto' | 'low' | 'medium' | 'high' | 'max';
export type KnowledgeSummaryMode = 'off' | 'cheap' | 'smart';

export interface MonisaveConfig {
  apiKey: string;
  enabled: boolean;
  effortMode: EffortMode;
  currency: 'usd' | 'cny';
  showDifficulty: boolean;
  showEffortOnSend: boolean;
  language: Lang;
  knowledgeEnabled: boolean;
  knowledgeTopK: number;
  knowledgeMinScore: number;
  knowledgeSummaryMode: KnowledgeSummaryMode;
  knowledgeRepoPath: string;
  knowledgeFeedbackWeight: number;
  knowledgeFeedbackMinSamples: number;
}

export function getConfig(): MonisaveConfig {
  const c = vscode.workspace.getConfiguration('monisave');
  return {
    apiKey: c.get<string>('apiKey', '') ?? '',
    enabled: c.get<boolean>('enabled', true) ?? true,
    effortMode: (c.get<string>('effortMode', 'auto') ?? 'auto') as EffortMode,
    currency: (c.get<string>('currency', 'usd') ?? 'usd') as 'usd' | 'cny',
    showDifficulty: c.get<boolean>('showDifficulty', false) ?? false,
    showEffortOnSend: c.get<boolean>('showEffortOnSend', true) ?? true,
    language: (c.get<string>('language', 'en') ?? 'en').startsWith('zh') ? 'zh' : 'en',
    knowledgeEnabled: c.get<boolean>('knowledge.enabled', true) ?? true,
    knowledgeTopK: c.get<number>('knowledge.topK', 3) ?? 3,
    knowledgeMinScore: c.get<number>('knowledge.minScore', 0.3) ?? 0.3,
    knowledgeSummaryMode: (c.get<string>('knowledge.summaryMode', 'off') ?? 'off') as KnowledgeSummaryMode,
    knowledgeRepoPath: c.get<string>('knowledge.repoPath', '') ?? '',
    knowledgeFeedbackWeight: c.get<number>('knowledge.feedbackWeight', 0.25) ?? 0.25,
    knowledgeFeedbackMinSamples: c.get<number>('knowledge.feedbackMinSamples', 3) ?? 3,
  };
}

export function onConfigChange(callback: () => void): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('monisave')) callback();
  });
}
