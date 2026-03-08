/**
 * Chat participant @monisave: slash commands save, useful, notuseful, search.
 * Uses optional vscode.chat API so extension still works when API is unavailable.
 */

import * as vscode from 'vscode';
import { getConfig } from './config.js';
import { getLang } from './strings.js';
import {
  listAllCardsFull,
  saveCurrentTurnAsKnowledge,
  markLastTurnFeedback,
  searchKnowledge,
} from './knowledge/index.js';

const PARTICIPANT_ID = 'monisave.participant';

function getKnowledgeConfig() {
  const cfg = getConfig();
  return {
    enabled: cfg.knowledgeEnabled,
    topK: cfg.knowledgeTopK,
    minScore: cfg.knowledgeMinScore,
    repoPath: cfg.knowledgeRepoPath,
    feedbackWeight: cfg.knowledgeFeedbackWeight,
    feedbackMinSamples: cfg.knowledgeFeedbackMinSamples,
  };
}

type ChatRequest = { command?: string; prompt: string };
type ChatResponseStream = { markdown(s: string): void; progress(s: string): void };

async function handleMonisaveRequest(
  request: ChatRequest,
  stream: ChatResponseStream,
  _token: vscode.CancellationToken
): Promise<void> {
  const cfg = getConfig();
  const lang = getLang(cfg.language, undefined);
  const cmd = (request.command ?? '').toLowerCase();
  const prompt = (request.prompt ?? '').trim();
  const kcfg = getKnowledgeConfig();

  if (cmd === 'save') {
    const result = await saveCurrentTurnAsKnowledge(kcfg);
    if (result.ok) {
      stream.markdown(lang === 'zh' ? `已保存为知识卡片：${result.message}` : result.message);
    } else {
      stream.markdown(lang === 'zh' ? `无法保存：${result.message}` : result.message);
    }
    return;
  }

  if (cmd === 'useful') {
    const result = await markLastTurnFeedback('useful', kcfg);
    if (result.ok) {
      stream.markdown(lang === 'zh' ? `已记录为有用。${result.message}` : result.message);
    } else {
      stream.markdown(lang === 'zh' ? result.message : result.message);
    }
    return;
  }

  if (cmd === 'notuseful') {
    const result = await markLastTurnFeedback('not_useful', kcfg);
    if (result.ok) {
      stream.markdown(lang === 'zh' ? `已记录为无用。${result.message}` : result.message);
    } else {
      stream.markdown(lang === 'zh' ? result.message : result.message);
    }
    return;
  }

  if (cmd === 'search') {
    const query = prompt || (lang === 'zh' ? '全部' : 'all');
    stream.progress(lang === 'zh' ? '搜索中…' : 'Searching…');
    const items = await searchKnowledge(query, kcfg);
    if (items.length === 0) {
      stream.markdown(lang === 'zh' ? '未找到匹配的知识卡片。' : 'No matching knowledge cards.');
      return;
    }
    const lines = items.map((it) => `- **${it.title}** (score: ${it.score.toFixed(2)})`);
    stream.markdown((lang === 'zh' ? '知识库匹配结果：\n\n' : 'Knowledge matches:\n\n') + lines.join('\n'));
    return;
  }

  if (cmd === 'list') {
    stream.progress(lang === 'zh' ? '加载中…' : 'Loading…');
    const cards = await listAllCardsFull(kcfg);
    if (cards.length === 0) {
      stream.markdown(lang === 'zh' ? '当前没有知识卡片。' : 'No knowledge cards yet.');
      return;
    }
    const blocks: string[] = [];
    const titleLabel = lang === 'zh' ? '知识卡片' : 'Knowledge cards';
    blocks.push(`## ${titleLabel}\n`);
    for (const c of cards) {
      blocks.push(`### ${c.title}`);
      blocks.push(`*${c.id}* · ${lang === 'zh' ? '质量' : 'quality'}=${c.qualityScore.toFixed(2)}\n`);
      if (c.rootCause?.trim()) {
        blocks.push(`**${lang === 'zh' ? '根因' : 'Root cause'}:** ${c.rootCause}\n`);
      }
      if (c.solutionSteps?.length) {
        blocks.push(`**${lang === 'zh' ? '步骤' : 'Steps'}:**`);
        c.solutionSteps.forEach((s, i) => blocks.push(`${i + 1}. ${s}`));
        blocks.push('');
      }
      if (c.commands?.length) {
        blocks.push(`**${lang === 'zh' ? '命令' : 'Commands'}:**`);
        blocks.push('```');
        c.commands.forEach((cmd) => blocks.push(cmd));
        blocks.push('```\n');
      }
      if (c.pitfalls?.length) {
        blocks.push(`**${lang === 'zh' ? '注意' : 'Pitfalls'}:** ${c.pitfalls.join('; ')}\n`);
      }
      blocks.push('---');
    }
    stream.markdown(blocks.join('\n'));
    return;
  }

  stream.markdown(
    lang === 'zh'
      ? '请使用子命令：`/save` 保存当前问答，`/useful` 标记有用，`/notuseful` 标记无用，`/search 关键词` 搜索，`/list` 查看全部卡片。'
      : 'Use subcommands: `/save`, `/useful`, `/notuseful`, `/search keywords`, `/list`.'
  );
}

export function registerChatParticipant(context: vscode.ExtensionContext): void {
  const chat = (vscode as unknown as { chat?: { createChatParticipant: (id: string, handler: (req: ChatRequest, ctx: unknown, stream: ChatResponseStream, token: vscode.CancellationToken) => Promise<void>) => unknown } }).chat;
  if (!chat?.createChatParticipant) {
    return;
  }
  const participant = chat.createChatParticipant(PARTICIPANT_ID, async (request, _context, stream, token) => {
    await handleMonisaveRequest(request as ChatRequest, stream as ChatResponseStream, token);
  });
  context.subscriptions.push(participant as vscode.Disposable);
}
