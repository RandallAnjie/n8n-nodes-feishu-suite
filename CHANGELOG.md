# Changelog

## 0.1.1

修复 n8n 2.42.x 上「Feishu Suite API」凭据 Test 显示 `Couldn't connect with these settings — Request failed with status code 403`。

该文案的标题是 n8n 前端固定的 `couldntConnectWithTheseSettings`，后面的 `Request failed with status code 403` 是 `authError` 细节。飞书 `POST /open-apis/auth/v3/tenant_access_token/internal` 对错误 App ID/Secret 返回的是 **HTTP 200 + JSON `code`**（10003/10014），不是 403。实测 403 来自 n8n 测试链路，而不是飞书 token 接口本身：

1. 声明式 Test 会先跑 `preAuthentication`（写回 expirable `accessToken`），再 `authenticate` 给探测请求加 `Authorization: Bearer`，最后 `POST` 同一个 token 路径。0.1.0 的 generic `authenticate` 无条件加 Bearer；部分边缘/WAF 会对带 Bearer 的 token 请求回 403，axios 文案就是 `Request failed with status code 403`。
2. 0.1.0 的 `test.request.baseURL` 用隐藏字段 `={{$credentials.baseUrl}}`（默认是 `$self` 表达式）。解析失败会打到错误主机。
3. n8n 在凭据 id 找不到时把 `CredentialNotFoundError` 映射成 REST **403 Forbidden**（前端 axios 同一句）。这是 n8n 自身行为，与飞书无关。
4. Community / custom-extension 节点会注册成 `CUSTOM.feishuSuite`，`supportedNodes` 为空，所以 **不能只靠** 节点上的 `testedBy`；必须保留凭据类型上的 `test`。

### 行为

- 保留声明式 `test`（否则 n8n 报 `No testing function found`），但 `baseURL` 改为 `url` / `customUrl`，不再读隐藏 `$self` `baseUrl`
- Tenant `authenticate` 改为函数：token 换票路径不加 Bearer，其它业务请求仍带 `Authorization: Bearer`
- `preAuthentication` 按 `url` / `customUrl` 解析 origin，并把飞书 `10003` / `10014` 以及 HTTP 403 映射成明确文案
- OAuth2 Test 同样改用 `url` / `customUrl`，并映射 `20005`
- 节点运行时仍用 App ID/Secret 换 `tenant_access_token`，并给非 token 请求加 Bearer

## 0.1.0

首个独立发行（不是任何 GitHub fork）。源码以普通文件从 MIT 上游拷入后重命名、合并并扩展。

### 基线

- 以 `@snae/n8n-nodes-feishu` v2.3.1（178 个操作）为起点
- 节点 / 凭据类型全部改为 `feishuSuite*` / `feishuSuiteApi` / `feishuSuiteOAuth2Api`
- 目标 n8n 2.x；Action 节点启用 `usableAsTool`
- 去掉运行时 `glob` / `uuid`，降低 Community Nodes UI 安装失败概率

### 从其他 MIT 包移植

- luka：多维表格 upsert / 记录是否存在 / URL 解析 / 批量保存字段；云空间分片上传与订阅；事件解密；知识库层级节点；用户搜索；Aily
- feishu-api：审批实例创建/查询；任务列表与清单任务
- feishu-lite：表格自动写入 / 前置写入
- feishu-lark / lark-global：对照补齐（流式卡片、Send and Wait、docx 转换已在 snae 中）

### 新写（官方 Open API）

- 审批：定义获取、实例列表/查询/撤回/抄送、任务同意/拒绝/转交/搜索、评论
- 任务 v2：清单、子任务、评论、分组
- 通讯录：用户/部门 CRUD、用户组与成员
- 邮箱：发信、邮件列表/详情、邮件组
- 妙记：详情与转写
- 视频会议 / 会议室基础
- 搜索：云文档与消息
- 考勤：考勤组、班次、打卡记录、统计

当前合计 **269** 个操作（相对 snae +91）。用 `npm run enumerate` 复核。

### 发布前自检修复

- 凭据 Base URL 默认中国区 `https://open.feishu.cn`；未选国际版时 OAuth 回落到飞书域名，不再误用 Lark
- Tenant / OAuth2 凭据测试请求均按所选 `baseUrl` 走 Feishu 或 Lark 域名
- 妙记转写按官方文档按文件二进制流返回（`txt` / `srt`）
- 邮件组列表分页字段改为官方 `items`；邮件列表空 `folder_id` 不再传给 API，且 `page_size` 上限改为 20
- 去掉残留的上游节点/凭据显示名（如 Lark OAuth2 API、Lark Drive、Respond to Lark）
