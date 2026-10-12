"""Redact secrets from e2e output. Never print App Secret / tokens."""

from __future__ import annotations

import json
import os
import re
from typing import Any

_SECRET_PARTS = [
	os.environ.get("FEISHU_APP_SECRET", ""),
	os.environ.get("FEISHU_APP_ID", ""),
	os.environ.get("N8N_PASSWORD", ""),
]
_TOKEN_RE = re.compile(r"\b(?:t-|u-|v-|cli_)[A-Za-z0-9_-]{8,}\b")


def scrub(value: Any) -> str:
	text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, default=str)
	for part in _SECRET_PARTS:
		if part:
			text = text.replace(part, "[redacted]")
	return _TOKEN_RE.sub("[redacted]", text)


def scrub_obj(value: Any) -> Any:
	if isinstance(value, str):
		return scrub(value)
	if isinstance(value, list):
		return [scrub_obj(item) for item in value]
	if isinstance(value, dict):
		return {str(key): scrub_obj(item) for key, item in value.items()}
	return value
