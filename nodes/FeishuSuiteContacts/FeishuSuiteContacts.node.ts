import type {
	IExecuteFunctions,
	INodeListSearchResult,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import ResourceFactory from '../help/builder/ResourceFactory';
import { Credentials, OutputType } from '../help/type/enums';
import { sendAndWaitWebhook } from '../help/utils/webhook';
import RequestUtils from '../help/utils/RequestUtils';

const resourceBuilder = ResourceFactory.build(require('path').resolve(__dirname, '..', 'FeishuSuite'));
const CONTACTS_RESOURCE = 'contacts';

function filterContactsProperties(allProps: any[]): any[] {
	const filtered: any[] = [];
	for (const prop of allProps) {
		const show = prop.displayOptions?.show;
		if (!show) {
			filtered.push(prop);
			continue;
		}
		if (show.resource?.includes(CONTACTS_RESOURCE)) {
			filtered.push(prop);
		}
	}
	return filtered;
}

const contactsProperties = filterContactsProperties(resourceBuilder.build());

export class FeishuSuiteContacts implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Feishu Suite Contacts',
		name: 'feishuSuiteContacts',
		icon: 'file:lark_icon.svg',
		group: ['input'],
		version: [1],
		defaultVersion: 1,
		description: 'Lark Contacts Operations (Users, Departments)',
		subtitle: '={{$parameter["operation"]}}',
		defaults: {
			name: 'Feishu Suite Contacts',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: ['main'],
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
			{
				name: Credentials.UserToken,
				required: true,
				displayOptions: {
					show: {
						authentication: [Credentials.UserToken],
					},
				},
			},
		],
		properties: contactsProperties,
	};

	methods = {
		listSearch: {
			async searchUserIds(
				this: ILoadOptionsFunctions,
				query?: string,
			): Promise<INodeListSearchResult> {
				if (!query) {
					throw new NodeOperationError(this.getNode(), 'Query required for search');
				}

				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				const body = emailRegex.test(query) ? { emails: [query] } : { mobiles: [query] };

				const results: any[] = [];
				const userIdTypes = ['open_id', 'user_id', 'union_id'];
				for (const userIdType of userIdTypes) {
					const {
						data: { user_list: users },
					} = await RequestUtils.request.call(this as unknown as IExecuteFunctions, {
						method: 'POST',
						url: '/open-apis/contact/v3/users/batch_get_id',
						qs: {
							user_id_type: userIdType,
						},
						body,
					});

					if (!users[0].user_id) {
						throw new NodeOperationError(this.getNode(), `No user found for: ${query}`);
					}

					results.push({
						name: userIdType,
						value: users[0]?.user_id || '',
					});
				}

				return { results };
			},
		},
	};

	webhook = sendAndWaitWebhook;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let returnData: INodeExecutionData[][] = Array.from({ length: 1 }, () => []);

		const operation = this.getNodeParameter('operation', 0);
		const callFunc = resourceBuilder.getCall(CONTACTS_RESOURCE, operation);

		if (!callFunc) {
			throw new NodeOperationError(
				this.getNode(),
				'No operation found: ' + CONTACTS_RESOURCE + '.' + operation,
			);
		}

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				this.logger.debug('call function', { resource: CONTACTS_RESOURCE, operation, itemIndex });
				const responseData = await callFunc.call(this, itemIndex);
				const { outputType } = responseData;
				if (!outputType) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: itemIndex } },
					);
					returnData[0].push(...executionData);
				} else if (outputType === OutputType.Multiple) {
					const { outputData } = responseData as { outputData: INodeExecutionData[][] };
					returnData = outputData;
				} else if (outputType === OutputType.Binary) {
					const { binaryData, binaryPropertyName = 'data' } = responseData as {
						binaryData: IDataObject;
						binaryPropertyName?: string;
					};
					const executionData = this.helpers.constructExecutionMetaData(
						[
							{
								json: {},
								binary: { [binaryPropertyName]: binaryData },
							},
						] as INodeExecutionData[],
						{ itemData: { item: itemIndex } },
					);
					returnData[0].push(...executionData);
				} else {
					return [];
				}
			} catch (error) {
				this.logger.error('call function error', {
					resource: CONTACTS_RESOURCE,
					operation,
					itemIndex,
					errorMessage: error.message,
					stack: error.stack,
				});

				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.description ?? error.message }),
						{ itemData: { item: itemIndex } },
					);
					returnData[0].push(...executionErrorData);
					continue;
				} else if (error.name === 'NodeApiError') {
					throw error;
				} else {
					throw new NodeOperationError(this.getNode(), error, {
						message: error.message,
						itemIndex,
					});
				}
			}
		}

		return returnData;
	}
}




