import {
	formatCredentialHttpError,
	formatFeishuAuthError,
	interpretFeishuApiResponse,
	resolveFeishuBaseUrl,
	feishuTenantTokenUrl,
} from '../nodes/help/utils/credentialBaseUrl';
import { FeishuSuiteApi } from '../credentials/FeishuSuiteApi.credentials';

describe('resolveFeishuBaseUrl', () => {
	it('uses the China or Lark option value', () => {
		expect(resolveFeishuBaseUrl({ url: 'https://open.feishu.cn' })).toBe('https://open.feishu.cn');
		expect(resolveFeishuBaseUrl({ url: 'https://open.larksuite.com' })).toBe(
			'https://open.larksuite.com',
		);
	});

	it('uses customUrl when url is custom', () => {
		expect(
			resolveFeishuBaseUrl({ url: 'custom', customUrl: 'https://open.example.com/' }),
		).toBe('https://open.example.com');
	});

	it('falls back to a resolved hidden baseUrl', () => {
		expect(resolveFeishuBaseUrl({ baseUrl: 'https://open.feishu.cn' })).toBe(
			'https://open.feishu.cn',
		);
	});

	it('rejects missing, relative, or unresolved $self expressions', () => {
		expect(() => resolveFeishuBaseUrl({})).toThrow(/Base URL is missing or invalid/);
		expect(() => resolveFeishuBaseUrl({ url: '/open-apis' })).toThrow(/Base URL is missing or invalid/);
		expect(() =>
			resolveFeishuBaseUrl({
				baseUrl: '={{$self["url"] === "custom" ? $self["customUrl"] : $self["url"]}}',
			}),
		).toThrow(/Base URL is missing or invalid/);
	});

	it('builds the tenant token URL from the resolved origin', () => {
		expect(feishuTenantTokenUrl({ url: 'https://open.feishu.cn' })).toBe(
			'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
		);
	});
});

describe('Feishu auth error mapping', () => {
	it('maps 10003 and 10014 to clear messages', () => {
		expect(formatFeishuAuthError(10003, 'invalid param')).toBe(
			'Invalid App ID or request parameters (Feishu code 10003)',
		);
		expect(formatFeishuAuthError(10014, 'app secret invalid')).toBe(
			'App secret invalid (Feishu code 10014)',
		);
		expect(formatFeishuAuthError(99999, 'boom')).toBe('Authentication failed: 99999, boom');
	});

	it('interprets Feishu JSON bodies', () => {
		expect(interpretFeishuApiResponse({ code: 10003, msg: 'invalid param' })).toEqual({
			ok: false,
			message: 'Invalid App ID or request parameters (Feishu code 10003)',
		});
		expect(interpretFeishuApiResponse({ code: 0, tenant_access_token: 't-ok' })).toEqual({
			ok: true,
		});
	});

	it('explains HTTP 403 instead of echoing axios', () => {
		expect(
			formatCredentialHttpError(
				{ message: 'Request failed with status code 403', statusCode: 403 },
				'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
			),
		).toMatch(/blocked with HTTP 403/);
	});
});

describe('FeishuSuiteApi.authenticate', () => {
	const credential = new FeishuSuiteApi();
	const creds = { accessToken: 't-runtime' };

	it('does not attach Bearer on the tenant token endpoint', async () => {
		const options = await credential.authenticate(creds, {
			baseURL: 'https://open.feishu.cn',
			url: '/open-apis/auth/v3/tenant_access_token/internal',
			headers: { Accept: 'application/json' },
		});
		expect(options.headers?.Authorization).toBeUndefined();
	});

	it('attaches Bearer for business API requests', async () => {
		const options = await credential.authenticate(creds, {
			baseURL: 'https://open.feishu.cn',
			url: '/open-apis/im/v1/messages',
			headers: {},
		});
		expect(options.headers?.Authorization).toBe('Bearer t-runtime');
	});
});
