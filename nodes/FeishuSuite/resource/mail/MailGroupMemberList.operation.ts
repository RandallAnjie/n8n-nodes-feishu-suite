import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import { handlePagination } from '../../../help/utils/pagination';

export default {
	name: 'List Mail Group Members (列出邮件组成员)',
	value: 'listMailGroupMembers',
	order: 120,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/mail-v1/mail-group-member/list">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Mail Group ID',
			name: 'mailgroup_id',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: { minValue: 1 },
			default: 50,
			description: 'Max number of results to return',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const mailgroup_id = this.getNodeParameter('mailgroup_id', index, '') as string;
		const result = await handlePagination(this, index, async (pageToken) => {
			const { data } = await RequestUtils.request.call(this, {
				method: 'GET',
				url: `/open-apis/mail/v1/mailgroups/${mailgroup_id}/members`,
				qs: {
					page_size: 50,
					...(pageToken && { page_token: pageToken }),
				},
				
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
