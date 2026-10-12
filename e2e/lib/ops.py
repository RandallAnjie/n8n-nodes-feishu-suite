"""Parse ResourceFactory operation files so the harness covers every op."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

VALUE_RE = re.compile(
	r"value:\s*(?:OperationType\.\w+|['\"]([^'\"]+)['\"])",
)
ENUM_VALUE_RE = re.compile(r"(\w+)\s*=\s*'([^']+)'")
NAME_RE = re.compile(r"name:\s*(?:WORDING\.\w+|['\"]([^'\"]+)['\"])")
REQUIRED_RE = re.compile(r"name:\s*'([^']+)'[\s\S]{0,120}?required:\s*true")
DOC_RE = re.compile(r"href=\"(https://open\.feishu\.cn/document[^\"]+)\"")


def load_enum_values(repo_root: Path) -> dict[str, str]:
	text = (repo_root / "nodes/help/type/enums.ts").read_text(encoding="utf-8")
	block = text.split("export declare const enum OperationType", 1)[1]
	block = block.split("}", 1)[0]
	return {name: value for name, value in ENUM_VALUE_RE.findall(block)}


def load_operations(repo_root: Path) -> list[dict[str, Any]]:
	enum_values = load_enum_values(repo_root)
	resource_dir = repo_root / "nodes/FeishuSuite/resource"
	ops: list[dict[str, Any]] = []
	for folder in sorted(resource_dir.iterdir()):
		if not folder.is_dir():
			continue
		resource = folder.name
		for path in sorted(folder.glob("*.operation.ts")):
			text = path.read_text(encoding="utf-8")
			raw_value = None
			match = re.search(r"value:\s*OperationType\.(\w+)", text)
			if match:
				raw_value = enum_values.get(match.group(1))
			if not raw_value:
				quoted = re.search(r"value:\s*['\"]([^'\"]+)['\"]", text)
				raw_value = quoted.group(1) if quoted else path.stem
			name_match = NAME_RE.search(text)
			stem = path.name.replace(".operation.ts", "")
			ops.append(
				{
					"file": str(path.relative_to(repo_root)),
					"resource": resource,
					"operation": raw_value,
					"stem": stem,
					"name": name_match.group(1) if name_match and name_match.group(1) else path.stem,
					"required": sorted(set(REQUIRED_RE.findall(text))),
					"docs": DOC_RE.findall(text),
				}
			)
	return ops
