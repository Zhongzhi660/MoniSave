/**
 * i18n strings for /savings and command description. Key-based; value by language.
 */

export type Lang = 'zh' | 'en';

export const strings = {
  command_description: {
    zh: '查看本会话省 token 统计',
    en: 'View this session\'s token savings',
  },
  savings_message: {
    zh: (tokens: number, money: string) => `本会话已节省约 ${tokens.toLocaleString()} tokens，约 ${money}`,
    en: (tokens: number, money: string) => `This session saved ~${tokens.toLocaleString()} tokens, ~${money}`,
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
