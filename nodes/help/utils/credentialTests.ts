import type {
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	ICredentialsDecrypted,
	INodeCredentialTestResult,
} from 'n8n-workflow';
import {
	feishuTenantTokenUrl,
	feishuUserInfoUrl,
	formatCredentialHttpError,
	interpretFeishuApiResponse,
	resolveFeishuBaseUrl,
} from './credentialBaseUrl';
import { throwIfRetryableFeishuBody, unwrapHttpResponse, withFeishuRetry } from './feishuRetry';

function fail(message: string): INodeCredentialTestResult {
	return { status: 'Error', message };
}

function ok(): INodeCredentialTestResult {
	return { status: 'OK', message: 'Connection successful!' };
}

export async function testFeishuSuiteApiCredential(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const data = (credential.data ?? {}) as ICredentialDataDecryptedObject;
	const appId = String(data.appid ?? '').trim();
	const appSecret = String(data.appsecret ?? '').trim();
	if (!appId || !appSecret) {
		return fail('App ID and App Secret are required');
	}

	let tokenUrl: string;
	try {
		resolveFeishuBaseUrl(data);
		tokenUrl = feishuTenantTokenUrl(data);
	} catch (error) {
		return fail(error instanceof Error ? error.message : String(error));
	}

	try {
		const body = await withFeishuRetry(async () => {
			const raw = await this.helpers.request({
				method: 'POST',
				uri: tokenUrl,
				body: {
					app_id: appId,
					app_secret: appSecret,
				},
				json: true,
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
				},
			});
			const unwrapped = unwrapHttpResponse(raw);
			throwIfRetryableFeishuBody(unwrapped.body, unwrapped.headers);
			return unwrapped.body;
		});
		const interpreted = interpretFeishuApiResponse(body);
		if (!interpreted.ok) {
			return fail(interpreted.message);
		}
		if (!(body as { tenant_access_token?: string })?.tenant_access_token) {
			return fail('Feishu did not return a tenant_access_token');
		}
		return ok();
	} catch (error) {
		return fail(formatCredentialHttpError(error, tokenUrl));
	}
}

export async function testFeishuSuiteOAuth2Credential(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const data = (credential.data ?? {}) as ICredentialDataDecryptedObject;
	const oauthTokenData = data.oauthTokenData;
	const accessToken =
		oauthTokenData && typeof oauthTokenData === 'object'
			? String((oauthTokenData as { access_token?: string }).access_token ?? '').trim()
			: '';

	if (!accessToken) {
		return fail('OAuth2 is not connected yet. Click Connect to authorize, then test again.');
	}

	let userInfoUrl: string;
	try {
		resolveFeishuBaseUrl(data);
		userInfoUrl = feishuUserInfoUrl(data);
	} catch (error) {
		return fail(error instanceof Error ? error.message : String(error));
	}

	try {
		const body = await withFeishuRetry(async () => {
			const raw = await this.helpers.request({
				method: 'GET',
				uri: userInfoUrl,
				headers: {
					Accept: 'application/json',
					Authorization: `Bearer ${accessToken}`,
				},
				json: true,
			});
			const unwrapped = unwrapHttpResponse(raw);
			throwIfRetryableFeishuBody(unwrapped.body, unwrapped.headers);
			return unwrapped.body;
		});
		const interpreted = interpretFeishuApiResponse(body);
		if (!interpreted.ok) {
			return fail(interpreted.message);
		}
		return ok();
	} catch (error) {
		return fail(formatCredentialHttpError(error, userInfoUrl));
	}
}
