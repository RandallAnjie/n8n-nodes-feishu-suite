# Feishu Suite 所需权限

权限名只收录两类来源，没有自行编造：

1. 本仓库 e2e 对真实租户调用时，飞书 `99991672` 原文里的 `One of the following scopes is required: [...]`
2. 开放平台接口文档「权限要求 / Required scopes」表格里写明的标识（文内给出文档链接）

后台勾了「全部权限」仍然出现 `99991672` 时，飞书原文通常是「应用尚未开通所需的**应用身份**权限」。常见原因：

- 权限加在了**未发布**的版本上（测试企业生效，正式版未发布）
- 租户管理员还没审通过 / 可用性范围不含当前企业
- 需要额外配置**数据范围**（通讯录、云文档等）
- 节点用的是 `tenant_access_token`，必须开通**应用身份**页签下的权限，不是用户身份

节点会把 scope 名写进 `NodeApiError.message`，并提示：开发者后台 → 权限管理 → 发布新版本 → 配置数据范围。

官方申请说明：[申请 API 权限](https://open.feishu.cn/document/ukTMukTMukTM/uQjN3QjL0YzN04CN2cDN)

## 本租户 e2e 实测到的缺 scope（原文）

| 模块 / 操作 | 飞书 code | 飞书列出的 scope（满足其一即可） |
| --- | --- | --- |
| `chat.delete` | 99991672 | `im:chat`, `im:chat:delete` |
| `calendar.getPrimaryInfo` | 99991672 | `calendar:calendar:readonly`, `calendar:calendar.calendar:readonly`, `calendar:calendar:read` |
| `calendar.getList` | 99991672 | `calendar:calendar:readonly`, `calendar:calendar`, `calendar:calendar.calendar:readonly`, `calendar:calendar:read` |
| `mail.listMailGroups` | 99991672 | `mail:mailgroup`, `mail:mailgroup:readonly` |
| `attendance.listAttendanceGroups` / `listAttendanceShifts` | 99991672 | `attendance:rule:readonly`, `attendance:rule` |
| `vc.listRooms` | 99991672 | `vc:room`, `vc:room:readonly`, `vc:rooms.room.basicinfo:read` |
| `approval.queryApprovalInstances` | 99991672 | `approval:approval.list:readonly` |
| `approval.searchApprovalTasks` | 99991672 | `approval:approval.list:readonly`, `approval:approval:readonly` |

通讯录 `40004 no dept authority` **不是**缺 API scope，是应用身份对部门/人员的**数据范围**不够。

## 官方文档中的模块权限（OR）

每个接口「满足下列任一权限即可」。链接指向开放平台文档。

| 模块 | 官方 scope（文档原文） | 来源 |
| --- | --- | --- |
| 多维表格读写 | `bitable:app` | [列出数据表](https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table/list)、[多维表格概述](https://open.feishu.cn/document/server-docs/docs/bitable-v1/bitable-overview) |
| 多维表格只读 | `bitable:app:readonly` | 同上 |
| 获取多维表格信息（较新标识） | `base:app:read` | [获取多维表格元数据](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/bitable-v1/app/get) |
| 高级权限 / 自定义角色 | `bitable:app`（且表格需开启高级权限） | [高级权限概述](https://open.feishu.cn/document/server-docs/docs/bitable-v1/advanced-permission/advanced-permission-guide) |
| 群列表 | `im:chat` / `im:chat:readonly` / `im:chat:read` / `im:chat.group_info:readonly` | [获取群列表](https://open.feishu.cn/document/server-docs/group/chat/list) |
| 解散群 | e2e 实测 `im:chat` 或 `im:chat:delete` | 飞书 `99991672` 原文 |
| 日历 | e2e 实测见上表 | [日历概述](https://open.feishu.cn/document/server-docs/calendar-v4/overview) 同类接口 |

PoC 主路径（多维表格 + 机器人自己建的群/云空间/任务/知识库）在本租户已能跑通的，说明对应应用身份权限和数据范围已经生效。日历 / 邮箱 / 考勤 / 会议室 / 审批列表 / 解散群仍被飞书按上表拒绝。

## 开发者后台批量导入

开放平台提供「权限管理 → 批量导入/导出」：[申请 API 权限 · 批量导入导出](https://open.feishu.cn/document/ukTMukTMukTM/uQjN3QjL0YzN04CN2cDN)。

官方页面说明：按**应用身份 / 用户身份**分别展示；导入是**追加申请**，不会覆盖已开通项；系统会实时校验 scope 是否存在。页面上的示例 JSON 是控制台交互组件，抓取 HTML 时看不到具体样例。控制台与多份官方流程文档使用的录入形状是：

```json
{
  "scopes": {
    "tenant": [
      "bitable:app",
      "bitable:app:readonly",
      "base:app:read",
      "im:chat",
      "im:chat:readonly",
      "im:chat:read",
      "im:chat:delete",
      "im:chat.group_info:readonly",
      "calendar:calendar",
      "calendar:calendar:readonly",
      "calendar:calendar:read",
      "calendar:calendar.calendar:readonly",
      "mail:mailgroup",
      "mail:mailgroup:readonly",
      "attendance:rule",
      "attendance:rule:readonly",
      "vc:room",
      "vc:room:readonly",
      "vc:rooms.room.basicinfo:read",
      "approval:approval.list:readonly",
      "approval:approval:readonly"
    ],
    "user": []
  }
}
```

粘贴后以后台实时校验为准：不存在或当前应用无权申请的标识会被拒绝。导入后若状态是「待发布」，必须走**版本管理与发布**，管理员通过后才对 `tenant_access_token` 生效。关联数据范围的权限还要单独配数据权限。
