import {
	extractFeishuScopes,
	formatFeishuBusinessError,
	isMissingScopeError,
} from '../nodes/help/utils/feishuError';

describe('feishuError', () => {
	it('extracts scope names from Feishu missing-scope messages', () => {
		const msg =
			'Access denied. One of the following scopes is required: [calendar:calendar:readonly, calendar:calendar]';
		expect(extractFeishuScopes(msg)).toEqual([
			'calendar:calendar:readonly',
			'calendar:calendar',
		]);
		expect(isMissingScopeError(99991672, msg)).toBe(true);
	});

	it('surfaces the scope name and a developer-console hint', () => {
		const formatted = formatFeishuBusinessError(
			99991672,
			'Access denied. One of the following scopes is required: [wiki:wiki:readonly]',
			'See https://open.feishu.cn',
		);
		expect(formatted.message).toContain('wiki:wiki:readonly');
		expect(formatted.message).toContain('99991672');
		expect(formatted.description).toMatch(/权限管理|Permissions & scopes/);
		expect(formatted.scopes).toEqual(['wiki:wiki:readonly']);
	});

	it('does not treat stack frames as scope names', () => {
		expect(extractFeishuScopes('Error at RequestUtils.ts:213:9 feishuRetry.ts:364:11')).toEqual([]);
	});

	it('keeps ordinary business errors as Feishu code + msg', () => {
		const formatted = formatFeishuBusinessError(99991663, 'token expired', '');
		expect(formatted.message).toBe('Request Feishu Suite API Error: 99991663, token expired');
		expect(formatted.scopes).toEqual([]);
	});

	it('explains contacts data-range errors instead of treating them as missing scopes', () => {
		const formatted = formatFeishuBusinessError(40004, 'no dept authority error', '');
		expect(formatted.message).toContain('40004');
		expect(formatted.description).toMatch(/数据权限|data range/i);
		expect(formatted.scopes).toEqual([]);
	});

	it('explains docx chat announcements', () => {
		const formatted = formatFeishuBusinessError(
			232097,
			'Unable to operate docx type chat announcement.',
			'',
		);
		expect(formatted.message).toMatch(/Docx/i);
		expect(formatted.description).toMatch(/Document resource|document_id/);
	});

	it('explains Bitable URL field shape', () => {
		const formatted = formatFeishuBusinessError(1254068, 'URLFieldConvFail', '');
		expect(formatted.message).toMatch(/text.*link/i);
		expect(formatted.description).toMatch(/字段名称/);
	});

	it('explains Bitable person / attachment / date / field-name errors', () => {
		expect(formatFeishuBusinessError(1254066, 'UserFieldConvFail', '').description).toMatch(
			/人员字段|open_id/,
		);
		expect(formatFeishuBusinessError(1254069, 'AttachFieldConvFail', '').description).toMatch(
			/file_token/,
		);
		expect(formatFeishuBusinessError(1254064, 'DatetimeFieldConvFail', '').description).toMatch(
			/Asia\/Shanghai/,
		);
		expect(formatFeishuBusinessError(1254045, 'FieldNameNotFound', '').description).toMatch(
			/字段名称/,
		);
		expect(formatFeishuBusinessError(1254104, 'RecordAddOnceExceedLimit', '').message).toMatch(
			/500/,
		);
		expect(formatFeishuBusinessError(1254301, 'advanced permissions', '').description).toMatch(
			/is_advanced/,
		);
	});

	it('tells operators to publish a new version when scopes look granted', () => {
		const formatted = formatFeishuBusinessError(
			99991672,
			'Access denied. One of the following scopes is required: [im:chat, im:chat:delete]',
			'',
		);
		expect(formatted.description).toMatch(/版本管理|publish a new app version/);
		expect(formatted.description).toMatch(/token_type=tenant/);
	});
});
