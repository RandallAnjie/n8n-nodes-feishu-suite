"""Safety rules, default read params, and create-cleanup scenarios."""

from __future__ import annotations

from typing import Any, Callable

from .bitable import bitable_steps
from .n8n_client import rl

UNSAFE: dict[str, str] = {
	"approval.InstanceCreate": "No approval submissions in PoC tenant",
	"approval.TaskApprove": "Would approve a real approval task",
	"approval.TaskReject": "Would reject a real approval task",
	"approval.TaskTransfer": "Would transfer a real approval task",
	"approval.InstanceCc": "Would CC a real approval instance",
	"approval.InstanceCancel": "Would cancel a real approval instance",
	"mail.MessageSend": "No mail sending to external addresses",
	"message.BatchMessageSend": "Batch send can reach real users",
	"message.MessageUrgent": "Urgent ping would notify real people",
	"message.SendAndWait": "Interactive wait is not safe in unattended e2e",
	"message.StreamMessage": "Needs an external webhook stream source",
	"contacts.UserCreate": "Would create a real directory user",
	"contacts.UserUpdate": "Would mutate a real directory user",
	"contacts.UserDelete": "Would delete a real directory user",
	"contacts.DepartmentCreate": "Would mutate the real org tree",
	"contacts.DepartmentUpdate": "Would mutate the real org tree",
	"contacts.DepartmentDelete": "Would mutate the real org tree",
	"wiki_spaces.MemberAdd": "Would add members to a real wiki space",
	"wiki_spaces.MemberDelete": "Would remove members from a real wiki space",
	"wiki_spaces.Setting": "Would change settings on a real wiki space",
	"calendar.MeetingChatCreate": "Binds a meeting chat on a real calendar",
	"calendar.MeetingChatUnbind": "Unbinds a meeting chat on a real calendar",
}

LOCAL_OPS = {
	("message", "parseContent"),
	("message", "parseWebhook"),
	("message", "decryptEvent"),
}

READ_DEFAULTS: dict[tuple[str, str], dict[str, Any]] = {
	("wiki_spaces", "getWikiSpaceList"): {"page_size": 20, "lang": "zh"},
	("chat", "getList"): {"returnAll": False, "limit": 10, "sort_type": "ByCreateTimeAsc", "user_id_type": "open_id"},
	("calendar", "getList"): {"whether_paging": False, "page_size": 50},
	("calendar", "getPrimaryInfo"): {},
	("task", "listTasklists"): {"returnAll": False, "limit": 10, "user_id_type": "open_id"},
	("task", "getTaskList"): {"returnAll": False, "limit": 10, "user_id_type": "open_id"},
	("contacts", "listUsers"): {"returnAll": False, "limit": 5, "user_id_type": "open_id", "department_id": "0"},
	("contacts", "getDepartmentChildren"): {"department_id": "0", "user_id_type": "open_id"},
	("mail", "listMailGroups"): {"returnAll": False, "limit": 10},
	("attendance", "listAttendanceGroups"): {"returnAll": False, "limit": 10},
	("attendance", "listAttendanceShifts"): {"returnAll": False, "limit": 10},
	("vc", "listRooms"): {"returnAll": False, "limit": 10},
	("aily", "ailyListSkills"): {"returnAll": False, "limit": 10},
	("space", "getRootFolderMeta"): {},
	("search", "searchDocs"): {"query": "n8n-e2e", "page_size": 5},
	("search", "searchSuiteMessages"): {"query": "n8n-e2e", "page_size": 5},
	("approval", "listApprovalInstances"): {"returnAll": False, "limit": 5},
	("approval", "queryApprovalInstances"): {},
	("approval", "searchApprovalTasks"): {},
	("message", "getMessageList"): {"container_id_type": "chat", "returnAll": False, "limit": 5},
}


def case_key(resource: str, stem: str) -> str:
	return f"{resource}.{stem}"


ParamFn = Callable[[dict[str, Any]], dict[str, Any] | None]


def _stamp(ctx: dict[str, Any]) -> str:
	return ctx.setdefault("stamp", "e2e")


def scenarios() -> list[dict[str, Any]]:
	"""Ordered create / read / cleanup flows. Each step can write ctx."""

	def send_text(ctx: dict[str, Any]) -> dict[str, Any] | None:
		chat_id = ctx.get("chat_id")
		if not chat_id:
			return None
		return {
			"receive_id_type": "chat_id",
			"receive_id": rl(chat_id),
			"msg_type": "text",
			"content": {"text": f"n8n-e2e harness {_stamp(ctx)}"},
		}

	return [
		{
			"name": "local-parse",
			"steps": [
				{
					"id": "message.ContentParse",
					"resource": "message",
					"operation": "parseContent",
					"params": lambda ctx: {"content": {"text": "hello e2e"}, "msg_type": "text"},
					"save": {},
				},
				{
					"id": "message.WebhookParse",
					"resource": "message",
					"operation": "parseWebhook",
					"params": lambda ctx: {
						"events": ["im.message.receive_v1"],
						"encryptKey": "",
					},
					"optional": True,
				},
			],
		},
		{
			"name": "wiki-read",
			"steps": [
				{
					"id": "wiki_spaces.GetList",
					"resource": "wiki_spaces",
					"operation": "getWikiSpaceList",
					"params": lambda ctx: {"page_size": 20, "lang": "zh"},
					"save": {"space_id": "items[0].space_id|spaces[0].space_id|data.items[0].space_id"},
				},
				{
					"id": "wiki_spaces.GetInfo",
					"resource": "wiki_spaces",
					"operation": "getSpaceInfo",
					"params": lambda ctx: {"space_id": ctx.get("space_id"), "lang": "zh"}
					if ctx.get("space_id")
					else None,
					"needs": ["space_id"],
				},
				{
					"id": "wiki_spaces.MembersGet",
					"resource": "wiki_spaces",
					"operation": "getSpaceMembers",
					"params": lambda ctx: {"space_id": ctx.get("space_id")} if ctx.get("space_id") else None,
					"needs": ["space_id"],
				},
				{
					"id": "wiki_spaces.NodeGetChildren",
					"resource": "wiki_spaces",
					"operation": "getSpaceNodeChildren",
					"params": lambda ctx: {"space_id": ctx.get("space_id")} if ctx.get("space_id") else None,
					"needs": ["space_id"],
				},
			],
		},
		{
			"name": "im-bot-chat",
			"steps": [
				{
					"id": "chat.ChatGetList",
					"resource": "chat",
					"operation": "getList",
					"params": lambda ctx: {
						"returnAll": False,
						"limit": 10,
						"sort_type": "ByCreateTimeAsc",
						"user_id_type": "open_id",
					},
				},
				{
					"id": "chat.ChatCreate",
					"resource": "chat",
					"operation": "create",
					"params": lambda ctx: {
						"name": f"n8n-e2e-{_stamp(ctx)}",
						"description": "Harness-created bot-only group. Safe to delete.",
						"chat_type": "private",
						"user_id_list": [],
						"bot_id_list": [],
					},
					"save": {"chat_id": "chat_id"},
				},
				{
					"id": "chat.ChatGetInfo",
					"resource": "chat",
					"operation": "getInfo",
					"params": lambda ctx: {"chat_id": ctx["chat_id"]} if ctx.get("chat_id") else None,
					"needs": ["chat_id"],
				},
				{
					"id": "chat.ChatGetMembers",
					"resource": "chat",
					"operation": "getMembers",
					"params": lambda ctx: {"chat_id": ctx["chat_id"], "returnAll": False, "limit": 20}
					if ctx.get("chat_id")
					else None,
					"needs": ["chat_id"],
				},
				{
					"id": "chat.ChatIsInChat",
					"resource": "chat",
					"operation": "isInChat",
					"params": lambda ctx: {"chat_id": ctx["chat_id"]} if ctx.get("chat_id") else None,
					"needs": ["chat_id"],
				},
				{
					"id": "chat.ChatGetLink",
					"resource": "chat",
					"operation": "getLink",
					"params": lambda ctx: {"chat_id": ctx["chat_id"]} if ctx.get("chat_id") else None,
					"needs": ["chat_id"],
				},
				{
					"id": "chat.ChatGetAnnouncement",
					"resource": "chat",
					"operation": "getAnnouncement",
					"params": lambda ctx: {"chat_id": ctx["chat_id"]} if ctx.get("chat_id") else None,
					"needs": ["chat_id"],
				},
				{
					"id": "message.Send",
					"resource": "message",
					"operation": "send",
					"params": send_text,
					"needs": ["chat_id"],
					"save": {"message_id": "message_id"},
				},
				{
					"id": "message.GetMessage",
					"resource": "message",
					"operation": "getMessage",
					"params": lambda ctx: {"message_id": ctx.get("message_id")} if ctx.get("message_id") else None,
					"needs": ["message_id"],
				},
				{
					"id": "message.Reply",
					"resource": "message",
					"operation": "reply",
					"params": lambda ctx: {
						"message_id": ctx.get("message_id"),
						"msg_type": "text",
						"content": {"text": "e2e-reply"},
					}
					if ctx.get("message_id")
					else None,
					"needs": ["message_id"],
					"save": {"reply_id": "message_id"},
				},
				{
					"id": "message.Edit",
					"resource": "message",
					"operation": "edit",
					"params": lambda ctx: {
						"message_id": ctx.get("message_id"),
						"edit_msg_type": "text",
						"content": {"text": "e2e-edited"},
					}
					if ctx.get("message_id")
					else None,
					"needs": ["message_id"],
				},
				{
					"id": "message.MessageReactionAdd",
					"resource": "message",
					"operation": "addReaction",
					"params": lambda ctx: {
						"message_id": ctx.get("message_id"),
						"emoji_type": "THUMBSUP",
					}
					if ctx.get("message_id")
					else None,
					"needs": ["message_id"],
					"save": {"reaction_id": "reaction_id"},
				},
				{
					"id": "message.MessageReactionList",
					"resource": "message",
					"operation": "getReactionList",
					"params": lambda ctx: {"message_id": ctx.get("message_id"), "returnAll": False, "limit": 10}
					if ctx.get("message_id")
					else None,
					"needs": ["message_id"],
				},
				{
					"id": "message.MessagePin",
					"resource": "message",
					"operation": "pinMessage",
					"params": lambda ctx: {"message_id": ctx.get("message_id")} if ctx.get("message_id") else None,
					"needs": ["message_id"],
				},
				{
					"id": "message.MessagePinList",
					"resource": "message",
					"operation": "getPinList",
					"params": lambda ctx: {
						"chat_id": ctx.get("chat_id"),
						"returnAll": False,
						"limit": 10,
					}
					if ctx.get("chat_id")
					else None,
					"needs": ["chat_id"],
				},
				{
					"id": "message.MessageUnpin",
					"resource": "message",
					"operation": "unpinMessage",
					"params": lambda ctx: {"message_id": ctx.get("message_id")} if ctx.get("message_id") else None,
					"needs": ["message_id"],
				},
				{
					"id": "message.Recall",
					"resource": "message",
					"operation": "recall",
					"params": lambda ctx: {"message_id": ctx.get("reply_id") or ctx.get("message_id")}
					if ctx.get("reply_id") or ctx.get("message_id")
					else None,
					"needs": ["message_id"],
				},
				{
					"id": "chat.ChatUpdate",
					"resource": "chat",
					"operation": "update",
					"params": lambda ctx: {
						"chat_id": ctx["chat_id"],
						"name": f"n8n-e2e-{_stamp(ctx)}-upd",
					}
					if ctx.get("chat_id")
					else None,
					"needs": ["chat_id"],
				},
				{
					"id": "chat.ChatDelete",
					"resource": "chat",
					"operation": "delete",
					"params": lambda ctx: {"chat_id": ctx["chat_id"]} if ctx.get("chat_id") else None,
					"needs": ["chat_id"],
					"cleanup": True,
				},
			],
		},
		{
			"name": "docs-workspace",
			"steps": [
				{
					"id": "space.RootFolderMeta",
					"resource": "space",
					"operation": "getRootFolderMeta",
					"params": lambda ctx: {},
					"save": {"root_token": "token"},
				},
				{
					"id": "space.FolderCreate",
					"resource": "space",
					"operation": "createFolder",
					"params": lambda ctx: {
						"name": f"n8n-e2e-{_stamp(ctx)}",
						"folder_token": rl(ctx.get("root_token") or ""),
					},
					"save": {"folder_token": "token"},
				},
				{
					"id": "space.FolderMeta",
					"resource": "space",
					"operation": "getFolderMeta",
					"params": lambda ctx: {"folder_token": ctx["folder_token"]} if ctx.get("folder_token") else None,
					"needs": ["folder_token"],
				},
				{
					"id": "space.FileGetList",
					"resource": "space",
					"operation": "getFileList",
					"params": lambda ctx: {
						"space_file_type": ["bitable", "doc", "sheet", "folder"],
					},
				},
				{
					"id": "document.Create",
					"resource": "document",
					"operation": "create",
					"params": lambda ctx: {
						"title": f"n8n-e2e-doc-{_stamp(ctx)}",
						"folder_token": rl(ctx.get("folder_token") or ""),
					},
					"save": {"document_id": "document_id"},
				},
				{
					"id": "document.GetInfo",
					"resource": "document",
					"operation": "get",
					"params": lambda ctx: {"document_id": ctx.get("document_id")} if ctx.get("document_id") else None,
					"needs": ["document_id"],
				},
				{
					"id": "document.GetRawContent",
					"resource": "document",
					"operation": "getRawContent",
					"params": lambda ctx: {"document_id": ctx.get("document_id")} if ctx.get("document_id") else None,
					"needs": ["document_id"],
				},
				{
					"id": "document.GetBlockList",
					"resource": "document",
					"operation": "getBlocks",
					"params": lambda ctx: {"document_id": ctx.get("document_id"), "returnAll": False, "limit": 20}
					if ctx.get("document_id")
					else None,
					"needs": ["document_id"],
				},
				{
					"id": "spreadsheet.Create",
					"resource": "spreadsheet",
					"operation": "create",
					"params": lambda ctx: {
						"title": f"n8n-e2e-sheet-{_stamp(ctx)}",
						"folder_token": rl(ctx.get("folder_token") or ""),
					},
					"save": {"spreadsheet_token": "spreadsheet_token"},
				},
				{
					"id": "spreadsheet.GetInfo",
					"resource": "spreadsheet",
					"operation": "get",
					"params": lambda ctx: {"spreadsheet_id": rl(ctx["spreadsheet_token"])}
					if ctx.get("spreadsheet_token")
					else None,
					"needs": ["spreadsheet_token"],
				},
				{
					"id": "spreadsheet.SheetsGetList",
					"resource": "spreadsheet",
					"operation": "getSheetList",
					"params": lambda ctx: {"spreadsheet_id": rl(ctx["spreadsheet_token"])}
					if ctx.get("spreadsheet_token")
					else None,
					"needs": ["spreadsheet_token"],
					"save": {"sheet_id": "sheet_id|sheets[0].sheet_id|[0].sheet_id"},
				},
				{
					"id": "spreadsheet.ValuesWrite",
					"resource": "spreadsheet",
					"operation": "writeValues",
					"params": lambda ctx: {
						"spreadsheet_id": rl(ctx["spreadsheet_token"]),
						"sheet_id": rl(ctx.get("sheet_id") or "Sheet1"),
						"range": "!A1:B1",
						"values": [["e2e", _stamp(ctx)]],
					}
					if ctx.get("spreadsheet_token")
					else None,
					"needs": ["spreadsheet_token"],
				},
				{
					"id": "spreadsheet.ValuesRead",
					"resource": "spreadsheet",
					"operation": "readValues",
					"params": lambda ctx: {
						"spreadsheet_id": rl(ctx["spreadsheet_token"]),
						"sheet_id": rl(ctx.get("sheet_id") or "Sheet1"),
						"range": "!A1:B1",
					}
					if ctx.get("spreadsheet_token")
					else None,
					"needs": ["spreadsheet_token"],
				},
				{
					"id": "space.FileFolderDelete",
					"resource": "space",
					"operation": "deleteFileOrFolder",
					"params": lambda ctx: {
						"file_token": rl(ctx["folder_token"]),
						"space_file_type": "folder",
					}
					if ctx.get("folder_token")
					else None,
					"needs": ["folder_token"],
					"cleanup": True,
				},
			],
		},
		{
			"name": "bitable-lifecycle",
			"steps": [
				{
					"id": "space.RootFolderMetaBitable",
					"resource": "space",
					"operation": "getRootFolderMeta",
					"params": lambda ctx: {},
					"save": {"root_token": "token"},
				},
				{
					"id": "space.FolderCreateBitable",
					"resource": "space",
					"operation": "createFolder",
					"params": lambda ctx: {
						"name": f"n8n-e2e-bitable-{_stamp(ctx)}",
						"folder_token": rl(ctx.get("root_token") or ""),
					},
					"save": {"bitable_folder": "token"},
				},
				*bitable_steps(),
				{
					"id": "space.FileFolderDeleteBitable",
					"resource": "space",
					"operation": "deleteFileOrFolder",
					"params": lambda ctx: {
						"file_token": rl(ctx["bitable_folder"]),
						"space_file_type": "folder",
					}
					if ctx.get("bitable_folder")
					else None,
					"needs": ["bitable_folder"],
					"cleanup": True,
				},
			],
		},
		{
			"name": "task-lifecycle",
			"steps": [
				{
					"id": "task.TasklistList",
					"resource": "task",
					"operation": "listTasklists",
					"params": lambda ctx: {"returnAll": False, "limit": 10, "user_id_type": "open_id"},
				},
				{
					"id": "task.TasklistCreate",
					"resource": "task",
					"operation": "createTasklist",
					"params": lambda ctx: {
						"user_id_type": "open_id",
						"body": {"name": f"n8n-e2e-list-{_stamp(ctx)}"},
					},
					"save": {"tasklist_guid": "guid|tasklist.guid"},
				},
				{
					"id": "task.Create",
					"resource": "task",
					"operation": "create",
					"params": lambda ctx: {
						"summary": f"n8n-e2e-task-{_stamp(ctx)}",
						"description": "harness",
						"user_id_type": "open_id",
						"body": {"summary": f"n8n-e2e-task-{_stamp(ctx)}"},
					},
					"save": {"task_guid": "guid|task.guid"},
				},
				{
					"id": "task.GetInfo",
					"resource": "task",
					"operation": "getInfo",
					"params": lambda ctx: {"task_guid": ctx.get("task_guid"), "user_id_type": "open_id"}
					if ctx.get("task_guid")
					else None,
					"needs": ["task_guid"],
				},
				{
					"id": "task.Update",
					"resource": "task",
					"operation": "update",
					"params": lambda ctx: {
						"task_guid": ctx.get("task_guid"),
						"user_id_type": "open_id",
						"body": {
							"task": {"summary": f"n8n-e2e-task-{_stamp(ctx)}-upd"},
							"update_fields": ["summary"],
						},
					}
					if ctx.get("task_guid")
					else None,
					"needs": ["task_guid"],
				},
				{
					"id": "task.CommentCreate",
					"resource": "task",
					"operation": "createTaskComment",
					"params": lambda ctx: {
						"task_guid": ctx.get("task_guid"),
						"content": "e2e comment",
						"body": {},
					}
					if ctx.get("task_guid")
					else None,
					"needs": ["task_guid"],
					"save": {"comment_id": "id|comment.id"},
				},
				{
					"id": "task.CommentList",
					"resource": "task",
					"operation": "listTaskComments",
					"params": lambda ctx: {
						"resource_id": ctx.get("task_guid"),
						"resource_type": "task",
						"returnAll": False,
						"limit": 10,
					}
					if ctx.get("task_guid")
					else None,
					"needs": ["task_guid"],
				},
				{
					"id": "task.Delete",
					"resource": "task",
					"operation": "delete",
					"params": lambda ctx: {"task_guid": ctx.get("task_guid")} if ctx.get("task_guid") else None,
					"needs": ["task_guid"],
					"cleanup": True,
				},
				{
					"id": "task.TasklistDelete",
					"resource": "task",
					"operation": "deleteTasklist",
					"params": lambda ctx: {"tasklist_guid": ctx.get("tasklist_guid")}
					if ctx.get("tasklist_guid")
					else None,
					"needs": ["tasklist_guid"],
					"cleanup": True,
				},
			],
		},
		{
			"name": "calendar-read",
			"steps": [
				{
					"id": "calendar.GetPrimaryInfo",
					"resource": "calendar",
					"operation": "getPrimaryInfo",
					"params": lambda ctx: {},
					"save": {"calendar_id": "calendars[0].calendar.calendar_id|calendar_id"},
				},
				{
					"id": "calendar.GetList",
					"resource": "calendar",
					"operation": "getList",
					"params": lambda ctx: {"whether_paging": False, "page_size": 50},
				},
			],
		},
		{
			"name": "contacts-read",
			"steps": [
				{
					"id": "contacts.DepartmentChildren",
					"resource": "contacts",
					"operation": "getDepartmentChildren",
					"params": lambda ctx: {"department_id": "0", "user_id_type": "open_id"},
				},
				{
					"id": "contacts.UserList",
					"resource": "contacts",
					"operation": "listUsers",
					"params": lambda ctx: {
						"department_id": "0",
						"returnAll": False,
						"limit": 5,
						"user_id_type": "open_id",
					},
				},
				{
					"id": "contacts.UserSearch",
					"resource": "contacts",
					"operation": "searchUsers",
					"params": lambda ctx: {"query": "e2e", "user_id_type": "open_id"},
				},
			],
		},
		{
			"name": "module-reads",
			"steps": [
				{
					"id": "approval.InstanceList",
					"resource": "approval",
					"operation": "listApprovalInstances",
					"params": lambda ctx: {"returnAll": False, "limit": 5},
				},
				{
					"id": "mail.MailGroupList",
					"resource": "mail",
					"operation": "listMailGroups",
					"params": lambda ctx: {"returnAll": False, "limit": 10},
				},
				{
					"id": "attendance.GroupList",
					"resource": "attendance",
					"operation": "listAttendanceGroups",
					"params": lambda ctx: {"returnAll": False, "limit": 10},
				},
				{
					"id": "attendance.ShiftList",
					"resource": "attendance",
					"operation": "listAttendanceShifts",
					"params": lambda ctx: {"returnAll": False, "limit": 10},
				},
				{
					"id": "vc.RoomList",
					"resource": "vc",
					"operation": "listRooms",
					"params": lambda ctx: {"returnAll": False, "limit": 10},
				},
				{
					"id": "aily.SkillsList",
					"resource": "aily",
					"operation": "ailyListSkills",
					"params": lambda ctx: {"returnAll": False, "limit": 10},
				},
				{
					"id": "search.DocsSearch",
					"resource": "search",
					"operation": "searchDocs",
					"params": lambda ctx: {"query": "n8n-e2e"},
				},
			],
		},
	]
