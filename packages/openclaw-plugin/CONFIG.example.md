# OpenClaw 多 effort 模型配置示例 (MoniSave)

将以下 YAML 块复制到 OpenClaw 配置中，以使用不同 thinking 档位的模型。插件 `monisave-thinking` 会根据消息难度通过 `modelOverride` 选择对应模型。

```yaml
# 在 OpenClaw 的 plugins 或 models 配置中粘贴类似内容（键名以实际文档为准）
plugins:
  entries:
    monisave-thinking:
      config:
        tierToModelId:
          simple: "anthropic/claude-sonnet-4-6-low"
          medium: "anthropic/claude-sonnet-4-6-medium"
          complex: "anthropic/claude-sonnet-4-6-high"
        language: "en"   # 或 "zh"
```

- **simple** → 短句、简单意图（如改 typo）→ 使用 low 档模型。
- **medium** → 默认档位。
- **complex** → 长文、多步推理、agent 场景 → 使用 high 档模型。

安装插件后，在对话中可使用 `/savings` 查看本会话节省的 token 与预估金额；通过 Gateway RPC `monisave.stats` 可获取 `saved_tokens`、`saved_usd`、`request_count`。

**本次用全力**：若某条消息希望临时使用 high 档 thinking，请参考 OpenClaw 官方文档中与 thinking 档位或 `/think` 相关的命令（若有）；或临时发送较复杂的问题以触发 complex 档位。
