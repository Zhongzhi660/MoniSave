/**
 * Status bar item: session saved tokens/money; optional tier label. Updates on config change.
 */

import * as vscode from 'vscode';
import { strings, getLang } from './strings.js';
import { getConfig } from './config.js';

let statusBarItem: vscode.StatusBarItem | undefined;
let sessionSavedTokens = 0;
let sessionSavedUsd = 0;
let lastTier: string | null = null;
/** When set, we are in warmup: don't add to session and show "Calibrating (n/20)". */
let calibratingCount: number | null = null;

export function getSessionStats(): { saved_tokens: number; saved_usd: number } {
  return { saved_tokens: sessionSavedTokens, saved_usd: sessionSavedUsd };
}

/** Set calibrating state (n = current request count during warmup, or null when done). */
export function setCalibrating(n: number | null): void {
  calibratingCount = n;
}

export function updateSessionSavings(savedTokens: number, savedUsd: number, tier: string | null): void {
  if (calibratingCount === null) {
    sessionSavedTokens += savedTokens;
    sessionSavedUsd += savedUsd;
  }
  lastTier = tier;
  refreshStatusBar();
}

export function setLastTier(tier: string | null): void {
  lastTier = tier;
  refreshStatusBar();
}

function formatMoney(usd: number, currency: 'usd' | 'cny'): string {
  if (currency === 'cny') return `¥${(usd * 7.2).toFixed(2)}`;
  return `$${usd.toFixed(2)}`;
}

const CALIBRATION_WARMUP = 20;

export function refreshStatusBar(): void {
  if (!statusBarItem) return;
  const cfg = getConfig();
  const lang = getLang(cfg.language, process.env.VSCODE_NLS_CONFIG ? undefined : undefined);
  const money = formatMoney(sessionSavedUsd, cfg.currency);
  let text: string;
  const modeLabel = `(${cfg.effortMode})`;
  if (calibratingCount !== null) {
    text = lang === 'zh'
      ? strings.statusBar_calibrating.zh(calibratingCount, CALIBRATION_WARMUP)
      : strings.statusBar_calibrating.en(calibratingCount, CALIBRATION_WARMUP);
    text = `${text} ${modeLabel}`;
    statusBarItem.tooltip = lang === 'zh' ? '前 20 次请求用于校准，之后将显示节省' : 'First 20 requests calibrate; savings shown after';
  } else if (sessionSavedTokens > 0) {
    text = lang === 'zh' ? strings.statusBar_savings.zh(sessionSavedTokens, money) : strings.statusBar_savings.en(sessionSavedTokens, money);
    if (cfg.showDifficulty && lastTier) {
      const tierLabel = lang === 'zh' ? strings.statusBar_tier.zh(lastTier) : strings.statusBar_tier.en(lastTier);
      text = `${tierLabel} ${text}`;
    }
    text = `${text} ${modeLabel}`;
    statusBarItem.tooltip = lang === 'zh' ? '本会话节省的 thinking tokens 与预估金额' : 'Session saved thinking tokens and estimated cost';
  } else {
    text = (lang === 'zh' ? strings.statusBar_noData.zh : strings.statusBar_noData.en) + ` ${modeLabel}`;
    statusBarItem.tooltip = lang === 'zh' ? '本会话节省的 thinking tokens 与预估金额' : 'Session saved thinking tokens and estimated cost';
  }
  const clickHint = lang === 'zh' ? ' · 点击切换档位' : ' · Click to change effort';
  statusBarItem.tooltip = (statusBarItem.tooltip ?? '') + clickHint;
  statusBarItem.text = text;
  statusBarItem.show();
}

export function createStatusBar(): vscode.StatusBarItem {
  if (statusBarItem) return statusBarItem;
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'monisave.selectEffortMode';
  refreshStatusBar();
  return statusBarItem;
}

export function disposeStatusBar(): void {
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = undefined;
  }
}
