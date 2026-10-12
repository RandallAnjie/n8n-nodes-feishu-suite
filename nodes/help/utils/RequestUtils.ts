import type { IExecuteFunctions, IHttpRequestOptions, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { Credentials } from '../type/enums';
import { resolveFeishuBaseUrl } from './credentialBaseUrl';
import {
	FEISHU_RATE_LIMIT_CODE,
	createRetryableError,
	ensureIdempotencyKey,
	extractHttpStatus,
	extractResponseHeaders,
	isRetryableHttpStatus,
	readNodeRetryPolicy,
	unwrapHttpResponse,
	withFeishuRetry,
} from './feishuRetry';

const TOKEN_EXPIRED_CODE = 99991663;

function isBinaryPayload(value: unknown): value is Buffer | ArrayBuffer | Uint8Array {
	return value instanceof Buffer || value instanceof ArrayBuffer || value instanceof Uint8Array;
}

class RequestUtils {
	static async originRequest(
		this: IExecuteFunctions,
		options: IHttpRequestOptions,
		clearAccessToken = false,
	) {
		const authenticationMethod = this.getNodeParameter(
			'authentication',
			0,
			Credentials.TenantToken,
		) as string;

		const credentials = await this.getCredentials(authenticationMethod);
		options.baseURL = resolveFeishuBaseUrl(credentials);

		if (authenticationMethod === Credentials.TenantToken) {
			// Replace the accessToken with an empty string if clearAccessToken is true, so the preAuthentication method can be triggered
			// and a new access token can be fetched
			const additionalCredentialOptions = {
				credentialsDecrypted: {
					id: Credentials.Id,
					name: Credentials.TenantToken,
					type: Credentials.Type,
					data: {
						...credentials,
						accessToken: clearAccessToken ? '' : credentials.accessToken,
					},
				},
			};

			return this.helpers.httpRequestWithAuthentication.call(
				this,
				authenticationMethod,
				options,
				additionalCredentialOptions,
			);
		}

		return this.helpers.httpRequestWithAuthentication.call(this, authenticationMethod, options);
	}

	static async request(this: IExecuteFunctions, options: IHttpRequestOptions): Promise<any> {
		if (options.json === undefined) options.json = true;
		ensureIdempotencyKey(options);
		const policy = readNodeRetryPolicy(this);

		return withFeishuRetry(() => RequestUtils.executeOnce.call(this, options), policy);
	}

	static async executeOnce(this: IExecuteFunctions, options: IHttpRequestOptions): Promise<any> {
		const wantsJson = options.json !== false;
		const requestOptions: IHttpRequestOptions = wantsJson
			? { ...options, returnFullResponse: true }
			: { ...options };

		try {
			const raw = await RequestUtils.originRequest.call(this, requestOptions);
			return RequestUtils.interpretSuccess.call(this, raw, requestOptions);
		} catch (error) {
			return RequestUtils.interpretFailure.call(this, error, requestOptions);
		}
	}

	static async interpretSuccess(
		this: IExecuteFunctions,
		raw: unknown,
		requestOptions: IHttpRequestOptions,
		allowTokenRefresh = true,
	): Promise<any> {
		if (isBinaryPayload(raw)) {
			return raw;
		}

		const { body, headers, statusCode } = unwrapHttpResponse(raw);
		if (isBinaryPayload(body)) {
			return body;
		}

		return RequestUtils.interpretFeishuJson.call(
			this,
			body,
			headers,
			statusCode,
			requestOptions,
			allowTokenRefresh,
		);
	}

	static async interpretFailure(
		this: IExecuteFunctions,
		error: unknown,
		requestOptions: IHttpRequestOptions,
	): Promise<any> {
		const err = error as { context?: { data?: unknown } };
		if (err.context?.data !== undefined) {
			let errorData: unknown = err.context.data;
			try {
				if (
					!errorData ||
					typeof errorData !== 'object' ||
					(errorData as { code?: unknown }).code === undefined
				) {
					errorData = JSON.parse(Buffer.from(errorData as ArrayBuffer).toString('utf-8'));
				}
			} catch {
				throw error;
			}

			return RequestUtils.interpretFeishuJson.call(
				this,
				errorData,
				extractResponseHeaders(error),
				extractHttpStatus(error),
				requestOptions,
				true,
				error,
			);
		}

		throw error;
	}

	static async interpretFeishuJson(
		this: IExecuteFunctions,
		body: unknown,
		headers: Record<string, string | string[] | undefined> | undefined,
		statusCode: number | undefined,
		requestOptions: IHttpRequestOptions,
		allowTokenRefresh: boolean,
		originalError?: unknown,
	): Promise<any> {
		if (!body || typeof body !== 'object') {
			if (statusCode && isRetryableHttpStatus(statusCode)) {
				throw createRetryableError({
					message: `Request failed with status code ${statusCode}`,
					statusCode,
					headers,
				});
			}
			return body;
		}

		const payload = body as { code?: number; msg?: string; error?: { troubleshooter?: string } };
		if (typeof payload.code !== 'number') {
			return body;
		}

		if (payload.code === 0) {
			return body;
		}

		if (payload.code === TOKEN_EXPIRED_CODE && allowTokenRefresh) {
			const raw = await RequestUtils.originRequest.call(this, requestOptions, true);
			return RequestUtils.interpretSuccess.call(this, raw, requestOptions, false);
		}

		if (payload.code === FEISHU_RATE_LIMIT_CODE) {
			throw createRetryableError({
				message: `Request Feishu Suite API Error: ${payload.code}, ${payload.msg}`,
				statusCode: statusCode && isRetryableHttpStatus(statusCode) ? statusCode : 429,
				feishuCode: payload.code,
				headers,
			});
		}

		if (statusCode && isRetryableHttpStatus(statusCode)) {
			throw createRetryableError({
				message: `Request Feishu Suite API Error: ${payload.code}, ${payload.msg}`,
				statusCode,
				feishuCode: payload.code,
				headers,
			});
		}

		throw new NodeApiError(this.getNode(), (originalError ?? payload) as JsonObject, {
			message: `Request Feishu Suite API Error: ${payload.code}, ${payload.msg}`,
			description: payload.error?.troubleshooter || '',
		});
	}
}

export default RequestUtils;
