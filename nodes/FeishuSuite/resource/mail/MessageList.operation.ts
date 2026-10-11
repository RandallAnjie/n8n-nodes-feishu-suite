import RequestUtils from '../../../help/utils/RequestUtils';
import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { ResourceOperation } from '../../../help/type/IResource';
import { handlePagination } from '../../../help/utils/pagination';

export default {
	name: 'List Mail Messages (列出邮件)',
	value: 'listMailMessages',
	order: 190,
	options: [
		{
			displayName: '<a target="_blank" href="https://open.feishu.cn/document/server-docs/mail-v1/user_mailbox-message/list">Open official document</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'User Mailbox ID',
			name: 'user_mailbox_id',
			type: 'string',
			default: 'me',
			description: 'Mailbox ID. Use me for the authorized user.',
		},
		{
			displayName: 'Folder ID',
			name: 'folder_id',
			type: 'string',
			default: '',
			description: 'Optional folder ID to filter messages',
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
		const user_mailbox_id = this.getNodeParameter('user_mailbox_id', index, 'me') as string;
		const folder_id = this.getNodeParameter('folder_id', index, '') as string;
		const result = await handlePagination(this, index, async (pageToken) => {
			const { data } = await RequestUtils.request.call(this, {
				method: 'GET',
				url: `/open-apis/mail/v1/user_mailboxes/${user_mailbox_id}/messages`,
				qs: {
					folder_id, page_size: 50,
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
