# Feishu Suite e2e harness

Drives **n8n itself** (REST the editor uses) against a real Feishu tenant. Operation files are not imported.

## What it covers

- Community-package node type `n8n-nodes-feishu-suite.feishuSuite`
- Credential Test, required-field validation, expressions, `continueOnFail`, `usableAsTool`
- HTTP 5xx retry via a local mock (503 twice, then 200)
- Webhook trigger `url_verification` and long-connection trigger activate
- Read ops first, then create-and-cleanup artifacts (bot-only chat, folder, bitable, docx, sheet, task)
- Deep Bitable path (`bitable-lifecycle`): app/table/view/field/record CRUD, every common field type (including duplex/lookup/location/person/attachment), batch 500 auto-chunk (501), search/filter/sort/paging, upsert, roles, field-name vs field-id, Asia/Shanghai timestamps, attachment upload/download, subscribe `bitable` events
- Every ResourceFactory operation appears in the matrix as PASS / FAIL-bug / BLOCKED-missing-scope / BLOCKED-needs-resource / SKIPPED-unsafe

## Safety

- Never messages real people or groups except a group the harness creates (bot-only) and deletes
- Skips approval submissions and outbound mail
- `FEISHU_APP_ID` / `FEISHU_APP_SECRET` are read from the environment only and redacted in all output

## Run

n8n 2.42.x must already be up with the community package installed (`N8N_COMMUNITY_PACKAGES_ENABLED=true`, no `N8N_CUSTOM_EXTENSIONS`).

```bash
export FEISHU_APP_ID=cli_xxx
export FEISHU_APP_SECRET=xxx
export N8N_BASE=http://127.0.0.1:5678
export N8N_EMAIL=you@example.com
export N8N_PASSWORD=secret

python3 e2e/run.py
python3 e2e/print_matrix.py
```

Results: `e2e/results/latest.json` (gitignored). The checked-in summary is `docs/E2E_REPORT.md`.
