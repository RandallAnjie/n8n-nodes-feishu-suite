import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import { handlePagination } from '../../../help/utils/pagination';
import NodeUtils from '../../../help/utils/node';

export default {
	name: 'Search Suite Messages (搜索消息)',
	value: 'searchSuiteMessages',
	order: 190,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/search-v2/suite-search/create">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'User ID Type',
			name: 'user_id_type',
			type: 'options',
			options: [
				{ name: 'Open ID', value: 'open_id' },
				{ name: 'Union ID', value: 'union_id' },
				{ name: 'User ID', value: 'user_id' },
			],
			default: 'open_id',
			description: 'ID type used in this request.',
		},
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return every page of results.',
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: { minValue: 1 },
			default: 50,
			description: 'Max number of results to return.',
		},
		{
			displayName: 'Request Body',
			name: 'body',
			type: 'json',
			default: '{}',
			description: 'JSON request body merged into the API call.',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const user_id_type = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const body = NodeUtils.getNodeJsonData(this, 'body', index, {}) as IDataObject;
		const result = await handlePagination(this, index, async (pageToken) => {
			const { data } = await RequestUtils.request.call(this, {
				method: 'POST',
				url: '/open-apis/search/v2/message',
				qs: {
					user_id_type, page_size: 50,
					...(pageToken && { page_token: pageToken }),
				},
				body: { ...body },
			});
			return data;
		}, 'items');
		return {
			items: result.items,
			has_more: result.hasMore,
			page_token: result.pageToken ?? '',
		};
	},
} as ResourceOperation;
