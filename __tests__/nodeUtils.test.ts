import NodeUtils from '../nodes/help/utils/node';

function mockCtx(value: unknown) {
	return {
		getNodeParameter: () => value,
		getNode: () => ({ name: 'Test' }),
	} as any;
}

describe('NodeUtils.getNodeJsonData', () => {
	it('accepts an already-parsed object from n8n JSON fields', () => {
		expect(NodeUtils.getNodeJsonData(mockCtx({ name: 'e2e' }), 'body', 0, {})).toEqual({
			name: 'e2e',
		});
	});

	it('parses a JSON string', () => {
		expect(NodeUtils.getNodeJsonData(mockCtx('{"name":"e2e"}'), 'body', 0, {})).toEqual({
			name: 'e2e',
		});
	});

	it('returns the fallback for empty input', () => {
		expect(NodeUtils.getNodeJsonData(mockCtx(''), 'body', 0, { empty: true })).toEqual({
			empty: true,
		});
	});
});

describe('NodeUtils.getOptionalJsonObject', () => {
	it('treats the type:json default string "{}" as empty', () => {
		expect(NodeUtils.getOptionalJsonObject(mockCtx('{}'), 'i18n_names', 0)).toBeUndefined();
	});

	it('treats Object.keys on a string as a parse, not character keys', () => {
		expect(NodeUtils.getOptionalJsonObject(mockCtx('{"zh_cn":"群"}'), 'i18n_names', 0)).toEqual({
			zh_cn: '群',
		});
	});
});

describe('NodeUtils.getResourceId', () => {
	it('unwraps a resourceLocator object', () => {
		const ctx = {
			getNodeParameter: (_n: string, _i: number, _d: unknown, _opts?: unknown) => ({
				__rl: true,
				mode: 'id',
				value: 'bascnXXX',
			}),
		} as any;
		expect(NodeUtils.getResourceId(ctx, 'app_token', 0)).toBe('bascnXXX');
	});
});
