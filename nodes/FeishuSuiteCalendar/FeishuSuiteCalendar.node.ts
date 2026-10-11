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
import { larkApiRequestCalendarEventList, larkApiRequestCalendarList } from '../FeishuSuite/GenericFunctions';
import { sendAndWaitWebhook } from '../help/utils/webhook';

const resourceBuilder = ResourceFactory.build(require('path').resolve(__dirname, '..', 'FeishuSuite'));
const CALENDAR_RESOURCE = 'calendar';

function filterCalendarProperties(allProps: any[]): any[] {
	const filtered: any[] = [];
	for (const prop of allProps) {
		const show = prop.displayOptions?.show;
		if (!show) {
			filtered.push(prop);
			continue;
		}
		if (show.resource?.includes(CALENDAR_RESOURCE)) {
			filtered.push(prop);
		}
	}
	return filtered;
}

const calendarProperties = filterCalendarProperties(resourceBuilder.build());

export class FeishuSuiteCalendar implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Feishu Suite Calendar',
		name: 'feishuSuiteCalendar',
		icon: 'file:lark_icon.svg',
		group: ['input'],
		version: [1],
		defaultVersion: 1,
		description: 'Lark Calendar Operations (Events, Calendars, Attendees, Meetings)',
		subtitle: '={{$parameter["operation"]}}',
		defaults: {
			name: 'Feishu Suite Calendar',
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
		properties: calendarProperties,
	};

	methods = {
		listSearch: {
			async searchCalendars(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				const calendars = await larkApiRequestCalendarList.call(this as unknown as IExecuteFunctions);
				return {
					results: calendars.map((calendar) => ({
						name: calendar.summary as string,
						value: calendar.calendar_id as string,
					})),
				};
			},

			async searchCalendarEvents(
				this: ILoadOptionsFunctions,
				query?: string,
			): Promise<INodeListSearchResult> {
				if (!query) {
					throw new NodeOperationError(this.getNode(), 'Query required for search');
				}

				const calendarId = this.getNodeParameter('calendar_id', undefined, {
					extractValue: true,
				}) as string;

				if (!calendarId) {
					throw new NodeOperationError(this.getNode(), 'Calendar ID required for search');
				}

				const user_id_type = this.getNodeParameter('user_id_type', 'open_id') as string;
				const events = await larkApiRequestCalendarEventList.call(this as unknown as IExecuteFunctions, {
					calendarId,
					query,
					user_id_type,
				});
				return {
					results: events.map((event) => ({
						name: event.summary as string,
						value: event.event_id as string,
						url: event.app_link as string,
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
		const callFunc = resourceBuilder.getCall(CALENDAR_RESOURCE, operation);

		if (!callFunc) {
			throw new NodeOperationError(
				this.getNode(),
				'No operation found: ' + CALENDAR_RESOURCE + '.' + operation,
			);
		}

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				this.logger.debug('call function', { resource: CALENDAR_RESOURCE, operation, itemIndex });
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
					resource: CALENDAR_RESOURCE,
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





