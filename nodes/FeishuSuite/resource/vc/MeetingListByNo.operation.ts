import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import { handlePagination } from '../../../help/utils/pagination';

export default {
	name: 'List Meetings By Number (按会议号列出会议)',
	value: 'listMeetingsByNo',
	order: 190,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/vc-v1/meeting/list_by_no">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Meeting Number',
			name: 'meeting_no',
			type: 'string',
			required: true,
			default: '',
			description: '9-digit meeting number.',
		},
		{
			displayName: 'Start Time',
			name: 'start_time',
			type: 'string',
			required: true,
			default: '',
			description: 'Unix start time in seconds.',
		},
		{
			displayName: 'End Time',
			name: 'end_time',
			type: 'string',
			required: true,
			default: '',
			description: 'Unix end time in seconds.',
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
		const meeting_no = this.getNodeParameter('meeting_no', index, '') as string;
		const start_time = this.getNodeParameter('start_time', index, '') as string;
		const end_time = this.getNodeParameter('end_time', index, '') as string;
		const result = await handlePagination(this, index, async (pageToken) => {
			const { data } = await RequestUtils.request.call(this, {
				method: 'GET',
				url: '/open-apis/vc/v1/meetings/list_by_no',
				qs: {
					meeting_no, start_time, end_time, page_size: 50,
					...(pageToken && { page_token: pageToken }),
				},
				
			});
			return data;
		}, 'meeting_briefs');
		return {
			items: result.items,
			has_more: result.hasMore,
			page_token: result.pageToken ?? '',
		};
	},
} as ResourceOperation;
