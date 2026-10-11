import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { DESCRIPTIONS } from '../../../help/description';
import { returnAllAndLimitOptions, timeoutAndBatchingCollection } from '../../../help/utils/options';

export default {
	name: WORDING.GetChatList,
	value: OperationType.GetChatList,
	order: 84,
	options: [
		DESCRIPTIONS.USER_ID_TYPE,
		{
			displayName: 'Sort Type (排序类型)',
			name: 'sort_type',
			type: 'options',
			options: [
				{ name: 'By Active Time (按活跃时间)', value: 'ByActiveTime' },
				{ name: 'By Create Time (按创建时间)', value: 'ByCreateTime' },
			],
			default: 'ByActiveTime',
		},
		...returnAllAndLimitOptions,
		{
			displayName: WORDING.Options,
			name: 'options',
			type: 'collection',
			placeholder: WORDING.AddField,
			default: {},
			options: [
				{ displayName: 'Page Token (分页标记)', name: 'page_token', type: 'string', typeOptions: { password: true }, default: '', description: 'Page token for pagination, leave empty for first page' },
				...(timeoutAndBatchingCollection.options ?? []),
			],
		},
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/server-docs/im-v1/chat/list">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject | IDataObject[]> {
		const user_id_type = this.getNodeParameter('user_id_type', index, 'open_id') as string;
		const sort_type = this.getNodeParameter('sort_type', index, 'ByActiveTime') as string;
		const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
		const options = this.getNodeParameter('options', index, {}) as IDataObject;
		const page_token = (options.page_token as string) || '';

		if (!returnAll) {
			const limit = this.getNodeParameter('limit', index, 50) as number;
			const { data } = await RequestUtils.request.call(this, {
				method: 'GET',
				url: '/open-apis/im/v1/chats',
				qs: {
					user_id_type,
					sort_type,
					page_size: limit,
					...(page_token && { page_token }),
				},
			});
			return data;
		}

		const allItems: IDataObject[] = [];
		let hasMore = true;
		let currentPageToken = page_token;

		do {
			const { data } = await RequestUtils.request.call(this, {
				method: 'GET',
				url: '/open-apis/im/v1/chats',
				qs: {
					user_id_type,
					sort_type,
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
