import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
	Icon,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { BaseUrl, Credentials } from '../nodes/help/type/enums';
import {
	feishuTenantTokenUrl,
	formatCredentialHttpError,
	formatFeishuAuthError,
} from '../nodes/help/utils/credentialBaseUrl';
import {
	throwIfRetryableFeishuBody,
	unwrapHttpResponse,
	withFeishuRetry,
} from '../nodes/help/utils/feishuRetry';

export class FeishuSuiteApi implements ICredentialType {
	name = Credentials.TenantToken;
	displayName = 'Feishu Suite API';
	icon: Icon = 'file:lark_icon.svg';
	documentationUrl = 'https://open.feishu.cn/document/faq/trouble-shooting/how-to-obtain-app-id';
	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'url',
			type: 'options',
			options: [
				{
					name: `${BaseUrl.China}`,
					value: `${BaseUrl.China}`,
					description: 'Feishu Open Platform base URL(China)',
				},
				{
					name: `${BaseUrl.Global}`,
					value: `${BaseUrl.Global}`,
					description: 'Larksuite Open Platform base URL(Global)',
				},
				{
					name: 'Custom',
					value: 'custom',
					description: 'Custom URL',
				},
			],
			default: BaseUrl.China,
			required: true,
		},
		{
			displayName: 'Custom URL',
			name: 'customUrl',
			type: 'string',
			default: '',
			placeholder: 'https://custom.domain',
			hint: 'Always start with "https://" or "http://"',
			displayOptions: {
				show: {
					url: ['custom'],
				},
			},
		},
		{
			displayName: 'URL',
			name: 'baseUrl',
			type: 'hidden',
			default: '={{$self["url"] === "custom" ? $self["customUrl"] : $self["url"]}}',
		},
		{
			displayName: 'App ID',
			description: 'The unique identifier for an application on the Lark Open Platform',
			name: 'appid',
			type: 'string',
			default: '',
		},
		{
			displayName: 'App Secret',
			name: 'appsecret',
			description: 'The secret key for the application.',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'AccessToken',
			name: 'accessToken',
			type: 'hidden',
			default: '',
			typeOptions: {
				expirable: true,
			},
		},
	];

	// Workflow requests and the credential Test button both call this when
	// accessToken is empty/expired (Test always does). Resolve the origin from
	// url/customUrl in code so an unevaluated hidden $self baseUrl cannot send
	// the probe to the wrong host.
	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const tokenUrl = feishuTenantTokenUrl(credentials);
		let payload: { code?: number; msg?: string; tenant_access_token?: string };
		try {
			payload = await withFeishuRetry(async () => {
				const raw = await this.helpers.httpRequest({
					method: 'POST',
					url: tokenUrl,
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/json',
					},
					body: {
						app_id: credentials.appid,
						app_secret: credentials.appsecret,
					},
					json: true,
					returnFullResponse: true,
				});
				const { body, headers } = unwrapHttpResponse(raw);
				throwIfRetryableFeishuBody(body, headers);
				return body as { code?: number; msg?: string; tenant_access_token?: string };
			});
		} catch (error) {
			throw new Error(formatCredentialHttpError(error, tokenUrl));
		}

		const { code, msg, tenant_access_token } = payload;
		if (code && code !== 0) {
			throw new Error(formatFeishuAuthError(code, msg));
		}

		if (!tenant_access_token) {
			throw new Error('Feishu did not return a tenant_access_token');
		}

		return { accessToken: tenant_access_token };
	}

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const target = `${requestOptions.baseURL ?? ''}${requestOptions.url ?? ''}`;
		// The tenant token endpoint authenticates with app_id/app_secret in the
		// body. Attaching Bearer here is what some Feishu/WAF edges 403, and it
		// is unnecessary for Test which re-POSTs that same path.
		if (target.includes('/open-apis/auth/v3/tenant_access_token/internal')) {
			return requestOptions;
		}
		requestOptions.headers = {
			...requestOptions.headers,
			Authorization: `Bearer ${credentials.accessToken}`,
		};
		return requestOptions;
	}

	// Community-package installs register nodes as n8n-nodes-feishu-suite.feishuSuite
	// and populate supportedNodes, so FeishuSuite.methods.credentialTest is
	// discovered via testedBy. Do not add a declarative `test` here: n8n prefers
	// type.test and that path always runs preAuthentication + persist, which
	// throws "Found credential with no ID" (or REST 403) on the editor's
	// unsaved / empty-id Test.
}
