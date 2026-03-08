# MoniSave

**别再为用不上的 thinking tokens 花冤枉钱。**

MoniSave 把 Claude 扩展思考接入 VS Code 和 OpenClaw，让你精确控制每条消息使用多少推理算力。

> ⚠️ **难度自动感知功能正在调试中，暂不可用。** 手动档位切换及其他所有功能均已可用。

---

## 能做什么

| | VS Code | OpenClaw（Telegram） |
|--|---------|----------------------|
| 按消息控制 effort 档位 | ✅ 点状态栏或 `Ctrl+Shift+E` | ✅ `/monisave_low`、`/monisave_high`… |
| 实时查看节省的 token | ✅ 状态栏 | ✅ `/savings` |
| 保存团队知识卡片 | ✅ `@monisave /save` | — |
| 中英文切换 | ✅ 一条命令 | — |

---

## VS Code

### 第一步 — 选择模型

打开 VS Code Chat，选择 **MoniSave (Claude Sonnet + thinking)**。

![在 VS Code Chat 中选择 MoniSave 模型](figs/vscode_1.png)

### 第二步 — 一键切换档位

点击状态栏或按 **`Ctrl+Shift+E`** 打开档位选择器。

![档位选择器 — auto / low / medium / high / max](figs/vscode_2.png)

或通过命令面板（`Ctrl+Shift+P` → 输入 **MoniSave**）：

![命令面板中的所有 MoniSave 命令](figs/vscode_3.png)

### 第三步 — 用 @monisave 管理团队知识

在 Chat 里输入 `@monisave /` 查看所有知识命令：

![`@monisave` 子命令列表](figs/vscode_4.png)

| 命令 | 作用 |
|------|------|
| `/save` | 把上一轮问答保存为知识卡片 |
| `/search <关键词>` | 搜索相关卡片 |
| `/list` | 显示所有卡片 |
| `/useful` · `/notuseful` | 给上一条回答打分 |

### 第四步 — 验证是否生效

打开 **帮助 → 切换开发人员工具 → Console**，筛选 `MoniSave`：

![开发者控制台 — 实时显示每条请求的 tier、effort 和 token 数据](figs/vscode_5.png)

每条请求都会输出 `tier · effort · input_tokens · thinking`，可以直接确认档位是否正确生效。

### 安装与配置

```
1. 在 VS Code 扩展市场搜索并安装 "MoniSave"
2. 执行 "MoniSave: Manage API Key"，填入你的 Anthropic API Key
3. 在 Chat 里选择 MoniSave 模型，即可使用
```

**常用设置：**

| 设置项 | 默认值 | 可选值 |
|--------|--------|--------|
| `monisave.effortMode` | `auto` | auto / low / medium / high / max |
| `monisave.currency` | `usd` | usd / cny |
| `monisave.language` | `en` | en / zh |
| `monisave.showEffortOnSend` | `true` | 每次发送后显示本条使用的档位 |

---

## OpenClaw

MoniSave 作为插件运行在你的 OpenClaw bot（Telegram 等）中。

### 档位切换

<img src="figs/Openclaw.jpg" width="320" alt="OpenClaw bot — 手机端档位切换演示" />

```
/monisave_mode        → 查看当前档位
/monisave_low         → 强制使用 low
/monisave_medium      → 强制使用 medium
/monisave_high        → 强制使用 high
/monisave_auto        → 恢复自动模式
/savings              → 本会话节省统计
```

### 安装

```bash
npm run build   # 在仓库根目录执行
# 然后按 OpenClaw 文档加载 packages/openclaw-plugin
```

**配置**（参考 `CONFIG.example.md`）：

```json
{
  "plugin": "monisave",
  "models": {
    "simple":  "你的低档位模型ID",
    "medium":  "你的中档位模型ID",
    "complex": "你的高档位模型ID"
  }
}
```

---

## 路线图

- [ ] **难度自动感知** *(开发中)* — 根据问题复杂度自动选择 effort 档位的启发式分类器
- [x] 手动档位切换（VS Code + OpenClaw）
- [x] 状态栏实时显示节省的 token
- [x] 团队知识卡片（`@monisave`）
- [x] 中英文界面切换

---

## 许可证

Apache-2.0
