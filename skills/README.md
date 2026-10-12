# n8n Feishu Suite 技能（PoC / 生产同事）

给**非开发**同事和 Cursor / Claude 类 Agent 用：在 n8n 里用本包搭工作流，主路径是**多维表格（Bitable）**。包名 `n8n-nodes-feishu-suite`，已在 n8n 2.42.6 上用 **0.1.5** 对真实租户跑通。

内容**只依据**仓库里已验证的文档，不编造未跑过的行为：

- [docs/E2E_REPORT.md](../docs/E2E_REPORT.md)
- [docs/REQUIRED_SCOPES.md](../docs/REQUIRED_SCOPES.md)
- [docs/BITABLE_RECIPES.md](../docs/BITABLE_RECIPES.md)

| 技能 | 何时打开 |
| --- | --- |
| [feishu-n8n-setup](feishu-n8n-setup/SKILL.md) | 新建飞书应用、开通权限、发布版本、在 n8n 里加凭据并点 Test |
| [feishu-bitable-workflows](feishu-bitable-workflows/SKILL.md) | 搭 webhook 写表、定时查询通知、upsert、批量、字段怎么写 |
| [feishu-bitable-trigger](feishu-bitable-trigger/SKILL.md) | 多维表格记录/字段变更触发 |
| [feishu-bitable-ai-agent](feishu-bitable-ai-agent/SKILL.md) | 把节点挂到 n8n AI Agent 当工具 |
| [feishu-n8n-troubleshooting](feishu-n8n-troubleshooting/SKILL.md) | `99991672` / `40004` / `99992402` / 限流写冲突 / 时区对不上 |

节点：统一节点 `Feishu Suite`（资源选 Base），或单独的 `Feishu Suite Base`。触发器用 `Feishu Suite Trigger`。
