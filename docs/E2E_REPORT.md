# E2E report (n8n 2.42.6 community package)

Harness: `e2e/run.py` drives **n8n REST** (login → credentials → workflows → `/run` → execution data). It does not import operation files. Community node type: `n8n-nodes-feishu-suite.feishuSuite`.

Credentials: `FEISHU_APP_ID` / `FEISHU_APP_SECRET` only. Never logged.

Classification:

| Status | Meaning |
| --- | --- |
| PASS | n8n execution succeeded and Feishu `code=0` (or UX assertion held) |
| FAIL-bug | Unexpected product / param-mapping failure |
| BLOCKED-missing-scope | Feishu `99991672` (or equivalent). Scope names recorded verbatim |
| BLOCKED-needs-resource | Missing fixture, data-range (`40004`), Docx announcement (`232097`), webhook parent, or workflow rejected before the node ran |
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

## Latest counts

Filled after the 0.1.4 community-package reinstall against the real tenant. Previous 0.1.3 working-tree run (before this release's product fixes) was:

| Status | Count |
| --- | --- |
| PASS | 51 |
| FAIL-bug | 22 |
| BLOCKED-missing-scope | 9 |
| BLOCKED-needs-resource | 174 |
| SKIPPED-unsafe | 22 |
| **Total** | **278** |

## Bugs fixed after that run (shipped in 0.1.4)

See CHANGELOG 0.1.4. Highlights that the previous FAIL-bug list mapped to:

- `chat.ChatGetList` `99992402` → invalid `sort_type`
- `message.MessagePinList` HTTP 404 → wrong pin list path
- `chat.ChatUpdate` `9499` → `i18n_names` string `'{}'`
- `base.RecordGet` `91402 NOTEXIST` → locator not extracted
- `base.FieldGetList` `run_nodes=[]` → required empty view
- `base.RecordSearch` `9499` → empty `page_token`
- `message.Edit` `230001` → default `post` vs text content
- `task.Update` / `task.CommentCreate` `99992402` → missing `update_fields` / first-class comment fields
- contacts `40004` reclassified as data-range, not a node bug
- `99991663` HTTP 400 path now refreshes the tenant token

## Missing scopes (verbatim from Feishu)

See [REQUIRED_SCOPES.md](REQUIRED_SCOPES.md). Even if the console shows “all permissions”, `99991672` with `应用尚未开通所需的应用身份权限` means the **published** app version and tenant-admin grant / data range are what Feishu enforces.

## Residual risk

- **Leftover `n8n-e2e-*` groups** cannot be deleted without `im:chat` or `im:chat:delete` on the published tenant token. The harness still creates bot-only groups. Delete them in the Feishu admin console or grant those scopes and re-run.
- Person / attachment writes need a real user or file token; the harness creates the fields but does not write those cell types.
- Webhook trigger `url_verification` depends on this n8n instance exposing `/webhook/{id}`. Long-connection trigger activate is covered; only one WS connection per app.
- `parseWebhook` requires a parent n8n Webhook node (`Respond to Webhook`).
- Do not point the harness at production chats, approval definitions, or external mail.
