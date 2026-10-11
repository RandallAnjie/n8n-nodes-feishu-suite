import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { returnAllAndLimitOptions, timeoutAndBatchingCollection } from '../../../help/utils/options';

export default {
	name: WORDING.MessageSearch,
	value: OperationType.MessageSearch,
	order: 215,
	options: [
		{
			displayName: '⚠️ This operation requires User Token (OAuth2) authentication. Tenant Access Token is not supported. Switch to \'Lark OAuth2 API\' in the node\'s Authentication setting.',
			name: 'authNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Query (搜索关键词)',
			name: 'query',
			type: 'string',
			required: true,
			default: '',
			description: 'Search keywords for message content',
		},
		...returnAllAndLimitOptions,
		{
			displayName: WORDING.Options,
			name: 'options',
			type: 'collection',
			placeholder: WORDING.AddField,
			default: {},
			options: [
				{
					displayName: 'Chat ID List (群聊ID列表)',
					name: 'chat_id_list',
					type: 'string',
					default: '',
					description: 'Comma-separated chat IDs to search in. Leave empty to search all chats.',
				},
				{
					displayName: 'End Time (结束时间)',
					name: 'end_time',
					type: 'string',
					default: '',
					description: 'End timestamp in Unix milliseconds',
				},
				{
					displayName: 'From User ID List (发送者ID列表)',
					name: 'from_user_id_list',
					type: 'string',
					default: '',
					description: 'Comma-separated sender user IDs',
				},
				{
					displayName: 'Sort Type (排序类型)',
					name: 'sort_type',
					type: 'options',
					options: [
						{ name: 'By Create Time Ascending', value: 'ByCreateTimeAsc' },
						{ name: 'By Create Time Descending', value: 'ByCreateTimeDesc' },
					],
					default: 'ByCreateTimeDesc',
				},
				{
					displayName: 'Start Time (开始时间)',
					name: 'start_time',
					type: 'string',
					default: '',
					description: 'Start timestamp in Unix milliseconds',
				},
				{
					displayName: 'To User ID List (接收者ID列表)',
					name: 'to_user_id_list',
					type: 'string',
					default: '',
					description: 'Comma-separated recipient user IDs',
				},
				...(timeoutAndBatchingCollection.options ?? []),
			],
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/message/search">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject | IDataObject[]> {
		const query = this.getNodeParameter('query', index) as string;
		const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
		const options = this.getNodeParameter('options', index, {}) as IDataObject;

		const chat_id_list = (options.chat_id_list as string) || '';
		const from_user_id_list = (options.from_user_id_list as string) || '';
		const to_user_id_list = (options.to_user_id_list as string) || '';
		const start_time = (options.start_time as string) || '';
		const end_time = (options.end_time as string) || '';
		const sort_type = (options.sort_type as string) || 'ByCreateTimeDesc';

		const body: IDataObject = { query };

		if (chat_id_list) {
			body.chat_id_list = chat_id_list
				.split(',')
				.map((s: string) => s.trim())
				.filter(Boolean);
		}
		if (from_user_id_list) {
			body.from_user_id_list = from_user_id_list
				.split(',')
				.map((s: string) => s.trim())
				.filter(Boolean);
		}
		if (to_user_id_list) {
			body.to_user_id_list = to_user_id_list
				.split(',')
				.map((s: string) => s.trim())
				.filter(Boolean);
		}
		if (start_time) body.start_time = start_time;
		if (end_time) body.end_time = end_time;
		if (sort_type) body.sort_type = sort_type;

		if (!returnAll) {
			const limit = this.getNodeParameter('limit', index, 50) as number;
			const { data } = await RequestUtils.request.call(this, {
				method: 'POST',
				url: '/open-apis/im/v1/messages/search',
				body,
				qs: { page_size: limit },
			});
			return data;
		}

		const allItems: IDataObject[] = [];
		let hasMore = true;
		let currentPageToken = '';

		do {
			const { data } = await RequestUtils.request.call(this, {
				method: 'POST',
				url: '/open-apis/im/v1/messages/search',
				body,
				qs: {
					page_size: 100,
					...(currentPageToken && { page_token: currentPageToken }),
				},
			});

			const responseData = data as IDataObject;
			const items = (responseData.items as IDataObject[]) || [];
			if (items.length > 0) {
				allItems.push(...items);
			}

			hasMore = !!responseData.has_more;
			currentPageToken = (responseData.page_token as string) || '';
		} while (hasMore);

		return allItems;
	},
} as ResourceOperation;
