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

## 安装到 Cursor / Claude Code

本目录是技能原文。一键安装 / 更新 / 卸载脚本在 fork **[RandallAnjie/n8n-skills](https://github.com/RandallAnjie/n8n-skills#如何安装更新卸载)**（不要用上游 n8n-io/skills 的插件 marketplace，那里没有飞书技能）。

macOS / Linux：

```bash
curl -fsSL https://raw.githubusercontent.com/RandallAnjie/n8n-skills/main/install.sh | bash -s -- --tool cursor
curl -fsSL https://raw.githubusercontent.com/RandallAnjie/n8n-skills/main/install.sh | bash -s -- --tool claude
curl -fsSL https://raw.githubusercontent.com/RandallAnjie/n8n-skills/main/install.sh | bash -s -- --tool cursor --project
curl -fsSL https://raw.githubusercontent.com/RandallAnjie/n8n-skills/main/install.sh | bash -s -- --tool cursor --only feishu
```

Windows（PowerShell）：

```powershell
irm https://raw.githubusercontent.com/RandallAnjie/n8n-skills/main/install.ps1 -OutFile install.ps1
.\install.ps1 -Tool cursor
.\install.ps1 -Tool claude
.\install.ps1 -Tool cursor -Project .
.\install.ps1 -Tool cursor -Only feishu
```

更新：再跑同一条命令。卸载：同样的命令加上 `--uninstall` / `-Uninstall`。只卸飞书技能时加 `--only feishu`。

路径（已核对）：Claude Code 用户级 `~/.claude/skills/<name>/SKILL.md`、项目级 `<仓库>/.claude/skills/`；Cursor 用户级 `~/.cursor/skills/<name>/SKILL.md`、项目级 `<仓库>/.cursor/skills/`。安装器始终扁平（一技能一文件夹）。
