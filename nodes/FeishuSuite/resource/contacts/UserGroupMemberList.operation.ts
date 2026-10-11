import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import { handlePagination } from '../../../help/utils/pagination';

export default {
	name: 'List User Group Members (列出用户组成员)',
	value: 'listUserGroupMembers',
	order: 56,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/contact-v3/group-member/simplelist">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Group ID',
			name: 'group_id',
			type: 'string',
			required: true,
			default: '',
			description: 'User group ID.',
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
		const group_id = this.getNodeParameter('group_id', index, '') as string;
		const result = await handlePagination(this, index, async (pageToken) => {
			const { data } = await RequestUtils.request.call(this, {
				method: 'GET',
				url: `/open-apis/contact/v3/group/${group_id}/member/simplelist`,
				qs: {
					page_size: 50,
					...(pageToken && { page_token: pageToken }),
				},
				
			});
			return data;
		}, 'memberlist');
		return {
			items: result.items,
			has_more: result.hasMore,
			page_token: result.pageToken ?? '',
		};
	},
} as ResourceOperation;
