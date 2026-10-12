import type { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { randomUUID } from 'crypto';

export const FEISHU_RATE_LIMIT_CODE = 99991400;
/** Bitable write/read transient codes that should use the same backoff as 99991400. */
export const FEISHU_RETRYABLE_BUSINESS_CODES = [
	FEISHU_RATE_LIMIT_CODE,
	1254290, // TooManyRequest
	1254291, // Write conflict
	1254607, // Data not ready
] as const;

export function isRetryableFeishuBusinessCode(code?: number): boolean {
	return typeof code === 'number' && FEISHU_RETRYABLE_BUSINESS_CODES.includes(code as (typeof FEISHU_RETRYABLE_BUSINESS_CODES)[number]);
}

export const FEISHU_RETRY_DEFAULTS = {
	enabled: true,
	/** Retries after the first attempt. 5 → up to 6 attempts total. */
	maxRetries: 5,
	baseDelayMs: 1000,
	maxDelayMs: 30_000,
	jitterRatio: 0.25,
	/** Absolute cap when honoring Retry-After / rate-limit reset. */
	maxWaitMs: 60_000,
} as const;

export type FeishuRetryPolicy = {
	enabled: boolean;
	maxRetries: number;
	baseDelayMs: number;
	maxDelayMs: number;
	jitterRatio: number;
	maxWaitMs: number;
	sleep?: (ms: number) => Promise<void>;
	random?: () => number;
};

export type FeishuRetryableError = Error & {
	feishuRetryable: true;
	statusCode?: number;
	feishuCode?: number;
	responseHeaders?: Record<string, string | string[] | undefined>;
};

function defaultSleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createRetryableError(options: {
	message: string;
	statusCode?: number;
	feishuCode?: number;
	headers?: Record<string, string | string[] | undefined>;
}): FeishuRetryableError {
	const error = new Error(options.message) as FeishuRetryableError;
	error.feishuRetryable = true;
	error.statusCode = options.statusCode;
	error.feishuCode = options.feishuCode;
	error.responseHeaders = options.headers;
	return error;
}

export function isRetryableHttpStatus(status: number): boolean {
	if (!Number.isFinite(status) || status <= 0) {
		return false;
	}
	return status === 429 || status >= 500;
}

export function extractHttpStatus(error: unknown): number | undefined {
	const err = error as {
		statusCode?: number;
		status?: number;
		httpCode?: string | number;
		response?: { status?: number };
		cause?: { response?: { status?: number }; status?: number };
		context?: { statusCode?: number };
		message?: string;
	};
	const raw =
		err?.statusCode ||
		err?.status ||
		err?.httpCode ||
		err?.response?.status ||
		err?.cause?.response?.status ||
		err?.cause?.status ||
		err?.context?.statusCode;
	const status = Number(raw);
	if (Number.isFinite(status) && status > 0) {
		return status;
	}
	const match = String(err?.message ?? error).match(/status code\s+(\d{3})/i);
	return match ? Number(match[1]) : undefined;
}

export function extractFeishuCode(error: unknown): number | undefined {
	const err = error as { feishuCode?: number; message?: string; context?: { data?: { code?: number } } };
	if (typeof err?.feishuCode === 'number') {
		return err.feishuCode;
	}
	if (typeof err?.context?.data?.code === 'number') {
		return err.context.data.code;
	}
	const match = String(err?.message ?? error).match(
		/Request Feishu Suite API Error:\s*(\d+)/i,
	);
	return match ? Number(match[1]) : undefined;
}

export function extractResponseHeaders(
	error: unknown,
): Record<string, string | string[] | undefined> | undefined {
	const err = error as {
		responseHeaders?: Record<string, string | string[] | undefined>;
		headers?: Record<string, string | string[] | undefined>;
		response?: { headers?: Record<string, string | string[] | undefined> };
		cause?: { response?: { headers?: Record<string, string | string[] | undefined> } };
	};
	return err?.responseHeaders || err?.response?.headers || err?.cause?.response?.headers || err?.headers;
}

export function unwrapHttpResponse(raw: unknown): {
	body: unknown;
	headers?: Record<string, string | string[] | undefined>;
	statusCode?: number;
} {
	if (raw == null || typeof raw !== 'object') {
		return { body: raw };
	}
	if (raw instanceof Buffer || raw instanceof ArrayBuffer || raw instanceof Uint8Array) {
		return { body: raw };
	}
	const candidate = raw as {
		body?: unknown;
		headers?: Record<string, string | string[] | undefined>;
		statusCode?: number;
		status?: number;
		code?: number;
	};
	if (
		'body' in candidate &&
		candidate.code === undefined &&
		(candidate.statusCode !== undefined ||
			candidate.status !== undefined ||
			candidate.headers !== undefined)
	) {
		const status = Number(candidate.statusCode ?? candidate.status);
		return {
			body: candidate.body,
			headers: candidate.headers,
			statusCode: Number.isFinite(status) && status > 0 ? status : undefined,
		};
	}
	return { body: raw };
}

export function isRetryableNetworkError(error: unknown): boolean {
	const err = error as { code?: string; cause?: { code?: string }; message?: string };
	const code = String(err?.code || err?.cause?.code || '');
	const message = String(err?.message ?? error);
	if (
		code === 'ECONNRESET' ||
		code === 'ETIMEDOUT' ||
		code === 'ECONNREFUSED' ||
		code === 'ESOCKETTIMEDOUT'
	) {
		return true;
	}
	return /ECONNRESET|ETIMEDOUT|ECONNREFUSED|socket hang up/i.test(message);
}

export function isRetryableError(error: unknown): boolean {
	if ((error as { feishuRetryable?: boolean })?.feishuRetryable) {
		return true;
	}
	if (isRetryableFeishuBusinessCode(extractFeishuCode(error))) {
		return true;
	}
	const status = extractHttpStatus(error);
	if (status !== undefined) {
		return isRetryableHttpStatus(status);
	}
	return isRetryableNetworkError(error);
}

function headerValue(
	headers: Record<string, string | string[] | undefined> | undefined,
	name: string,
): string | undefined {
	if (!headers) {
		return undefined;
	}
	const target = name.toLowerCase();
	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() === target) {
			return Array.isArray(value) ? value[0] : value;
		}
	}
	return undefined;
}

export function parseRetryAfterMs(
	headers: Record<string, string | string[] | undefined> | undefined,
	nowMs = Date.now(),
): number | undefined {
	const retryAfter = headerValue(headers, 'retry-after');
	if (retryAfter) {
		const seconds = Number(retryAfter);
		if (Number.isFinite(seconds)) {
			return Math.max(0, seconds * 1000);
		}
		const dateMs = Date.parse(retryAfter);
		if (!Number.isNaN(dateMs)) {
			return Math.max(0, dateMs - nowMs);
		}
	}

	const reset = headerValue(headers, 'x-ogw-ratelimit-reset');
	if (reset) {
		const value = Number(reset);
		if (!Number.isFinite(value)) {
			return undefined;
		}
		if (value > 1_000_000_000) {
			const resetMs = value > 1e12 ? value : value * 1000;
			return Math.max(0, resetMs - nowMs);
		}
		return Math.max(0, value * 1000);
	}

	return undefined;
}

export function computeBackoffMs(
	retryIndex: number,
	policy: Pick<FeishuRetryPolicy, 'baseDelayMs' | 'maxDelayMs' | 'jitterRatio'>,
	random: () => number = Math.random,
): number {
	const exp = policy.baseDelayMs * 2 ** retryIndex;
	const capped = Math.min(policy.maxDelayMs, exp);
	const jitter = Math.min(Math.max(policy.jitterRatio, 0), 1);
	const factor = 1 - jitter + random() * jitter * 2;
	return Math.max(0, Math.round(capped * factor));
}

export function resolveWaitMs(
	retryIndex: number,
	error: unknown,
	policy: FeishuRetryPolicy,
): number {
	const headerWait = parseRetryAfterMs(extractResponseHeaders(error));
	const backoff = computeBackoffMs(retryIndex, policy, policy.random ?? Math.random);
	const wait = headerWait !== undefined ? headerWait : backoff;
	return Math.min(policy.maxWaitMs, wait);
}

export function mergeRetryPolicy(overrides?: Partial<FeishuRetryPolicy>): FeishuRetryPolicy {
	return {
		...FEISHU_RETRY_DEFAULTS,
		...overrides,
		maxRetries: Math.max(0, Math.min(8, overrides?.maxRetries ?? FEISHU_RETRY_DEFAULTS.maxRetries)),
	};
}

export function readNodeRetryPolicy(ctx: IExecuteFunctions): FeishuRetryPolicy {
	try {
		const options = ctx.getNodeParameter('requestOptions', 0, {}) as {
			retryEnabled?: boolean;
			maxRetries?: number;
		};
		return mergeRetryPolicy({
			enabled: options.retryEnabled !== false,
			maxRetries:
				typeof options.maxRetries === 'number' ? options.maxRetries : FEISHU_RETRY_DEFAULTS.maxRetries,
		});
	} catch {
		return mergeRetryPolicy();
	}
}

function isFormBody(body: unknown): boolean {
	if (!body || typeof body !== 'object') {
		return false;
	}
	const candidate = body as { getHeaders?: unknown; append?: unknown; constructor?: { name?: string } };
	return (
		typeof candidate.getHeaders === 'function' ||
		candidate.constructor?.name === 'FormData'
	);
}

/**
 * Attach a stable Feishu idempotency key (uuid / client_token) so retried
 * non-idempotent POSTs reuse the same value.
 */
export function ensureIdempotencyKey(options: IHttpRequestOptions): void {
	const method = String(options.method || 'GET').toUpperCase();
	if (method !== 'POST' && method !== 'PUT' && method !== 'PATCH') {
		return;
	}
	const url = String(options.url || '');
	const qs: IDataObject = { ...(options.qs ?? {}) };
	const body = options.body;

	const assignBody = (field: 'uuid' | 'client_token') => {
		if (!body || typeof body !== 'object' || isFormBody(body)) {
			return;
		}
		const record = body as Record<string, unknown>;
		if (record[field] == null || record[field] === '') {
			record[field] = randomUUID();
		}
	};
	const assignQuery = (field: 'uuid' | 'client_token') => {
		if (qs[field] == null || qs[field] === '') {
			qs[field] = randomUUID();
			options.qs = qs;
		}
	};

	if (/\/im\/v1\/messages\/?$/.test(url) || /\/im\/v1\/messages\/[^/]+\/reply\/?$/.test(url)) {
		assignBody('uuid');
		return;
	}
	if (
		/\/im\/v1\/messages\/[^/]+\/forward\/?$/.test(url) ||
		/\/im\/v1\/batch_messages\/?$/.test(url)
	) {
		assignQuery('uuid');
		return;
	}
	if (/\/bitable\/v1\/.+\/records(\/batch_create)?\/?$/.test(url)) {
		assignBody('client_token');
		return;
	}
	if (/\/docx\/v1\/.+\/blocks/.test(url)) {
		assignQuery('client_token');
		return;
	}
	if (/\/task\/v2\/.+\/members\/?$/.test(url)) {
		assignQuery('client_token');
	}
}

export function throwIfRetryableFeishuBody(
	body: unknown,
	headers?: Record<string, string | string[] | undefined>,
): void {
	if (!body || typeof body !== 'object') {
		return;
	}
	const payload = body as { code?: number; msg?: string };
	if (isRetryableFeishuBusinessCode(payload.code)) {
		throw createRetryableError({
			message: `Request Feishu Suite API Error: ${payload.code}, ${payload.msg || 'rate limit'}`,
			statusCode: 429,
			feishuCode: payload.code,
			headers,
		});
	}
}

export async function withFeishuRetry<T>(
	operation: () => Promise<T>,
	overrides?: Partial<FeishuRetryPolicy>,
): Promise<T> {
	const policy = mergeRetryPolicy(overrides);
	const sleep = policy.sleep ?? defaultSleep;
	const maxAttempts = policy.enabled ? policy.maxRetries + 1 : 1;

	let lastError: unknown;
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;
			const canRetry = attempt < maxAttempts - 1 && isRetryableError(error);
			if (!canRetry) {
				throw error;
			}
			await sleep(resolveWaitMs(attempt, error, policy));
		}
	}
	throw lastError;
}
