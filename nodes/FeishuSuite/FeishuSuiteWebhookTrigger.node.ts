import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { ANY_EVENT } from '../lark-sdk/consts';
import { AESCipher } from '../lark-sdk/utils/aes-cipher';
import { Credentials } from '../help/type/enums';
import { triggerEventProperty } from '../help/utils/properties';

export class FeishuSuiteWebhookTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Feishu Suite Webhook Trigger',
		name: 'feishuSuiteWebhookTrigger',
		icon: 'file:lark_icon.svg',
		group: ['trigger'],
		version: [1],
		defaultVersion: 1,
		subtitle: '=Events: {{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow on Feishu/Lark events via HTTP webhook',
		defaults: {
			name: 'Feishu Suite Webhook Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: Credentials.TenantToken,
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: '={{$parameter["responseMode"]}}',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'Configure the Webhook URL below in the Feishu open platform "Event Subscription" settings. | 将下方 Webhook URL 配置到飞书开放平台「事件与回调」中',
				name: 'webhookNotice',
				type: 'notice',
				default: '',
			},
			triggerEventProperty,
			{
				displayName: 'Encrypt Key',
				name: 'encryptKey',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				description:
					'The encrypt key configured in the Feishu open platform for encrypted event push. Leave empty if encryption is not enabled.',
			},
			{
				displayName: 'Verify Token',
				name: 'verifyTokenEnabled',
				type: 'boolean',
				default: false,
				description: 'Whether to verify the verification token sent by Feishu',
			},
			{
				displayName: 'Verification Token',
				name: 'verificationToken',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				description: 'The verification token configured in the Feishu open platform',
				displayOptions: {
					show: {
						verifyTokenEnabled: [true],
					},
				},
			},
			{
				displayName: 'Response Mode',
				name: 'responseMode',
				type: 'options',
				required: true,
				default: 'onReceived',
				options: [
					{
						name: 'Immediately',
						value: 'onReceived',
						description: 'Returns a 200 response immediately when the webhook is received',
					},
					{
						name: 'Using Respond Node',
						value: 'responseNode',
						description:
							'Use a Respond to Feishu Suite node to send the response. No immediate response is sent.',
					},
				],
			},
			{
				displayName:
					'When using "Using Respond Node" mode, you must add a Respond to Feishu Suite node to your workflow to respond to the webhook.',
				name: 'responseNodeNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						responseMode: ['responseNode'],
					},
				},
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData() as IDataObject;
		const credentials = await this.getCredentials(Credentials.TenantToken);

		// Step 1: Decrypt if encrypt field is present
		let eventBody: IDataObject = body;
		const encryptKey = this.getNodeParameter('encryptKey', '') as string;

		if (body.encrypt && encryptKey) {
			try {
				const aesCipher = new AESCipher(encryptKey);
				const decrypted = aesCipher.decrypt(body.encrypt as string);
				eventBody = JSON.parse(decrypted) as IDataObject;
			} catch (error) {
				throw new NodeOperationError(
					this.getNode(),
					`Failed to decrypt event body: ${error.message}`,
				);
			}
		}

		// Step 2: URL verification (Feishu sends a challenge during URL verification)
		if (eventBody.type === 'url_verification') {
			const challenge = eventBody.challenge as string;
			if (challenge) {
				return {
					webhookResponse: { challenge },
				};
			}
		}

		// Step 3: Verify token if enabled
		const verifyTokenEnabled = this.getNodeParameter('verifyTokenEnabled', false) as boolean;
		if (verifyTokenEnabled) {
			const verificationToken = this.getNodeParameter('verificationToken', '') as string;
			const receivedToken = (eventBody.token as string) || '';
			if (receivedToken !== verificationToken) {
				throw new NodeOperationError(this.getNode(), 'Verification token mismatch');
			}
		}

		// Step 4: app_id matching
		const appId = credentials.appid as string;
		if (!appId) {
			throw new NodeOperationError(this.getNode(), 'Missing app ID in credentials');
		}

		let eventAppId: string | undefined;

		// Schema 1.0: event.app_id
		if (eventBody.event) {
			const event = eventBody.event as IDataObject;
			eventAppId = event.app_id as string;
		}

		// Schema 2.0: header.app_id
		if (!eventAppId && eventBody.header) {
			const header = eventBody.header as IDataObject;
			eventAppId = header.app_id as string;
		}

		// Fallback: top-level app_id
		if (!eventAppId) {
			eventAppId = eventBody.app_id as string;
		}

		if (eventAppId && eventAppId !== appId) {
			this.logger.warn(
				`Event app_id ${eventAppId} does not match credential app_id ${appId}, skipping event`,
			);
			return {};
		}

		// Step 5: Event type matching
		const selectedEvents = this.getNodeParameter('events', []) as string[];
		const isAnyEvent = selectedEvents.includes(ANY_EVENT);

		if (!isAnyEvent) {
			let eventType: string | undefined;

			// Schema 1.0: event.type
			if (eventBody.event) {
				const event = eventBody.event as IDataObject;
				eventType = event.type as string;
			}

			// Schema 2.0: header.event_type
			if (!eventType && eventBody.header) {
				const header = eventBody.header as IDataObject;
				eventType = header.event_type as string;
			}

			if (!eventType || !selectedEvents.includes(eventType)) {
				this.logger.debug(`Event type ${eventType} not in selected events, skipping`);
				return {};
			}
		}

		// Step 6: Emit the event
		const responseMode = this.getNodeParameter('responseMode', 'onReceived') as string;
		const workflowData = [[{ json: eventBody as unknown as IDataObject }]];

		if (responseMode === 'onReceived') {
			return {
				webhookResponse: { code: 0, msg: 'success' },
				workflowData,
			};
		}

		// responseNode mode: do not send immediate response, let the user use a Respond node
		return {
			workflowData,
		};
	}
}
