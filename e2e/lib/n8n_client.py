"""Drive a real n8n 2.x editor via the same REST the UI uses."""

from __future__ import annotations

import json
import time
from http.cookiejar import CookieJar
from typing import Any
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener

from .redact import scrub, scrub_obj


def parse_flatted(raw: Any) -> Any:
	"""Decode n8n 2.x execution `data` (flatted JSON array)."""
	if isinstance(raw, dict):
		return raw
	if not isinstance(raw, str) or not raw:
		return raw
	try:
		data = json.loads(raw)
	except json.JSONDecodeError:
		return {}
	if not isinstance(data, list) or not data:
		return data

	def resolve(node: Any, seen: dict[int, Any]) -> Any:
		if isinstance(node, str) and node.isdigit():
			idx = int(node)
			if 0 <= idx < len(data):
				if idx in seen:
					if seen[idx] is not None:
						return seen[idx]
					placeholder: Any = {} if isinstance(data[idx], dict) else []
					seen[idx] = placeholder
					return placeholder
				seen[idx] = None
				val = resolve(data[idx], seen)
				seen[idx] = val
				return val
			return node
		if isinstance(node, list):
			return [resolve(item, seen) for item in node]
		if isinstance(node, dict):
			return {key: resolve(value, seen) for key, value in node.items()}
		return node

	return resolve(data[0], {0: None})


def rl(value: str) -> dict[str, Any]:
	return {"__rl": True, "mode": "id", "value": value}


class N8nClient:
	def __init__(self, base: str, email: str, password: str, browser_id: str = "feishu-e2e"):
		self.base = base.rstrip("/")
		self.email = email
		self.password = password
		self.browser_id = browser_id
		self.opener = build_opener(HTTPCookieProcessor(CookieJar()))

	def request(
		self,
		method: str,
		path: str,
		body: Any = None,
		timeout: int = 90,
	) -> tuple[int, Any]:
		data = None if body is None else json.dumps(body).encode()
		headers = {
			"Content-Type": "application/json",
			"Accept": "application/json",
			"browser-id": self.browser_id,
		}
		req = Request(self.base + path, data=data, headers=headers, method=method)
		try:
			with self.opener.open(req, timeout=timeout) as resp:
				raw = resp.read()
				payload = json.loads(raw.decode() or "null")
				return resp.status, payload
		except HTTPError as err:
			raw = err.read()
			try:
				payload = json.loads(raw.decode() or "null")
			except Exception:
				payload = {"raw": scrub(raw[:400].decode("utf-8", "replace"))}
			return err.code, payload

	def unwrap(self, payload: Any) -> Any:
		if isinstance(payload, dict) and isinstance(payload.get("data"), dict):
			inner = payload["data"]
			if any(key in inner for key in ("id", "status", "executionId", "finished", "data")):
				return inner
		return payload

	def login(self) -> None:
		status, _ = self.request(
			"POST",
			"/rest/login",
			{"emailOrLdapLoginId": self.email, "password": self.password},
		)
		if status >= 400:
			raise RuntimeError(f"n8n login failed HTTP {status}")

	def create_suite_credential(self, name: str, app_id: str, app_secret: str, url: str) -> str:
		if url in ("https://open.feishu.cn", "https://open.larksuite.com"):
			data = {"url": url, "appid": app_id, "appsecret": app_secret}
		else:
			data = {
				"url": "custom",
				"customUrl": url,
				"appid": app_id,
				"appsecret": app_secret,
			}
		status, payload = self.request(
			"POST",
			"/rest/credentials",
			{"name": name, "type": "feishuSuiteApi", "data": data},
		)
		created = self.unwrap(payload)
		cred_id = created.get("id") if isinstance(created, dict) else None
		if not cred_id:
			raise RuntimeError(f"credential create failed HTTP {status}: {scrub(payload)}")
		return str(cred_id)

	def test_credential(self, cred_id: str, name: str, app_id: str, app_secret: str, url: str) -> dict[str, Any]:
		status, payload = self.request(
			"POST",
			"/rest/credentials/test",
			{
				"credentials": {
					"id": cred_id,
					"name": name,
					"type": "feishuSuiteApi",
					"data": {
						"url": url,
						"appid": app_id,
						"appsecret": app_secret,
					},
				}
			},
		)
		inner = payload.get("data", payload) if isinstance(payload, dict) else {}
		return {
			"http": status,
			"status": inner.get("status") if isinstance(inner, dict) else None,
			"message": scrub(inner.get("message") if isinstance(inner, dict) else inner),
		}

	def create_workflow(self, body: dict[str, Any]) -> str:
		status, payload = self.request("POST", "/rest/workflows", body)
		wf = self.unwrap(payload)
		wf_id = wf.get("id") if isinstance(wf, dict) else None
		if not wf_id:
			raise RuntimeError(f"workflow create failed HTTP {status}: {scrub(payload)}")
		return str(wf_id)

	def set_active(self, wf_id: str, active: bool) -> tuple[int, Any]:
		return self.request("PATCH", f"/rest/workflows/{wf_id}", {"active": active})

	def delete_workflow(self, wf_id: str) -> None:
		self.request("DELETE", f"/rest/workflows/{wf_id}")

	def run_workflow(self, wf_id: str, trigger_name: str = "Start") -> str:
		status, payload = self.request(
			"POST",
			f"/rest/workflows/{wf_id}/run",
			{"triggerToStartFrom": {"name": trigger_name}},
		)
		run = self.unwrap(payload)
		exec_id = run.get("executionId") if isinstance(run, dict) else None
		if not exec_id:
			raise RuntimeError(f"workflow run failed HTTP {status}: {scrub(payload)}")
		return str(exec_id)

	def wait_execution(self, exec_id: str, timeout_s: int = 90) -> dict[str, Any]:
		deadline = time.time() + timeout_s
		last: dict[str, Any] = {}
		while time.time() < deadline:
			_, payload = self.request("GET", f"/rest/executions/{exec_id}?includeData=true")
			data = payload.get("data", payload) if isinstance(payload, dict) else {}
			if not isinstance(data, dict):
				time.sleep(0.5)
				continue
			last = data
			if data.get("status") in ("success", "error", "crashed", "canceled") or data.get("finished"):
				return data
			time.sleep(0.4)
		return last or {"status": "timeout"}

	def extract_node_result(self, execution: dict[str, Any], node_name: str) -> dict[str, Any]:
		inner = execution.get("data", execution)
		if isinstance(inner, str):
			inner = parse_flatted(inner)
		elif isinstance(inner, dict) and isinstance(inner.get("data"), str):
			inner = parse_flatted(inner["data"])
		run_data = {}
		if isinstance(inner, dict):
			run_data = inner.get("resultData", {}).get("runData", {}) or {}
			if not run_data:
				nested = inner.get("data", {})
				if isinstance(nested, dict):
					run_data = nested.get("resultData", {}).get("runData", {}) or {}
		node_run = run_data.get(node_name) or []
		result: dict[str, Any] = {
			"status": execution.get("status"),
			"finished": execution.get("finished"),
			"run_nodes": list(run_data.keys()) if isinstance(run_data, dict) else [],
		}
		if node_run:
			first = node_run[0] if isinstance(node_run, list) else {}
			err = first.get("error") if isinstance(first, dict) else None
			if isinstance(err, dict):
				result["error"] = scrub(
					" ".join(
						str(err.get(key) or "")
						for key in ("message", "description", "httpCode")
					)
				)
				result["error_raw"] = scrub_obj(err)
			else:
				result["error"] = scrub_obj(err) if err else None
			items = []
			if isinstance(first, dict):
				items = (((first.get("data") or {}).get("main") or [[]])[0]) or []
			result["item_count"] = len(items)
			if items:
				result["json"] = scrub_obj(items[0].get("json") or {})
				result["binary_keys"] = list((items[0].get("binary") or {}).keys())
		return result

	def run_feishu_op(
		self,
		*,
		cred_id: str,
		cred_name: str,
		resource: str,
		operation: str,
		parameters: dict[str, Any],
		continue_on_fail: bool = False,
		node_name: str = "Feishu",
	) -> dict[str, Any]:
		params = {
			"authentication": "feishuSuiteApi",
			"resource": resource,
			"operation": operation,
			**parameters,
		}
		wf_id = self.create_workflow(
			{
				"name": f"e2e-{resource}-{operation}"[:80],
				"nodes": [
					{
						"id": "start",
						"name": "Start",
						"type": "n8n-nodes-base.manualTrigger",
						"typeVersion": 1,
						"position": [0, 0],
						"parameters": {},
					},
					{
						"id": "feishu",
						"name": node_name,
						"type": "n8n-nodes-feishu-suite.feishuSuite",
						"typeVersion": 1,
						"position": [280, 0],
						"parameters": params,
						"credentials": {"feishuSuiteApi": {"id": cred_id, "name": cred_name}},
						"continueOnFail": continue_on_fail,
					},
				],
				"connections": {"Start": {"main": [[{"node": node_name, "type": "main", "index": 0}]]}},
				"settings": {"executionOrder": "v1"},
			}
		)
		try:
			exec_id = self.run_workflow(wf_id)
			execution = self.wait_execution(exec_id)
			return self.extract_node_result(execution, node_name)
		finally:
			try:
				self.delete_workflow(wf_id)
			except Exception:
				pass
