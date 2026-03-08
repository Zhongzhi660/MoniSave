# MoniSave

> 面向 **VS Code** 与 **OpenClaw** 的 thinking token 优化 — 根据问题难度自动选择合适的 effort 档位（low / medium / high），并在状态栏实时显示本会话节省的 token 与费用。

- **纯启发式**（无需训练）：短句/简单问题 → low；长文/复杂问题 → high。
- **两端共用同一套核心逻辑**，VS Code 扩展与 OpenClaw 插件均使用。
- **实时节省**：显示本会话节省的 token 数量与预估金额（美元 / 人民币）。

---

## 目录

- [VS Code 扩展](#vs-code-扩展)
- [OpenClaw 插件](#openclaw-插件)
- [仓库结构](#仓库结构)
- [许可证](#许可证)

---

## VS Code 扩展

### 功能一览

| 功能 | 说明 |
|------|------|
| **自动档位选择** | 启发式算法将每条问题分类为 simple / medium / complex，自动对应 low / medium / high effort |
| **手动档位切换** | 支持 `auto` / `low` / `medium` / `high` / `max`，点击状态栏或按 `Ctrl+Shift+E` 即可切换 |
| **状态栏实时节省** | 右下角实时显示本会话节省的 token 数与预估金额（美元或人民币） |
| **发送时提示档位** | 每次发送后状态栏短暂显示本条实际使用的档位，例如「MoniSave: 本条使用 low」 |
| **一次性全力模式** | 一键让下一条消息使用 high effort，之后自动恢复 |
| **团队知识卡片** | 将问答保存为可搜索的知识卡片，后续问题自动注入相关上下文 |
| **@monisave 聊天参与者** | 在 VS Code Chat 中直接用 `/save`、`/useful`、`/notuseful`、`/search`、`/list` |
| **中英文界面** | 通过命令或设置（`monisave.language`）一键切换语言 |

<!-- 截图：状态栏显示节省金额与当前档位 -->
<!-- ![状态栏](docs/images/statusbar.png) -->

<!-- GIF：点击状态栏切换档位 -->
<!-- ![档位切换](docs/images/effort-switch.gif) -->

### 快速上手

**1. 安装**

从 [VS Code 扩展市场](https://marketplace.visualstudio.com/items?itemName=MoniSave.monisave) 安装，或在「扩展开发主机」中从 `packages/vscode-extension` 加载。

**2. 配置**

- 设置 Anthropic API Key：执行 **`MoniSave: Manage API Key`** 或在设置里填写 `monisave.apiKey`。
- 可选配置项：

| 设置项 | 默认值 | 说明 |
|--------|--------|------|
| `monisave.effortMode` | `auto` | `auto` / `low` / `medium` / `high` / `max` |
| `monisave.currency` | `usd` | `usd` 或 `cny` |
| `monisave.language` | `en` | `en` 或 `zh` |
| `monisave.showDifficulty` | `false` | 在状态栏显示难度档位标签 |
| `monisave.showEffortOnSend` | `true` | 每次发送后显示本条使用的档位 |

**3. 使用**

1. 打开 VS Code Chat，选择模型 **`MoniSave (Claude Sonnet + thinking)`**。
2. 正常发消息 — 档位按难度自动选择。
3. 查看右下角**状态栏**，实时看到节省数据。
4. **点击状态栏**（或按 `Ctrl+Shift+E`）可随时切换档位。

<!-- 截图：模型选择器中的 MoniSave -->
<!-- ![模型选择器](docs/images/model-picker.png) -->

### 档位切换方式

三种方式均可：

1. **点击状态栏** — 当前档位显示在括号里，如 `MoniSave (high)`，点击即打开选择器。
2. **键盘快捷键** — `Ctrl+Shift+E`（Mac：`Cmd+Shift+E`）。
3. **命令面板** — `Ctrl+Shift+P` → `MoniSave: Select effort mode`。

<!-- GIF：通过状态栏切换档位 -->
<!-- ![切换档位](docs/images/switch-effort.gif) -->

### 团队知识卡片（`@monisave`）

在 VS Code Chat 里输入 **`@monisave`** 并使用斜杠子命令：

| 命令 | 效果 |
|------|------|
| `@monisave /save` | 将上一轮问答保存为知识卡片 |
| `@monisave /useful` | 标记上一条回答为「有用」（提升该卡片排名） |
| `@monisave /notuseful` | 标记上一条回答为「无用」 |
| `@monisave /search <关键词>` | 按关键词搜索知识卡片 |
| `@monisave /list` | 列出所有知识卡片及完整内容 |

<!-- 截图：@monisave /list 在 Chat 中的输出 -->
<!-- ![知识卡片](docs/images/knowledge-list.png) -->

### 如何验证档位切换是否生效

1. **状态栏标签** — 显示当前配置的档位，如 `(low)`，切换后立即更新。
2. **发送时提示** — 每次发送后状态栏短暂显示「MoniSave: 本条使用 low」。
3. **开发者控制台** — 帮助 → 切换开发人员工具 → Console，筛选 `MoniSave`：
   ```
   [MoniSave] tier: simple effort: low count: ...
   ```

---

## OpenClaw 插件

### 功能一览

| 功能 | 说明 |
|------|------|
| **自动模型路由** | 通过 `before_prompt_build` 钩子根据难度返回 `modelOverride` |
| **档位映射** | 将 `simple` / `medium` / `complex` 映射到你的 OpenClaw 模型 ID |
| **会话节省统计** | `/savings` 命令显示本会话节省的 token 与预估金额 |
| **Gateway RPC** | `monisave.stats` 返回 `saved_tokens`、`saved_usd`、`request_count` |
| **手动模式命令** | `monisave_auto`、`monisave_low`、`monisave_medium`、`monisave_high`、`monisave_max` |

<!-- 截图：/savings 在 OpenClaw 对话中的输出 -->
<!-- ![OpenClaw 节省](docs/images/openclaw-savings.png) -->

### 快速上手

**1. 构建与安装**

```bash
# 从仓库根目录构建所有包
npm run build

# 或仅构建插件
cd packages/openclaw-plugin && npm run build
```

按 OpenClaw 文档将插件从 `packages/openclaw-plugin` 安装/加载。

**2. 配置**

参考 `packages/openclaw-plugin/CONFIG.example.md`，将档位映射到你的模型 ID：

```json
{
  "plugin": "monisave",
  "models": {
    "simple":  "你的低档位模型ID",
    "medium":  "你的中档位模型ID",
    "complex": "你的高档位模型ID"
  },
  "language": "zh"
}
```

**3. 使用**

- 正常对话 — 插件通过 `before_prompt_build` 自动选择模型。
- 执行 `/savings` 查看本会话节省数据。
- 通过 Gateway RPC `monisave.stats` 以编程方式获取统计。

<!-- GIF：OpenClaw 中 /savings 命令输出 -->
<!-- ![OpenClaw 节省 GIF](docs/images/openclaw-savings.gif) -->

### 手动模式命令

| 命令 | 效果 |
|------|------|
| `monisave_auto` | 切换为自动（启发式）模式 |
| `monisave_low` | 强制使用 low effort |
| `monisave_medium` | 强制使用 medium effort |
| `monisave_high` | 强制使用 high effort |
| `monisave_max` | 强制使用 max effort（不支持时自动降级为 high） |

---

## 仓库结构

```
MoniSave/
├── packages/
│   ├── heuristic-core/       # 共用评估、节省与定价逻辑（零运行时依赖）
│   ├── vscode-extension/     # VS Code Chat Provider、状态栏、命令、知识卡片
│   └── openclaw-plugin/      # OpenClaw 钩子、/savings、monisave.stats RPC
├── README.md                 # 英文版说明
└── README.zh-CN.md           # 本文件（中文版）
```

---

## 许可证

Apache-2.0
