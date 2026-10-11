import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
	Icon,
	IAuthenticateGeneric,
} from 'n8n-workflow';
import { BaseUrl, Credentials } from '../nodes/help/type/enums';
import { feishuTenantTokenUrl, formatFeishuAuthError } from '../nodes/help/utils/credentialBaseUrl';

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

	// Used by workflow requests, not by the credential Test button.
	// Test is implemented via FeishuSuite.methods.credentialTest so n8n does not
	// attach Authorization and persist the token while probing App ID/Secret.
	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const { code, msg, tenant_access_token } = (await this.helpers.httpRequest({
			method: 'POST',
			url: feishuTenantTokenUrl(credentials),
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			body: {
				app_id: credentials.appid,
				app_secret: credentials.appsecret,
			},
			json: true,
		})) as { code: number; msg: string; tenant_access_token: string };

		if (code && code !== 0) {
			throw new Error(formatFeishuAuthError(code, msg));
		}

		if (!tenant_access_token) {
			throw new Error('Feishu did not return a tenant_access_token');
		}

		return { accessToken: tenant_access_token };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials?.accessToken}}',
			},
		},
	};

	supportedNodes = ['feishuSuite'];
}
