# MoniSave

> Thinking token optimization for **VS Code** and **OpenClaw** — automatically selects the right effort level (low / medium / high) by heuristic difficulty, and shows real-time token savings in the status bar.

- **Heuristic-only** (no training required): short/simple prompts → low effort; long/complex prompts → high effort.
- **Shared core logic** used by both the VS Code extension and the OpenClaw plugin.
- **Real-time savings**: session saved tokens + estimated cost (USD / CNY).

---

## Table of Contents

- [VS Code Extension](#vs-code-extension)
- [OpenClaw Plugin](#openclaw-plugin)
- [Repository Layout](#repository-layout)
- [License](#license)

---

## VS Code Extension

### Features

| Feature | Description |
|---------|-------------|
| **Auto effort selection** | Heuristic classifies each prompt as simple / medium / complex and picks low / medium / high effort automatically |
| **Manual effort modes** | Switch between `auto` / `low` / `medium` / `high` / `max` via status bar click or `Ctrl+Shift+E` |
| **Status bar savings** | Shows session saved tokens and estimated cost (USD or CNY) in real time |
| **Effort-on-send hint** | Briefly shows which effort level was used for each request (e.g. `MoniSave: This message uses low`) |
| **Full-effort once** | One-shot command to force high effort for the next message only |
| **Team knowledge cards** | Save Q&A pairs as searchable knowledge cards; auto-inject relevant context into future prompts |
| **@monisave chat participant** | Use `/save`, `/useful`, `/notuseful`, `/search`, `/list` directly in VS Code Chat |
| **Chinese / English UI** | Switch language via command or settings (`monisave.language`) |

<!-- Screenshot: status bar showing savings and current effort mode -->
<!-- ![Status bar](docs/images/statusbar.png) -->

<!-- GIF: clicking status bar to switch effort mode -->
<!-- ![Effort switch](docs/images/effort-switch.gif) -->

### Quick Start

**1. Install**

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MoniSave.monisave), or load from `packages/vscode-extension` in Extension Development Host.

**2. Configure**

- Set your Anthropic API key: run **`MoniSave: Manage API Key`** or open Settings → `monisave.apiKey`.
- Optional settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `monisave.effortMode` | `auto` | `auto` / `low` / `medium` / `high` / `max` |
| `monisave.currency` | `usd` | `usd` or `cny` |
| `monisave.language` | `en` | `en` or `zh` |
| `monisave.showDifficulty` | `false` | Show tier label in status bar |
| `monisave.showEffortOnSend` | `true` | Show effort used per request |

**3. Use**

1. Open VS Code Chat and select the model **`MoniSave (Claude Sonnet + thinking)`**.
2. Send messages as usual — effort is chosen automatically.
3. Check the **status bar** (bottom-right) for live savings.
4. **Click the status bar** (or press `Ctrl+Shift+E`) to switch effort mode instantly.

<!-- Screenshot: model picker showing MoniSave -->
<!-- ![Model picker](docs/images/model-picker.png) -->

### Effort Mode Switching

Three ways to switch:

1. **Click the status bar** — shows current mode e.g. `MoniSave (high)`, click to open picker.
2. **Keyboard shortcut** — `Ctrl+Shift+E` (Mac: `Cmd+Shift+E`).
3. **Command palette** — `Ctrl+Shift+P` → `MoniSave: Select effort mode`.

<!-- GIF: switching effort mode from status bar -->
<!-- ![Switch effort](docs/images/switch-effort.gif) -->

### Team Knowledge Cards (`@monisave`)

In VS Code Chat, mention **`@monisave`** and use slash sub-commands:

| Command | Action |
|---------|--------|
| `@monisave /save` | Save the last Q&A as a knowledge card |
| `@monisave /useful` | Mark last answer as useful (boosts card ranking) |
| `@monisave /notuseful` | Mark last answer as not useful |
| `@monisave /search <keywords>` | Search knowledge cards by keywords |
| `@monisave /list` | List all knowledge cards with full content |

<!-- Screenshot: @monisave /list output in Chat -->
<!-- ![Knowledge cards](docs/images/knowledge-list.png) -->

### Verifying Effort Switching Works

1. **Status bar label** — shows current configured mode e.g. `(low)`. Updates immediately on switch.
2. **Per-request hint** — status bar briefly shows `MoniSave: This message uses low` after each send.
3. **Developer console** — Help → Toggle Developer Tools → Console, filter `MoniSave`:
   ```
   [MoniSave] tier: simple effort: low count: ...
   ```

---

## OpenClaw Plugin

### Features

| Feature | Description |
|---------|-------------|
| **Auto model routing** | Returns `modelOverride` from `before_prompt_build` based on heuristic difficulty |
| **Tier mapping** | Maps `simple` / `medium` / `complex` tiers to your OpenClaw model IDs |
| **Session savings** | `/savings` command shows saved tokens and estimated cost for the session |
| **Gateway RPC** | `monisave.stats` RPC returns `saved_tokens`, `saved_usd`, `request_count` |
| **Manual mode commands** | `monisave_mode`, `monisave_auto`, `monisave_low`, `monisave_medium`, `monisave_high`, `monisave_max` |

<!-- Screenshot: /savings output in OpenClaw chat -->
<!-- ![OpenClaw savings](docs/images/openclaw-savings.png) -->

### Quick Start

**1. Build & Install**

```bash
# From repo root
npm run build

# Or build plugin only
cd packages/openclaw-plugin && npm run build
```

Then install/load the plugin from `packages/openclaw-plugin` per your OpenClaw documentation.

**2. Configure**

See `packages/openclaw-plugin/CONFIG.example.md`. Map tiers to your model IDs:

```json
{
  "plugin": "monisave",
  "models": {
    "simple":  "your-low-effort-model-id",
    "medium":  "your-mid-effort-model-id",
    "complex": "your-high-effort-model-id"
  },
  "language": "en"
}
```

**3. Use**

- Chat as usual — the plugin auto-selects model via `before_prompt_build`.
- Run `/savings` to see session token savings.
- Use Gateway RPC `monisave.stats` for programmatic access.

<!-- GIF: /savings command output in OpenClaw -->
<!-- ![OpenClaw savings GIF](docs/images/openclaw-savings.gif) -->

### Manual Mode Commands

| Command | Effect |
|---------|--------|
| `monisave_auto` | Switch to auto (heuristic) mode |
| `monisave_low` | Force low effort |
| `monisave_medium` | Force medium effort |
| `monisave_high` | Force high effort |
| `monisave_max` | Force max effort (falls back to high if unsupported) |

---

## Repository Layout

```
MoniSave/
├── packages/
│   ├── heuristic-core/       # Shared evaluation, savings, pricing (no runtime deps)
│   ├── vscode-extension/     # VS Code Chat Provider, status bar, commands, knowledge
│   └── openclaw-plugin/      # OpenClaw hook, /savings, monisave.stats RPC
├── README.md                 # This file (English)
└── README.zh-CN.md           # Chinese version
```

---

## License

Apache-2.0
