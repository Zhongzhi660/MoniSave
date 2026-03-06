/**
 * i18n strings for /savings and command description. Key-based; value by language.
 */

export type Lang = 'zh' | 'en';

export const strings = {
  command_description: {
    zh: '查看本会话省 token 统计',
    en: 'View this session\'s token savings',
  },
  mode_command_description: {
    zh: '查看或设置 MoniSave 档位（auto/low/medium/high/max）',
    en: 'Get or set MoniSave mode (auto/low/medium/high/max)',
  },
  savings_message: {
    zh: (tokens: number, money: string) => `本会话已节省约 ${tokens.toLocaleString()} tokens，约 ${money}`,
    en: (tokens: number, money: string) => `This session saved ~${tokens.toLocaleString()} tokens, ~${money}`,
  },
  mode_current: {
    zh: (mode: string) => `当前 MoniSave mode：${mode}`,
    en: (mode: string) => `Current MoniSave mode: ${mode}`,
  },
  mode_set: {
    zh: (mode: string) => `MoniSave mode 已切换为：${mode}`,
    en: (mode: string) => `MoniSave mode set to: ${mode}`,
  },
  mode_usage: {
    zh: '用法：/monisave-mode [auto|low|medium|high|max]',
    en: 'Usage: /monisave-mode [auto|low|medium|high|max]',
  },
  mode_max_hint: {
    zh: '提示：max 需要你在 effortToModelId.max 中配置可用模型；否则会回退到 complex 模型。',
    en: 'Hint: max requires effortToModelId.max; otherwise it falls back to complex-tier model.',
  },
  no_data: {
    zh: '暂无数据（本会话尚未产生 thinking 用量）',
    en: 'No data yet (no thinking usage this session)',
  },
} as const;

export function getLang(envLang?: string): Lang {
  if (!envLang) return 'en';
  const lower = envLang.toLowerCase();
  if (lower.startsWith('zh')) return 'zh';
  return 'en';
}
