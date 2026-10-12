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
