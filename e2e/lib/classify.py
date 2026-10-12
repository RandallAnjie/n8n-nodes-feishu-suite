"""Classify n8n/Feishu outcomes the way PoC staff will read them."""

from __future__ import annotations

import re
from typing import Any

SCOPE_RE = re.compile(r"[a-z][a-z0-9_.-]*:[a-z0-9_.:-]+", re.I)

PASS = "PASS"
FAIL_BUG = "FAIL-bug"
BLOCKED_SCOPE = "BLOCKED-missing-scope"
BLOCKED_RESOURCE = "BLOCKED-needs-resource"
SKIPPED_UNSAFE = "SKIPPED-unsafe"


def extract_scopes(text: str) -> list[str]:
	if not text:
		return []
	found: list[str] = []
	for block in re.findall(r"\[([^\]]+)\]", text):
		for part in re.split(r"[,，\s]+", block):
			if re.fullmatch(r"[a-z][a-z0-9_.-]*:[a-z0-9_.:-]+", part, re.I):
				found.append(part)
	if not found:
		found = [m.group(0) for m in SCOPE_RE.finditer(text)]
	clean = []
	for scope in found:
		if ".ts" in scope or scope.startswith("http") or "open.feishu" in scope:
			continue
		if not re.fullmatch(r"[a-z][a-z0-9_]*:[a-z][a-z0-9_.:-]+", scope, re.I):
			continue
		if scope.split(":")[-1].isdigit():
			continue
		clean.append(scope)
	return list(dict.fromkeys(clean))


def classify_error(error_text: str) -> tuple[str, list[str]]:
	text = error_text or ""
	scopes = extract_scopes(text)
	if (
		"99991672" in text
		or "Missing Feishu permission scope" in text
		or ("Access denied" in text and scopes)
		or ("Required scope" in text and scopes)
		or ("权限" in text and scopes)
	):
		return BLOCKED_SCOPE, scopes
	if any(
		needle in text
		for needle in (
			"40004",
			"no dept authority",
			"no user authority",
			"data-range",
			"232097",
			"docx type chat announcement",
			"No Webhook node found",
			"BLOCKED-needs-resource",
		)
	):
		return BLOCKED_RESOURCE, scopes
	if '"run_nodes": []' in text or "'run_nodes': []" in text:
		return BLOCKED_RESOURCE, scopes
	if "99991663" in text or "how-to-fix-99991663" in text:
		return BLOCKED_RESOURCE, scopes
	return FAIL_BUG, scopes


def summarize(rows: list[dict[str, Any]]) -> dict[str, int]:
	counts = {
		PASS: 0,
		FAIL_BUG: 0,
		BLOCKED_SCOPE: 0,
		BLOCKED_RESOURCE: 0,
		SKIPPED_UNSAFE: 0,
	}
	for row in rows:
		status = row.get("status")
		if status in counts:
			counts[status] += 1
	return counts
