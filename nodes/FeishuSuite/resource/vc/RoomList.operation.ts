import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import { handlePagination } from '../../../help/utils/pagination';

export default {
	name: 'List Rooms (列出会议室)',
	value: 'listRooms',
	order: 180,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/vc-v1/room/list">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
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
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {

		const result = await handlePagination(this, index, async (pageToken) => {
			const { data } = await RequestUtils.request.call(this, {
				method: 'GET',
				url: '/open-apis/vc/v1/rooms',
				qs: {
					page_size: 50,
					...(pageToken && { page_token: pageToken }),
				},
				
			});
			return data;
		}, 'rooms');
		return {
			items: result.items,
			has_more: result.hasMore,
			page_token: result.pageToken ?? '',
		};
	},
} as ResourceOperation;
