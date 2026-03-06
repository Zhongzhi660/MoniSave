/**
 * i18n strings for status bar, settings, toast. Key-based; value by language.
 */

export type Lang = 'zh' | 'en';

export const strings = {
  statusBar_savings: {
    zh: (tokens: number, money: string) => `省 ~${tokens.toLocaleString()} tokens · ${money}`,
    en: (tokens: number, money: string) => `Saved ~${tokens.toLocaleString()} tokens · ${money}`,
  },
  statusBar_noData: {
    zh: 'MoniSave',
    en: 'MoniSave',
  },
  statusBar_calibrating: {
    zh: (n: number, total: number) => `MoniSave 校准中 (${n}/${total})`,
    en: (n: number, total: number) => `MoniSave calibrating (${n}/${total})`,
  },
  statusBar_tier: {
    zh: (tier: string) => `[${tier}]`,
    en: (tier: string) => `[${tier}]`,
  },
  config_title: {
    zh: 'MoniSave',
    en: 'MoniSave',
  },
  config_apiKeyDescription: {
    zh: 'Anthropic API Key（用于 Claude 扩展思考）',
    en: 'Anthropic API key for Claude (with extended thinking)',
  },
  config_enabledDescription: {
    zh: '启用启发式档位；关闭时始终使用 high',
    en: 'Enable heuristic effort; when off, always use high effort',
  },
  config_currencyDescription: {
    zh: '节省金额显示货币',
    en: 'Currency for savings display',
  },
  config_showDifficultyDescription: {
    zh: '在状态栏显示当前难度档位',
    en: 'Show current difficulty tier in status bar',
  },
  config_languageDescription: {
    zh: '界面语言',
    en: 'UI language',
  },
  toast_firstTime: {
    zh: 'MoniSave 已启用：将根据问题难度自动选择 thinking 档位，节省 token。',
    en: 'MoniSave is on: thinking effort is chosen by difficulty to save tokens.',
  },
  error_noApiKey: {
    zh: '请先设置 Anthropic API Key（命令：MoniSave: Manage API Key）',
    en: 'Set Anthropic API key first (command: MoniSave: Manage API Key)',
  },
  error_apiFailed: {
    zh: '请求失败，已用默认档位重试',
    en: 'Request failed, retried with default effort',
  },
  savings_unavailable: {
    zh: '数据不可用（无 thinking 用量）',
    en: 'Data unavailable (no thinking usage)',
  },
  command_useFullEffortOnce: {
    zh: '本次用全力（下一条消息使用 high effort）',
    en: 'Use full effort for next message',
  },
  toast_fullEffortOnce: {
    zh: '下一条消息将使用 high effort。',
    en: 'Next message will use high effort.',
  },
  warning_maxDowngraded: {
    zh: '当前模型不支持 max effort，已自动降级为 high。',
    en: 'Current model does not support max effort. Downgraded to high.',
  },
} as const;

export function getLang(langSetting: string | undefined, envLanguage: string | undefined): Lang {
  const v = (langSetting ?? envLanguage ?? '').toLowerCase();
  if (v.startsWith('zh')) return 'zh';
  return 'en';
}
