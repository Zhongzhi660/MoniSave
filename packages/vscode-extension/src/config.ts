/**
 * Read MoniSave settings from VS Code configuration.
 */

import * as vscode from 'vscode';
import type { Lang } from './strings.js';

export type EffortMode = 'auto' | 'low' | 'medium' | 'high' | 'max';

export interface MonisaveConfig {
  apiKey: string;
  enabled: boolean;
  effortMode: EffortMode;
  currency: 'usd' | 'cny';
  showDifficulty: boolean;
  language: Lang;
}

export function getConfig(): MonisaveConfig {
  const c = vscode.workspace.getConfiguration('monisave');
  return {
    apiKey: c.get<string>('apiKey', '') ?? '',
    enabled: c.get<boolean>('enabled', true) ?? true,
    effortMode: (c.get<string>('effortMode', 'auto') ?? 'auto') as EffortMode,
    currency: (c.get<string>('currency', 'usd') ?? 'usd') as 'usd' | 'cny',
    showDifficulty: c.get<boolean>('showDifficulty', false) ?? false,
    language: (c.get<string>('language', 'en') ?? 'en').startsWith('zh') ? 'zh' : 'en',
  };
}

export function onConfigChange(callback: () => void): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('monisave')) callback();
  });
}
