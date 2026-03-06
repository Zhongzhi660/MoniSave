# MoniSave

面向 **VS Code** 与 **OpenClaw** 的 thinking token 优化：根据问题难度自动选择 effort（low/medium/high），并在状态栏或通过命令查看本会话节省量。

- **纯启发式**（无训练）：短句、简单意图 → low；长文或复杂 → high。  
- **两端共用**同一套核心逻辑（`@monisave/heuristic-core`）。  
- **实时节省**：本会话节省的 token 与预估金额（美元/人民币）。

---

## 前置条件

- **VS Code**：1.85 及以上（需支持 Language Model Chat API）。  
- **OpenClaw**：支持插件及 `before_prompt_build` 钩子的版本。  
- **Anthropic API**：具备扩展思考能力的 Claude 模型（如 Claude Sonnet 4）的 API Key。

---

## 三步上手

### VS Code

1. **安装**  
   - 从市场安装 MoniSave 扩展，或在「扩展开发主机」中从 `packages/vscode-extension` 加载。

2. **配置**  
   - 设置 Anthropic API Key：执行 **MoniSave: Manage API Key** 或在设置中填写 `monisave.apiKey`。  
   - 可选：`monisave.enabled`（默认开）、`monisave.currency`（usd/cny）、`monisave.language`（en/zh）。

3. **使用**  
   - 在 Chat 中选择模型 **MoniSave (Claude Sonnet + thinking)**。  
   - 正常发消息，档位按难度自动选择。  
   - 在状态栏查看本会话节省，或执行 **MoniSave: Show savings**。  
   - 若希望**本次用全力**：先执行 **MoniSave: Use full effort for next message**，再发下一条消息。

**验证**：发一条短句（如「改个 typo」）和一条长/复杂消息，状态栏应显示节省；关闭 `monisave.enabled` 后，所有请求均为 high effort。

---

### OpenClaw

1. **安装**  
   - 在仓库根目录执行 `npm run build`（或单独构建 `packages/openclaw-plugin`）。  
   - 按 OpenClaw 文档将插件从 `packages/openclaw-plugin` 安装/加载。

2. **配置**  
   - 参考 `packages/openclaw-plugin/CONFIG.example.md`：在配置中加入插件项，将 simple/medium/complex 映射到你的 OpenClaw 模型 ID（如低/中/高 effort 模型）。  
   - 按需设置 `language` 为 `en` 或 `zh`。

3. **使用**  
   - 正常对话；插件通过 `before_prompt_build` 返回 `modelOverride`。  
   - 在对话中执行 `/savings` 查看本会话节省的 token 与金额。  
   - 通过 Gateway RPC `monisave.stats` 获取 `saved_tokens`、`saved_usd`、`request_count`。

**验证**：分别发简单与复杂消息，`/savings` 应有相应统计。临时使用 high 档的说明见 `CONFIG.example.md`（如 OpenClaw 的 `/think` 等，以官方文档为准）。

---

## 仓库结构

- `docs/PLAN.md` — 完整实施方案（M1–M4）。  
- `packages/heuristic-core` — 共用评估、映射、节省与定价（零运行时依赖）。  
- `packages/vscode-extension` — VS Code Chat Provider、状态栏与设置。  
- `packages/openclaw-plugin` — OpenClaw 钩子、`/savings`、`monisave.stats` RPC。

---

## 许可证

MIT。
