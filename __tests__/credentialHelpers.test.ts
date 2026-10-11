import { testFeishuSuiteApiCredential } from '../nodes/help/utils/credentialTests';

describe('testFeishuSuiteApiCredential', () => {
	it('fails closed when App ID/Secret are missing', async () => {
		const result = await testFeishuSuiteApiCredential.call(
			{ helpers: { request: async () => ({}) } } as never,
			{ data: { url: 'https://open.feishu.cn' } } as never,
		);
		expect(result.status).toBe('Error');
		expect(result.message).toMatch(/App ID and App Secret/);
	});

	it('returns Connection successful when the token body is code 0', async () => {
		const request = jest.fn().mockResolvedValue({
			code: 0,
			msg: 'ok',
			tenant_access_token: 't-test-token',
		});
		const result = await testFeishuSuiteApiCredential.call({ helpers: { request } } as never, {
			data: {
				url: 'https://open.feishu.cn',
				appid: 'cli_example',
				appsecret: 'secret-example',
			},
		} as never);
		expect(result).toEqual({ status: 'OK', message: 'Connection successful!' });
		expect(request).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'POST',
				uri: 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
			}),
		);
		expect(request.mock.calls[0][0].headers).not.toHaveProperty('Authorization');
	});
});
