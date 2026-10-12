#!/usr/bin/env python3
"""Print the latest e2e result matrix."""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

DEFAULT = Path(__file__).resolve().parent / "results" / "latest.json"


def main() -> int:
	path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
	if not path.exists():
		print(f"No results file at {path}. Run: python3 e2e/run.py")
		return 1
	data = json.loads(path.read_text(encoding="utf-8"))
	rows = data.get("cases", [])
	counts = Counter(row.get("status") for row in rows)
	print(f"n8n-nodes-feishu-suite e2e  {data.get('package_version')}  {data.get('n8n_version')}")
	print(f"cases={len(rows)}  " + "  ".join(f"{k}={counts.get(k, 0)}" for k in (
		"PASS",
		"FAIL-bug",
		"BLOCKED-missing-scope",
		"BLOCKED-needs-resource",
		"SKIPPED-unsafe",
	)))
	print("")
	print(f"{'status':<24} {'id':<36} {'resource':<16} {'operation':<28} detail")
	print("-" * 140)
	for row in rows:
		detail = row.get("scopes") or row.get("reason") or row.get("error") or ""
		if isinstance(detail, list):
			detail = ", ".join(detail)
		detail = str(detail).replace("\n", " ")[:80]
		print(
			f"{row.get('status', ''):<24} {row.get('id', ''):<36} {row.get('resource', ''):<16} {row.get('operation', ''):<28} {detail}"
		)
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
