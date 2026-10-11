import { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import RequestUtils from '../../../help/utils/RequestUtils';
import { ResourceOperation } from '../../../help/type/IResource';
import { WORDING } from '../../../help/wording';
import { OperationType } from '../../../help/type/enums';
import { returnAllAndLimitOptions } from '../../../help/utils/options';
import { handlePagination } from '../../../help/utils/pagination';

export default {
	name: WORDING.MessagePinList,
	value: OperationType.MessagePinList,
	order: 221,
	options: [
		{
			displayName: 'Chat ID (群聊 ID)',
			name: 'chat_id',
			type: 'string',
			required: true,
			default: '',
			description: 'The chat ID to list pinned messages from',
		},
		...returnAllAndLimitOptions,
		{
			displayName: `<a target="_blank" href="https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/pin/list">${WORDING.OpenDocument}</a>`,
			name: 'notice',
			type: 'notice',
			default: '',
		},
	],
	async call(this: IExecuteFunctions, index: number): Promise<IDataObject> {
		const chat_id = this.getNodeParameter('chat_id', index) as string;

		const result = await handlePagination(
			this,
			index,
			async (pageToken?: string) => {
				const qs: IDataObject = { page_size: 50 };
				if (pageToken) {
					qs.page_token = pageToken;
				}

				const { data } = await RequestUtils.request.call(this, {
					method: 'GET',
					url: `/open-apis/im/v1/chats/${chat_id}/pins`,
					qs,
				});
				return data as IDataObject;
			},
			'items',
		);

		return {
			items: result.items,
			has_more: result.hasMore,
			page_token: result.pageToken ?? '',
		};
	},
} as ResourceOperation;
