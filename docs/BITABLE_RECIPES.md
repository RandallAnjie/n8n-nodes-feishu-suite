# 多维表格 PoC 配方

公司 PoC / 生产同事主要会用 **Bitable（多维表格）**。节点：`Feishu Suite` 资源选 Base，或单独的 `Feishu Suite Base`。两者都开了 `usableAsTool`，可以挂到 n8n AI Agent。

官方字段类型说明：[字段概述](https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-field/guide)。记录接口：[新增记录](https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/create)、[查询记录](https://open.feishu.cn/document/docs/bitable-v1/app-table-record/search)、[批量新增](https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/batch_create)。附件先走 [上传素材](https://open.feishu.cn/document/server-docs/docs/drive-v1/media/upload_all)（`parent_type=bitable_file`）。

## 必知坑

1. **JSON 键是字段名称，不是 field_id。** 选择器 `searchTableFields` 返回 ID（删除/更新字段）；`searchTableFieldNames` 返回名称（search / filter / upsert / 记录 JSON）。列表里会显示「名称 · 类型 (field_id)」。
2. **日期 / 创建时间是 Unix 毫秒。** 本包会把 `2026-10-12`、`2026-10-12 18:00:00`、ISO 按 **Asia/Shanghai** 转成毫秒。创建多维表格时可在 Options 里设 `time_zone`。
3. **批量新增 / 更新 / 删除单次最多 500 条。** 超过 500 节点会自动拆批。限流 `1254290` / 写冲突 `1254291` / `99991400` / HTTP 429 会重试。
4. **人员 / 附件 / 单向或双向关联** 写入需要真实 open_id、file_token 或对端 record_id。公式 / 查找引用只读。
5. **超链接** 官方要 `{text,link}`。裸 `https://…` 字符串现在会自动转换。
6. **地理位置** 写入 `"116.397755,39.903179"`（经度,纬度）。
7. **高级权限（角色 / 协作者）** 要先 `updateApp` 打开 `is_advanced`，否则角色接口会报 `1254301`。
8. 缺 `bitable:app` 时节点会写出飞书的 scope 名。若后台已勾「全部权限」仍 `99991672`，把飞书返回的 **code / msg / scope** 原样记下来：通常是**未发布的版本**或租户/用户级授权、数据范围不够。`token_type=tenant` 表示应用身份。见 [REQUIRED_SCOPES.md](REQUIRED_SCOPES.md)。

## 配方 1：Webhook → 新增记录

1. `Webhook`（或 `Feishu Suite Webhook Trigger`）接到表单 / 飞书事件
2. `Feishu Suite Base` → 新增记录
   - 多维表格 / 数据表用列表选择器
   - 请求体：`{"fields":{"Name":"{{$json.name}}","Amount":{{$json.amount}},"Due":"{{$json.dueDate}}","Website":"{{$json.url}}"}}`
   - `Due` 可以是毫秒或 `2026-10-12`；`Website` 可以是裸 URL
3. 可选：发消息，把 `record_id` 回写到机器人自己建的群（不要对真实业务群群发）

## 配方 2：定时 → 查询 → 通知

1. `Schedule Trigger`（例如每小时）
2. 查询记录：`whether_paging=false` 让节点自动翻页；`body.filter` 用**字段名**

```json
{
  "automatic_fields": false,
  "field_names": ["Name", "Status", "Due"],
  "sort": [{"field_name": "Due", "desc": false}],
  "filter": {
    "conjunction": "and",
    "conditions": [
      {"field_name": "Status", "operator": "is", "value": ["Doing"]}
    ]
  }
}
```

3. 有结果再发消息 / 建任务。空结果用 IF 停掉。

## 配方 3：Upsert（按业务键更新或新建）

操作 **更新或新建记录**：

- 匹配字段名称 = 用字段名称选择器（不要填 field_id）
- 匹配字段值 = 业务主键
- Fields JSON = 要写入的整行

内部是 search（`is`）再 PUT 或 POST。适合「同一工单不要插两条」。

## 配方 4：AI Agent 当工具

把 `Feishu Suite Base` 加到 Agent 的 Tools。Agent 能看到中文操作名（新增记录、查询记录、列出字段、上传附件…）。在 System 里写清：

- 先 `列出字段` / `解析多维表格链接` 再写记录
- 记录 JSON 用字段名
- 日期可用 `YYYY-MM-DD`（按上海时区）或毫秒
- 不要猜 app_token / table_id，让用户提供链接或用选择器
- 公式 / 查找引用只读，不要写

## 配方 5：字段类型对照

| UI | type | 写入值 | 节点会自动转 |
| --- | --- | --- | --- |
| 文本 | 1 | 字符串 | |
| 数字 | 2 | number | |
| 单选 | 3 | 选项名字符串 | |
| 多选 | 4 | 选项名数组 | |
| 日期 | 5 | Unix 毫秒 | `2026-10-12` / ISO → 上海时区毫秒 |
| 复选框 | 7 | boolean | `"true"` / `"false"` |
| 人员 | 11 | `[{ "id": "<open_id>" }]` | 裸 `ou_` / `on_` |
| 电话 | 13 | 字符串 | |
| 超链接 | 15 | `{ "text": "...", "link": "https://..." }` | 裸 URL |
| 附件 | 17 | `[{ "file_token": "boxcn..." }]` | 先上传 |
| 单向关联 | 18 | `["recXXX"]` | 裸 `rec…` |
| 查找引用 | 19 | **只读** | |
| 公式 | 20 | **只读**；创建字段时 `property.formula_expression` | |
| 双向关联 | 21 | `["recXXX"]`，创建字段时 `property.table_id` + `back_field_name` | |
| 地理位置 | 22 | `"116.397755,39.903179"` | 带空格的坐标串 |

创建单向/双向关联字段必须带对端 `table_id`。查找引用（type 19）官方 create-field 校验很严，本租户实测 `99992402 field validation failed`；表里已有查找列时用「获取记录 / 查询记录」只读即可。人员字段写入需要通讯录**数据范围**（缺了是 `40004`，不是缺 `bitable:app`）。

## 配方 6：分页与 500 上限

- 查询记录：`whether_paging=false` 一次拉完；`true` 时自己拿 `page_token` 再调
- 批量新增：`{"records":[{"fields":{...}}, ...]}`。**超过 500 条节点会拆成多批**
- 大批量建议 100～200 一批也可以，靠节点重试扛 `1254290` / `1254291` / 429
- 限流大约官方 50 次/秒（新增记录），写同一张表不要并行多个写接口（会 `1254291` 写冲突）

## 配方 7：附件上传 / 下载

1. 上游节点产出二进制（HTTP Request、表单、Code）
2. `Feishu Suite Base` → **上传附件到多维表格**
   - 多维表格 / 数据表用选择器
   - 二进制字段默认 `data`
   - Options：勾选「写入记录」，填 `record_id` + 附件字段名称（如 `Files`）
3. 下载：同一节点 **下载多维表格附件**，`file_token` 来自上传结果或记录里的附件字段

不要把外部 URL 直接塞进附件字段。文件必须属于当前 Base，否则 `1254303` / `1254069`。

## 配方 8：多维表格事件（Trigger）

没有单独的「Bitable Trigger」节点。用通用 `Feishu Suite Trigger`：

1. Options → 订阅云文档事件：类型 **多维表格（Bitable）**，File Token = `app_token`
2. Events 勾选：
   - `drive.file.bitable_record_changed_v1` 记录变更
   - `drive.file.bitable_field_changed_v1` 字段变更
3. 也可以先跑 `订阅云文档事件`（`subscribeFile`，file_type=bitable）再激活 Trigger
4. 开发者后台「事件订阅」必须随**已发布版本**开通。一个应用同时只能有一条长连接

后续技能可以按「webhook → 新增记录」「定时 → 查询 → 通知」「记录变更 → 同步」三条来写。
