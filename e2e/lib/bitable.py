"""Bitable (多维表格) field fixtures and record payloads for the e2e harness."""

from __future__ import annotations

from typing import Any

from .n8n_client import rl

# Official field type numbers: https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-field/guide
FIELD_TEXT = 1
FIELD_NUMBER = 2
FIELD_SINGLE_SELECT = 3
FIELD_MULTI_SELECT = 4
FIELD_DATE = 5
FIELD_CHECKBOX = 7
FIELD_PERSON = 11
FIELD_PHONE = 13
FIELD_URL = 15
FIELD_ATTACHMENT = 17
FIELD_LINK = 18
FIELD_LOOKUP = 19
FIELD_FORMULA = 20
FIELD_DUPLEX = 21
FIELD_LOCATION = 22


def extra_fields(link_table_id: str | None = None) -> list[dict[str, Any]]:
	fields: list[dict[str, Any]] = [
		{"field_name": "Amount", "type": FIELD_NUMBER},
		{
			"field_name": "Status",
			"type": FIELD_SINGLE_SELECT,
			"property": {
				"options": [
					{"name": "Todo"},
					{"name": "Doing"},
					{"name": "Done"},
				]
			},
		},
		{
			"field_name": "Tags",
			"type": FIELD_MULTI_SELECT,
			"property": {"options": [{"name": "A"}, {"name": "B"}, {"name": "C"}]},
		},
		{
			"field_name": "Due",
			"type": FIELD_DATE,
			"property": {"date_formatter": "yyyy/MM/dd HH:mm"},
		},
		{"field_name": "Done", "type": FIELD_CHECKBOX},
		{"field_name": "Phone", "type": FIELD_PHONE},
		{"field_name": "Website", "type": FIELD_URL},
	]
	if link_table_id:
		fields.append(
			{
				"field_name": "Related",
				"type": FIELD_LINK,
				"property": {"multiple": False, "table_id": link_table_id},
			}
		)
	return fields


def sample_fields(stamp: str, due_ms: int) -> dict[str, Any]:
	return {
		"Name": f"row-{stamp}",
		"Amount": 21,
		"Status": "Doing",
		"Tags": ["A", "B"],
		"Due": due_ms,
		"Done": False,
		"Phone": "13800138000",
		"Website": "https://example.com",
	}


def bitable_steps() -> list[dict[str, Any]]:
	"""Create-cleanup Bitable coverage: app/table/view/field/record/batch/search/role."""

	def need(*keys: str):
		return list(keys)

	return [
		{
			"id": "base.AppCreate",
			"resource": "base",
			"operation": "createApp",
			"params": lambda ctx: {
				"name": f"n8n-e2e-base-{ctx['stamp']}",
				"folder_token": rl(ctx.get("bitable_folder") or ctx.get("folder_token") or ""),
				"options": {"time_zone": "Asia/Shanghai"},
			},
			"save": {
				"app_token": "app_token",
				"default_table_id": "default_table_id",
				"bitable_url": "url",
			},
		},
		{
			"id": "base.AppGetInfo",
			"resource": "base",
			"operation": "getAppInfo",
			"params": lambda ctx: {"app_token": rl(ctx["app_token"])} if ctx.get("app_token") else None,
			"needs": need("app_token"),
		},
		{
			"id": "base.ParseUrl",
			"resource": "base",
			"operation": "parseBitableUrl",
			"params": lambda ctx: {"url": ctx.get("bitable_url") or f"https://feishu.cn/base/{ctx.get('app_token')}"}
			if ctx.get("app_token")
			else None,
			"needs": need("app_token"),
		},
		{
			"id": "base.TableGetList",
			"resource": "base",
			"operation": "getTableList",
			"params": lambda ctx: {"app_token": rl(ctx["app_token"]), "returnAll": False, "limit": 20}
			if ctx.get("app_token")
			else None,
			"needs": need("app_token"),
			"save": {"table_id": "items[0].table_id|tables[0].table_id"},
		},
		{
			"id": "base.TableCreate",
			"resource": "base",
			"operation": "createTable",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"body": {
					"table": {
						"name": f"e2e_{ctx['stamp']}",
						"default_view_name": "Grid",
						"fields": [{"field_name": "Name", "type": FIELD_TEXT}],
					}
				},
			}
			if ctx.get("app_token")
			else None,
			"needs": need("app_token"),
			"save": {"table_id": "table_id", "default_view_id": "default_view_id"},
		},
		{
			"id": "base.TableCreateLink",
			"resource": "base",
			"operation": "createTable",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"body": {
					"table": {
						"name": f"e2e_link_{ctx['stamp']}",
						"fields": [{"field_name": "Title", "type": FIELD_TEXT}],
					}
				},
			}
			if ctx.get("app_token")
			else None,
			"needs": need("app_token"),
			"save": {"link_table_id": "table_id"},
		},
		{
			"id": "base.FieldBatchSave",
			"resource": "base",
			"operation": "batchSaveFields",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"fields": extra_fields(ctx.get("link_table_id")),
			}
			if ctx.get("app_token") and ctx.get("table_id")
			else None,
			"needs": need("app_token", "table_id"),
		},
		{
			"id": "base.FieldGetList",
			"resource": "base",
			"operation": "getFieldList",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"options": {"returnAll": True, "limit": 50},
			}
			if ctx.get("app_token") and ctx.get("table_id")
			else None,
			"needs": need("app_token", "table_id"),
			"save": {"field_id": "items[0].field_id"},
		},
		{
			"id": "base.FieldCreateFormula",
			"resource": "base",
			"operation": "createField",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"body": {
					"field_name": "Double",
					"type": FIELD_FORMULA,
					"property": {"formatter": "0.00", "formula_expression": "2*{Amount}"},
				},
			}
			if ctx.get("table_id")
			else None,
			"needs": ["table_id"],
			"optional": True,
		},
		{
			"id": "base.FieldCreatePerson",
			"resource": "base",
			"operation": "createField",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"body": {"field_name": "Owner", "type": FIELD_PERSON, "property": {"multiple": False}},
			}
			if ctx.get("table_id")
			else None,
			"needs": ["table_id"],
			"optional": True,
		},
		{
			"id": "base.FieldCreate",
			"resource": "base",
			"operation": "createField",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"body": {"field_name": "Notes", "type": FIELD_TEXT},
			}
			if ctx.get("app_token") and ctx.get("table_id")
			else None,
			"needs": need("app_token", "table_id"),
			"save": {"notes_field_id": "field.field_id|field_id"},
		},
		{
			"id": "base.ViewGetList",
			"resource": "base",
			"operation": "getViewList",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"options": {"returnAll": False, "limit": 20},
			}
			if ctx.get("app_token") and ctx.get("table_id")
			else None,
			"needs": need("app_token", "table_id"),
			"save": {"view_id": "items[0].view_id"},
		},
		{
			"id": "base.ViewCreate",
			"resource": "base",
			"operation": "createView",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"view_name": f"e2e-view-{ctx['stamp']}",
				"view_type": "grid",
			}
			if ctx.get("app_token") and ctx.get("table_id")
			else None,
			"needs": need("app_token", "table_id"),
			"save": {"view_id": "view_id"},
		},
		{
			"id": "base.ViewGetInfo",
			"resource": "base",
			"operation": "getViewInfo",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"view_id": rl(ctx["view_id"]),
			}
			if ctx.get("view_id")
			else None,
			"needs": need("view_id"),
		},
		{
			"id": "base.ViewUpdate",
			"resource": "base",
			"operation": "updateView",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"view_id": rl(ctx["view_id"]),
				"view_name": f"e2e-view-{ctx['stamp']}-upd",
			}
			if ctx.get("view_id")
			else None,
			"needs": need("view_id"),
		},
		{
			"id": "base.RecordCreate",
			"resource": "base",
			"operation": "createRecord",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"body": {"fields": sample_fields(ctx["stamp"], ctx.get("due_ms") or 1_767_225_600_000)},
			}
			if ctx.get("app_token") and ctx.get("table_id")
			else None,
			"needs": need("app_token", "table_id"),
			"save": {"record_id": "record.record_id|record_id"},
		},
		{
			"id": "base.RecordGet",
			"resource": "base",
			"operation": "getRecord",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"record_id": ctx.get("record_id"),
			}
			if ctx.get("record_id")
			else None,
			"needs": need("record_id"),
		},
		{
			"id": "base.RecordUpdate",
			"resource": "base",
			"operation": "updateRecord",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"record_id": ctx.get("record_id"),
				"body": {"fields": {"Name": f"row-{ctx['stamp']}-upd", "Done": True, "Amount": 42}},
			}
			if ctx.get("record_id")
			else None,
			"needs": need("record_id"),
		},
		{
			"id": "base.RecordExists",
			"resource": "base",
			"operation": "recordExists",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"field_name": "Name",
				"field_value": f"row-{ctx['stamp']}-upd",
			}
			if ctx.get("table_id")
			else None,
			"needs": need("table_id"),
		},
		{
			"id": "base.RecordUpsert",
			"resource": "base",
			"operation": "upsertRecord",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"field_name": "Name",
				"field_value": f"row-{ctx['stamp']}-upsert",
				"fields": {"Name": f"row-{ctx['stamp']}-upsert", "Amount": 7, "Status": "Todo"},
			}
			if ctx.get("table_id")
			else None,
			"needs": need("table_id"),
			"save": {"upsert_id": "record.record_id|record_id"},
		},
		{
			"id": "base.RecordSearch",
			"resource": "base",
			"operation": "searchRecords",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"whether_paging": False,
				"page_size": 20,
				"body": {
					"automatic_fields": False,
					"field_names": ["Name", "Amount", "Status", "Due", "Done"],
					"sort": [{"field_name": "Amount", "desc": True}],
					"filter": {
						"conjunction": "and",
						"conditions": [
							{"field_name": "Name", "operator": "contains", "value": [ctx["stamp"]]},
						],
					},
				},
			}
			if ctx.get("table_id")
			else None,
			"needs": need("table_id"),
		},
		{
			"id": "base.RecordGetList",
			"resource": "base",
			"operation": "getRecordList",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"record_ids": [rid for rid in (ctx.get("record_id"), ctx.get("upsert_id")) if rid],
			}
			if ctx.get("record_id")
			else None,
			"needs": need("record_id"),
		},
		{
			"id": "base.RecordBatchCreate",
			"resource": "base",
			"operation": "batchCreateRecords",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"body": {
					"records": [
						{"fields": {"Name": f"batch-{ctx['stamp']}-{i}", "Amount": i}}
						for i in range(ctx.get("batch_size") or 20)
					]
				},
			}
			if ctx.get("table_id")
			else None,
			"needs": need("table_id"),
		},
		{
			"id": "base.RecordSearchPage",
			"resource": "base",
			"operation": "searchRecords",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"whether_paging": True,
				"page_size": 5,
				"body": {
					"filter": {
						"conjunction": "and",
						"conditions": [
							{"field_name": "Name", "operator": "contains", "value": [f"batch-{ctx['stamp']}"]},
						],
					}
				},
			}
			if ctx.get("table_id")
			else None,
			"needs": need("table_id"),
			"save": {"page_token": "page_token"},
		},
		{
			"id": "base.AppUpdate",
			"resource": "base",
			"operation": "updateApp",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"name": f"n8n-e2e-base-{ctx['stamp']}-adv",
				"is_advanced": True,
			}
			if ctx.get("app_token")
			else None,
			"needs": need("app_token"),
		},
		{
			"id": "base.RoleGetList",
			"resource": "base",
			"operation": "getRoleList",
			"params": lambda ctx: {"app_token": rl(ctx["app_token"]), "whether_paging": False}
			if ctx.get("app_token")
			else None,
			"needs": need("app_token"),
		},
		{
			"id": "base.RoleCreate",
			"resource": "base",
			"operation": "createRole",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"body": {
					"role_name": f"e2e-role-{ctx['stamp']}",
					"table_roles": [{"table_id": ctx["table_id"], "table_perm": 1}],
				},
			}
			if ctx.get("app_token") and ctx.get("table_id")
			else None,
			"needs": need("app_token", "table_id"),
			"save": {"role_id": "role_id"},
		},
		{
			"id": "base.RoleDelete",
			"resource": "base",
			"operation": "deleteRole",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"role_id": rl(ctx["role_id"]),
			}
			if ctx.get("role_id")
			else None,
			"needs": need("role_id"),
			"cleanup": True,
		},
		{
			"id": "base.FieldUpdate",
			"resource": "base",
			"operation": "updateField",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"field_id": rl(ctx["notes_field_id"]),
				"body": {"field_name": "NotesUpd", "type": FIELD_TEXT},
			}
			if ctx.get("notes_field_id")
			else None,
			"needs": need("notes_field_id"),
		},
		{
			"id": "base.RecordDelete",
			"resource": "base",
			"operation": "deleteRecord",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"record_id": ctx.get("record_id"),
			}
			if ctx.get("record_id")
			else None,
			"needs": need("record_id"),
			"cleanup": True,
		},
		{
			"id": "base.ViewDelete",
			"resource": "base",
			"operation": "deleteView",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"view_id": rl(ctx["view_id"]),
			}
			if ctx.get("view_id")
			else None,
			"needs": need("view_id"),
			"cleanup": True,
		},
		{
			"id": "base.FieldDelete",
			"resource": "base",
			"operation": "deleteField",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["table_id"]),
				"field_id": rl(ctx["notes_field_id"]),
			}
			if ctx.get("notes_field_id")
			else None,
			"needs": need("notes_field_id"),
			"cleanup": True,
		},
		{
			"id": "base.TableDeleteLink",
			"resource": "base",
			"operation": "deleteTable",
			"params": lambda ctx: {
				"app_token": rl(ctx["app_token"]),
				"table_id": rl(ctx["link_table_id"]),
			}
			if ctx.get("link_table_id")
			else None,
			"needs": need("link_table_id"),
			"cleanup": True,
		},
	]
