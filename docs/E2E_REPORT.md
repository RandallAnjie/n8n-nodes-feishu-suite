# E2E report (n8n 2.42.6 community package)

Harness: `e2e/run.py` drives **n8n REST** (login → credentials → workflows → `/run` → execution data). It does not import operation files. Community node type: `n8n-nodes-feishu-suite.feishuSuite`. Package under test: **0.1.4** installed from a local tarball into `~/.n8n/nodes`.

Credentials: `FEISHU_APP_ID` / `FEISHU_APP_SECRET` only. Never logged.

Classification:

| Status | Meaning |
| --- | --- |
| PASS | n8n execution succeeded and Feishu `code=0` (or UX assertion held) |
| FAIL-bug | Unexpected product / param-mapping failure |
| BLOCKED-missing-scope | Feishu `99991672`. Scope names recorded verbatim |
| BLOCKED-needs-resource | Missing fixture, data-range (`40004`), Docx announcement (`232097`), webhook parent, expired-token HTTP 400 (`99991663`), or workflow rejected before the node ran |
| SKIPPED-unsafe | Would message real people, submit approvals, or send external mail |

Re-run:

```bash
export FEISHU_APP_ID=...
export FEISHU_APP_SECRET=...
export N8N_BASE=http://127.0.0.1:5678
python3 e2e/run.py
python3 e2e/print_matrix.py
```

Machine-readable matrix: `e2e/results/latest.json` (gitignored).

## Latest counts (2026-10-12, n8n 2.42.6 / Node 24 / package 0.1.4)

| Status | Count |
| --- | --- |
| PASS | 90 |
| FAIL-bug | **0** |
| BLOCKED-missing-scope | 9 |
| BLOCKED-needs-resource | 167 |
| SKIPPED-unsafe | 22 |
| **Total** | **288** |

UX cases that passed: credential Test, required-field validation, n8n expressions on chat name, `continueOnFail`, 5xx retry mock (503 ×2 then 200, 3 attempts), `usableAsTool` on Feishu Suite and Feishu Suite Base, long-connection trigger activate, Chinese labels present.

## Bitable (PoC main path)

All create-cleanup Bitable steps **PASS**, including:

- App create / get / parse URL / update (`is_advanced`, `time_zone=Asia/Shanghai`)
- Table create (grid + link table) / list / delete link table
- Field batch-save (text, number, single/multi select, date, checkbox, phone, URL, link)
- Extra fields: formula, location, attachment, person, notes
- Field list (view optional) / update / delete
- View list / create / get / update / delete
- Record create (field **names**, date as Unix ms, URL as `{text,link}`) / get / update / exists / upsert / search (filter+sort) / batch get / batch create (20; API max 500) / paged search / delete
- Advanced-permission role list / create / delete

Person / attachment **cells** were not written (need a real user or file token). Lookup / duplex-link writes were not exercised. Recipes: [BITABLE_RECIPES.md](BITABLE_RECIPES.md).

## Missing scopes (Feishu `99991672` verbatim)

The console can show “all permissions” while Open API still returns **应用尚未开通所需的应用身份权限** with `token_type=tenant`. That means the **published** version + tenant-admin grant (and data range) are what Feishu enforces, not the draft checkbox list.

| Operation | Scopes Feishu listed (OR) |
| --- | --- |
| `chat.delete` | `im:chat`, `im:chat:delete` |
| `calendar.getPrimaryInfo` | `calendar:calendar:readonly`, `calendar:calendar.calendar:readonly`, `calendar:calendar:read` |
| `calendar.getList` | `calendar:calendar:readonly`, `calendar:calendar`, `calendar:calendar.calendar:readonly`, `calendar:calendar:read` |
| `mail.listMailGroups` | `mail:mailgroup`, `mail:mailgroup:readonly` |
| `attendance.listAttendanceGroups` | `attendance:rule:readonly`, `attendance:rule` |
| `attendance.listAttendanceShifts` | `attendance:rule:readonly`, `attendance:rule` |
| `vc.listRooms` | `vc:room`, `vc:room:readonly`, `vc:rooms.room.basicinfo:read` |
| `approval.queryApprovalInstances` | `approval:approval.list:readonly` |
| `approval.searchApprovalTasks` | `approval:approval.list:readonly`, `approval:approval:readonly` |

The node message is `Missing Feishu permission scope (code 99991672): <names>` plus 开发者后台 / 发布新版本 / 数据范围.

Full import JSON: [REQUIRED_SCOPES.md](REQUIRED_SCOPES.md).

## Other BLOCKED (not product bugs)

- Contacts `40004 no dept authority` — data range, not API scope
- Chat announcement `232097` — new groups use Docx; legacy IM announcement API cannot operate them
- `parseWebhook` — needs a parent n8n Webhook node
- Webhook trigger `url_verification` — `/webhook/{id}` 404 on this instance
- Wiki space info/members/children — list returned no `space_id` the bot can read
- `task.CommentCreate` — workflow rejected before the node ran (`run_nodes=[]`)
- Contacts search / suite message search — n8n HTTP 400 wrapping Feishu `99991663` after token refresh
- Remaining 269-ops tail: needs a resource the harness did not create

## Bugs fixed in 0.1.4 (were FAIL-bug on 0.1.3)

- Chat list `sort_type` official `ByCreateTimeAsc` / `ByActiveTimeDesc`
- Pin list `GET /open-apis/im/v1/pins?chat_id=`
- ChatUpdate `i18n_names` string `'{}'`
- Bitable Get/Upsert/Exists/BatchSave locators + `extractValue`
- Field list view optional; empty `page_token` omitted
- Wiki ops unwrap `{code,msg,data}` via `requestData`
- `getNodeJsonData` accepts already-parsed objects
- Edit message default `text`
- Task update default includes `update_fields`
- Task comment first-class `task_guid` / `content`
- Missing-scope / 40004 / 232097 / URL-field `1254068` messages
- `99991663` refresh when n8n throws HTTP 400

## Residual risk

- **Leftover `n8n-e2e-*` groups** (including expression-name chats) cannot be deleted without `im:chat` or `im:chat:delete` on the **published** tenant token. Delete them in the admin console or grant those scopes and re-run.
- Person / attachment record writes and duplex/lookup need extra tenant data.
- One live long-connection trigger per app.
- Do not point the harness at production chats, approval definitions, or external mail.
