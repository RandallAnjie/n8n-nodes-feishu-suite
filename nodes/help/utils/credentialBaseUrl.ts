import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

const FEISHU_TOKEN_PATH = '/open-apis/auth/v3/tenant_access_token/internal';
const FEISHU_USER_INFO_PATH = '/open-apis/authen/v1/user_info';

export function resolveFeishuBaseUrl(credentials: ICredentialDataDecryptedObject): string {
	const selected = credentials.url;
	const customUrl = credentials.customUrl;
	const hidden = credentials.baseUrl;
	const raw = selected === 'custom' ? customUrl : selected || hidden;
	const origin = String(raw ?? '')
		.trim()
		.replace(/\/+$/, '');

	if (!origin || !/^https?:\/\//i.test(origin) || origin.includes('{{') || origin.includes('$self')) {
		throw new Error(
			'Base URL is missing or invalid. Choose Feishu (https://open.feishu.cn), Lark (https://open.larksuite.com), or a custom http(s) URL.',
		);
	}

	return origin;
}

export function feishuTenantTokenUrl(credentials: ICredentialDataDecryptedObject): string {
	return `${resolveFeishuBaseUrl(credentials)}${FEISHU_TOKEN_PATH}`;
}

export function feishuUserInfoUrl(credentials: ICredentialDataDecryptedObject): string {
	return `${resolveFeishuBaseUrl(credentials)}${FEISHU_USER_INFO_PATH}`;
}

export function formatFeishuAuthError(code: number, msg?: string): string {
	if (code === 10003) {
		return 'Invalid App ID or request parameters (Feishu code 10003)';
	}
	if (code === 10014) {
		return 'App secret invalid (Feishu code 10014)';
	}
	if (code === 20005) {
		return 'Invalid or expired user access token (Feishu code 20005). Reconnect OAuth2.';
	}
	return `Authentication failed: ${code}${msg ? `, ${msg}` : ''}`;
}

export function interpretFeishuApiResponse(body: unknown): { ok: true } | { ok: false; message: string } {
	if (body === undefined || body === null || typeof body !== 'object') {
		return { ok: false, message: 'Feishu returned an empty or non-JSON response' };
	}

	const payload = body as { code?: number; msg?: string; tenant_access_token?: string };
	if (typeof payload.code === 'number' && payload.code !== 0) {
		return { ok: false, message: formatFeishuAuthError(payload.code, payload.msg) };
	}

	return { ok: true };
}

export function formatCredentialHttpError(error: unknown, targetUrl: string): string {
	const err = error as { message?: string; statusCode?: number; status?: number };
	const message = String(err?.message ?? error);
	const status = Number(err?.statusCode || err?.status);
	if (status === 403 || /status code 403/i.test(message)) {
		return `Request to ${targetUrl} was blocked with HTTP 403. Feishu's token endpoint itself returns HTTP 200 for bad App ID/Secret; this usually means n8n sent the test to the wrong host or a proxy denied it. Check the Base URL.`;
	}
	return message;
}
