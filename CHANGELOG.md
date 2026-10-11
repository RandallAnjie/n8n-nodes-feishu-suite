# Changelog

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
