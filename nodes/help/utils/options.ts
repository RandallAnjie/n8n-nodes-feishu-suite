import type { INodeProperties } from 'n8n-workflow';
import { WORDING } from '../wording';

const timeoutOption: INodeProperties = {
	displayName: WORDING.Timeout,
	name: 'timeout',
	type: 'number',
	typeOptions: {
		minValue: 0,
		numberPrecision: 0,
	},
	default: 30000,
	description: 'Timeout in milliseconds for each API request. Set to 0 to disable.',
};

const itemsPerBatchOption: INodeProperties = {
	displayName: WORDING.ItemsPerBatch,
	name: 'itemsPerBatch',
	type: 'number',
	typeOptions: {
		minValue: 1,
		maxValue: 100,
		numberPrecision: 0,
	},
	default: 20,
	description: 'Number of items to process in each batch request',
};

const batchIntervalOption: INodeProperties = {
	displayName: WORDING.BatchInterval,
	name: 'batchInterval',
	type: 'number',
	typeOptions: {
		minValue: 0,
		numberPrecision: 0,
	},
	default: 1000,
	description: 'Delay in milliseconds between batches to avoid rate limiting',
};

export const timeoutAndBatchingOptions: INodeProperties[] = [
	timeoutOption,
	itemsPerBatchOption,
	batchIntervalOption,
];

export const timeoutAndBatchingCollection: INodeProperties = {
	displayName: WORDING.Options,
	name: 'options',
	type: 'collection',
	placeholder: WORDING.AddField,
	default: {},
	options: timeoutAndBatchingOptions,
};

export const returnAllAndLimitOptions: INodeProperties[] = [
	{
		displayName: WORDING.ReturnAll,
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: WORDING.Limit,
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			numberPrecision: 0,
		},
		default: 50,
		description: 'Max number of results to return',
	},
];
