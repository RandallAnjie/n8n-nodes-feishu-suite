export const FEISHU_MISSING_SCOPE_CODE = 99991672;
export const FEISHU_CONTACTS_NO_AUTHORITY_CODE = 40004;
export const FEISHU_CHAT_ANNOUNCEMENT_DOCX_CODE = 232097;

const SCOPE_TOKEN = /[a-z][a-z0-9_]*:[a-z][a-z0-9_.:-]+/gi;

function isFeishuScopeName(scope: string): boolean {
	return (
		/^[a-z][a-z0-9_]*:[a-z][a-z0-9_.:-]+$/i.test(scope) &&
		!scope.includes('.ts') &&
		!/:\d+$/.test(scope)
	);
}

export function extractFeishuScopes(text?: string): string[] {
	if (!text) {
		return [];
	}
	const found = new Set<string>();
	for (const block of text.match(/\[([^\]]+)\]/g) ?? []) {
		for (const part of block.slice(1, -1).split(/[,，\s]+/)) {
			const scope = part.trim();
			if (isFeishuScopeName(scope)) {
				found.add(scope);
			}
		}
	}
	if (found.size === 0) {
		for (const match of text.match(SCOPE_TOKEN) ?? []) {
			if (isFeishuScopeName(match)) {
				found.add(match);
			}
		}
	}
	return [...found];
}

export function isMissingScopeError(code?: number, msg?: string): boolean {
	if (code === FEISHU_MISSING_SCOPE_CODE) {
		return true;
	}
	return /scope|权限范围|access denied/i.test(msg ?? '') && extractFeishuScopes(msg).length > 0;
}

export function formatFeishuBusinessError(
	code: number,
	msg?: string,
	troubleshooter?: string,
): { message: string; description: string; scopes: string[] } {
	const scopes = extractFeishuScopes(`${msg ?? ''} ${troubleshooter ?? ''}`);
	const missingScope = isMissingScopeError(code, msg) || scopes.length > 0 && /scope|权限/i.test(msg ?? '');

	if (missingScope) {
		const scopeText = scopes.length ? scopes.join(', ') : '(see Feishu message)';
		return {
			message: `Missing Feishu permission scope (code ${code}): ${scopeText}`,
			description: [
				msg ? `Feishu: ${msg}` : '',
				troubleshooter || '',
				`Required scope(s): ${scopeText}. Open Feishu Developer Console → Permissions & scopes (开发者后台 → 权限管理), apply the scope for tenant_access_token.`,
				'If these scopes already show as granted, create and publish a new app version (版本管理与发布) and have the tenant admin authorize it. Also configure the data range (数据权限). token_type=tenant means tenant_access_token scopes, not user scopes.',
			]
				.filter(Boolean)
				.join('\n'),
			scopes,
		};
	}

	if (
		code === FEISHU_CHAT_ANNOUNCEMENT_DOCX_CODE ||
		/docx type chat announcement/i.test(msg ?? '')
	) {
		return {
			message: `Feishu chat announcement is now a Docx document (code ${code}). The legacy IM announcement API cannot operate it.`,
			description: [
				msg ? `Feishu: ${msg}` : '',
				troubleshooter || '',
				'New groups use Docx announcements. Read chat info for the announcement document_id and use the Document resource, or skip this operation for new groups.',
			]
				.filter(Boolean)
				.join('\n'),
			scopes,
		};
	}

	if (code === 1254068 || /URLFieldConvFail/i.test(msg ?? '')) {
		return {
			message: `Bitable URL field value is invalid (code ${code}). Use {"text":"label","link":"https://..."}, not a bare string.`,
			description: [
				msg ? `Feishu: ${msg}` : '',
				troubleshooter || '',
				'Hyperlink / URL 字段必须是 { text, link } 对象。记录 JSON 的键是字段名称，不是 field_id。裸 https:// URL 字符串现在会自动转换。',
			]
				.filter(Boolean)
				.join('\n'),
			scopes,
		};
	}

	if (code === 1254104 || /RecordAddOnceExceedLimit/i.test(msg ?? '')) {
		return {
			message: `Bitable batch exceeds the official 500-record limit (code ${code}).`,
			description: [
				msg ? `Feishu: ${msg}` : '',
				troubleshooter || '',
				'批量新增 / 更新 / 删除单次最多 500 条。本节点会自动拆批；若仍看到此错误，请确认没有绕过节点直接调用。',
			]
				.filter(Boolean)
				.join('\n'),
			scopes,
		};
	}

	if (code === 1254301 || /advanced permissions/i.test(msg ?? '') || /高级权限/.test(msg ?? '')) {
		return {
			message: `Bitable advanced permission is off or unsupported (code ${code}).`,
			description: [
				msg ? `Feishu: ${msg}` : '',
				troubleshooter || '',
				'角色 / 协作者接口需要先 updateApp 打开 is_advanced。若已打开仍失败，可能是套餐不支持高级权限。',
			]
				.filter(Boolean)
				.join('\n'),
			scopes,
		};
	}

	if (code === 1254066 || /UserFieldConvFail/i.test(msg ?? '')) {
		return {
			message: `Bitable person field value is invalid (code ${code}). Pass [{id: open_id}] and match user_id_type.`,
			description: [
				msg ? `Feishu: ${msg}` : '',
				troubleshooter || '',
				'人员字段必须是数组 [{ "id": "ou_xxx" }]。open_id 不能跨应用混用。裸 ou_/on_ 字符串现在会自动包成数组。',
			]
				.filter(Boolean)
				.join('\n'),
			scopes,
		};
	}

	if (code === 1254069 || /AttachFieldConvFail/i.test(msg ?? '')) {
		return {
			message: `Bitable attachment field value is invalid (code ${code}). Upload first, then write [{file_token}].`,
			description: [
				msg ? `Feishu: ${msg}` : '',
				troubleshooter || '',
				'附件字段写 [{ "file_token": "boxcn..." }]。先用「上传附件到多维表格」拿到 file_token，文件必须属于当前 Base。',
			]
				.filter(Boolean)
				.join('\n'),
			scopes,
		};
	}

	if (code === 1254064 || /DatetimeFieldConvFail/i.test(msg ?? '')) {
		return {
			message: `Bitable date field value is invalid (code ${code}). Use Unix milliseconds.`,
			description: [
				msg ? `Feishu: ${msg}` : '',
				troubleshooter || '',
				'日期字段是 Unix 毫秒，不是 2026-10-12 字符串。节点会按 Asia/Shanghai 自动转换常见日期字符串。',
			]
				.filter(Boolean)
				.join('\n'),
			scopes,
		};
	}

	if (code === 1254045 || /FieldNameNotFound/i.test(msg ?? '')) {
		return {
			message: `Bitable field name was not found (code ${code}). Use the field name, not field_id.`,
			description: [
				msg ? `Feishu: ${msg}` : '',
				troubleshooter || '',
				'记录 JSON / filter / upsert 的键是字段名称。searchTableFieldNames 返回名称；searchTableFields 返回 field_id（给删除/更新字段用）。',
			]
				.filter(Boolean)
				.join('\n'),
			scopes,
		};
	}

	if (code === 1254074 || /DuplexLinkFieldConvFail/i.test(msg ?? '')) {
		return {
			message: `Bitable duplex-link field must be a string array of record_ids (code ${code}).`,
			description: [
				msg ? `Feishu: ${msg}` : '',
				troubleshooter || '',
				'双向 / 单向关联写入 ["recXXX"]。公式和查找引用字段只读。',
			]
				.filter(Boolean)
				.join('\n'),
			scopes,
		};
	}

	if (
		code === FEISHU_CONTACTS_NO_AUTHORITY_CODE ||
		/no dept authority|no user authority/i.test(msg ?? '')
	) {
		return {
			message: `Feishu data-range / contacts authority error (code ${code}): ${msg ?? ''}`,
			description: [
				msg ? `Feishu: ${msg}` : '',
				troubleshooter || '',
				'This is not a missing API scope. In 开发者后台 → 权限管理, set the contacts / department data range for tenant_access_token, then republish the app. Root department "0" still fails if the bot has no org visibility.',
			]
				.filter(Boolean)
				.join('\n'),
			scopes,
		};
	}

	return {
		message: `Request Feishu Suite API Error: ${code}, ${msg ?? ''}`.trim(),
		description: troubleshooter || '',
		scopes,
	};
}
