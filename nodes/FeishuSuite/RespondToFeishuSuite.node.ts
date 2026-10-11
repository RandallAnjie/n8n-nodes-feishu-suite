import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	INodeParameters,
	IN8nHttpFullResponse,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const configuredOutputs = (parameters: INodeParameters) => {
	const enableResponseOutput = parameters.enableResponseOutput as boolean;
	if (enableResponseOutput) {
		return [
			{ type: 'main', displayName: 'Input Data' },
			{ type: 'main', displayName: 'Response Data' },
		];
	}
	return ['main'];
};

export class RespondToFeishuSuite implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Respond to Feishu Suite',
		name: 'respondToFeishuSuite',
		icon: 'file:lark_icon.svg',
		group: ['output'],
		version: [1],
		defaultVersion: 1,
		description:
			'Sends a synchronous response back to the Feishu Suite Trigger or Feishu Suite Webhook Trigger node. Place this node after your trigger and processing nodes to send a custom response to card callbacks and other synchronous events. | 向 Feishu Suite Trigger 或 Feishu Suite Webhook Trigger 节点发送同步响应。将此节点放在触发器和处理节点之后，以向卡片回调和其他同步事件发送自定义响应。',
		subtitle:
			'={{$parameter["respondWith"] === "json" ? "Returns custom JSON data" : "No response data"}}',
		defaults: {
			name: 'Respond to Feishu Suite',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: `={{(${configuredOutputs})($parameter)}}`,
		properties: [
			{
				displayName:
					'This node sends a synchronous response back to the Feishu Suite trigger. It only works when the trigger\'s Response Mode is set to "Using Respond Node". Place it after your trigger and processing nodes. | 此节点向 Feishu Suite 触发器发送同步响应。仅当触发器的响应模式设置为 "使用 Respond 节点" 时有效。请将其放在触发器和处理节点之后。',
				name: 'respondNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				required: true,
				default: 'websocket',
				description: 'The trigger mode this node responds to',
				options: [
					{
						name: 'WebSocket',
						value: 'websocket',
						description: 'For Feishu Suite Trigger (WebSocket)',
					},
					{
						name: 'Webhook',
						value: 'webhook',
						description: 'For Feishu Suite Webhook Trigger (HTTP)',
					},
				],
			},
			{
				displayName: 'Response Content',
				name: 'respondWith',
				type: 'options',
				required: true,
				default: 'noResponse',
				description: 'The content to send back as the response',
				options: [
					{
						name: 'No Response Data',
						value: 'noResponse',
						description: 'Return an empty response body',
					},
					{
						name: 'JSON',
						value: 'json',
						description: 'Return custom JSON data',
					},
				],
			},
			{
				displayName: 'Custom JSON',
				name: 'jsonValue',
				type: 'json',
				required: true,
				default: '{}',
				displayOptions: {
					show: {
						respondWith: ['json'],
					},
				},
				description: 'Custom JSON data to send as the response body',
			},
			{
				displayName: 'Enable Response Output',
				name: 'enableResponseOutput',
				type: 'boolean',
				default: false,
				isNodeSetting: true,
				description: 'Whether to output the response data as a separate output',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const mode = this.getNodeParameter('mode', 0) as string;
		const respondWith = this.getNodeParameter('respondWith', 0) as string;
		const enableResponseOutput = this.getNodeParameter('enableResponseOutput', 0, false) as boolean;

		let responseBody: IDataObject | string = {};

		if (respondWith === 'json') {
			const jsonValue = this.getNodeParameter('jsonValue', 0) as string;
			if (typeof jsonValue === 'string') {
				try {
					responseBody = JSON.parse(jsonValue);
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Invalid JSON in response content: ${error.message}`,
					);
				}
			} else {
				responseBody = jsonValue as IDataObject;
			}
		}

		if (mode === 'webhook') {
			this.sendResponse({
				body: responseBody,
				headers: {},
				statusCode: 200,
			} as IN8nHttpFullResponse);
		} else {
			this.sendResponse(responseBody as IDataObject);
		}

		const responseData = respondWith === 'json' ? responseBody : {};
		const responseItems = this.helpers.constructExecutionMetaData(
			this.helpers.returnJsonArray(responseData as IDataObject),
			{ itemData: { item: 0 } },
		);

		if (enableResponseOutput) {
			return [items, responseItems];
		}

		return [responseItems];
	}
}
