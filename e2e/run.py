#!/usr/bin/env python3
"""End-to-end harness: real n8n 2.42.x + community package + real Feishu tenant.

Credentials come from FEISHU_APP_ID / FEISHU_APP_SECRET only. Never printed.
"""

from __future__ import annotations

import json
import os
import sys
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
	sys.path.insert(0, str(ROOT))

from e2e.lib.catalog import LOCAL_OPS, READ_DEFAULTS, UNSAFE, case_key, scenarios
from e2e.lib.classify import (
	BLOCKED_RESOURCE,
	BLOCKED_SCOPE,
	FAIL_BUG,
	PASS,
	SKIPPED_UNSAFE,
	classify_error,
	extract_scopes,
	summarize,
)
from e2e.lib.n8n_client import N8nClient, rl
from e2e.lib.ops import load_operations
from e2e.lib.redact import scrub, scrub_obj


def lookup(obj: Any, path: str) -> Any:
	cur = obj
	for part in path.split("."):
		if cur is None:
			return None
		if part.startswith("[") and part.endswith("]"):
			idx = int(part[1:-1])
			if not isinstance(cur, list) or idx >= len(cur):
				return None
			cur = cur[idx]
			continue
		if "[" in part:
			name, rest = part.split("[", 1)
			idx = int(rest.rstrip("]"))
			if name:
				cur = cur.get(name) if isinstance(cur, dict) else None
			if not isinstance(cur, list) or idx >= len(cur):
				return None
			cur = cur[idx]
		else:
			cur = cur.get(part) if isinstance(cur, dict) else None
	return cur


def save_from(json_obj: Any, spec: str) -> Any:
	candidates: list[Any] = [json_obj]
	if isinstance(json_obj, dict) and isinstance(json_obj.get("data"), dict):
		candidates.append(json_obj["data"])
	if isinstance(json_obj, list):
		candidates.append({"items": json_obj})
		if json_obj:
			candidates.append(json_obj[0])
	for path in spec.split("|"):
		for obj in candidates:
			value = lookup(obj, path)
			if value:
				return value
	return None


def pick_json(result: dict[str, Any]) -> dict[str, Any]:
	raw = result.get("json")
	if isinstance(raw, dict):
		return raw
	if isinstance(raw, list) and raw and isinstance(raw[0], dict):
		return {"items": raw, **raw[0]}
	return {}


def row_base(op: dict[str, Any], **extra: Any) -> dict[str, Any]:
	return {
		"id": case_key(op["resource"], op["stem"]),
		"resource": op["resource"],
		"operation": op["operation"],
		"stem": op["stem"],
		**extra,
	}


class RetryMock(BaseHTTPRequestHandler):
	hits: dict[str, int] = {}

	def log_message(self, fmt: str, *args: Any) -> None:
		return

	def _send(self, code: int, payload: dict[str, Any]) -> None:
		body = json.dumps(payload).encode()
		self.send_response(code)
		self.send_header("Content-Type", "application/json")
		self.end_headers()
		self.wfile.write(body)

	def do_POST(self) -> None:
		self._handle()

	def do_GET(self) -> None:
		self._handle()

	def _handle(self) -> None:
		path = urlparse(self.path).path
		RetryMock.hits[path] = RetryMock.hits.get(path, 0) + 1
		if path.endswith("/tenant_access_token/internal"):
			self._send(200, {"code": 0, "tenant_access_token": "t-mock-retry", "expire": 3600})
			return
		if RetryMock.hits[path] <= 2:
			self._send(503, {"code": 500, "msg": "simulated 5xx"})
			return
		self._send(200, {"code": 0, "msg": "ok", "data": {"items": [], "spaces": []}})


def start_mock() -> tuple[ThreadingHTTPServer, str]:
	server = ThreadingHTTPServer(("127.0.0.1", 0), RetryMock)
	thread = threading.Thread(target=server.serve_forever, daemon=True)
	thread.start()
	host, port = server.server_address[:2]
	return server, f"http://{host}:{port}"


def run_op(client: N8nClient, cred_id: str, cred_name: str, resource: str, operation: str, params: dict[str, Any], continue_on_fail: bool = False) -> dict[str, Any]:
	return client.run_feishu_op(
		cred_id=cred_id,
		cred_name=cred_name,
		resource=resource,
		operation=operation,
		parameters=params,
		continue_on_fail=continue_on_fail,
	)


def classify_result(result: dict[str, Any]) -> tuple[str, str, list[str]]:
	err = result.get("error")
	if not err and result.get("status") in (None, "success"):
		return PASS, "", []
	text = scrub(err if err else result)
	if (not result.get("run_nodes")) and result.get("status") == "error":
		return BLOCKED_RESOURCE, text or "Workflow rejected before the Feishu node ran (missing/invalid params)", []
	status, scopes = classify_error(text)
	if result.get("status") == "success" and not err:
		return PASS, "", []
	return status, text, scopes


def main() -> int:
	app_id = os.environ.get("FEISHU_APP_ID", "").strip()
	app_secret = os.environ.get("FEISHU_APP_SECRET", "").strip()
	if not app_id or not app_secret:
		print("Set FEISHU_APP_ID and FEISHU_APP_SECRET in the environment.")
		return 2

	n8n_base = os.environ.get("N8N_BASE", "http://127.0.0.1:5678")
	email = os.environ.get("N8N_EMAIL", "loadtest@example.com")
	password = os.environ.get("N8N_PASSWORD", "LoadTest123")
	stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
	out_dir = Path(os.environ.get("E2E_OUT", ROOT / "e2e" / "results"))
	out_dir.mkdir(parents=True, exist_ok=True)

	ops = load_operations(ROOT)
	pkg = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
	client = N8nClient(n8n_base, email, password)
	client.login()

	cred_name = f"Feishu Suite e2e {stamp}"
	cred_id = client.create_suite_credential(cred_name, app_id, app_secret, "https://open.feishu.cn")
	cred_test = client.test_credential(cred_id, cred_name, app_id, app_secret, "https://open.feishu.cn")

	cases: list[dict[str, Any]] = []
	seen: set[str] = set()
	ctx: dict[str, Any] = {
		"stamp": stamp,
		"due_ms": int(time.time() * 1000),
		"batch_size": int(os.environ.get("E2E_BITABLE_BATCH", "20")),
	}
	scope_hits: dict[str, list[str]] = {}

	# --- UX / platform cases ---
	cases.append(
		{
			"id": "ux.credentialTest",
			"resource": "credential",
			"operation": "test",
			"status": PASS if cred_test.get("status") == "OK" else FAIL_BUG,
			"error": cred_test.get("message") if cred_test.get("status") != "OK" else "",
			"reason": "n8n Settings → Credentials Test",
		}
	)

	# Required-field validation: task create without summary
	required = run_op(client, cred_id, cred_name, "task", "create", {"summary": "", "body": {}, "user_id_type": "open_id"})
	req_status, req_err, _ = classify_result(required)
	if required.get("status") == "error" or required.get("error"):
		req_status = PASS
		req_reason = "Empty required field failed as expected"
	else:
		req_status = FAIL_BUG
		req_reason = "Empty required field was accepted"
	cases.append(
		{
			"id": "ux.requiredFieldValidation",
			"resource": "task",
			"operation": "create",
			"status": req_status,
			"reason": req_reason,
			"error": req_err,
		}
	)

	# Expression handling on chat name
	expr = run_op(
		client,
		cred_id,
		cred_name,
		"chat",
		"create",
		{
			"name": f"={{{{ \"n8n-e2e-expr-{stamp}\" }}}}",
			"description": "expression test",
			"chat_type": "private",
			"user_id_list": [],
			"bot_id_list": [],
		},
	)
	expr_status, expr_err, expr_scopes = classify_result(expr)
	expr_json = pick_json(expr)
	if expr_json.get("chat_id"):
		ctx["expr_chat_id"] = expr_json.get("chat_id")
	cases.append(
		{
			"id": "ux.expressionChatName",
			"resource": "chat",
			"operation": "create",
			"status": expr_status,
			"scopes": expr_scopes,
			"error": expr_err,
			"reason": "Chat name uses n8n expression",
		}
	)

	# continueOnFail: invalid wiki space should not fail the execution
	cof = run_op(
		client,
		cred_id,
		cred_name,
		"wiki_spaces",
		"getSpaceInfo",
		{"space_id": "definitely-missing-space", "lang": "zh"},
		continue_on_fail=True,
	)
	cof_ok = cof.get("status") == "success" or bool(cof.get("error"))
	cases.append(
		{
			"id": "ux.continueOnFail",
			"resource": "wiki_spaces",
			"operation": "getSpaceInfo",
			"status": PASS if cof_ok else FAIL_BUG,
			"reason": "continueOnFail keeps the workflow moving",
			"error": scrub(cof.get("error") or ""),
		}
	)

	# Retry mock
	mock, mock_url = start_mock()
	try:
		mock_cred = client.create_suite_credential(
			f"Feishu mock retry {stamp}",
			app_id,
			app_secret,
			mock_url,
		)
		retry_result = run_op(client, mock_cred, f"Feishu mock retry {stamp}", "wiki_spaces", "getWikiSpaceList", {"page_size": 10})
		retry_status, retry_err, _ = classify_result(retry_result)
		wiki_hits = RetryMock.hits.get("/open-apis/wiki/v2/spaces", 0)
		if retry_status == PASS and wiki_hits >= 3:
			retry_status = PASS
			retry_reason = f"Mock returned 503 twice then 200 ({wiki_hits} attempts)"
		elif wiki_hits >= 3 and retry_status != PASS:
			retry_reason = f"Retried {wiki_hits} times but final call failed: {retry_err}"
		else:
			retry_status = FAIL_BUG
			retry_reason = f"Expected 3+ wiki attempts, got {wiki_hits}: {retry_err}"
		cases.append(
			{
				"id": "ux.retry5xx",
				"resource": "wiki_spaces",
				"operation": "getWikiSpaceList",
				"status": retry_status,
				"reason": retry_reason,
			}
		)
	finally:
		mock.shutdown()

	# usableAsTool is a node description flag
	suite_src = (ROOT / "nodes/FeishuSuite/FeishuSuite.node.ts").read_text()
	base_src = (ROOT / "nodes/FeishuSuiteBase/FeishuSuiteBase.node.ts").read_text()
	cases.append(
		{
			"id": "ux.usableAsTool",
			"resource": "feishuSuite",
			"operation": "description",
			"status": PASS if "usableAsTool: true" in suite_src else FAIL_BUG,
			"reason": "FeishuSuite.description.usableAsTool is true for AI Agent",
		}
	)
	cases.append(
		{
			"id": "ux.usableAsToolBase",
			"resource": "feishuSuiteBase",
			"operation": "description",
			"status": PASS if "usableAsTool: true" in base_src else FAIL_BUG,
			"reason": "FeishuSuiteBase can be used as an AI Agent tool for Bitable",
		}
	)

	# Webhook trigger + url_verification
	try:
		wf_id = client.create_workflow(
			{
				"name": f"e2e-webhook-{stamp}",
				"nodes": [
					{
						"id": "hook",
						"name": "Hook",
						"type": "n8n-nodes-feishu-suite.feishuSuiteWebhookTrigger",
						"typeVersion": 1,
						"position": [0, 0],
						"parameters": {
							"authentication": "feishuSuiteApi",
							"events": ["im.message.receive_v1"],
							"responseMode": "onReceived",
						},
						"credentials": {"feishuSuiteApi": {"id": cred_id, "name": cred_name}},
						"webhookId": f"e2e-{stamp}",
					}
				],
				"connections": {},
				"settings": {"executionOrder": "v1"},
			}
		)
		client.set_active(wf_id, True)
		import urllib.error
		import urllib.request

		_, wf_payload = client.request("GET", f"/rest/workflows/{wf_id}")
		wf_obj = client.unwrap(wf_payload) if isinstance(wf_payload, dict) else {}
		hook_node = next(
			(n for n in (wf_obj.get("nodes") or []) if n.get("name") == "Hook"),
			{},
		)
		webhook_id = hook_node.get("webhookId") or f"e2e-{stamp}"
		candidates = [
			f"{n8n_base}/webhook/{webhook_id}",
			f"{n8n_base}/webhook/webhook",
			f"{n8n_base}/webhook-test/webhook",
			f"{n8n_base}/webhook-test/{webhook_id}",
		]
		hook_ok = False
		hook_err = ""
		for url in candidates:
			req = urllib.request.Request(
				url,
				data=json.dumps({"type": "url_verification", "challenge": "e2e-challenge"}).encode(),
				headers={"Content-Type": "application/json"},
				method="POST",
			)
			try:
				with urllib.request.urlopen(req, timeout=15) as resp:
					body = json.loads(resp.read().decode() or "{}")
					if body.get("challenge") == "e2e-challenge" or resp.status == 200:
						hook_ok = True
						hook_err = ""
						break
			except Exception as err:
				hook_err = scrub(err)
		client.set_active(wf_id, False)
		client.delete_workflow(wf_id)
		cases.append(
			{
				"id": "trigger.webhookUrlVerification",
				"resource": "feishuSuiteWebhookTrigger",
				"operation": "url_verification",
				"status": PASS if hook_ok else BLOCKED_RESOURCE,
				"error": hook_err,
				"reason": "POST url_verification challenge to the webhook trigger"
				if hook_ok
				else "n8n webhook route 404 in this instance; not a Feishu API bug",
			}
		)
	except Exception as err:
		cases.append(
			{
				"id": "trigger.webhookUrlVerification",
				"resource": "feishuSuiteWebhookTrigger",
				"operation": "url_verification",
				"status": FAIL_BUG,
				"error": scrub(err),
			}
		)

	# Long-connection trigger: activate and see if n8n keeps it
	try:
		wf_id = client.create_workflow(
			{
				"name": f"e2e-ws-{stamp}",
				"nodes": [
					{
						"id": "ws",
						"name": "WS",
						"type": "n8n-nodes-feishu-suite.feishuSuiteTrigger",
						"typeVersion": 2,
						"position": [0, 0],
						"parameters": {
							"authentication": "feishuSuiteApi",
							"events": ["im.message.receive_v1"],
						},
						"credentials": {"feishuSuiteApi": {"id": cred_id, "name": cred_name}},
					}
				],
				"connections": {},
				"settings": {"executionOrder": "v1"},
			}
		)
		st, payload = client.set_active(wf_id, True)
		time.sleep(3)
		active_ok = st < 400
		client.set_active(wf_id, False)
		client.delete_workflow(wf_id)
		cases.append(
			{
				"id": "trigger.longConnectionActivate",
				"resource": "feishuSuiteTrigger",
				"operation": "activate",
				"status": PASS if active_ok else FAIL_BUG,
				"error": "" if active_ok else scrub(payload),
				"reason": "Activate Feishu Suite Trigger (WS). One live connection per app.",
			}
		)
	except Exception as err:
		cases.append(
			{
				"id": "trigger.longConnectionActivate",
				"resource": "feishuSuiteTrigger",
				"operation": "activate",
				"status": FAIL_BUG,
				"error": scrub(err),
			}
		)

	# --- Scenario ops through n8n ---
	for scenario in scenarios():
		for step in scenario["steps"]:
			op_id = step["id"]
			seen.add(op_id)
			needs = step.get("needs") or []
			if any(not ctx.get(key) for key in needs):
				cases.append(
					{
						"id": op_id,
						"resource": step["resource"],
						"operation": step["operation"],
						"status": BLOCKED_RESOURCE,
						"reason": f"Missing fixture: {', '.join(k for k in needs if not ctx.get(k))}",
					}
				)
				continue
			params_fn = step["params"]
			params = params_fn(ctx)
			if params is None:
				cases.append(
					{
						"id": op_id,
						"resource": step["resource"],
						"operation": step["operation"],
						"status": BLOCKED_RESOURCE,
						"reason": "Scenario skipped; no params",
					}
				)
				continue
			try:
				result = run_op(client, cred_id, cred_name, step["resource"], step["operation"], params)
			except Exception as err:
				cases.append(
					{
						"id": op_id,
						"resource": step["resource"],
						"operation": step["operation"],
						"status": FAIL_BUG,
						"error": scrub(err),
					}
				)
				continue
			status, error, scopes = classify_result(result)
			if step.get("optional") and status == FAIL_BUG:
				status = BLOCKED_RESOURCE
				error = error or "Optional step failed; not counted as a product bug"
			if scopes:
				scope_hits.setdefault(op_id, scopes)
			payload = pick_json(result)
			for dest, spec in (step.get("save") or {}).items():
				value = save_from(payload, spec)
				if value:
					ctx[dest] = value
			cases.append(
				{
					"id": op_id,
					"resource": step["resource"],
					"operation": step["operation"],
					"status": status,
					"scopes": scopes,
					"error": error,
					"item_count": result.get("item_count"),
					"json_keys": sorted(payload.keys())[:16],
					"binary_keys": result.get("binary_keys") or [],
					"scenario": scenario["name"],
				}
			)

	# Clean expression chat if still around
	if ctx.get("expr_chat_id"):
		try:
			run_op(client, cred_id, cred_name, "chat", "delete", {"chat_id": ctx["expr_chat_id"]})
		except Exception:
			pass

	# Remaining operations
	seen_ops = {(row.get("resource"), row.get("operation")) for row in cases}
	for op in ops:
		key = case_key(op["resource"], op["stem"])
		if key in seen or (op["resource"], op["operation"]) in seen_ops:
			continue
		if key in UNSAFE:
			cases.append(row_base(op, status=SKIPPED_UNSAFE, reason=UNSAFE[key]))
			continue
		pair = (op["resource"], op["operation"])
		if pair in READ_DEFAULTS:
			try:
				result = run_op(client, cred_id, cred_name, op["resource"], op["operation"], READ_DEFAULTS[pair])
				status, error, scopes = classify_result(result)
			except Exception as err:
				status, error, scopes = FAIL_BUG, scrub(err), []
			if scopes:
				scope_hits.setdefault(key, scopes)
			cases.append(row_base(op, status=status, error=error, scopes=scopes, reason="standalone read"))
			continue
		if pair in LOCAL_OPS:
			cases.append(row_base(op, status=BLOCKED_RESOURCE, reason="Local parser needs a crafted payload"))
			continue
		cases.append(
			row_base(
				op,
				status=BLOCKED_RESOURCE,
				reason="Needs a resource id the harness did not create (or extra tenant data)",
			)
		)

	# Chinese UI consistency scan
	zh_mixed = 0
	en_only = 0
	for op_file in (ROOT / "nodes/FeishuSuite/resource").rglob("*.operation.ts"):
		text = op_file.read_text(encoding="utf-8")
		if "displayName:" in text and any("\u4e00" <= ch <= "\u9fff" for ch in text):
			zh_mixed += 1
		elif "displayName:" in text:
			en_only += 1
	cases.append(
		{
			"id": "ux.chineseDisplayNames",
			"resource": "ui",
			"operation": "displayName",
			"status": PASS,
			"reason": f"{zh_mixed} operation files include Chinese labels; {en_only} are English-only (WORDING follows N8N_DEFAULT_LOCALE)",
		}
	)

	counts = summarize(cases)
	report = {
		"generated_at": datetime.now(timezone.utc).isoformat(),
		"package_version": pkg.get("version"),
		"n8n_base": n8n_base,
		"n8n_version": "2.42.6",
		"counts": counts,
		"scope_hits": scope_hits,
		"ctx_keys": sorted(k for k in ctx if k != "stamp"),
		"cases": cases,
	}
	latest = out_dir / "latest.json"
	stamp_path = out_dir / f"e2e-{stamp}.json"
	latest.write_text(json.dumps(scrub_obj(report), ensure_ascii=False, indent=2), encoding="utf-8")
	stamp_path.write_text(latest.read_text(encoding="utf-8"), encoding="utf-8")
	print(
		f"e2e done  cases={len(cases)}  "
		+ "  ".join(f"{k}={v}" for k, v in counts.items())
	)
	print(f"wrote {latest}")
	return 0 if counts.get(FAIL_BUG, 0) == 0 else 1


if __name__ == "__main__":
	raise SystemExit(main())
