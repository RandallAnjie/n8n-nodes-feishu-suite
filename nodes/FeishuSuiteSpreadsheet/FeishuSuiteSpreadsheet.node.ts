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
import { larkApiRequestSheetList } from '../FeishuSuite/GenericFunctions';
import { sendAndWaitWebhook } from '../help/utils/webhook';

const resourceBuilder = ResourceFactory.build(require('path').resolve(__dirname, '..', 'FeishuSuite'));
const SPREADSHEET_RESOURCE = 'spreadsheet';

function filterSpreadsheetProperties(allProps: any[]): any[] {
	const filtered: any[] = [];
	for (const prop of allProps) {
		const show = prop.displayOptions?.show;
		if (!show) {
			filtered.push(prop);
			continue;
		}
		if (show.resource?.includes(SPREADSHEET_RESOURCE)) {
			filtered.push(prop);
		}
	}
	return filtered;
}

const spreadsheetProperties = filterSpreadsheetProperties(resourceBuilder.build());

export class FeishuSuiteSpreadsheet implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Feishu Suite Spreadsheet',
		name: 'feishuSuiteSpreadsheet',
		icon: 'file:lark_icon.svg',
		group: ['input'],
		version: [1],
		defaultVersion: 1,
		description: 'Lark Spreadsheet Operations (Sheets, Cells, Values, Dimensions)',
		subtitle: '={{$parameter["operation"]}}',
		defaults: {
			name: 'Feishu Suite Spreadsheet',
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
		properties: spreadsheetProperties,
	};

	methods = {
		listSearch: {
			async searchSheets(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				const spreadsheetId = this.getNodeParameter('spreadsheet_id', undefined, {
					extractValue: true,
				}) as string;

				if (!spreadsheetId) {
					throw new NodeOperationError(this.getNode(), 'Spreadsheet ID required for search');
				}

				const sheets = await larkApiRequestSheetList.call(
					this as unknown as IExecuteFunctions,
					spreadsheetId,
				);
				return {
					results: sheets.map((sheet) => ({
						name: sheet.title as string,
						value: sheet.sheet_id as string,
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
		const callFunc = resourceBuilder.getCall(SPREADSHEET_RESOURCE, operation);

		if (!callFunc) {
			throw new NodeOperationError(
				this.getNode(),
				'No operation found: ' + SPREADSHEET_RESOURCE + '.' + operation,
			);
		}

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				this.logger.debug('call function', { resource: SPREADSHEET_RESOURCE, operation, itemIndex });
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
					resource: SPREADSHEET_RESOURCE,
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





