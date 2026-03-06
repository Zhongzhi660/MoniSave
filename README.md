# MoniSave

Thinking token optimization for **VS Code** and **OpenClaw**: choose effort (low/medium/high) by heuristic difficulty, and see session savings in the status bar or via commands.

- **Heuristic only** (no training): short/simple messages → low effort; long or complex → high.
- **Shared core** (`@monisave/heuristic-core`) used by both the VS Code extension and the OpenClaw plugin.
- **Real-time savings**: session saved tokens and estimated cost (USD/CNY).

---

## Prerequisites

- **VS Code**: VS Code 1.85+ (for Language Model Chat API).
- **OpenClaw**: OpenClaw with plugin support and `before_prompt_build` hook.
- **Anthropic API**: An API key for Claude (extended thinking–capable models, e.g. Claude Sonnet 4).

---

## Quick start

### VS Code (three steps)

1. **Install**  
   - Install the MoniSave extension (from the marketplace or load from `packages/vscode-extension` in Extension Development Host).

2. **Configure**  
   - Set your Anthropic API key: run **MoniSave: Manage API Key** or open Settings and set `monisave.apiKey`.  
   - Optionally: `monisave.enabled` (default on), `monisave.currency` (usd/cny), `monisave.language` (en/zh).

3. **Use**  
   - In Chat, select the model **MoniSave (Claude Sonnet + thinking)**.  
   - Send messages as usual; effort is chosen by difficulty.  
   - Check the status bar for session savings, or run **MoniSave: Show savings**.  
   - For one message at full effort, run **MoniSave: Use full effort for next message** before sending.

**Verify**: Send a short message (e.g. “fix typo”) and a long/complex one; status bar should show non-zero savings after the former. Turn off `monisave.enabled` to force high effort for all requests.

---

### OpenClaw (three steps)

1. **Install**  
   - Build the plugin: from repo root run `npm run build` (or build `packages/openclaw-plugin`).  
   - Install/load the OpenClaw plugin from `packages/openclaw-plugin` (see OpenClaw docs for plugin installation).

2. **Configure**  
   - Add the plugin config (see `packages/openclaw-plugin/CONFIG.example.md`): map tiers `simple` / `medium` / `complex` to your OpenClaw model IDs (e.g. low/medium/high effort models).  
   - Set `language` to `en` or `zh` if needed.

3. **Use**  
   - Chat as usual; the plugin returns `modelOverride` from `before_prompt_build`.  
   - Run `/savings` in the chat to see session saved tokens and cost.  
   - Use Gateway RPC `monisave.stats` for `saved_tokens`, `saved_usd`, `request_count`.

**Verify**: Send a simple and a complex message; `/savings` should reflect usage. For “full effort” once, see the note in `CONFIG.example.md` (e.g. OpenClaw’s `/think` or similar, if available).

---

## Repository layout

- `docs/PLAN.md` — Full implementation plan (M1–M4).
- `packages/heuristic-core` — Shared evaluation, mapping, savings, pricing (no runtime deps).
- `packages/vscode-extension` — VS Code Language Model Chat Provider, status bar, settings.
- `packages/openclaw-plugin` — OpenClaw hook, `/savings`, `monisave.stats` RPC.

---

## License

MIT.
