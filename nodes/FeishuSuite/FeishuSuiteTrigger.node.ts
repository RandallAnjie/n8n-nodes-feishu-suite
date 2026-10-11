import type {
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
	IRun,
	IDataObject,
	IExecuteFunctions,
} from 'n8n-workflow';
import {
	NodeConnectionTypes,
	NodeOperationError,
	type IExecuteResponsePromiseData,
} from 'n8n-workflow';
import { Credentials, FileType } from '../help/type/enums';
import { WSClient } from '../lark-sdk/ws-client';
import { EventDispatcher } from '../lark-sdk/handler/event-handler';
import { triggerEventProperty } from '../help/utils/properties';
import { WORDING } from '../help/wording';
import { ANY_EVENT } from '../lark-sdk/consts';
import RequestUtils from '../help/utils/RequestUtils';
import { resolveFeishuBaseUrl } from '../help/utils/credentialBaseUrl';

export class FeishuSuiteTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Feishu Suite Trigger',
		name: 'feishuSuiteTrigger',
		icon: 'file:lark_icon.svg',
		group: ['trigger'],
		version: [1, 2],
		defaultVersion: 2,
		subtitle: '=Events: {{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow on Feishu/Lark events',
		defaults: {
			name: 'Feishu Suite Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: Credentials.TenantToken,
				required: true,
				displayOptions: {
					show: {
						authentication: [Credentials.TenantToken],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				default: `${Credentials.TenantToken}`,
				options: [
					{
						name: 'Tenant Access Token',
						value: Credentials.TenantToken,
					},
				],
			},
			{
				displayName:
					'Long-connection WebSocket events use the credential Base URL (Feishu China or Lark international). Due to API limits, only one live connection is supported per bot app.',
				name: 'LarkTriggerNotice',
				type: 'notice',
				default: '',
			},
			triggerEventProperty,
			{
				displayName: WORDING.Options,
				name: 'options',
				type: 'collection',
				placeholder: WORDING.AddField,
				default: {},
				options: [
					{
						displayName: '响应模式（Response Mode）',
						name: 'responseMode',
						type: 'options',
						default: 'immediately',
						options: [
							{
								name: 'Immediately',
								value: 'immediately',
								description:
									'Returns a response immediately when the event is received (callbackToast can still be used)',
							},
							{
								name: 'Using Respond Node',
								value: 'responseNode',
								description:
									'Use a Respond to Feishu Suite node to send the response. The trigger will wait up to 3000ms for the response.',
							},
						],
					},
					{
						displayName: '停用时取消订阅（Unsubscribe on Deactivate）',
						name: 'unsubscribeOnDeactivate',
						type: 'boolean',
						default: false,
						description: 'Whether to unsubscribe the events on deactivation',
					},
					{
						displayName: '回调提示（Callback Toast）',
						name: 'callbackToast',
						type: 'string',
						default: '',
						description:
							'Set the toast message displayed to users when the callback is triggered. If not set, no toast will be shown.',
					},
					{
						displayName: '订阅云文档事件（Subscription Docs Event）',
						name: 'subscriptionEventsUi',
						placeholder: 'Add New Subscription',
						type: 'fixedCollection',
						default: {},
						typeOptions: {
							multipleValues: true,
						},
						options: [
							{
								name: 'eventValues',
								displayName: 'New Subscription',
								values: [
									{
										displayName: '文件类型（File Type）',
										name: 'type',
										type: 'options',
										required: true,
										default: 'bitable',
										options: [
											{
												name: '多维表格（Bitable）',
												value: FileType.Bitable,
											},
											{
												name: '新版文档类型（Docx）',
												value: FileType.Docx,
											},
											{
												name: '文件夹（Folder）',
												value: FileType.Folder,
											},
											{
												name: '文件（File）',
												value: FileType.File,
											},
											{
												name: '幻灯片（Slides）',
												value: FileType.Slides,
											},
										],
									},
									{
										displayName: '文件唯一标识（File Token）',
										name: 'fileId',
										required: true,
										type: 'string',
										default: '',
										description:
											'Document token. For details, <a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/drive-v1/faq">check documentation</a>.',
									},
								],
							},
						],
					},
				],
			},
			{
				displayName:
					'When using "Using Respond Node" mode, you must add a Respond to Feishu Suite node to your workflow to respond to the trigger.',
				name: 'responseNodeNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName:
					'Before adding this event, please ensure that you have add the subscription in the options field. <a target="_blank" href="https://open.feishu.cn/document/server-docs/docs/drive-v1/event/subscribe">Open Documentation</a>',
				name: 'subscriptionNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						events: [
							ANY_EVENT,
							'drive.file.bitable_field_changed_v1',
							'drive.file.bitable_record_changed_v1',
						],
					},
				},
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const credentials = await this.getCredentials(Credentials.TenantToken);

		if (!(credentials.appid && credentials.appsecret)) {
			throw new NodeOperationError(this.getNode(), 'Missing required Feishu Suite credentials');
		}

		const options = this.getNodeParameter('options', {}) as IDataObject;
		const callbackToast = (options.callbackToast as string) || undefined;
		const responseMode = (options.responseMode as string) || 'immediately';

		const handleSubscribeEvents = async (cmd: 'subscribe' | 'delete_subscribe') => {
			const unsubscribeOnDeactivate = (options.unsubscribeOnDeactivate as boolean) || false;
			if (cmd === 'delete_subscribe' && !unsubscribeOnDeactivate) {
				return;
			}

			if (options.subscriptionEventsUi) {
				const subscriptionEvents = (options.subscriptionEventsUi as IDataObject)
					.eventValues as IDataObject[];

				const subscriptionPromises = subscriptionEvents.map(async (subscription) => {
					const { type, fileId } = subscription;

					return RequestUtils.request.call(this as unknown as IExecuteFunctions, {
						method: cmd === 'subscribe' ? 'POST' : 'DELETE',
						url: `/open-apis/drive/v1/files/${fileId}/${cmd}`,
						qs: {
							file_type: type,
							...(type === FileType.Folder && { event_type: 'file.created_in_folder_v1' }),
						},
					});
				});

				// Wait for all subscription requests to complete
				await Promise.all(subscriptionPromises);
			}
		};

		const appId = credentials['appid'] as string;
		const appSecret = credentials['appsecret'] as string;
		const baseUrl = resolveFeishuBaseUrl(credentials);

		const wsClient: WSClient = new WSClient({
			appId,
			appSecret,
			domain: `${baseUrl}`, // Use the base URL from credentials
			logger: this.logger,
			helpers: this.helpers,
		});

		const closeFunction = async () => {
			await wsClient.stop(); // Close the WebSocket connection
			await handleSubscribeEvents('delete_subscribe'); // Unsubscribe from events if needed
		};

		const startWsClient = async () => {
			const events = this.getNodeParameter('events', []) as string[];
			const isAnyEvent = events.includes('any_event');
			const handlers: Record<string, (data: any) => Promise<IDataObject>> = {};

			for (const event of events) {
				handlers[event] = async (data) => {
					const isCardAction = event === 'card.action.trigger';

					if (responseMode === 'responseNode' && isCardAction) {
						const responsePromise =
							this.helpers.createDeferredPromise<IExecuteResponsePromiseData>();
						this.emit([this.helpers.returnJsonArray(data)], responsePromise);
						try {
							const response = await Promise.race([
								responsePromise.promise,
								new Promise<never>((_, reject) =>
									setTimeout(
										() => reject(new Error('Response timeout (3000ms)')),
										3000,
									),
								),
							]);
							return (response as IDataObject) ?? {};
						} catch {
							return {};
						}
					}

					let donePromise = undefined;

					donePromise = this.helpers.createDeferredPromise<IRun>();
					this.emit([this.helpers.returnJsonArray(data)], undefined, donePromise);
					// if (donePromise) {
					// 	await donePromise.promise;
					// }

					this.logger.info(`Handled event: ${event}`);

					if (callbackToast) {
						return {
							toast: {
								type: 'info',
								content: callbackToast,
							},
						};
					}

					return {};
				};
			}

			const eventDispatcher = new EventDispatcher({ logger: this.logger, isAnyEvent }).register(
				handlers,
			);

			await wsClient.start({ eventDispatcher });
		};

		if (this.getMode() !== 'manual') {
			await handleSubscribeEvents('subscribe');
			await startWsClient();
			return {
				closeFunction,
			};
		} else {
			const manualTriggerFunction = async () => {
				await handleSubscribeEvents('subscribe');
				await startWsClient();
			};

			return {
				closeFunction,
				manualTriggerFunction,
			};
		}
	}
}
