import {
	FEISHU_RATE_LIMIT_CODE,
	FEISHU_RETRY_DEFAULTS,
	computeBackoffMs,
	createRetryableError,
	ensureIdempotencyKey,
	extractFeishuCode,
	extractHttpStatus,
	isRetryableError,
	isRetryableHttpStatus,
	isRetryableNetworkError,
	parseRetryAfterMs,
	resolveWaitMs,
	unwrapHttpResponse,
	withFeishuRetry,
} from '../nodes/help/utils/feishuRetry';
import type { IHttpRequestOptions } from 'n8n-workflow';

function httpError(status: number, message = `Request failed with status code ${status}`) {
	const error = new Error(message) as Error & { statusCode: number };
	error.statusCode = status;
	return error;
}

describe('feishuRetry helper', () => {
	it('retries HTTP 5xx then succeeds', async () => {
		const sleeps: number[] = [];
		let attempts = 0;

		const result = await withFeishuRetry(
			async () => {
				attempts += 1;
				if (attempts < 3) {
					throw httpError(503);
				}
				return { code: 0, data: { ok: true } };
			},
			{
				sleep: async (ms) => {
					sleeps.push(ms);
				},
				random: () => 0.5,
				jitterRatio: 0,
			},
		);

		expect(result).toEqual({ code: 0, data: { ok: true } });
		expect(attempts).toBe(3);
		expect(sleeps).toEqual([1000, 2000]);
	});

	it('exhausts after 5 retries (6 attempts total)', async () => {
		const sleeps: number[] = [];
		let attempts = 0;
		const error = httpError(500);

		await expect(
			withFeishuRetry(
				async () => {
					attempts += 1;
					throw error;
				},
				{
					sleep: async (ms) => {
						sleeps.push(ms);
					},
					random: () => 0.5,
					jitterRatio: 0,
				},
			),
		).rejects.toBe(error);

		expect(attempts).toBe(6);
		expect(sleeps).toEqual([1000, 2000, 4000, 8000, 16000]);
		expect(FEISHU_RETRY_DEFAULTS.maxRetries).toBe(5);
	});

	it('does not retry HTTP 400', async () => {
		let attempts = 0;
		const error = httpError(400);

		await expect(
			withFeishuRetry(async () => {
				attempts += 1;
				throw error;
			}),
		).rejects.toBe(error);

		expect(attempts).toBe(1);
	});

	it('does not retry normal Feishu business error codes', async () => {
		let attempts = 0;
		const error = new Error('Request Feishu Suite API Error: 99991672, missing scope');

		await expect(
			withFeishuRetry(async () => {
				attempts += 1;
				throw error;
			}),
		).rejects.toBe(error);

		expect(attempts).toBe(1);
		expect(extractFeishuCode(error)).toBe(99991672);
		expect(isRetryableError(error)).toBe(false);
	});

	it('retries Feishu rate-limit code 99991400', async () => {
		let attempts = 0;
		const result = await withFeishuRetry(
			async () => {
				attempts += 1;
				if (attempts === 1) {
					throw createRetryableError({
						message: `Request Feishu Suite API Error: ${FEISHU_RATE_LIMIT_CODE}, rate limit`,
						statusCode: 429,
						feishuCode: FEISHU_RATE_LIMIT_CODE,
					});
				}
				return 'ok';
			},
			{
				sleep: async () => undefined,
				jitterRatio: 0,
			},
		);

		expect(result).toBe('ok');
		expect(attempts).toBe(2);
	});

	it('respects Retry-After header instead of exponential backoff', async () => {
		const sleeps: number[] = [];
		const error = createRetryableError({
			message: 'Request failed with status code 429',
			statusCode: 429,
			headers: { 'Retry-After': '7' },
		});

		await expect(
			withFeishuRetry(
				async () => {
					throw error;
				},
				{
					maxRetries: 1,
					sleep: async (ms) => {
						sleeps.push(ms);
					},
					jitterRatio: 0,
				},
			),
		).rejects.toBe(error);

		expect(sleeps).toEqual([7000]);
		expect(parseRetryAfterMs({ 'retry-after': '7' })).toBe(7000);
		expect(
			resolveWaitMs(0, error, {
				...FEISHU_RETRY_DEFAULTS,
				jitterRatio: 0,
				random: () => 0.5,
			}),
		).toBe(7000);
	});

	it('honors x-ogw-ratelimit-reset seconds', () => {
		expect(parseRetryAfterMs({ 'X-Ogw-Ratelimit-Reset': '3' })).toBe(3000);
	});

	it('retries transient network errors', async () => {
		let attempts = 0;
		const error = Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' });

		const result = await withFeishuRetry(
			async () => {
				attempts += 1;
				if (attempts === 1) {
					throw error;
				}
				return 1;
			},
			{ sleep: async () => undefined },
		);

		expect(result).toBe(1);
		expect(attempts).toBe(2);
		expect(isRetryableNetworkError(error)).toBe(true);
		expect(isRetryableNetworkError(new Error('connect ETIMEDOUT'))).toBe(true);
		expect(isRetryableNetworkError(Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }))).toBe(
			true,
		);
	});

	it('classifies HTTP statuses', () => {
		expect(isRetryableHttpStatus(500)).toBe(true);
		expect(isRetryableHttpStatus(502)).toBe(true);
		expect(isRetryableHttpStatus(503)).toBe(true);
		expect(isRetryableHttpStatus(504)).toBe(true);
		expect(isRetryableHttpStatus(429)).toBe(true);
		expect(isRetryableHttpStatus(400)).toBe(false);
		expect(isRetryableHttpStatus(403)).toBe(false);
		expect(extractHttpStatus(httpError(504))).toBe(504);
	});

	it('computes binary exponential backoff with a cap', () => {
		const policy = { baseDelayMs: 1000, maxDelayMs: 30_000, jitterRatio: 0 };
		expect(computeBackoffMs(0, policy, () => 0.5)).toBe(1000);
		expect(computeBackoffMs(1, policy, () => 0.5)).toBe(2000);
		expect(computeBackoffMs(2, policy, () => 0.5)).toBe(4000);
		expect(computeBackoffMs(4, policy, () => 0.5)).toBe(16000);
		expect(computeBackoffMs(8, policy, () => 0.5)).toBe(30000);
	});

	it('reuses a generated uuid across retries for send-message POSTs', () => {
		const options: IHttpRequestOptions = {
			method: 'POST',
			url: '/open-apis/im/v1/messages',
			body: { receive_id: 'ou_1', msg_type: 'text' },
		};

		ensureIdempotencyKey(options);
		const first = (options.body as { uuid?: string }).uuid;
		expect(first).toEqual(expect.any(String));
		ensureIdempotencyKey(options);
		expect((options.body as { uuid?: string }).uuid).toBe(first);
	});

	it('does not wrap Feishu JSON as a full HTTP response', () => {
		const payload = { code: 0, msg: 'ok', data: {} };
		expect(unwrapHttpResponse(payload)).toEqual({ body: payload });
		expect(
			unwrapHttpResponse({
				body: payload,
				statusCode: 200,
				headers: { 'retry-after': '1' },
			}),
		).toEqual({
			body: payload,
			statusCode: 200,
			headers: { 'retry-after': '1' },
		});
	});
});
