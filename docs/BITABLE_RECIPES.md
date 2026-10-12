# 多维表格 PoC 配方

公司 PoC / 生产同事主要会用 **Bitable（多维表格）**。节点：`Feishu Suite` 资源选 Base，或单独的 `Feishu Suite Base`。两者都开了 `usableAsTool`，可以挂到 n8n AI Agent。

官方字段类型说明：[字段概述](https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-field/guide)。记录接口：[新增记录](https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/create)、[查询记录](https://open.feishu.cn/document/docs/bitable-v1/app-table-record/search)、[批量新增](https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/batch_create)。

## 必知坑

1. **JSON 键是字段名称，不是 field_id。** 选择器 `searchTableFields` 返回的是 ID（给删除/更新字段用）；`searchTableFieldNames` 返回名称（给 search / filter / upsert / 记录 JSON 用）。
2. **日期 / 创建时间是 Unix 毫秒**，不是 `2026-10-12` 字符串。本包创建多维表格时可在 Options 里设 `time_zone`，默认提示 **Asia/Shanghai**。
3. **批量新增 / 更新 / 删除单次最多 500 条**（飞书官方上限）。超过就拆批。限流大约 20 次/秒，节点会重试 `99991400` / HTTP 429。
4. **人员 / 附件 / 单向或双向关联** 写入需要真实 open_id、文件 token 或对端 table_id。公式 / 查找字段只读。
5. **高级权限（角色 / 协作者）** 要先 `updateApp` 打开 `is_advanced`，否则角色接口会报 1254301。
6. 缺 `bitable:app` / `bitable:app:readonly` 时节点会写出飞书的 scope 名。若后台已勾选仍 99991672，发布应用新版本并配数据范围。见 [REQUIRED_SCOPES.md](REQUIRED_SCOPES.md)。

## 配方 1：Webhook → 新增记录

1. `Webhook`（或 `Feishu Suite Webhook Trigger`）接到表单 / 飞书事件
2. `Feishu Suite Base` → 新增记录  
   - 多维表格 / 数据表用列表选择器  
   - 请求体：`{"fields":{"Name":"{{$json.name}}","Amount":{{$json.amount}},"Due":{{$json.dueMs}}}}`
3. 可选：`Feishu Suite` 发消息，把 `record_id` 回写到机器人自己建的群（不要对真实业务群群发）

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

- Match Field Name = `Name`（字段名称）
- Match Field Value = 业务主键
- Fields JSON = 要写入的整行

内部是 search（`is`）再 PUT 或 POST。适合「同一工单不要插两条」。

## 配方 4：AI Agent 当工具

把 `Feishu Suite Base` 加到 Agent 的 Tools。Agent 能看到中文操作名（新增记录、查询记录、列出字段…）。在 System 里写清：

- 先 `列出字段` / `解析多维表格链接` 再写记录
- 记录 JSON 用字段名
- 日期用毫秒
- 不要猜 app_token / table_id，让用户提供链接或用选择器

## 配方 5：字段类型对照（创建字段 body）

| UI | type | 写入值 |
| --- | --- | --- |
| 文本 | 1 | 字符串 |
| 数字 | 2 | number |
| 单选 | 3 | 选项名字符串 |
| 多选 | 4 | 选项名数组 |
| 日期 | 5 | Unix 毫秒 |
| 复选框 | 7 | boolean |
| 人员 | 11 | `{ "id": "<open_id>" }`（需要真实用户） |
| 电话 | 13 | 字符串 |
| 超链接 | 15 | `{ "text": "...", "link": "https://..." }` 或 URL 字符串（视表配置） |
| 附件 | 17 | 先走云空间上传，再填 file_token |
| 单向关联 | 18 | 对端 `record_ids`，创建字段时 `property.table_id` |
| 公式 | 20 | 只读；`property.formula_expression` 如 `2*{Amount}` |
| 地理位置 | 22 | 飞书 location 对象 |

## 配方 6：分页与 500 上限

- 查询记录：`whether_paging=false` 一次拉完；`true` 时自己拿 `page_token` 再调
- 批量新增：`{"records":[{"fields":{...}}, ...]}`，`len(records) <= 500`
- 大批量建议 100～200 一批，靠节点重试扛 429
