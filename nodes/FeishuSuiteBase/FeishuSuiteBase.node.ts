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
import { Credentials, FileType, OutputType } from '../help/type/enums';
import {
	getFileList,
	larkApiRequestBaseRoleList,
	larkApiRequestTableFieldList,
	larkApiRequestTableList,
	larkApiRequestTableViewList,
} from '../FeishuSuite/GenericFunctions';
import { sendAndWaitWebhook } from '../help/utils/webhook';

const resourceBuilder = ResourceFactory.build(require('path').resolve(__dirname, '..', 'FeishuSuite'));
const BASE_RESOURCE = 'base';

function filterBaseProperties(allProps: any[]): any[] {
	const filtered: any[] = [];
	for (const prop of allProps) {
		const show = prop.displayOptions?.show;
		if (!show) {
			filtered.push(prop);
			continue;
		}
		if (show.resource?.includes(BASE_RESOURCE)) {
			filtered.push(prop);
		}
	}
	return filtered;
}

const baseProperties = filterBaseProperties(resourceBuilder.build());

export class FeishuSuiteBase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Feishu Suite Base',
		name: 'feishuSuiteBase',
		icon: 'file:lark_icon.svg',
		group: ['input'],
		version: [1],
		defaultVersion: 1,
		description: 'Lark Base/Bitable Operations (Apps, Tables, Records, Fields, Views, Roles, Members)',
		subtitle: '={{$parameter["operation"]}}',
		defaults: {
			name: 'Feishu Suite Base',
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
		properties: baseProperties,
	};

	methods = {
		listSearch: {
			async searchBitables(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				const bitables = await getFileList.call(this as unknown as IExecuteFunctions, [
					FileType.Bitable,
				]);
				return {
					results: bitables.map((bitable) => ({
						name: bitable.name as string,
						value: bitable.token as string,
						url: bitable.url as string,
					})),
				};
			},

			async searchTables(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				const appToken = this.getNodeParameter('app_token', undefined, {
					extractValue: true,
				}) as string;
				const tables = await larkApiRequestTableList.call(
					this as unknown as IExecuteFunctions,
					appToken,
				);
				return {
					results: tables.map((table) => ({
						name: table.name as string,
						value: table.table_id as string,
					})),
				};
			},

			async searchTableViews(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				const app_token = this.getNodeParameter('app_token', undefined, {
					extractValue: true,
				}) as string;
				const table_id = this.getNodeParameter('table_id', undefined, {
					extractValue: true,
				}) as string;
				const user_id_type = this.getNodeParameter('user_id_type', 'open_id') as string;
				const views = await larkApiRequestTableViewList.call(this as unknown as IExecuteFunctions, {
					app_token,
					table_id,
					user_id_type,
				});
				return {
					results: views.map((view) => ({
						name: view.view_name as string,
						value: view.view_id as string,
					})),
				};
			},

			async searchTableFields(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				const app_token = this.getNodeParameter('app_token', undefined, {
					extractValue: true,
				}) as string;
				const table_id = this.getNodeParameter('table_id', undefined, {
					extractValue: true,
				}) as string;
				const fields = await larkApiRequestTableFieldList.call(
					this as unknown as IExecuteFunctions,
					{
						app_token,
						table_id,
					},
				);
				return {
					results: fields.map((field) => ({
						name: field.field_name as string,
						value: field.field_id as string,
					})),
				};
			},

			async searchTableFieldNames(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				const app_token = this.getNodeParameter('app_token', undefined, {
					extractValue: true,
				}) as string;
				const table_id = this.getNodeParameter('table_id', undefined, {
					extractValue: true,
				}) as string;
				const fields = await larkApiRequestTableFieldList.call(
					this as unknown as IExecuteFunctions,
					{
						app_token,
						table_id,
					},
				);
				return {
					results: fields.map((field) => ({
						name: `${field.field_name as string} (${field.field_id as string})`,
						value: field.field_name as string,
					})),
				};
			},

			async searchBaseRoles(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				const app_token = this.getNodeParameter('app_token', undefined, {
					extractValue: true,
				}) as string;
				const roles = await larkApiRequestBaseRoleList.call(this as unknown as IExecuteFunctions, {
					app_token,
				});
				return {
					results: roles.map((role) => ({
						name: role.role_name as string,
						value: role.role_id as string,
					})),
				};
			},
		},
	};

	webhook = sendAndWaitWebhook;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let returnData: INodeExecutionData[][] = Array.from({ length: 1 }, () => []);

		const operation = this.getNodeParameter('operation', 0);
		const callFunc = resourceBuilder.getCall(BASE_RESOURCE, operation);

		if (!callFunc) {
			throw new NodeOperationError(
				this.getNode(),
				'No operation found: ' + BASE_RESOURCE + '.' + operation,
			);
		}

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				this.logger.debug('call function', { resource: BASE_RESOURCE, operation, itemIndex });
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
					resource: BASE_RESOURCE,
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





