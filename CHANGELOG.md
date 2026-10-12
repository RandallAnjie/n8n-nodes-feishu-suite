# Changelog

## 0.1.3

飞书 Open API 偶发 HTTP 5xx / 限流时自动重试，二进制指数退避，最多 5 次（合计最多 6 次尝试）。

所有走共享请求层的操作都会受益：`RequestUtils`、凭据 `preAuthentication`、凭据 Test、长连接 Trigger 拉 WS 配置，以及流式消息的 webhook `fetch`。任意 URL 文件下载（`UploadByUrl`）仍不走这套重试。

### 何时重试

- HTTP 5xx（500 / 502 / 503 / 504 等）
- HTTP 429
- 飞书业务限流码 `99991400`
- 瞬时网络错误：`ECONNRESET` / `ETIMEDOUT` / `ECONNREFUSED` / `socket hang up`
- 有 `Retry-After` 或 `x-ogw-ratelimit-reset` 时优先按该等待时间（上限 60s）

不重试其它 4xx，也不重试普通飞书业务错误码（如缺 scope、参数错误）。token 过期码 `99991663` 仍在单次尝试内刷新后重发，不占用 5xx 重试次数。

### 退避与配置

- 默认 `1s * 2^attempt`（1s / 2s / 4s / 8s / 16s），带抖动，单次上限 30s
- 常量见 `FEISHU_RETRY_DEFAULTS`
- 各 Action 节点底部「Request Options」可关闭重试或改最大次数（默认开 / 5）

### 其它

- 发送消息等支持 `uuid` / `client_token` 的非幂等 POST，重试会复用同一次生成的幂等键
- 二进制下载（云空间文件、妙记转写等）仍按原样返回 Buffer / ArrayBuffer

## 0.1.2

继续修复 n8n 2.42.x 社区节点安装后「Feishu Suite API」凭据 Test 仍显示 `Couldn't connect with these settings — Request failed with status code 403`。

0.1.1 保留了声明式 `type.test`。n8n 只要凭据类型上有 `test` 就**优先走它**，不会用节点上的 `testedBy`。声明式路径会：

1. 先跑 `preAuthentication`（飞书 token 接口本身对有效/无效 App 都是 **HTTP 200 + JSON `code`**，不是 403）
2. 再把 expirable `accessToken` **写回数据库**
3. 再发第二次探测 POST

编辑器对未保存凭据的 Test 发送 `id: ""`。写回步骤会抛 `Found credential with no ID`。若前端带了不存在的 id（或当前用户没有 `credential:manageInstance`），n8n 把 `CredentialNotFoundError` 映射成 REST **403 Forbidden**，axios 文案就是用户看到的那句。这是 **n8n 自己的 `/rest/credentials/test`**，不是飞书。

社区节点 UI 安装（`N8N_COMMUNITY_PACKAGES` / `~/.n8n/nodes`）会把节点注册成 `n8n-nodes-feishu-suite.feishuSuite`，并填满 `supportedNodes`。因此可以去掉 `type.test`，让 Test 走 `FeishuSuite.methods.credentialTest`：只对飞书 token 接口做一次普通 `helpers.request`，不 persist、不加 Bearer。未保存（`id: ""`）和已保存凭据都可以得到 `Connection successful!`。

### 行为

- `FeishuSuiteApi` / `FeishuSuiteOAuth2Api` 不再声明 `test`
- Tenant Test：`testedBy: feishuSuiteApiTest` → `POST {baseUrl}/open-apis/auth/v3/tenant_access_token/internal`
- OAuth2 Test：`testedBy: feishuSuiteOAuth2ApiTest` → 已连接则查 user_info，并映射 `20005`
- 节点运行时仍用 `preAuthentication` 换 `tenant_access_token`，非 token 请求继续带 Bearer
- 无效 App ID/Secret 仍映射为飞书 `10003` / `10014`，而不是 axios 403

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
