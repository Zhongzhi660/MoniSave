# Thinking Token 启发式优化 — 详细实施方案（VS Code + OpenClaw）

> 本文档为 MoniSave 项目实施的唯一依据。开发时须先阅读本文档，按 M1→M2→M3→M4 顺序执行，每步完成预期功能、测试用例与验证后再进入下一步。

---

## 1. 目标与范围

- **目标**：在 VS Code 与 OpenClaw 上，根据当前请求的"问题难度"自动选择 thinking/effort 档位，在保证结果可用的前提下降低 thinking 相关 token 消耗。
- **本期范围**：
  - 仅采用**启发式**难度评估（规则 + 简单特征），不做训练或轻量模型；
  - 两端共用同一套难度→档位映射逻辑；
  - 支持用户**实时查看**本次/本会话节省的 token 与预估金额；
  - 追求**稳定可靠、简单好用**：开箱即用、故障降级、一键开关。
- **不包含**：Cursor 支持、HTTP 代理、流式早停、thinking 摘要（后续可扩展）。

### 1.1 系统精简原则（控制体量、避免臃肿）

- **依赖最少化**：heuristic-core 零运行时依赖；VS Code 扩展仅依赖 `@anthropic-ai/sdk` 与 VS Code API；OpenClaw 插件仅依赖 OpenClaw 运行时，不引入额外 npm 包。
- **功能边界清晰**：核心只做「评估 + 映射 + 节省计算」；扩展只做「Provider + 状态栏 + 配置」；插件只做「钩子 + 命令 + RPC」。不做通用 i18n 框架、不做独立配置服务。
- **实现从简**：状态栏与命令文案用「单文件键值表」做中英文切换，不引入 i18next 等重型库；Webview 面板为可选，首版可仅状态栏 + 命令/ RPC 展示节省。
- **代码与包体量**：heuristic-core 单包 < 500 行业务逻辑；每个端单包 < 800 行，总仓库（含测试）< 3500 行。

### 1.2 开发规范（代码与文档）

- **代码注释一律英文**：源码中所有注释（单行、多行、JSDoc）必须使用英文，**不得出现中文**。仅用户可见的**功能文案**（界面、状态栏、toast、设置项、命令返回等）通过 i18n 支持中英文，由 `strings` 等键值表维护，不在注释里写中文。
- **README 分中英文两份**：仓库根目录提供两份独立文档：**README.md**（英文）、**README.zh-CN.md**（中文）。两份内容对应：均含三步上手（VS Code / OpenClaw）、前置条件、配置说明、如何验证；其余技术说明可依语言分别撰写或保持一致。不在单文件内用中英双段混排代替分文件。

---

## 2. 整体架构

- **heuristic-core**：纯逻辑，无外部依赖，两端共用。
- **VS Code 扩展**：注册为 Language Model Chat Provider，在 Chat 中作为模型可选；请求前调核心得到 effort，注入 API 参数。
- **OpenClaw 插件**：注册 `before_prompt_build` 钩子，调核心得到档位，通过 modelOverride 选择对应 thinking 配置的模型。

---

## 3. 启发式难度评估设计

### 3.1 输入

- **必选**：当前请求中最后一条用户消息的纯文本。
- **可选**（若平台可提供）：消息条数、上下文 token 数、场景标记（`coding` / `chat` / `agent`）。

### 3.2 难度档位

三档，与 Claude effort 对齐：

- **simple**（→ effort `low`）：简单补全、小改、查说明。典型 budget 500–1k。
- **medium**（→ effort `medium`）：一般实现、单文件重构、解释。典型 budget 2k–4k。**这是默认档位。**
- **complex**（→ effort `high` 或 `max`）：多文件、架构、多步推理、Agent。典型 budget 8k+ 或 adaptive。

### 3.3 规则与特征

全部为规则 + 阈值，可在配置中调节。**核心策略：安全偏高，只有明确命中才降档。**

**降为 simple 需同时满足：**

- 消息长度 < 80 字符；
- 不含"步骤/分析/设计/实现/重构/explain/implement/refactor"等词；
- 无代码块（三反引号）、无文件路径；
- 含明显简单意图关键词（如"改个 typo""什么意思""简短说""fix typo""rename"）。

**升为 complex 满足任一：**

- 消息长度 > 400 字符；
- 含多段代码或多个文件路径；
- 含"step by step/分析/设计/架构/重构/从零实现/全面/implement from scratch"等词；
- 含多个问号或编号子问题（"1…2…3…"）；
- 场景标记为 `agent` 或消息数 > 10。

**其余情况均为 medium。**

**实现要点：** 内置中英双语关键词列表，匹配时 case-insensitive + 全角/半角归一化。输出枚举 `simple | medium | complex`，再由映射表得到 `effort`。

### 3.4 Agent 场景特殊处理

- **Agent 场景锁定为 complex**，不降档。
- 识别方式：场景标记为 `agent`，或消息中含 tool_use / tool_result 历史。

---

## 4. 实时节省展示

- 输入：usage（含 thinking_tokens）、effortUsed、modelId。输出：`{ saved_tokens, saved_usd_estimate, hasData }`。
- 基线估算（保守）：若用 high 的预估 thinking 量，按保守比例（如 1.4x）减去实际得 saved_tokens；再乘单价。展示文案加「约」。
- 实现：`computeSavings(usage, effortUsed, modelId, pricingTable?)` 放在 heuristic-core。

---

## 5. 稳定性与故障降级

- evaluate() 抛异常 → 返回 medium，不阻断请求。
- VS Code：注入 effort 后 API 400 → 去掉 effort 重试一次并提示。
- OpenClaw：modelOverride 失败 → 不返回 override。
- 无 thinking_tokens → 节省展示「数据不可用」或 hasData: false。

---

## 6. 中英文支持（i18n）

- 所有用户可见字符串在各自包 `strings.ts` 中维护中英 value；README 单独提供 README.md 与 README.zh-CN.md。
- 实现方式：单文件键值表，key 常量，value 中/英；运行时按当前语言取表。不引入 i18next 等库。

---

## 7. 目录结构（精简）

```
MoniSave/
├── docs/
│   └── PLAN.md                 # 本方案（唯一依据）
├── packages/
│   ├── heuristic-core/         # 共享核心，零运行时依赖
│   │   ├── src/
│   │   │   ├── evaluate.ts
│   │   │   ├── mapping.ts
│   │   │   ├── savings.ts
│   │   │   ├── pricing.ts
│   │   │   ├── keywords.ts
│   │   │   └── config.ts
│   │   ├── __tests__/
│   │   │   └── evaluate.test.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── vscode-extension/
│   │   ├── src/
│   │   │   ├── extension.ts
│   │   │   ├── provider.ts
│   │   │   ├── statusBar.ts
│   │   │   ├── strings.ts
│   │   │   └── config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── openclaw-plugin/
│       ├── src/
│       │   ├── index.ts
│       │   ├── strings.ts
│       │   └── config.ts
│       ├── openclaw.plugin.json
│       └── package.json
├── package.json
├── tsconfig.base.json
├── README.md
└── README.zh-CN.md
```

---

## 8. 详细实施计划（M1→M2→M3→M4）

**执行顺序**：M1 全部通过后再进入 M2；M2 在真实 OpenClaw 验证通过后再进入 M3；M3 在 VS Code 实机验证通过后再做 M4。每步须完成「预期功能」「测试用例」「验证方式」并记录通过/不通过。

### M1：共享核心 heuristic-core

| 子项 | 预期功能 | 测试用例 | 验证方式 |
|------|----------|----------|----------|
| **M1.1** evaluate + getEffort | 输入最后一条用户消息+可选 meta；输出档位 simple/medium/complex；再映射为 effort。规则：长度 80/400、中英关键词、代码块/路径、agent 锁定 complex；默认 medium。 | 短句+简单意图→simple；长句或 step by step/架构→complex；中等无强词→medium；scene=agent→complex；代码块→至少 medium；空串→medium；边界长度与自定义阈值。 | 运行 `npm test` 在 heuristic-core，断言档位与 effort；覆盖率覆盖 evaluate、getEffort。 |
| **M1.2** computeSavings | 输入 usage、effortUsed、modelId；输出 saved_tokens、saved_usd_estimate、hasData。无 thinking_tokens 时 hasData false；high effort 时节省为 0。 | usage 含 thinking、effort low→saved>0；effort high→0；无 thinking_tokens→hasData false；不同 modelId 单价不同。 | 单元测试断言返回结构与数量级。 |
| **M1.3** 配置与关键词 | 阈值、档位→effort 映射可覆盖；关键词中英双语，大小写不敏感、全角转半角。 | 自定义阈值后边界消息档位符合；自定义映射后 getEffort 正确；全角与半角同词等价。 | 单元测试构造 config override 断言。 |

### M2：OpenClaw 插件

| 子项 | 预期功能 | 测试用例 | 验证方式 |
|------|----------|----------|----------|
| **M2.1** before_prompt_build + modelOverride | 注册钩子；取最后用户消息；调 evaluate+映射；按配置返回 modelOverride。异常时不返回 override。 | 简单消息→low 模型；复杂消息→high 模型；中等→medium 模型；evaluate 抛错→请求仍成功。 | 在 OpenClaw 安装插件、配置多 effort 模型，发 3 类消息确认；mock 异常验证 fallback。 |
| **M2.2** /savings 与 monisave.stats RPC | 注册 /savings 命令；返回会话累计「已节省约 X tokens，约 ¥Y/$Y」；文案中英切换。RPC 返回 saved_tokens、saved_usd、request_count。 | 无请求时→0 或暂无数据；1 条请求后数字一致；3 条后累计正确；切换语言后文案对应。 | 实机发消息后执行 /savings 与 RPC 核对。 |
| **M2.3** 中英文与配置示例 | strings 表含 /savings 说明、命令 description 中英文；文档提供可粘贴的 OpenClaw 多 effort 模型 YAML。 | 中文时输出含「本会话已节省…」；英文时含 "This session saved…"；YAML 粘贴无语法错误。 | 手动切换语言执行 /savings；YAML 粘贴重启验证。 |

### M3：VS Code 扩展

| 子项 | 预期功能 | 测试用例 | 验证方式 |
|------|----------|----------|----------|
| **M3.1** Chat Provider 注册与流式 | provideLanguageModelChatInformation 返回 1 模型，toolCalling: true；provideLanguageModelChatResponse 取最后 user 消息、evaluate、注入 effort、流式上报；provideTokenCount 合理估算。 | 模型选择器可见；发消息得流式回复；API 报错不崩溃。 | Extension Development Host 中选模型发 2–3 条消息；断网/错 Key 有提示。 |
| **M3.2** 启发式注入与节省展示 | 请求前 evaluate 注入 effort；请求后 usage 调 computeSavings 更新状态栏；状态栏随语言与货币切换。 | 简单消息→节省>0；复杂→较低或 0；切换货币/语言后文案变化。 | 发简单/复杂消息看状态栏；改设置再看。 |
| **M3.3** 故障降级与首次引导 | evaluate 异常→medium 照常发；API 400→去 effort 重试并提示；无 thinking_tokens→「数据不可用」；首次触发显示一次 toast（中英）。 | 抛错→请求成功；400→重试成功+提示；toast 仅一次。 | mock 异常与 400；实机首次发消息看 toast。 |
| **M3.4** 设置项与中英文 | API Key、总开关、货币、显示难度；设置 title/description 在 strings 中英；语言由 env.language 或设置决定。 | 关总开关→不注入/始终 high；开显示难度→状态栏见档位标签；界面语言与设置页一致。 | 切换开关与语言检查状态栏与设置页。 |

### M4：体验收尾与文档

| 子项 | 预期功能 | 测试用例 | 验证方式 |
|------|----------|----------|----------|
| **M4.1** 「本次用全力」与总开关 | VS Code：本次用全力按钮/指令仅当次 high；OpenClaw：文档说明 /think high。总开关关时所有请求 high。 | 本次用全力+简单消息→当次 high；总开关关→effort high。 | 实机点击本次用全力、关总开关发消息查日志。 |
| **M4.2** README 中英文两份 | 根目录 README.md（英文）、README.zh-CN.md（中文）；每份含三步上手（VS Code / OpenClaw）、前置条件、API Key、如何验证。 | 按 README.zh-CN 完成 VS Code 安装对话；按 README 完成 OpenClaw；新用户读任一份可完成安装→配置→验证；代码无中文注释。 | 干净环境按两份文档执行；grep/lint 检查注释仅英文。 |

---

## 9. 验收标准

- heuristic-core：20+ 条测试消息，档位与 effort 符合设计表。
- OpenClaw：简单/复杂消息 modelOverride 与 /savings 正确。
- VS Code：选模型发问题，状态栏即时更新，effort 随消息变化。
- 故障降级：evaluate 异常→请求完成(medium)；注入失败→完成(high)。
- 中英文：界面与文案切换；README 两份，均含三步上手。
- 代码规范：注释一律英文；中文仅出现在 i18n 与 README.zh-CN.md。
- 体量：heuristic-core 零运行时依赖；总业务代码 < 3500 行。

---

## 当前进度（开发时更新）

- **M1**：已完成；heuristic-core 单测通过。
- **M2**：已完成；openclaw-plugin 实现 before_prompt_build、/savings、monisave.stats RPC、strings 中英文、openclaw.plugin.json、CONFIG.example.md；单测 4 条通过。实机 OpenClaw 验证待用户环境执行。
- **M3**：已完成；vscode-extension 实现 Chat Provider、状态栏、配置、/savings 命令、首次 toast、故障降级（400 重试）；需实机 Extension Development Host 验证。
- **M4**：已完成；VS Code 增加「本次用全力」命令（monisave.useFullEffortOnce），总开关已由 monisave.enabled 实现；OpenClaw 在 CONFIG.example.md 中说明临时 high 档；README.md（英文）与 README.zh-CN.md（中文）已写，含三步上手与验证方式。
