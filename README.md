# n8n-nodes-feishu-suite

飞书 / Lark 全功能 n8n 社区节点包。目标 n8n 2.x（已在 n8n 2.42.6 的社区节点模型上对齐）。

本仓库是**独立新仓库**，不是任何 GitHub fork。源码以普通文件方式从 MIT 上游拷贝后再改造：节点类型名与凭据类型名全部改为 `feishuSuite*` / `feishuSuiteApi` / `feishuSuiteOAuth2Api`，可与其他飞书/Lark 社区节点并存。

当前共 **271** 个 ResourceFactory 操作（snae `@snae/n8n-nodes-feishu` v2.3.1 基线 178，净增 93）。

## 功能概览

- 统一节点 `Feishu Suite`：覆盖消息/卡片、群组、多维表格、文档、表格、云空间、知识库、日历、任务、通讯录、审批、邮箱、妙记、视频会议、搜索、考勤、Aily
- 模块节点：`Feishu Suite Base` / `Message` / `Chat` / `Document` / `Spreadsheet` / `Space` / `Wiki` / `Calendar` / `Task` / `Contacts` / `Approval` / `Mail` / `Minutes` / `VC` / `Search` / `Attendance` / `Aily`
- 触发器：长连接 WebSocket（`Feishu Suite Trigger`）+ Webhook（`Feishu Suite Webhook Trigger`）
- 响应节点：`Respond to Feishu Suite`（卡片回调等同步响应）
- 凭据：应用 `tenant_access_token`（App ID / App Secret）与用户 OAuth2；支持 `https://open.feishu.cn` 与 `https://open.larksuite.com`
- 全部 Action 节点设置了 `usableAsTool`，可被 n8n AI Agent 当作工具
- 运行时不再依赖 `glob`（改用 Node 内置 `fs.readdirSync`），避免 n8n UI 安装后找不到 `glob` 的已知失败
- Open API 调用对 HTTP 5xx / 429 / 飞书限流码 `99991400` 以及瞬时网络错误自动重试（最多 5 次，二进制指数退避；可在节点 Request Options 关闭）
- 缺 scope（`99991672`）会在错误里写出飞书返回的权限名，并提示发布新版本 / 配置数据范围；通讯录 `40004` 按数据权限而不是缺 scope 解释
- PoC 主路径是**多维表格**：`Feishu Suite Base` / 统一节点的 Base 资源，字段选择器、字段名 vs 字段 ID、Asia/Shanghai 日期毫秒、批量最多 500 条。见 [docs/BITABLE_RECIPES.md](docs/BITABLE_RECIPES.md)

## 安装

### 方式一：n8n 社区节点 UI（推荐）

1. 打开 n8n → **Settings → Community nodes**
2. 安装包名：`n8n-nodes-feishu-suite`
3. 同意社区节点风险提示后安装，重启 n8n（若界面要求）
4. 在工作流中搜索 **Feishu Suite**

> 若 UI 安装失败（常见于依赖未落到 n8n 的 community 目录），改用下面的手动安装。本包已去掉 `glob`，并把运行时依赖压到 `form-data` / `ws` / `protobufjs` / `luxon` / `sanitize-html` / `isbot`。

### 方式二：手动安装到 `~/.n8n/nodes`

```bash
mkdir -p ~/.n8n/nodes
cd ~/.n8n/nodes
npm install n8n-nodes-feishu-suite
# 或安装本地 tarball：
# npm pack /path/to/n8n-nodes-feishu-suite
# npm install ./n8n-nodes-feishu-suite-0.1.5.tgz
```

然后重启 n8n。

### 从源码构建

```bash
git clone https://github.com/RandallAnjie/n8n-nodes-feishu-suite.git
cd n8n-nodes-feishu-suite
npm install
npm run build
npm run lint
npm run enumerate
```

npm 包通过 GitHub Release（`v*`）由 `release.yml` 发布。本地开发请用 tarball 或 `npm install n8n-nodes-feishu-suite`。

## 凭据

| 凭据类型名 | 显示名 | 用途 |
| --- | --- | --- |
| `feishuSuiteApi` | Feishu Suite API | 应用 `tenant_access_token`，填写 App ID / App Secret |
| `feishuSuiteOAuth2Api` | Feishu Suite OAuth2 API | 用户 `user_access_token`，PKCE OAuth2 |

创建飞书/Lark 应用后：

1. 选择 Base URL：中国区 `https://open.feishu.cn` 或国际版 `https://open.larksuite.com`（也可填自定义域名）
2. Tenant Token：开放平台「凭证与基础信息」中的 App ID / App Secret
3. OAuth2：开启用户授权，回调地址填 n8n 的 OAuth Redirect URL；Scope 建议包含 `offline_access` 以及业务所需权限

## 节点类型名（可与其他飞书包共存）

| 类型名 | 说明 |
| --- | --- |
| `feishuSuite` | 全量统一节点 |
| `feishuSuiteBase` 等模块节点 | 只暴露对应 resource |
| `feishuSuiteTrigger` | 长连接事件触发 |
| `feishuSuiteWebhookTrigger` | HTTP 事件订阅触发 |
| `respondToFeishuSuite` | 向触发器回写同步响应 |

## 操作统计（相对 snae 178）

| 模块 | 操作数 | 相对 snae 178 |
| --- | ---: | ---: |
| 消息 / 卡片 | 38 | 37 → 38（+1） |
| 群组 | 17 | 17 → 17（+0） |
| 多维表格 | 43 | 36 → 43（+7） |
| 文档 docx | 10 | 10 → 10（+0） |
| 电子表格 | 26 | 24 → 26（+2） |
| 云空间 | 20 | 12 → 20（+8） |
| 知识库 | 13 | 12 → 13（+1） |
| 日历 | 19 | 19 → 19（+0） |
| 任务 v2 | 21 | 6 → 21（+15） |
| 通讯录 | 23 | 5 → 23（+18） |
| 审批 | 13 | 新增 |
| 邮箱 | 10 | 新增 |
| 妙记 | 2 | 新增 |
| 视频会议 / 会议室 | 4 | 新增 |
| 搜索 | 2 | 新增 |
| 考勤 | 5 | 新增 |
| Aily 智能伙伴 | 5 | 新增 |
| **合计** | **271** | **178 → 271（+93）** |

核对命令：

```bash
npm run enumerate
```

会打印各模块数量，并写出 `operations-report.json`。

## 各模块操作

### 消息 / 卡片（38）
- `BatchMessageProgress`
- `BatchMessageReadUsers`
- `BatchMessageRecall`
- `BatchMessageSend`
- `CardUpdate`
- `ContentGetInfo`
- `ContentParse`
- `ContentResourceGet`
- `Edit`
- `EventDecrypt`
- `FileDownload`
- `FileUpload`
- `Forward`
- `GetMessage`
- `GetMessageList`
- `GetMessageResource`
- `ImageDownload`
- `ImageUpload`
- `InteractiveCardUpdate`
- `LimitedCardDelete`
- `LimitedCardSend`
- `MessagePin`
- `MessagePinList`
- `MessagePushFollowUp`
- `MessageReactionAdd`
- `MessageReactionDelete`
- `MessageReactionList`
- `MessageReadUsers`
- `MessageSearch`
- `MessageUnpin`
- `MessageUrgent`
- `Recall`
- `Reply`
- `Send`
- `SendAndWait`
- `StreamMessage`
- `ThreadForward`
- `WebhookParse`

### 群组（17）
- `ChatAddManagers`
- `ChatAddMembers`
- `ChatCreate`
- `ChatDelete`
- `ChatDeleteTopNotice`
- `ChatGetAnnouncement`
- `ChatGetInfo`
- `ChatGetLink`
- `ChatGetList`
- `ChatGetMembers`
- `ChatIsInChat`
- `ChatRemoveManagers`
- `ChatRemoveMembers`
- `ChatSearch`
- `ChatSetTopNotice`
- `ChatUpdate`
- `ChatUpdateAnnouncement`

### 多维表格（43）
- `AppCopy`
- `AppCreate`
- `AppGetInfo`
- `AppUpdate`
- `AttachmentDownload`
- `AttachmentUpload`
- `FieldBatchSave`
- `FieldCreate`
- `FieldDelete`
- `FieldGetList`
- `FieldUpdate`
- `MemberBatchCreate`
- `MemberBatchDelete`
- `MemberCreate`
- `MemberDelete`
- `MemberGetList`
- `ParseUrl`
- `RecordBatchCreate`
- `RecordBatchDelete`
- `RecordBatchUpdate`
- `RecordCreate`
- `RecordDelete`
- `RecordExists`
- `RecordGet`
- `RecordGetList`
- `RecordSearch`
- `RecordUpdate`
- `RecordUpsert`
- `RoleCreate`
- `RoleDelete`
- `RoleGetList`
- `RoleUpdate`
- `TableBatchCreate`
- `TableBatchDelete`
- `TableCreate`
- `TableDelete`
- `TableGetList`
- `TableUpdate`
- `ViewCreate`
- `ViewDelete`
- `ViewGetInfo`
- `ViewGetList`
- `ViewUpdate`

### 文档 docx（10）
- `BlockConvert`
- `BlockCreate`
- `BlockDelete`
- `BlockGet`
- `BlockNestedCreate`
- `BlockUpdate`
- `Create`
- `GetBlockList`
- `GetInfo`
- `GetRawContent`

### 电子表格（26）
- `CellsFind`
- `CellsMerge`
- `CellsReplace`
- `CellsSplit`
- `CellsStyle`
- `Create`
- `DimensionCreate`
- `DimensionDelete`
- `DimensionInsert`
- `DimensionMove`
- `DimensionUpdate`
- `GetInfo`
- `SheetCreate`
- `SheetGet`
- `SheetsCopy`
- `SheetsDelete`
- `SheetsGetList`
- `SheetsUpdate`
- `Update`
- `ValuesAppend`
- `ValuesAutoWrite`
- `ValuesImageInsert`
- `ValuesInsert`
- `ValuesPrepend`
- `ValuesRead`
- `ValuesWrite`

### 云空间（20）
- `ChunkUpload`
- `FileCreateExport`
- `FileCreateImport`
- `FileDownload`
- `FileFolderDelete`
- `FileGetList`
- `FileGetStatistics`
- `FileGetViewRecords`
- `FileSearch`
- `FileSubscribe`
- `FileUnsubscribe`
- `FileUpload`
- `FolderCreate`
- `FolderMeta`
- `MediaChunkUpload`
- `MediaDownload`
- `MediaTmpDownloadUrlGet`
- `MediaUpload`
- `RootFolderMeta`
- `UploadByUrl`

### 知识库（13）
- `GetInfo`
- `GetList`
- `MemberAdd`
- `MemberDelete`
- `MembersGet`
- `NodeCopy`
- `NodeCreate`
- `NodeCreateHierarchy`
- `NodeGetChildren`
- `NodeGetInfo`
- `NodeMove`
- `NodeUpdateTitle`
- `Setting`

### 日历（19）
- `Availability`
- `Create`
- `Delete`
- `EventAttendeeCreate`
- `EventAttendeeDelete`
- `EventAttendeeGetList`
- `EventCreate`
- `EventDelete`
- `EventGet`
- `EventGetList`
- `EventSearch`
- `EventUpdate`
- `GetInfo`
- `GetList`
- `GetPrimaryInfo`
- `MeetingChatCreate`
- `MeetingChatUnbind`
- `Search`
- `Update`

### 任务 v2（21）
- `CommentCreate`
- `CommentDelete`
- `CommentList`
- `Create`
- `Delete`
- `GetInfo`
- `GetList`
- `MembersAdd`
- `MembersRemove`
- `SectionCreate`
- `SectionDelete`
- `SectionList`
- `SubtaskCreate`
- `SubtaskList`
- `TasklistCreate`
- `TasklistDelete`
- `TasklistGet`
- `TasklistGetTasks`
- `TasklistList`
- `TasklistUpdate`
- `Update`

### 通讯录（23）
- `DepartmentChildren`
- `DepartmentCreate`
- `DepartmentDelete`
- `DepartmentGet`
- `DepartmentSearch`
- `DepartmentUpdate`
- `DepartmentUserList`
- `UserBatchGet`
- `UserBatchGetInfo`
- `UserCreate`
- `UserDelete`
- `UserGetInfo`
- `UserGroupCreate`
- `UserGroupDelete`
- `UserGroupGet`
- `UserGroupList`
- `UserGroupMemberAdd`
- `UserGroupMemberList`
- `UserGroupMemberRemove`
- `UserGroupUpdate`
- `UserList`
- `UserSearch`
- `UserUpdate`

### 审批（13）
- `CommentCreate`
- `CommentList`
- `DefinitionGet`
- `InstanceCancel`
- `InstanceCc`
- `InstanceCreate`
- `InstanceGet`
- `InstanceList`
- `InstanceQuery`
- `TaskApprove`
- `TaskReject`
- `TaskSearch`
- `TaskTransfer`

### 邮箱（10）
- `MailGroupCreate`
- `MailGroupDelete`
- `MailGroupGet`
- `MailGroupList`
- `MailGroupMemberAdd`
- `MailGroupMemberDelete`
- `MailGroupMemberList`
- `MessageGet`
- `MessageList`
- `MessageSend`

### 妙记（2）
- `MinutesGet`
- `TranscriptGet`

### 视频会议 / 会议室（4）
- `MeetingGet`
- `MeetingListByNo`
- `RoomGet`
- `RoomList`

### 搜索（2）
- `DocsSearch`
- `MessageSearch`

### 考勤（5）
- `GroupGet`
- `GroupList`
- `ShiftList`
- `UserStatsQuery`
- `UserTaskQuery`

### Aily 智能伙伴（5）
- `FileGet`
- `FileUpload`
- `SkillGet`
- `SkillStart`
- `SkillsList`

## 来源说明

| 来源 | 许可 | 本包如何使用 |
| --- | --- | --- |
| `@snae/n8n-nodes-feishu` v2.3.1 | MIT | **基线**：ResourceFactory、178 个操作、长连接/Webhook/Respond、分模块节点 |
| `@luka-cat-mimi/n8n-nodes-feishu` | MIT | 多维表格 upsert / 记录是否存在 / URL 解析 / 批量保存字段；云空间分片上传、文件夹元数据、订阅/取消订阅、按 URL 上传；事件解密；知识库层级节点；通讯录搜索；Aily 5 个操作 |
| `n8n-nodes-feishu-api` | MIT | 审批实例创建/查询；任务列表与清单任务列表 |
| `n8n-nodes-feishu-lark` | MIT | 对照补齐：流式卡片、Send and Wait、docx Markdown/HTML → blocks（snae 已有） |
| `n8n-nodes-feishu-lite` | MIT | 自动写入表格、前置写入、批量保存字段；架构源头 |
| `n8n-nodes-lark-global` | MIT | 核对后无额外 Open API 操作（仅 MCP helper，未移植） |
| 飞书 / Lark 官方 Open API | — | 审批全量、任务 v2 清单/子任务/评论/分组、通讯录 CRUD/用户组、邮箱、妙记、视频会议/会议室、搜索、考勤基础 |

详细版权声明见 [NOTICE](./NOTICE)。

## 已知未实现

- **审批定义列表**：开放平台只有按 `approval_code` 获取定义，没有稳定的「列出全部定义」接口，因此只实现了 `DefinitionGet`
- **MCP Tool List/Execute**：仅出现在 lark-global，不属于飞书 Open API，未移植
- **考勤**：只覆盖组/班次/打卡记录/统计查询，未做排班规则、补卡审批等冷门接口
- **邮箱附件流、会议室预定冲突检测、妙记列表**等更细的选项按「广度优先」未展开
- npm 包由 GitHub Release（`v*`）触发 `release.yml` 发布；日常开发可用社区节点 UI 或本地 tarball

## 开发

```bash
npm install
npm run build   # tsc + 图标
npm run lint
npm run enumerate
npm test
# 真实 n8n 2.42.x + 飞书租户（凭据只走环境变量，见 e2e/README.md）
# export FEISHU_APP_ID=... FEISHU_APP_SECRET=...
# npm run e2e && npm run e2e:matrix
```

权限清单与开发者后台批量导入 JSON：[docs/REQUIRED_SCOPES.md](docs/REQUIRED_SCOPES.md)。端到端矩阵：[docs/E2E_REPORT.md](docs/E2E_REPORT.md)。

架构与 `n8n-nodes-feishu-lite` / `@snae/n8n-nodes-feishu` 相同：每个操作一个文件，由 `ResourceFactory` 自动加载。

## License

MIT。见 [LICENSE](./LICENSE) 与 [NOTICE](./NOTICE)。
