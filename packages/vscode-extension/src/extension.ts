/**
 * MoniSave VS Code extension: activate provider, status bar, commands, first-time toast.
 */

import * as vscode from 'vscode';
import { MonisaveChatProvider } from './provider.js';
import { createStatusBar, disposeStatusBar, refreshStatusBar, getSessionStats, setCalibrating } from './statusBar.js';
import { onConfigChange } from './config.js';
import { getConfig, type EffortMode } from './config.js';
import { setFullEffortOnce } from './fullEffortOnce.js';
import { strings, getLang } from './strings.js';
import { initCalibration, getRequestCount, CALIBRATION_WARMUP_REQUESTS } from './calibration.js';

const FIRST_TIME_KEY = 'monisave.firstTimeToastShown';

async function promptAndSetApiKey(): Promise<void> {
  const cfg = getConfig();
  const current = cfg.apiKey ?? '';
  const input = await vscode.window.showInputBox({
    prompt: 'Enter Anthropic API Key (will be saved to user settings)',
    placeHolder: 'sk-... or paste your key',
    value: current,
    ignoreFocusOut: true,
  });
  if (typeof input === 'string') {
    const c = vscode.workspace.getConfiguration('monisave');
    await c.update('apiKey', input, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage('MoniSave: API key saved to user settings');
  }
}

async function promptAndSetEffortMode(): Promise<void> {
  const cfg = getConfig();
  const lang = getLang(cfg.language, undefined);
  const picked = await vscode.window.showQuickPick(
    [
      { label: 'auto', description: lang === 'zh' ? '自动按复杂度判断' : 'Automatic by difficulty' },
      { label: 'low', description: lang === 'zh' ? '低开销，速度优先' : 'Lower cost, faster' },
      { label: 'medium', description: lang === 'zh' ? '平衡模式' : 'Balanced mode' },
      { label: 'high', description: lang === 'zh' ? '高能力（默认行为）' : 'High capability (default behavior)' },
      { label: 'max', description: lang === 'zh' ? '最高能力（当前 Sonnet 会降级到 high）' : 'Maximum capability (downgraded to high on Sonnet)' },
    ],
    {
      title: lang === 'zh' ? '选择 Effort 档位' : 'Select Effort mode',
      placeHolder: cfg.effortMode,
      ignoreFocusOut: true,
    }
  );
  if (!picked) return;
  const c = vscode.workspace.getConfiguration('monisave');
  await c.update('effortMode', picked.label as EffortMode, vscode.ConfigurationTarget.Global);
  const msg = lang === 'zh'
    ? `MoniSave: Effort 已设置为 ${picked.label}`
    : `MoniSave: effort mode set to ${picked.label}`;
  vscode.window.showInformationMessage(msg);
}

export function activate(context: vscode.ExtensionContext): void {
  initCalibration(context.globalState);
  createStatusBar();
  const n = getRequestCount();
  setCalibrating(n <= CALIBRATION_WARMUP_REQUESTS ? n : null);
  refreshStatusBar();
  context.subscriptions.push({ dispose: disposeStatusBar });

  context.subscriptions.push(onConfigChange(refreshStatusBar));

  const provider = new MonisaveChatProvider({
    onFirstRequest: () => {
      if (context.globalState.get<boolean>(FIRST_TIME_KEY)) return;
      context.globalState.update(FIRST_TIME_KEY, true);
      const cfg = getConfig();
      const lang = getLang(cfg.language, undefined);
      const msg = lang === 'zh' ? strings.toast_firstTime.zh : strings.toast_firstTime.en;
      vscode.window.showInformationMessage(msg);
    },
  });
  context.subscriptions.push(
    vscode.lm.registerLanguageModelChatProvider('monisave', provider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('monisave.manage', async () => {
      const cfg = getConfig();
      const lang = getLang(cfg.language, undefined);
      const action = await vscode.window.showQuickPick(
        [
          { label: lang === 'zh' ? '设置 API Key' : 'Set API Key', id: 'api' },
          { label: lang === 'zh' ? '设置 Effort 档位' : 'Set Effort mode', id: 'effort' },
        ],
        {
          title: 'MoniSave',
          ignoreFocusOut: true,
        }
      );
      if (!action) return;
      if (action.id === 'api') {
        await promptAndSetApiKey();
      } else {
        await promptAndSetEffortMode();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('monisave.selectEffortMode', async () => {
      await promptAndSetEffortMode();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('monisave.useFullEffortOnce', () => {
      setFullEffortOnce();
      const cfg = getConfig();
      const lang = getLang(cfg.language, undefined);
      const msg = lang === 'zh' ? strings.toast_fullEffortOnce.zh : strings.toast_fullEffortOnce.en;
      vscode.window.showInformationMessage(msg);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('monisave.showSavings', () => {
      const stats = getSessionStats();
      const cfg = getConfig();
      const lang = getLang(cfg.language, undefined);
      if (stats.saved_tokens <= 0) {
        const msg = lang === 'zh' ? strings.savings_unavailable.zh : strings.savings_unavailable.en;
        vscode.window.showInformationMessage(msg);
      } else {
        const money = cfg.currency === 'cny' ? `¥${(stats.saved_usd * 7.2).toFixed(2)}` : `$${stats.saved_usd.toFixed(2)}`;
        const msg = lang === 'zh'
          ? strings.statusBar_savings.zh(stats.saved_tokens, money)
          : strings.statusBar_savings.en(stats.saved_tokens, money);
        vscode.window.showInformationMessage(msg);
      }
    })
  );

}

export function deactivate(): void {}
